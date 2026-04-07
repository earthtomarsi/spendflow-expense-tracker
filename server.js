const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS connected");
    res.json({
      success: true,
      message: "Database connected successfully",
      rows
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message
    });
  }
});

app.get("/expenses", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id,
        title,
        category,
        amount,
        DATE_FORMAT(expense_date, '%Y-%m-%d') AS expense_date,
        description,
        created_at
      FROM expenses
      ORDER BY expense_date DESC, id DESC
    `);

    const expenses = rows.map(row => ({
      id: row.id,
      expenseName: row.title,
      category: row.category,
      amount: Number(row.amount),
      date: row.expense_date,
      description: row.description,
      created_at: row.created_at
    }));

    res.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
});

app.post("/expenses", async (req, res) => {
  try {
    const { expenseName, category, amount, date, description } = req.body;

    if (!expenseName || !category || !amount || !date || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a valid number greater than 0" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO expenses (title, category, amount, expense_date, description)
      VALUES (?, ?, ?, ?, ?)
      `,
      [expenseName, category, numericAmount, date, description]
    );

    res.status(201).json({
      id: result.insertId,
      expenseName,
      category,
      amount: numericAmount,
      date,
      description
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ message: "Failed to create expense" });
  }
});

app.put("/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { expenseName, category, amount, date, description } = req.body;

    if (!expenseName || !category || !amount || !date || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a valid number greater than 0" });
    }

    const [result] = await pool.query(
      `
      UPDATE expenses
      SET title = ?, category = ?, amount = ?, expense_date = ?, description = ?
      WHERE id = ?
      `,
      [expenseName, category, numericAmount, date, description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({
      id: Number(id),
      expenseName,
      category,
      amount: numericAmount,
      date,
      description
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Failed to update expense" });
  }
});

app.delete("/expenses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM expenses WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Failed to delete expense" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});