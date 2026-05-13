const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Copy server/.env.example to server/.env before testing login.");
}

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Spendflow backend is running" });
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

// Route groups keep authentication, expenses, and admin features separated.
app.use("/auth", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/admin", adminRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
