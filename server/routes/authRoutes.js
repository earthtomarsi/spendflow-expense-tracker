const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const pool = require("../db");
const { authenticateToken } = require("../middleware/authMiddleware");
const logActivity = require("../utils/logActivity");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanName = String(name || cleanUsername).trim();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanUsername || !cleanEmail || !password) {
      return res.status(400).json({
        message: "Username, email and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [cleanEmail, cleanUsername]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email or username is already registered"
      });
    }

    // Store only the bcrypt hash so the plain password is never saved.
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (name, username, email, password_hash) VALUES (?, ?, ?, ?)",
      [cleanName, cleanUsername, cleanEmail, passwordHash]
    );

    await logActivity(result.insertId, "REGISTER", "User registered a new account");

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: result.insertId,
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        role: "user"
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    // The frontend sends "login" for either email or username.
    // The fallback to req.body.email keeps older frontend requests from breaking.
    const loginInput = req.body.login ?? req.body.email ?? "";
    const { password } = req.body;

    const loginValue = String(loginInput || "").trim().toLowerCase();

    if (!loginValue || !password) {
      return res.status(400).json({
        message: "Email/username and password are required"
      });
    }

    const [users] = await pool.query(
      `
      SELECT id, name, username, email, password_hash, role
      FROM users
      WHERE email = ? OR username = ?
      LIMIT 1
      `,
      [loginValue, loginValue]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email/username or password"
      });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email/username or password"
      });
    }

    // The frontend sends this token in the Authorization header for protected routes.
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    await logActivity(user.id, "LOGIN", "User logged in");

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login" });
  }
});

router.post("/logout", authenticateToken, async (req, res) => {
  try {
    await logActivity(req.user.id, "LOGOUT", "User logged out");
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
});

module.exports = router;
