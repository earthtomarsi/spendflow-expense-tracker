const express = require("express");
const bcrypt = require("bcrypt");

const pool = require("../db");
const { authenticateToken, requireAdmin } = require("../middleware/authMiddleware");
const logActivity = require("../utils/logActivity");

const router = express.Router();

router.use(authenticateToken, requireAdmin);

function cleanUserInput(body) {
  return {
    name: String(body.name || "").trim(),
    username: String(body.username || "").trim().toLowerCase(),
    email: String(body.email || "").trim().toLowerCase(),
    role: String(body.role || "user").trim().toLowerCase(),
    password: body.password
  };
}

function validateAdminUserInput(user, { requirePassword = false } = {}) {
  if (!user.name || !user.username || !user.email || !user.role) {
    return "Name, username, email and role are required";
  }

  if (!["user", "admin"].includes(user.role)) {
    return "Role must be either user or admin";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    return "Email must be valid";
  }

  if (requirePassword && (!user.password || user.password.length < 6)) {
    return "Password must be at least 6 characters";
  }

  if (user.password && user.password.length < 6) {
    return "Password must be at least 6 characters";
  }

  return null;
}

router.get("/users", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, username, email, role, created_at FROM users ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const user = cleanUserInput(req.body);
    const validationError = validateAdminUserInput(user, { requirePassword: true });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [user.email, user.username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email or username is already registered" });
    }

    const passwordHash = await bcrypt.hash(user.password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [user.name, user.username, user.email, passwordHash, user.role]
    );

    await logActivity(
      req.user.id,
      "ADMIN_CREATE_USER",
      `Created user account: ${user.username}`
    );

    res.status(201).json({
      id: result.insertId,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = Number(id);
    const user = cleanUserInput(req.body);
    const validationError = validateAdminUserInput(user);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE (email = ? OR username = ?) AND id <> ?",
      [user.email, user.username, targetUserId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email or username is already registered" });
    }

    if (targetUserId === req.user.id && user.role !== "admin") {
      return res.status(400).json({ message: "You cannot remove your own admin role" });
    }

    let result;

    if (user.password) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      [result] = await pool.query(
        `
        UPDATE users
        SET name = ?, username = ?, email = ?, role = ?, password_hash = ?
        WHERE id = ?
        `,
        [user.name, user.username, user.email, user.role, passwordHash, targetUserId]
      );
    } else {
      [result] = await pool.query(
        `
        UPDATE users
        SET name = ?, username = ?, email = ?, role = ?
        WHERE id = ?
        `,
        [user.name, user.username, user.email, user.role, targetUserId]
      );
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await logActivity(
      req.user.id,
      "ADMIN_UPDATE_USER",
      `Updated user account ID: ${targetUserId}`
    );

    res.json({
      id: targetUserId,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = Number(id);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [targetUserId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await logActivity(
      req.user.id,
      "ADMIN_DELETE_USER",
      `Deleted user account ID: ${targetUserId}`
    );

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
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
