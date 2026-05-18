const express = require("express");

const pool = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");
const logActivity = require("../utils/logActivity");

const router = express.Router();

function mapExpenseRow(row) {
  return {
    id: row.id,
    expenseName: row.title,
    category: row.category,
    amount: Number(row.amount),
    date: row.expense_date,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function validateExpenseInput({ expenseName, category, amount, date }) {
  if (!expenseName || !category || amount === undefined || !date) {
    return "Expense name, category, amount and date are required";
  }

  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return "Amount must be a valid number greater than 0";
  }

  return null;
}

router.get("/", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        id,
        title,
        category,
        amount,
        DATE_FORMAT(expense_date, '%Y-%m-%d') AS expense_date,
        description,
        created_at,
        updated_at
      FROM expenses
      WHERE user_id = ?
      ORDER BY expense_date DESC, id DESC
      `,
      [req.user.id]
    );

    res.json(rows.map(mapExpenseRow));
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { expenseName, category, amount, date, description } = req.body;
    const validationError = validateExpenseInput(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const numericAmount = Number(amount);
    const cleanDescription = String(description ?? "").trim();

    // Always use req.user.id from the JWT instead of trusting frontend user_id.
    const [result] = await pool.query(
      `
      INSERT INTO expenses (user_id, title, category, amount, expense_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [req.user.id, expenseName.trim(), category, numericAmount, date, cleanDescription]
    );

    await logActivity(req.user.id, "CREATE_EXPENSE", `Created expense: ${expenseName}`);

    res.status(201).json({
      id: result.insertId,
      expenseName: expenseName.trim(),
      category,
      amount: numericAmount,
      date,
      description: cleanDescription
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ message: "Failed to create expense" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { expenseName, category, amount, date, description } = req.body;
    const validationError = validateExpenseInput(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const numericAmount = Number(amount);
    const cleanDescription = String(description ?? "").trim();

    const [result] = await pool.query(
      `
      UPDATE expenses
      SET title = ?, category = ?, amount = ?, expense_date = ?, description = ?
      WHERE id = ? AND user_id = ?
      `,
      [expenseName.trim(), category, numericAmount, date, cleanDescription, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    await logActivity(req.user.id, "UPDATE_EXPENSE", `Updated expense ID: ${id}`);

    res.json({
      id: Number(id),
      expenseName: expenseName.trim(),
      category,
      amount: numericAmount,
      date,
      description: cleanDescription
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Failed to update expense" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM expenses WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    await logActivity(req.user.id, "DELETE_EXPENSE", `Deleted expense ID: ${id}`);

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Failed to delete expense" });
  }
});

module.exports = router;
