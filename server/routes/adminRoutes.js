const express = require("express");

const pool = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        user_activity.id,
        user_activity.user_id,
        users.name,
        users.email,
        user_activity.action,
        user_activity.details,
        user_activity.created_at
      FROM user_activity
      LEFT JOIN users ON user_activity.user_id = users.id
      ORDER BY user_activity.created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Error fetching activity:", error);
    res.status(500).json({ message: "Failed to fetch activity" });
  }
});

module.exports = router;
