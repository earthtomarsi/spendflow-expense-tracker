const express = require("express");
const bcrypt = require("bcrypt");

const pool = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");
const logActivity = require("../utils/logActivity");

const router = express.Router();

router.use(authenticateToken);

function formatUser(user) {
  return {
    id: user.id,
    userID: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role
  };
}

function validateProfileInput(user) {
  if (!user.name || !user.username || !user.email) {
    return "Name, username and email are required";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    return "Email must be valid";
  }

  return null;
}

function mergeProfileInput(currentUser, body) {
  return {
    name:
      body.name === undefined
        ? currentUser.name
        : String(body.name || "").trim(),
    username:
      body.username === undefined
        ? currentUser.username
        : String(body.username || "").trim().toLowerCase(),
    email:
      body.email === undefined
        ? currentUser.email
        : String(body.email || "").trim().toLowerCase()
  };
}

router.get("/me", async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, name, username, email, role FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(formatUser(users[0]));
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ message: "Failed to fetch current user" });
  }
});

router.put("/me", async (req, res) => {
  try {
    const [currentUsers] = await pool.query(
      "SELECT id, name, username, email, role FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (currentUsers.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = mergeProfileInput(currentUsers[0], req.body);
    const validationError = validateProfileInput(user);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE (email = ? OR username = ?) AND id <> ?",
      [user.email, user.username, req.user.id]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: "Email or username is already registered" });
    }

    const [result] = await pool.query(
      `
      UPDATE users
      SET name = ?, username = ?, email = ?
      WHERE id = ?
      `,
      [user.name, user.username, user.email, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    await logActivity(req.user.id, "ACCOUNT_UPDATE", "User updated their account profile");

    const [updatedUsers] = await pool.query(
      "SELECT id, name, username, email, role FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    res.json(formatUser(updatedUsers[0]));
  } catch (error) {
    console.error("Error updating current user:", error);
    res.status(500).json({ message: "Failed to update current user" });
  }
});

router.put("/me/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const [users] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, users[0].password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, req.user.id]
    );

    await logActivity(req.user.id, "PASSWORD_UPDATE", "User updated their password");

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Failed to update password" });
  }
});

module.exports = router;
