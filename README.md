# Spendflow Expense Tracker

Spendflow is a single-page expense tracking web application that helps users record, manage, and review their spending history. It supports database-backed CRUD operations, dynamic filtering and sorting, manual search, editable expense history, category summaries, and monthly spending trends.

## Problem It Solves

Many people track expenses in spreadsheets or scattered notes, which makes it harder to review patterns, edit past entries, and understand where money is going. Spendflow provides a cleaner workflow for logging expenses and analysing spending by category and month in one interface.

## Technical Stack

- **Frontend:** HTML, CSS, JavaScript, and React
- **Styling:** Custom CSS
- **Backend:** Node.js + Express
- **Database:** MySQL
- **Charts:** Chart.js
- **Routing / Data Flow:** REST API endpoints between frontend and backend
- **Database Export:** `expense_tracker.sql`

## Frontend Implementation Note

The current polished dashboard interface is implemented in the root `index.html`, `script.js`, and `style.css` files. The project also includes a React frontend inside the `client/` folder, which is intended for the next stage of frontend refactoring.

Some current UI behaviours, including the custom dropdowns, date picker, table edit mode, toast notifications, pagination behaviour, logout state, and Chart.js visualisations, still need to be fully migrated into the React version.

## UI Design and Visual Style

Spendflow uses a modern dashboard-style interface designed around clarity, consistency, and low-friction expense tracking. The visual system uses soft green accents, glass-like surfaces, rounded components, and subtle shadows to create a calm financial tracking experience.

### Design Principles

The interface is guided by four design principles:

- **Clarity:** Expense information, table actions, and chart insights should be easy to scan.
- **Consistency:** Forms, dropdowns, filters, tooltips, buttons, and cards use shared styling patterns.
- **Soft visual hierarchy:** Headings, cards, active states, and chart colours guide attention without overwhelming the page.
- **Feedback-driven interaction:** Toasts, focus states, row highlights, and edit states help users understand when an action has been completed or when a control is active.

### Colour System

Spendflow uses a green and mint colour system to suggest money flow, progress, and positive financial tracking. The palette combines bright accent colours with pale green backgrounds and dark neutral text for readability.

| Token / Use | Colour | Usage |
| --- | --- | --- |
| Primary Green | `#4DDE83` | Main brand accent, active states, highlights, and selected UI elements |
| Mint Accent | `#48DDB6` | Gradients, focus borders, chart accents, and secondary interactive states |
| Lime Accent | `#A8FF78` | Background glows, focus highlights, and soft decorative accents |
| Primary Gradient | `#58E66F` → `#48DDB6` | Primary buttons, active filters, selected dropdown items, and major call-to-action states |
| Hover Gradient | `#64ED78` → `#55E8C2` | Button hover states and stronger interaction feedback |
| Main Text | `#111827` | Headings, important labels, totals, and active table text |
| Muted Text | `#7B857F` | Secondary labels and supporting UI text |
| Soft Text | `#9CA3AF` | Placeholder text, inactive states, helper text, and subtle metadata |
| Page Background | `#FBFFF8`, `#F4FFF0`, `#EFFDF5` | Soft green page gradient and dashboard background tones |

Chart colours use distinct category-based accents so users can quickly compare spending areas, while the monthly trend chart uses a green spending line and a contrasting orange average line for clearer comparison.

### Typography

Spendflow uses **Inter** as the primary typeface because it is clean, modern, and readable in dashboard, form, table, and chart interfaces.

Headings use heavier font weights to establish structure, while body text, table data, labels, and descriptions use lighter weights so the interface feels balanced and easy to scan.

### Layout and Components

The application is structured as a single-page dashboard with three main content areas:

- **Add Expense section:** A hero-style form area for quickly adding a new expense.
- **Expense History section:** A searchable and editable table with filters, sorting, pagination, and row actions.
- **Summary and Monthly Trend sections:** Chart-based views for reviewing spending by category and month.

The component system uses rounded cards, soft shadows, translucent borders, glass-like backgrounds, and consistent spacing. Custom dropdowns, the date picker, toast messages, tooltips, buttons, filters, and chart containers follow the same visual language so the app feels cohesive.

### Interaction and State Design

Spendflow uses clear interaction states so users can understand what is clickable, selected, editable, or completed.

| State | Behaviour |
| --- | --- |
| Default | Inputs and cards use soft white surfaces with subtle borders |
| Hover | Buttons, dropdown options, and controls become slightly brighter or darker |
| Focus | Inputs use a mint border and soft green glow |
| Active / Selected | Filters, dropdown options, and selected dates use the primary green gradient |
| Edit Mode | Table cells show stronger focus states only while editing is enabled |
| Success Feedback | Toast notifications confirm actions such as adding, saving, deleting, or logging out |
| New Row Feedback | Newly added expenses are highlighted and the table jumps to the correct page |

The category pie chart uses a tooltip positioned outside the centre label so values remain readable. The monthly trend chart uses responsive x-axis labels so month labels do not become overcrowded at smaller breakpoints.

### Responsiveness and Accessibility Considerations

The layout is designed to adapt across screen sizes. Filter controls wrap on smaller screens, chart sections stack when needed, and the Expense History table uses ellipsis and horizontal scrolling to prevent text from being cut off on narrow viewports.

Accessibility considerations include:

- Clear focus states for keyboard navigation
- `aria-label` usage for icon-only controls
- Hidden helper labels for controls such as the calendar trigger
- Sufficient contrast between text, backgrounds, and active states
- Text-based feedback through status messages and toast notifications

## Screenshots

### Add Expense

![Add Expense section](Assets/screenshots/add-expense.png)

### Expense History

![Expense History table with filters](Assets/screenshots/expense-history.png)

### Category Summary

![Category summary pie chart](Assets/screenshots/category-summary.png)

### Monthly Spending Trend

![Monthly spending trend chart](Assets/screenshots/monthly-trend.png)

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
- Responsive table layout with ellipsis for narrow columns
- Custom-styled dropdowns and date picker
- Favicon and consistent visual branding
- Tooltips for truncated table content and chart values
- Toast notifications for successful user actions
- User-facing status messages for database or server errors

## Folder Structure

```text
expense-tracker/
├── index.html                  # Current polished dashboard interface
├── style.css                   # Current custom dashboard styling
├── script.js                   # Current frontend logic for expenses, charts, filters, and UI interactions
├── Assets/                     # Static assets such as favicon and screenshots
│   └── screenshots/            # UI screenshots used in README documentation
├── database/
│   └── expense_tracker.sql     # MySQL database setup and sample structure
├── server/                     # Node.js + Express backend
│   ├── server.js               # Backend entry point and route registration
│   ├── db.js                   # MySQL connection pool
│   ├── routes/
│   │   ├── authRoutes.js       # Registration and login APIs
│   │   ├── expenseRoutes.js    # Protected expense CRUD APIs
│   │   └── adminRoutes.js      # Admin user and activity APIs
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT authentication and admin checks
│   ├── utils/
│   │   └── logActivity.js      # Helper for recording user activity
│   └── .env.example            # Example backend environment variables
└── client/                     # React frontend for future refactoring
    └── src/
        ├── App.jsx             # Main React interface
        └── App.css             # React application styling
```

## Challenges Overcome

One challenge was converting the original front-end-only version into a database-backed CRUD application while keeping the interaction smooth. Another challenge was preserving a single-page experience after introducing backend persistence, search, pagination, and edit mode.

I also refined the table editing flow so users could make multiple changes safely using Save and Cancel instead of updating the database on every cell interaction. Finally, I improved the UI structure, responsive filter behaviour, responsive table behaviour, error handling, chart-table relationship, custom dropdowns, date input behaviour, tooltip behaviour, and row highlighting so the experience felt more polished and intuitive.

## How to Run the Project

### 1. Install dependencies

Install backend dependencies:

```bash
cd server
npm install
```

The polished frontend is served by the Express backend, so no extra frontend install step is needed for the main app.

### 2. Import the database export

From the project root, import the database setup file into MySQL:

```bash
mysql -u root -p < database/expense_tracker.sql
```

Enter your MySQL admin password when prompted. The import script creates a project database user for the app:

```env
DB_USER=spendflow_app
DB_PASSWORD=spendflow123
```

If the `mysql` command is not recognised, confirm where MySQL is installed on your machine:

```bash
which mysql
```

or:

```bash
command -v mysql
```

Then run the import command using the full path returned by your system. For example, on some macOS installations this may look like:

```bash
/usr/local/mysql/bin/mysql -u root -p < database/expense_tracker.sql
```

or, for Homebrew installations:

```bash
/opt/homebrew/bin/mysql -u root -p < database/expense_tracker.sql
```

You can also import `database/expense_tracker.sql` manually using a database tool such as MySQL Workbench.

### 3. Check the database connection settings

Copy `server/.env.example` to `server/.env`. The default local app database credentials are already set to `spendflow_app` / `spendflow123`.

### 4. Start the integrated app

```bash
cd server
npm start
```

Open the app in your browser:

```text
http://localhost:3000
```

The same Express server serves both the frontend files and the API routes.

### 5. Optional: Run the current dashboard interface with Live Server

You can still open the root `index.html` using VS Code Live Server. When the frontend is running from Live Server, it automatically sends API requests to:

```text
http://localhost:3000
```

### 6. Start the React frontend

The React frontend is available for ongoing refactoring work, but it is not the main integrated dashboard yet:

```bash
cd client
npm run dev
```

## API Overview

The frontend communicates with the backend using these REST endpoints:

- `POST /auth/register` – create a user account with a bcrypt-hashed password
- `POST /auth/login` – verify the password and return a JWT
- `POST /auth/logout` – record a logout event for the logged-in user
- `GET /expenses` – retrieve the logged-in user's expenses
- `POST /expenses` – create an expense for the logged-in user
- `PUT /expenses/:id` – update one of the logged-in user's expenses
- `DELETE /expenses/:id` – delete one of the logged-in user's expenses
- `GET /admin/users` – admin-only list of users
- `POST /admin/users` – admin-only creation of a user account
- `PUT /admin/users/:id` – admin-only update of user profile, role, or password
- `DELETE /admin/users/:id` – admin-only deletion of a user account
- `GET /admin/activity` – admin-only user activity history

## Security Note

JWT tokens should not be committed directly into `script.js`. For local testing, a token may be generated through the login endpoint and pasted temporarily, but this should be replaced with a proper login-based authentication flow before final deployment.

## Known Limitations and Future Improvements

- Replace the temporary hardcoded JWT workflow with a full login interface.
- Ensure logout clears the token and returns the user to the login state.
- Refactor the current root HTML/CSS/JS interface into the React frontend.
- Make the monthly trend chart, category pie chart, dropdowns, date picker, toast messages, table edit mode, pagination, and logout state work properly in React.
- Improve Chart.js lifecycle handling in React using refs and cleanup functions.
- Consolidate repeated CSS overrides and remove older experimental styling rules.
- Continue improving responsive behaviour for smaller screens.

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
