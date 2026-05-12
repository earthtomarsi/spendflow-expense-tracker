import { useState } from "react";
import "./App.css";

function App() {
  const [expenses, setExpenses] = useState([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [monthFilter, setMonthFilter] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  const addExpense = () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!date) {
      alert("Please select a date");
      return;
    }

    const newExpense = {
      id: Date.now(),
      title: title.trim(),
      amount: Number(amount),
      category,
      date,
      description: description.trim(),
    };

    setExpenses([...expenses, newExpense]);

    setTitle("");
    setAmount("");
    setCategory("Food");
    setDate("");
    setDescription("");
  };

  const deleteExpense = (id) => {
    setExpenses(expenses.filter((expense) => expense.id !== id));
  };

  const filteredExpenses = expenses
    .filter((expense) => {
      if (selectedCategory !== "All" && expense.category !== selectedCategory) {
        return false;
      }

      if (
        search &&
        !expense.title.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }

      if (monthFilter && !expense.date.startsWith(monthFilter)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date) - new Date(a.date);
      if (sortBy === "date-asc") return new Date(a.date) - new Date(b.date);
      if (sortBy === "amount-asc") return a.amount - b.amount;
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "name-asc") return a.title.localeCompare(b.title);
      if (sortBy === "name-desc") return b.title.localeCompare(a.title);
      return 0;
    });

  const totalSpending = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const categories = ["All", "Food", "Transport", "Bills", "Leisure", "Shopping"];

  return (
    <>
   
      <header className="header-full">
        <div className="header-left">
          <h1 id="brand-home" className="logo logo-clickable">
            Spend<span className="f">ƒ </span>low
            
          </h1>
          <p>Track your spending</p>
        </div>

        <div className="header-right">
          <div className="profile">
            <img
              className="profile-pic"
              src="https://www.gravatar.com/avatar/?d=mp"
              alt="Default profile avatar"
            />

            <div className="profile-info">
              <div
                className="username-wrapper"
                role="button"
                tabIndex="0"
                aria-expanded="false"
                aria-controls="dropdown"
              >
                <span className="username">Marsi</span>
                <span className="arrow">›</span>
              </div>

              <div id="dropdown" className="dropdown">
                <button id="logout-btn" className="logout-btn" type="button">
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div
          id="app-status"
          className="status-message"
          role="alert"
          aria-live="assertive"
          hidden
        ></div>

        <div className="add">
          <h2>Track an Expense</h2>

          <div className="container">
            <div className="input-section">
              <div className="input-row">
                <div className="field-group">
                  <label className="sr-only" htmlFor="expenseName">
                    Expense title
                  </label>
                  <input
                    id="expenseName"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <p id="expenseName-error" className="error-text"></p>
                </div>

                <div className="field-group">
                  <label className="sr-only" htmlFor="amount">
                    Expense amount
                  </label>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <small id="amount-helper"></small>
                  <p id="amount-error" className="error-text"></p>
                </div>

                <div className="field-group">
                  <label className="sr-only" htmlFor="category">
                    Expense category
                  </label>
                  <div className="select-wrapper">
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option>Food</option>
                      <option>Transport</option>
                      <option>Bills</option>
                      <option>Leisure</option>
                      <option>Shopping</option>
                    </select>
                    <span className="select-arrow">›</span>
                  </div>
                </div>

                <div className="field-group">
                  <label className="sr-only" htmlFor="date">
                    Expense date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <small id="date-helper"></small>
                  <p id="date-error" className="error-text"></p>
                </div>

                <div className="field-group description-group">
                  <label className="sr-only" htmlFor="description">
                    Expense description
                  </label>
                  <input
                    id="description"
                    maxLength="70"
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div className="desc-info">
                    <p id="desc-error" className="error-text"></p>
                    <small id="desc-counter">{description.length}/70</small>
                  </div>
                </div>
              </div>

              <div className="button-section">
                <button id="add-btn" type="button" onClick={addExpense}>
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="table-controls">
          <div className="filters">
            {categories.map((cat) => (
              <button
                key={cat}
                className={
                  selectedCategory === cat ? "filter-btn active" : "filter-btn"
                }
                type="button"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="controls-right">
            <div className="month-filter">
              <label htmlFor="month-filter">Month</label>
              <input
                id="month-filter"
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
              <button
                id="clear-month"
                type="button"
                onClick={() => setMonthFilter("")}
              >
                Clear
              </button>
            </div>

            <div className="sort">
              <label htmlFor="sort-select">Sort by</label>
              <div className="select-wrapper">
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="date-desc">Date: Newest</option>
                  <option value="date-asc">Date: Oldest</option>
                  <option value="amount-asc">Amount: Low to High</option>
                  <option value="amount-desc">Amount: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
                <span className="select-arrow">›</span>
              </div>
            </div>
          </div>
        </div>

        <div className="table-section">
          <div className="table-header">
            <h3>Expense History</h3>

            <div className="table-topbar">
              <div className="table-search">
                <label className="sr-only" htmlFor="expense-search">
                  Search expense titles
                </label>
                <input
                  id="expense-search"
                  type="text"
                  placeholder="Search by title"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  type="button"
                  className="search-icon-btn"
                  aria-label="Search"
                  disabled
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="7"></circle>
                    <path d="M20 20L16.65 16.65"></path>
                  </svg>
                </button>
              </div>

              <div className="table-pagination">
                <span id="page-indicator">
                  {filteredExpenses.length === 0
                    ? "0-0 of 0"
                    : `1-${filteredExpenses.length} of ${filteredExpenses.length}`}
                </span>
                <button
                  id="prev-page-btn"
                  type="button"
                  className="page-btn"
                  aria-label="Previous page"
                >
                  &#8249;
                </button>
                <button
                  id="next-page-btn"
                  type="button"
                  className="page-btn"
                  aria-label="Next page"
                >
                  &#8250;
                </button>
              </div>
            </div>
          </div>

          <table id="expense-table">
            <thead>
              <tr>
                <th>
                  <span className="th-text">Title</span>
                </th>
                <th>
                  <span className="th-text">Amount</span>
                </th>
                <th>
                  <span className="th-text">Category</span>
                </th>
                <th>
                  <span className="th-text">Date</span>
                </th>
                <th>
                  <span className="th-text">Description</span>
                </th>
                <th></th>
              </tr>
            </thead>

            <tbody id="expense-body">
              {filteredExpenses.length === 0 ? (
                <tr id="empty-row">
                  <td colSpan="6" id="empty-state">
                    No expenses yet
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.title}</td>
                    <td>${expense.amount.toFixed(2)}</td>
                    <td>{expense.category}</td>
                    <td>{expense.date}</td>
                    <td>{expense.description || "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => deleteExpense(expense.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="table-actions">
            <button id="edit-table-btn" type="button" className="table-action-btn">
              Edit
            </button>
            <button
              id="cancel-table-btn"
              type="button"
              className="table-action-btn secondary"
            >
              Cancel
            </button>
          </div>

          <div className="summary-section">
            <h3>Summary</h3>

            <div className="summary-grid">
              <div className="summary-left">
                <div className="total-card">
                  <p>Total Spending</p>
                  <h2 id="total">${totalSpending.toFixed(2)}</h2>
                </div>

                <div className="category-breakdown" id="category-totals">
                  {["Food", "Transport", "Bills", "Leisure", "Shopping"].map(
                    (cat) => {
                      const categoryTotal = filteredExpenses
                        .filter((expense) => expense.category === cat)
                        .reduce((sum, expense) => sum + expense.amount, 0);

                      return (
                        <p key={cat}>
                          {cat}: ${categoryTotal.toFixed(2)}
                        </p>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="summary-right">
                <div className="chart-placeholder">Pie chart will be added later</div>
              </div>
            </div>
          </div>
        </div>

        <section className="trend-section">
          <div className="trend-inner">
            <div className="chart-container">
              <h3>Monthly Spending Trend</h3>
              <div className="chart-placeholder">
                Monthly spending chart will be added later
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default App;