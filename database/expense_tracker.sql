-- Spendflow Expense Tracker database setup
-- Import this file into MySQL to create the tables needed by the backend.

DROP DATABASE IF EXISTS expense_tracker;
CREATE DATABASE expense_tracker;
USE expense_tracker;

-- App database user.
-- The backend uses this account instead of MySQL root after this script is imported.
CREATE USER IF NOT EXISTS 'spendflow_app'@'localhost' IDENTIFIED BY 'spendflow123';
GRANT ALL PRIVILEGES ON expense_tracker.* TO 'spendflow_app'@'localhost';
FLUSH PRIVILEGES;

-- Users are used for registration and login.
-- password_hash stores the bcrypt-hashed password, never the plain password.
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Expenses belong to a single user through user_id.
-- This lets the backend return only the logged-in user's own expenses.
CREATE TABLE expenses (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_expenses_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- User activity records important actions for the admin view.
-- It supports the assignment requirement for viewing user activity.
CREATE TABLE user_activity (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_activity_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Demo users.
-- Password for both users is: password123
INSERT INTO users (id, name, username, email, password_hash, role) VALUES
(1, 'Admin', 'admin', 'admin@example.com', '$2b$10$ksBycUy/sIpepuewWwbMGujnALow/.YbXmPZLURha0dhiKYGlzQVO', 'admin'),
(2, 'Marsi', 'marsi', 'marsi@example.com', '$2b$10$ksBycUy/sIpepuewWwbMGujnALow/.YbXmPZLURha0dhiKYGlzQVO', 'user');

-- Existing demo expenses are assigned to the regular demo user.
INSERT INTO expenses
(id, user_id, title, category, amount, expense_date, description, created_at)
VALUES
(5, 2, 'Groceries', 'Food', 80.00, '2026-03-06', 'monthly groceries', '2026-04-06 19:31:02'),
(6, 2, 'Jay Chou Concert', 'Leisure', 50.00, '2026-02-06', 'concert tix', '2026-04-06 19:47:00'),
(8, 2, 'Caramel', 'Shopping', 10.50, '2026-04-05', 'chopstick holder, socks', '2026-04-06 20:41:39'),
(9, 2, 'Opal Travel', 'Transport', 20.00, '2025-12-20', 'auto top up', '2026-04-06 20:42:31'),
(10, 2, 'Sun''s Kitchen', 'Food', 16.00, '2026-03-06', '3 meals', '2026-04-06 20:44:51'),
(12, 2, 'Lab', 'Food', 12.00, '2026-03-27', 'bread, coffee', '2026-04-06 21:13:19'),
(13, 2, 'UberEats', 'Food', 150.00, '2025-12-06', 'uber ride', '2026-04-06 21:13:48'),
(14, 2, 'Scoot', 'Leisure', 150.00, '2026-02-07', 'Melb trip', '2026-04-07 12:44:07'),
(15, 2, 'Dinner', 'Food', 50.00, '2026-03-15', 'Japanese food', '2026-04-07 12:44:44'),
(16, 2, 'Adobe', 'Bills', 30.00, '2026-01-07', 'monthly subscription', '2026-04-07 12:45:12'),
(18, 2, 'Rent', 'Bills', 650.00, '2026-04-07', 'weekly rent', '2026-04-07 13:36:51'),
(19, 2, 'Car', 'Transport', 3000.00, '2025-12-12', 'bought a used car off of Facebook Marketplace', '2026-04-07 13:52:02'),
(20, 2, 'Taobao', 'Shopping', 180.00, '2026-03-14', 'clothes', '2026-04-07 14:53:23'),
(23, 2, 'test', 'Food', 123.00, '2026-02-02', 'testing', '2026-04-07 15:51:17');

INSERT INTO user_activity (user_id, action, details) VALUES
(1, 'SEED_DATABASE', 'Initial demo data was imported.');
