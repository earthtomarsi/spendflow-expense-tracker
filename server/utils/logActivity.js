const pool = require("../db");

async function logActivity(userId, action, details = "") {
  try {
    await pool.query(
      "INSERT INTO user_activity (user_id, action, details) VALUES (?, ?, ?)",
      [userId, action, details]
    );
  } catch (error) {
    // Activity logging should not break the main user action.
    console.error("Activity logging failed:", error);
  }
}

module.exports = logActivity;
