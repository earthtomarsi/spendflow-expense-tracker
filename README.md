# Spendflow Expense Tracker

Spendflow is a single-page expense tracking web application that helps users record, manage, and review their spending history. It supports database-backed CRUD operations, dynamic filtering and sorting, manual search, editable expense history, category summaries, and monthly spending trends.

## Problem It Solves

Many people track expenses in spreadsheets or scattered notes, which makes it harder to review patterns, edit past entries, and understand where money is going. Spendflow provides a cleaner workflow for logging expenses and analysing spending by category and month in one interface.

## Technical Stack

- **Frontend:** React, HTML, CSS, JavaScript
- **Styling:** Custom CSS
- **Backend:** Node.js + Express
- **Database:** MySQL
- **Charts:** Chart.js
- **Routing / Data Flow:** REST API endpoints between frontend and backend
- **Database Export:** `expense_tracker.sql`

## Features

- Single-page application interface
- Create, read, update, and delete expenses from a MySQL database
- Add expenses with title, amount, category, date, and description
- Edit table rows with Save / Cancel workflow
- Delete expenses directly from the table
- Filter by category
- Filter by month
- Sort by date, amount, or name
- Manual title search
- Pagination with 10 rows per page
- Category breakdown summary
- Monthly spending trend chart
- Pie chart for spending by category
- Responsive filter layout
- Favicon and consistent visual branding
- Tooltips for truncated table content
- User-facing status messages for database or server errors

## Folder Structure

- `client/` – React frontend application
- `client/src/App.jsx` – main React interface for expenses
- `client/src/App.css` – React application styling
- `server/` – Node.js and Express backend
- `server/server.js` – backend entry point and route registration
- `server/db.js` – MySQL connection pool
- `server/routes/authRoutes.js` – registration and login APIs
- `server/routes/expenseRoutes.js` – protected expense CRUD APIs
- `server/routes/adminRoutes.js` – admin user and activity APIs
- `server/middleware/authMiddleware.js` – JWT authentication and admin checks
- `server/utils/logActivity.js` – helper for recording user activity
- `server/.env.example` – example backend environment variables
- `database/expense_tracker.sql` – database setup with users, expenses, and activity tables
- `Assets/` – static assets such as the favicon

## Challenges Overcome

One challenge was converting the original front-end-only version into a database-backed CRUD application while keeping the interaction smooth. Another challenge was preserving a single-page experience even after introducing backend persistence, search, pagination, and edit mode. I also refined the table editing flow so users could make multiple changes safely using Save and Cancel instead of updating the database on every cell interaction. Finally, I improved the UI structure, responsive filter behaviour, error handling, and chart-table relationship so that the experience felt more polished and intuitive.

## How to Run the Project

### 1. Install dependencies

```bash
npm install
```

### 2. Import the database export

If `mysql` is available on your PATH:

```bash
mysql -u root -p < database/expense_tracker.sql
```

If `mysql` is not available on your PATH, use the full MySQL binary path instead:

```bash
/usr/local/mysql/bin/mysql -u root -p < database/expense_tracker.sql
```

### 3. Check the database connection settings

Copy `server/.env.example` to `server/.env` and update the MySQL password and JWT secret.

### 4. Start the backend server

```bash
cd server
npm install
npm start
```

### 5. Start the React frontend

```bash
cd client
npm install
npm run dev
```

## API Overview

The frontend communicates with the backend using these REST endpoints:
- POST /auth/register – create a user account with a bcrypt-hashed password
- POST /auth/login – verify the password and return a JWT
- GET /expenses – retrieve the logged-in user's expenses
- POST /expenses – create an expense for the logged-in user
- PUT /expenses/:id – update one of the logged-in user's expenses
- DELETE /expenses/:id – delete one of the logged-in user's expenses
- GET /admin/users – admin-only list of users
- GET /admin/activity – admin-only user activity history

## Notes

The app is designed as a single-page application, so interactions such as filtering, editing, searching, and pagination happen without navigating away from the main page.
Search affects the table view only, while the charts and summary cards continue to reflect the saved expense data.
Edit mode uses a Save / Cancel workflow so multiple table changes can be reviewed before being committed to the database.

## Submission Files Included

- Source code
- Backend files
- MySQL database export
- README documentation
- Static assets
