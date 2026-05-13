let expenses = [];
let draftExpenses = [];

const API_BASE = "http://localhost:3000";
const AUTH_TOKEN = "PASTE_YOUR_CURRENT_JWT_TOKEN_HERE";

let categoryChart = null;
let pieChart = null;
let currentFilter = "All";
let currentSort = "date-desc";
let currentMonthFilter = "All";
let currentSearch = "";
let pendingSearch = "";
let currentPage = 1;
const rowsPerPage = 10;
const DESCRIPTION_LIMIT = 70;
let isEditMode = false;
let newlyAddedExpenseId = null;
let highlightTimeoutId = null;
let appToastTimeoutId = null;
let activeEditCell = null;
let isLoggedIn = true;

// DOM elements
const expenseNameInput = document.getElementById("expenseName");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const addBtn = document.getElementById("add-btn");
const expenseNameError = document.getElementById("expenseName-error");
const amountError = document.getElementById("amount-error");
const dateInput = document.getElementById("date");
const dateError = document.getElementById("date-error");
const descInput = document.getElementById("description");
const descError = document.getElementById("desc-error");
const descCounter = document.getElementById("desc-counter");
const monthFilterInput = document.getElementById("month-filter");
const clearMonthBtn = document.getElementById("clear-month");
const editTableBtn = document.getElementById("edit-table-btn");
const cancelTableBtn = document.getElementById("cancel-table-btn");
const expenseSearchInput = document.getElementById("expense-search");
const searchIconBtn = document.querySelector(".search-icon-btn");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageIndicator = document.getElementById("page-indicator");
const expenseBody = document.getElementById("expense-body");
const statusMessage = document.getElementById("app-status");
const brandHome = document.getElementById("brand-home");
const usernameWrapper = document.querySelector(".username-wrapper");
const logoutBtn = document.getElementById("logout-btn");
const trendSection = document.querySelector(".trend-section");
const tableSection = document.querySelector(".table-section");

// ---------- Helpers ----------
function cloneExpenses(expenseList) {
  return expenseList.map(exp => ({ ...exp }));
}

function getTableExpenses() {
  return isEditMode ? draftExpenses : expenses;
}

function normalizeExpense(expense = {}) {
  const rawAmount =
    expense.amount ??
    expense.expense_amount ??
    expense.expenseAmount ??
    0;

  const amount = Number(rawAmount);

  const rawDate =
    expense.date ??
    expense.expense_date ??
    expense.expenseDate ??
    "";

  return {
    ...expense,
    id:
      expense.id ??
      expense.expense_id ??
      expense.expenseId ??
      null,
    expenseName:
      expense.expenseName ??
      expense.expense_name ??
      expense.expenseTitle ??
      expense.title ??
      expense.name ??
      "",
    category:
      expense.category ??
      expense.expense_category ??
      expense.expenseCategory ??
      "Uncategorized",
    amount: Number.isFinite(amount) ? amount : 0,
    date: rawDate ? String(rawDate).slice(0, 10) : "",
    description:
      expense.description ??
      expense.expense_description ??
      expense.expenseDescription ??
      expense.notes ??
      "",
    dateError: expense.dateError ?? ""
  };
}

function getExpensesArrayFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.expenses)) return data.expenses;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.rows)) return data.rows;
  return [];
}

function getCreatedExpenseId(responseData) {
  const createdExpense =
    responseData?.expense ??
    responseData?.data ??
    responseData;

  return (
    createdExpense?.id ??
    createdExpense?.expense_id ??
    createdExpense?.expenseId ??
    responseData?.id ??
    responseData?.expense_id ??
    responseData?.expenseId ??
    responseData?.insertId ??
    null
  );
}

function buildExpensePayload(expense) {
  return {
    expenseName: expense.expenseName,
    category: expense.category,
    amount: Number(expense.amount),
    date: expense.date,
    description: expense.description
  };
}

function getTodayLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

function formatDateDisplay(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showStatus(message, type = "error") {
  if (!statusMessage) return;

  statusMessage.innerHTML = `
    <span class="status-message-text">${escapeHtml(message)}</span>
    <button
      class="status-close-btn"
      type="button"
      aria-label="Dismiss message"
    >
      ×
    </button>
  `;

  statusMessage.className = `status-message ${type}`;
  statusMessage.hidden = false;

  const closeBtn = statusMessage.querySelector(".status-close-btn");

  if (closeBtn) {
    closeBtn.addEventListener("click", clearStatus);
  }
}

function clearStatus() {
  if (!statusMessage) return;
  statusMessage.hidden = true;
  statusMessage.textContent = "";
  statusMessage.className = "status-message";
}

function renderAuthState() {
  const profile = document.querySelector(".profile");
  const dropdown = document.querySelector(".dropdown");
  const username = document.querySelector(".username");
  const arrow = document.querySelector(".arrow");
  const profilePic = document.querySelector(".profile-pic");

  if (!profile || !usernameWrapper) return;

  if (isLoggedIn) {
    profile.classList.remove("logged-out");
    usernameWrapper.classList.remove("login-header-btn");
    usernameWrapper.setAttribute("aria-expanded", "false");
    usernameWrapper.setAttribute("role", "button");
    usernameWrapper.setAttribute("tabindex", "0");

    if (username) username.textContent = "Marsi";
    if (arrow) arrow.hidden = false;
    if (dropdown) dropdown.hidden = false;
    if (profilePic) profilePic.hidden = false;

    return;
  }

  profile.classList.add("logged-out");
  usernameWrapper.classList.remove("active");
  usernameWrapper.classList.add("login-header-btn");
  usernameWrapper.setAttribute("aria-expanded", "false");
  usernameWrapper.setAttribute("role", "button");
  usernameWrapper.setAttribute("tabindex", "0");

  if (username) username.textContent = "Login";
  if (arrow) arrow.hidden = true;
  if (dropdown) dropdown.hidden = true;
  if (profilePic) profilePic.hidden = true;
}

function showAppToast(message) {
  const toast = document.getElementById("app-toast");
  const messageEl = document.getElementById("app-toast-message");

  if (!toast || !messageEl) return;

  messageEl.textContent = message;
  toast.hidden = false;
  toast.classList.add("show");

  if (appToastTimeoutId) {
    clearTimeout(appToastTimeoutId);
  }

  appToastTimeoutId = setTimeout(() => {
    hideAppToast();
  }, 2600);
}

function hideAppToast() {
  const toast = document.getElementById("app-toast");
  if (!toast) return;

  if (appToastTimeoutId) {
    clearTimeout(appToastTimeoutId);
    appToastTimeoutId = null;
  }

  toast.classList.remove("show");

  setTimeout(() => {
    toast.hidden = true;
  }, 180);
}

function updatePaginationDisplay(totalItems, startIndex = 0, endIndex = 0) {
  if (!pageIndicator || !prevPageBtn || !nextPageBtn) return;

  if (totalItems === 0) {
    pageIndicator.textContent = "0-0 of 0";
    prevPageBtn.disabled = true;
    nextPageBtn.disabled = true;
    return;
  }

  pageIndicator.textContent = `${startIndex}-${endIndex} of ${totalItems}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = endIndex >= totalItems;
}

function destroyCharts() {
  if (pieChart) {
    pieChart.destroy();
    pieChart = null;
  }

  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }
}

function toggleTrendSection(show) {
  if (!trendSection) return;
  trendSection.style.display = show ? "block" : "none";
}

function getFilteredExpenses(sourceExpenses, includeSearch = true) {
  let filtered = [...sourceExpenses];

  if (currentMonthFilter !== "All") {
    filtered = filtered.filter(exp => exp.date && exp.date.slice(0, 7) === currentMonthFilter);
  }

  if (currentFilter !== "All") {
    filtered = filtered.filter(exp => exp.category === currentFilter);
  }

  if (includeSearch && currentSearch) {
    filtered = filtered.filter(exp =>
      String(exp.expenseName || "").toLowerCase().includes(currentSearch)
    );
  }

  filtered.sort((a, b) => {
    const amountA = Number(a.amount) || 0;
    const amountB = Number(b.amount) || 0;
    const nameA = String(a.expenseName || "");
    const nameB = String(b.expenseName || "");
    const dateA = a.date ? new Date(`${a.date}T00:00:00`).getTime() : 0;
    const dateB = b.date ? new Date(`${b.date}T00:00:00`).getTime() : 0;

    switch (currentSort) {
      case "added-desc":
        return Number(b.id || 0) - Number(a.id || 0);
      case "amount-asc":
        return amountA - amountB;
      case "amount-desc":
        return amountB - amountA;
      case "name-asc":
        return nameA.localeCompare(nameB);
      case "name-desc":
        return nameB.localeCompare(nameA);
      case "date-asc":
        return dateA - dateB;
      case "date-desc":
      default:
        return dateB - dateA;
    }
  });

  return filtered;
}

function syncMonthFilterState() {
  if (!monthFilterInput) return;

  if (monthFilterInput.value) {
    monthFilterInput.classList.add("has-value");
  } else {
    monthFilterInput.classList.remove("has-value");
  }
}

function hasInvalidLeadingZero(value) {
  return /^0\d/.test(value.trim());
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const today = getTodayLocalDate();

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (value > today) return false;

  const date = new Date(`${value}T00:00:00`);

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function setTodayDate() {
  if (!dateInput) return;

  const today = getTodayLocalDate();
  dateInput.max = today;
  dateInput.value = today;

  if (dateInput.value) {
    dateInput.classList.add("has-value");
  } else {
    dateInput.classList.remove("has-value");
  }
}

function getSortedCategoryEntries() {
  const totals = {};

  expenses.forEach(exp => {
    const category = exp.category || "Uncategorized";
    const amount = Number(exp.amount);
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    totals[category] = (totals[category] || 0) + safeAmount;
  });

  let entries = Object.entries(totals);
  entries.sort((a, b) => b[1] - a[1]);

  if (currentFilter !== "All") {
    const selectedIndex = entries.findIndex(([category]) => category === currentFilter);
    if (selectedIndex > -1) {
      const [selectedEntry] = entries.splice(selectedIndex, 1);
      entries.unshift(selectedEntry);
    }
  }

  return entries;
}

function formatCurrency(amount) {
  const value = Number(amount);
  const safeAmount = Number.isFinite(value) ? value : 0;

  return safeAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function isExpenseDifferent(a, b) {
  return (
    a.expenseName !== b.expenseName ||
    a.category !== b.category ||
    Number(a.amount) !== Number(b.amount) ||
    a.date !== b.date ||
    a.description !== b.description
  );
}

function getCategoryOptions(selectedCategory) {
  return Array.from(categoryInput.options)
    .map(opt => {
      const value = escapeHtml(opt.value);
      const text = escapeHtml(opt.text);
      const selected = opt.value === selectedCategory ? "selected" : "";
      return `<option value="${value}" ${selected}>${text}</option>`;
    })
    .join("");
}

function applyRowTooltips(row, expense) {
  const rowCells = row.querySelectorAll("td");
  const titleText = row.querySelector(".cell-text");
  const categorySelect = row.querySelector("td.category-cell select");

  if (titleText) {
    titleText.title = expense.expenseName || "";
  }

  if (rowCells[1]) {
    rowCells[1].title = expense.amount != null ? String(expense.amount) : "";
  }

  if (categorySelect) {
    categorySelect.title = expense.category || "";
  }

  if (rowCells[3]) {
    rowCells[3].title = formatDateDisplay(expense.date) || "";
  }

  if (rowCells[4]) {
    rowCells[4].title = expense.description || "";
  }
}

function focusEditableCellAtEnd(cell) {
  if (!cell) return;

  cell.focus();

  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(cell);
  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);
}

function startRowEdit(index) {
  if (!isEditMode) {
    isEditMode = true;
    draftExpenses = cloneExpenses(expenses);
    editTableBtn.textContent = "Save";
    cancelTableBtn.classList.remove("inactive");
  }

  renderExpenses();

  requestAnimationFrame(() => {
    const cell = expenseBody.querySelector(
      `td[data-field="expenseName"][data-index="${index}"]`
    );

    focusEditableCellAtEnd(cell);
  });
}

function createExpenseRow(expense, index) {
  const row = document.createElement("tr");
  const lockedClass = !isEditMode ? "locked" : "";
  const editableValue = isEditMode ? "true" : "false";
  const categoryOptions = getCategoryOptions(expense.category);
  const isNewlyAdded = expense.id === newlyAddedExpenseId;

  if (isNewlyAdded) {
    row.classList.add("new-expense-row");
  }

  row.innerHTML = `
    <td
      class="editable title-cell ${lockedClass}"
      data-field="expenseName"
      data-index="${index}"
      contenteditable="${editableValue}"
    >
      <span class="cell-text">${escapeHtml(expense.expenseName)}</span>
    </td>

    <td
      class="editable ${lockedClass}"
      data-field="amount"
      data-index="${index}"
      contenteditable="${editableValue}"
    >
      ${escapeHtml(expense.amount)}
    </td>

    <td class="category-cell ${lockedClass}">
      <select
        class="editable"
        data-field="category"
        data-index="${index}"
        ${!isEditMode ? "disabled" : ""}
      >
        ${categoryOptions}
      </select>
    </td>

    <td
      class="editable date-cell ${lockedClass}"
      data-field="date"
      data-index="${index}"
      contenteditable="${editableValue}"
    >
      ${escapeHtml(formatDateDisplay(expense.date) || "")}
    </td>

   <td
      class="editable description-cell ${lockedClass}"
      data-field="description"
      data-index="${index}"
      contenteditable="${editableValue}"
    >
      ${escapeHtml(expense.description || "")}
    </td>

    <td class="actions-cell">
      <div class="row-actions">
        <button
          class="row-icon-btn edit-row-btn ${isEditMode ? "hidden-edit" : ""}"
          type="button"
          data-action="edit-row"
          data-index="${index}"
          aria-label="Edit expense"
          title="Edit expense"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z"></path>
            <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"></path>
          </svg>
        </button>

       <button
          class="row-icon-btn delete-btn ${!isEditMode ? "hidden-delete" : ""}"
          type="button"
          data-action="delete"
          data-index="${index}"
          aria-label="Delete expense"
          title="Delete expense"
        >
          ×
        </button>
      </div>
    </td>
  `;

  applyRowTooltips(row, expense);
  return row;
}

function renderLoadFailureState() {
  expenseBody.innerHTML = `
    <tr>
      <td colspan="6" class="empty-state-cell">
        Could not load expenses. Please check the server connection.
      </td>
    </tr>
  `;

  document.getElementById("total").textContent = formatCurrency(0);
  document.getElementById("category-totals").innerHTML = "";
  destroyCharts();
  toggleTrendSection(false);
  updatePaginationDisplay(0);
}

// ---------- Database ----------
async function createExpenseInDatabase(expense) {
  const response = await fetch(`${API_BASE}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify(buildExpensePayload(expense))
  });

  if (!response.ok) {
    throw new Error("Failed to create expense");
  }

  return await response.json();
}

async function updateExpenseInDatabase(expense) {
  const response = await fetch(`${API_BASE}/expenses/${expense.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`
    },
    body: JSON.stringify(buildExpensePayload(expense))
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Update expense failed:", response.status, errorText);
    throw new Error(`Failed to update expense: ${response.status}`);
  }

  return await response.json();
}

async function deleteExpenseFromDatabase(id) {
  const response = await fetch(`${API_BASE}/expenses/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to delete expense");
  }

  return await response.json();
}

function commitActiveTableCell() {
  if (!isEditMode) return;

  const cell =
    document.querySelector("#expense-table td.editing") ||
    activeEditCell;

  if (!cell || !cell.isConnected || cell.classList.contains("locked")) return;

  const index = Number(cell.dataset.index);
  const field = cell.dataset.field;

  if (!Number.isInteger(index) || !field) return;

  updateExpense(index, field, cell.innerText, cell);
  cell.classList.remove("editing");
}

async function saveDraftChanges() {
  const savedById = new Map(expenses.map(exp => [exp.id, exp]));
  const draftById = new Map(draftExpenses.map(exp => [exp.id, exp]));

  for (const savedExpense of expenses) {
    if (!draftById.has(savedExpense.id)) {
      await deleteExpenseFromDatabase(savedExpense.id);
    }
  }

  for (const draftExpense of draftExpenses) {
    const savedExpense = savedById.get(draftExpense.id);

    if (savedExpense && isExpenseDifferent(savedExpense, draftExpense)) {
      await updateExpenseInDatabase(draftExpense);
    }
  }

  expenses = cloneExpenses(draftExpenses);
}

async function loadExpenses() {
  try {
    const response = await fetch(`${API_BASE}/expenses`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to load expenses");
    }

    const data = await response.json();
    const rawExpenses = getExpensesArrayFromResponse(data);

    expenses = rawExpenses
      .map(normalizeExpense)
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

    draftExpenses = cloneExpenses(expenses);
    clearStatus();
    renderExpenses();
  } catch (error) {
    console.error("Failed to load expenses:", error);
    showStatus("Could not load saved expenses. Check your server connection and refresh the page.", "error");
    renderLoadFailureState();
  }
}

// ---------- Rendering ----------
function updateCategoryTotals() {
  const container = document.getElementById("category-totals");
  container.innerHTML = "";

  const entries = getSortedCategoryEntries();

  entries.forEach(([category, total]) => {
    const div = document.createElement("div");
    div.className = "category-item";
    div.innerHTML = `
      <span>${escapeHtml(category)}</span>
      <span>${formatCurrency(total)}</span>
    `;
    container.appendChild(div);
  });
}

function renderPieChart() {
  const entries = getSortedCategoryEntries();

  if (entries.length === 0) {
    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }
    return;
  }

  const categoryColors = {
    Food: "#F59E0B",
    Bills: "#10B981",
    Transport: "#3B82F6",
    Leisure: "#EF4444",
    Shopping: "#EC4899"
  };

  const labels = entries.map(([category]) => category);
  const data = entries.map(([, total]) => total);
  const backgroundColor = labels.map(label => categoryColors[label] || "#ccc");

  const ctx = document.getElementById("pieChart");
  if (!ctx) return;

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderWidth: 0
      }]
    },
    plugins: [{
      id: "sliceLabels",
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        const total = data.reduce((sum, value) => sum + value, 0);

        const rootStyles = getComputedStyle(document.documentElement);
        const pieLabelColor = rootStyles.getPropertyValue("--pie-label-color").trim() || "#ffffff";
        const pieLabelFontFamily = rootStyles.getPropertyValue("--pie-label-font-family").trim() || "Inter, Arial, sans-serif";
        const pieLabelFontWeight = rootStyles.getPropertyValue("--pie-label-font-weight").trim() || "700";
        const pieLabelFontSize = parseInt(rootStyles.getPropertyValue("--pie-label-font-size"), 10) || 14;
        const pieLabelFontSizeSmall = parseInt(rootStyles.getPropertyValue("--pie-label-font-size-small"), 10) || 10;

        ctx.save();
        ctx.fillStyle = pieLabelColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        meta.data.forEach((slice, index) => {
          const value = data[index];
          const percentage = total ? (value / total) * 100 : 0;

          const fontSize = percentage < 8 ? pieLabelFontSizeSmall : pieLabelFontSize;
          ctx.font = `${pieLabelFontWeight} ${fontSize}px ${pieLabelFontFamily}`;

          const angle = (slice.startAngle + slice.endAngle) / 2;
          const radius = slice.outerRadius * 0.62;
          const x = slice.x + Math.cos(angle) * radius;
          const y = slice.y + Math.sin(angle) * radius;

          ctx.fillText(`${percentage.toFixed(0)}%`, x, y);
        });

        ctx.restore();
      }
    }],
    options: {
      responsive: true,
      layout: {
        padding: {
          bottom: 18
        }
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 28,
            usePointStyle: false
          }
        },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: () => "",
            label: function(context) {
              return `${context.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      }
    }
  });
}

function renderChart() {
  const monthlyTotals = {};

  expenses.forEach(exp => {
    if (!exp.date || !/^\d{4}-\d{2}-\d{2}$/.test(exp.date)) return;

    const monthKey = exp.date.slice(0, 7);
    const amount = Number(exp.amount);
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + safeAmount;
  });

  const sorted = Object.entries(monthlyTotals).sort(([a], [b]) => a.localeCompare(b));

  const labels = sorted.map(([monthKey]) => {
    const [year, month] = monthKey.split("-").map(Number);
    return new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "short",
      year: "numeric"
    });
  });

  const data = sorted.map(([, total]) => total);

  const average =
    data.length > 0
      ? data.reduce((sum, value) => sum + value, 0) / data.length
      : 0;

  const averageLine = labels.map(() => average);

  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Monthly Spending",
          data,
          borderColor: "#2ecc71",
          backgroundColor: "rgba(54, 227, 112, 0.1)",
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#2ecc71",
          pointBorderColor: "#2ecc71",
          borderWidth: 3
        },
        {
          label: "Average Monthly Spending",
          data: averageLine,
          borderColor: "#EF4444",
          borderDash: [6, 6],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 8,
          right: 6,
          bottom: 8,
          left: 6
        }
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            padding: 18
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          offset: false,
          ticks: {
            padding: 14,
            maxRotation: 0,
            minRotation: 0,
            align: "inner"
          },
          grid: {
            display: false,
            drawBorder: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            padding: 10,
            callback: function(value) {
              return formatCurrency(Number(value));
            }
          },
          grid: {
            drawBorder: false
          }
        }
      }
    }
  });
}

function renderExpenses() {
  expenseBody.innerHTML = "";

  const sourceExpenses = getTableExpenses();
  const filtered = getFilteredExpenses(sourceExpenses, true);
  const savedFiltered = getFilteredExpenses(expenses, false);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedExpenses = filtered.slice(startIndex, endIndex);

  if (expenses.length === 0) {
    expenseBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state-cell">
          No expenses yet
        </td>
      </tr>
    `;

    document.getElementById("total").textContent = formatCurrency(0);
    document.getElementById("category-totals").innerHTML = "";
    destroyCharts();
    toggleTrendSection(false);
    updatePaginationDisplay(0);
    return;
  }

  if (filtered.length === 0) {
    expenseBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state-cell">
          No expenses found
        </td>
      </tr>
    `;

    document.getElementById("total").textContent = formatCurrency(
      savedFiltered.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
    );

    updateCategoryTotals();
    renderChart();
    renderPieChart();
    toggleTrendSection(true);
    updatePaginationDisplay(0);
    return;
  }

  paginatedExpenses.forEach((expense) => {
    const index = sourceExpenses.indexOf(expense);
    const row = createExpenseRow(expense, index);
    expenseBody.appendChild(row);
  });

  document.getElementById("total").textContent = formatCurrency(
    savedFiltered.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  );

  updateCategoryTotals();
  renderChart();
  renderPieChart();
  toggleTrendSection(true);

  const startDisplay = startIndex + 1;
  const endDisplay = Math.min(endIndex, filtered.length);
  updatePaginationDisplay(filtered.length, startDisplay, endDisplay);
}

// ---------- Form validation ----------
function validateAmountLive() {
  const amountRaw = amountInput.value;
  const helper = document.getElementById("amount-helper");

  helper.textContent = "";
  helper.classList.remove("error");
  amountInput.classList.remove("error");

  if (amountRaw === "") return;

  const amount = Number(amountRaw);

  if (isNaN(amount)) {
    helper.textContent = "Please enter a valid number";
    helper.classList.add("error");
    amountInput.classList.add("error");
  } else if (amount <= 0) {
    helper.textContent = "Amount must be greater than 0";
    helper.classList.add("error");
    amountInput.classList.add("error");
  }
}

// ---------- Actions ----------
async function addExpense() {
  if (isEditMode) {
    showStatus("Save or cancel your table edits before adding a new expense.", "error");
    return;
  }

  const expenseName = expenseNameInput.value.trim();
  const amountRaw = amountInput.value;
  const amount = amountRaw === "" ? null : Number(amountRaw);
  const category = categoryInput.value;
  const date = dateInput.value;
  const description = descInput.value.trim();

  expenseNameError.textContent = "";
  amountError.textContent = "";
  dateError.textContent = "";
  descError.textContent = "";

  let hasError = false;

  if (!expenseName) {
    expenseNameError.textContent = "Please enter an expense name";
    expenseNameInput.classList.add("error");
    hasError = true;
  } else {
    expenseNameInput.classList.remove("error");
  }

  if (amountRaw === "" || amount === null) {
    amountError.textContent = "Please enter an expense amount";
    amountInput.classList.add("error");
    hasError = true;
  } else if (isNaN(amount)) {
    amountError.textContent = "Please enter a valid number";
    amountInput.classList.add("error");
    hasError = true;
  } else if (hasInvalidLeadingZero(amountRaw)) {
    amountError.textContent = "Amount cannot start with 0";
    amountInput.classList.add("error");
    hasError = true;
  } else if (amount <= 0) {
    amountError.textContent = "Please enter a valid amount greater than 0";
    amountInput.classList.add("error");
    hasError = true;
  } else {
    amountInput.classList.remove("error");
  }

  if (dateInput.value === "" || dateInput.value == null) {
    dateError.textContent = "Please select a date";
    dateInput.classList.add("error");
    hasError = true;
  } else if (date > getTodayLocalDate()) {
    dateError.textContent = "Date cannot be after today";
    dateInput.classList.add("error");
    hasError = true;
  } else {
    dateInput.classList.remove("error");
  }

  if (!description) {
    descError.textContent = "Please enter a description";
    descInput.classList.add("error");
    hasError = true;
  } else if (description.length > DESCRIPTION_LIMIT) {
    descError.textContent = "Max 70 characters";
    descInput.classList.add("error");
    hasError = true;
  } else {
    descInput.classList.remove("error");
  }

  if (hasError) return;

  try {
    const expenseToSave = {
      expenseName,
      amount,
      category,
      date,
      description
    };

    const createResponse = await createExpenseInDatabase(expenseToSave);
    newlyAddedExpenseId = getCreatedExpenseId(createResponse);
    currentPage = 1;

    await loadExpenses();

    if (newlyAddedExpenseId == null) {
      const matchingExpense = expenses.find(exp =>
        exp.expenseName === expenseName &&
        Number(exp.amount) === Number(amount) &&
        exp.category === category &&
        exp.date === date &&
        exp.description === description
      );

      newlyAddedExpenseId = matchingExpense?.id ?? null;

      if (newlyAddedExpenseId != null) {
        renderExpenses();
      }
    }

    clearStatus();

    if (tableSection) {
      tableSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    if (highlightTimeoutId) {
      clearTimeout(highlightTimeoutId);
    }

    highlightTimeoutId = setTimeout(() => {
      newlyAddedExpenseId = null;
      renderExpenses();
    }, 2800);

    showAppToast("Expense added successfully.");
  } catch (error) {
    console.error("Create failed:", error);
    showStatus("Failed to save expense. Please check the server and try again.", "error");
    return;
  }

  expenseNameInput.value = "";
  amountInput.value = "";
  dateInput.value = "";
  descInput.value = "";
  descCounter.textContent = `0/${DESCRIPTION_LIMIT}`;
  setTodayDate();
}

async function deleteExpense(index) {
  if (isEditMode) {
    draftExpenses.splice(index, 1);
    renderExpenses();
    return;
  }

  try {
    const expenseId = expenses[index].id;
    await deleteExpenseFromDatabase(expenseId);
    expenses.splice(index, 1);
    draftExpenses = cloneExpenses(expenses);
    clearStatus();
    renderExpenses();
    showAppToast("Expense deleted successfully.");
  } catch (error) {
    console.error("Delete failed:", error);
    showStatus("Failed to delete expense from the database.", "error");
  }
}

function updateExpense(index, field, value, el = null) {
  if (!isEditMode) return;

  const targetExpenses = draftExpenses;
  value = value.trim();

  if (field === "date") {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!match) {
      if (el) el.innerText = formatDateDisplay(targetExpenses[index].date || "");
      return;
    }

    const [, month, day, year] = match;
    const isoDate = `${year}-${month}-${day}`;

    if (!isValidDate(isoDate)) {
      targetExpenses[index].dateError = "Invalid calendar date";
      if (el) el.innerText = formatDateDisplay(targetExpenses[index].date || "");
      return;
    }

    targetExpenses[index].dateError = "";
    targetExpenses[index].date = isoDate;

    if (el) {
      el.innerText = formatDateDisplay(isoDate);
    }

    return;
  }

  if (field === "amount") {
    const previousValue = targetExpenses[index].amount.toString();

    if (hasInvalidLeadingZero(value)) {
      if (el) el.innerText = previousValue;
      return;
    }

    const isValid = /^\d+(\.\d{1,2})?$/.test(value);

    if (!isValid) {
      if (el) el.innerText = previousValue;
      return;
    }

    const numericValue = Number(value);

    if (numericValue <= 0 || isNaN(numericValue)) {
      if (el) el.innerText = previousValue;
      return;
    }

    targetExpenses[index].amount = numericValue;

    if (el) {
      el.innerText = String(numericValue);
    }

    return;
  }

  if (field === "description") {
    const limitedValue = value.slice(0, DESCRIPTION_LIMIT);
    targetExpenses[index].description = limitedValue;

    if (el && el.innerText !== limitedValue) {
      el.innerText = limitedValue;
      focusEditableCellAtEnd(el);
    }

    return;
  }

  targetExpenses[index][field] = value;
}

function resetDashboardView() {
  currentFilter = "All";
  currentSort = "added-desc";
  currentMonthFilter = "All";
  currentSearch = "";
  pendingSearch = "";
  currentPage = 1;
  draftExpenses = cloneExpenses(expenses);
  isEditMode = false;

  if (expenseSearchInput) {
    expenseSearchInput.value = "";
  }

  if (searchIconBtn) {
    searchIconBtn.disabled = true;
  }

  editTableBtn.textContent = "Edit";
  cancelTableBtn.classList.add("inactive");

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.category === "All") {
      btn.classList.add("active");
    }
  });

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.value = "added-desc";
  }

  if (monthFilterInput) {
    monthFilterInput.value = "";
    syncMonthFilterState();
  }

  expenseNameInput.value = "";
  amountInput.value = "";
  descInput.value = "";
  descCounter.textContent = `0/${DESCRIPTION_LIMIT}`;

  expenseNameError.textContent = "";
  amountError.textContent = "";
  dateError.textContent = "";
  descError.textContent = "";

  expenseNameInput.classList.remove("error");
  amountInput.classList.remove("error");
  dateInput.classList.remove("error");
  descInput.classList.remove("error");

  const amountHelper = document.getElementById("amount-helper");
  if (amountHelper) {
    amountHelper.textContent = "";
    amountHelper.classList.remove("error");
  }

  clearStatus();
  setTodayDate();
  renderExpenses();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function logout() {
  isLoggedIn = false;
  clearStatus();
  renderAuthState();
  showAppToast("Logged out successfully.");
}

// ---------- Table event delegation ----------
function handleTableFocusIn(event) {
  const cell = event.target.closest("td[data-field]");
  if (!cell || cell.classList.contains("locked")) return;

  activeEditCell = cell;
  cell.classList.add("editing");
}

function handleTableFocusOut(event) {
  const cell = event.target.closest("td[data-field]");
  if (!cell || cell.classList.contains("locked")) return;
  if (cell.contains(event.relatedTarget)) return;

  cell.classList.remove("editing");

  const index = Number(cell.dataset.index);
  const field = cell.dataset.field;
  const value = cell.innerText;

  if (field === "amount" || field === "date") {
    updateExpense(index, field, value, cell);
  } else {
    updateExpense(index, field, value);
  }
}

function handleTableChange(event) {
  const select = event.target.closest("select[data-field='category']");
  if (!select) return;

  const index = Number(select.dataset.index);
  updateExpense(index, "category", select.value);
}

function handleTableInput(event) {
  const cell = event.target.closest("td[data-field='description']");
  if (!cell || cell.classList.contains("locked")) return;

  let value = cell.innerText.replace(/\n/g, " ");

  if (value.length > DESCRIPTION_LIMIT) {
    value = value.slice(0, DESCRIPTION_LIMIT);
    cell.innerText = value;
    focusEditableCellAtEnd(cell);
  }

  const index = Number(cell.dataset.index);

  if (Number.isInteger(index)) {
    draftExpenses[index].description = value;
  }
}

function handleTableClick(event) {
  const editButton = event.target.closest("button[data-action='edit-row']");
  if (editButton) {
    if (isEditMode || editButton.disabled) return;
  
    const index = Number(editButton.dataset.index);
    startRowEdit(index);
    return;
  }

  const deleteButton = event.target.closest("button[data-action='delete']");
  if (deleteButton) {
    const index = Number(deleteButton.dataset.index);
    deleteExpense(index);
  }
}

function closeUsernameMenuOnOutsideClick(event) {
  if (!usernameWrapper) return;

  const profile = document.querySelector(".profile");

  if (profile && profile.contains(event.target)) return;

  usernameWrapper.classList.remove("active");
  usernameWrapper.setAttribute("aria-expanded", "false");
}

// ---------- Static event binding ----------
function bindEvents() {
  addBtn.addEventListener("click", addExpense);

  expenseNameInput.addEventListener("input", () => {
    expenseNameError.textContent = "";
    expenseNameInput.classList.remove("error");
  });

  amountInput.addEventListener("input", () => {
    const raw = amountInput.value.trim();
    const helper = document.getElementById("amount-helper");

    amountError.textContent = "";
    amountInput.classList.remove("error");
    helper.textContent = "";
    helper.classList.remove("error");

    if (hasInvalidLeadingZero(raw)) {
      amountInput.value = "";
      helper.textContent = "Amount cannot start with 0";
      helper.classList.add("error");
      amountInput.classList.add("error");
      return;
    }

    validateAmountLive();
  });

  descInput.addEventListener("input", () => {
    descInput.classList.remove("error");

    const length = descInput.value.length;
    descCounter.textContent = `${length}/${DESCRIPTION_LIMIT}`;

    if (length >= DESCRIPTION_LIMIT) {
      descError.textContent = "Max 70 characters";
    } else {
      descError.textContent = "";
    }
  });

  const appToastCloseBtn = document.getElementById("app-toast-close");
  if (appToastCloseBtn) {
    appToastCloseBtn.addEventListener("click", hideAppToast);
  }

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentFilter = btn.dataset.category;
      currentPage = 1;
      renderExpenses();
    });
  });

  document.getElementById("sort-select").addEventListener("change", (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    renderExpenses();
  });

  monthFilterInput.addEventListener("change", (e) => {
    currentMonthFilter = e.target.value || "All";
    currentPage = 1;
    syncMonthFilterState();
    renderExpenses();
  });

  clearMonthBtn.addEventListener("click", () => {
    currentMonthFilter = "All";
    monthFilterInput.value = "";
    currentPage = 1;
    syncMonthFilterState();
    renderExpenses();
  });

  editTableBtn.addEventListener("click", async () => {
    if (!isEditMode) {
      isEditMode = true;
      draftExpenses = cloneExpenses(expenses);
      activeEditCell = null;
      editTableBtn.textContent = "Save";
      cancelTableBtn.classList.remove("inactive");
      renderExpenses();
      return;
    }
  
    try {
      commitActiveTableCell();
  
      await saveDraftChanges();
  
      isEditMode = false;
      activeEditCell = null;
      editTableBtn.textContent = "Edit";
      cancelTableBtn.classList.add("inactive");
  
      await loadExpenses();
  
      clearStatus();
      showAppToast("Changes saved successfully.");
    } catch (error) {
      console.error("Save failed:", error);
      showStatus("Failed to save table changes. Please try again.", "error");
    }
  });

  cancelTableBtn.addEventListener("click", () => {
    draftExpenses = cloneExpenses(expenses);
    isEditMode = false;
    editTableBtn.textContent = "Edit";
    cancelTableBtn.classList.add("inactive");
    clearStatus();
    renderExpenses();
  });

  expenseSearchInput.addEventListener("input", (e) => {
    pendingSearch = e.target.value.trim().toLowerCase();

    if (searchIconBtn) {
      searchIconBtn.disabled = pendingSearch === "";
    }

    if (pendingSearch === "") {
      currentSearch = "";
      currentPage = 1;
      renderExpenses();
    }
  });

  if (searchIconBtn) {
    searchIconBtn.addEventListener("click", () => {
      currentSearch = pendingSearch;
      currentPage = 1;
      renderExpenses();
      expenseSearchInput.focus();
    });
  }

  expenseSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      currentSearch = pendingSearch;
      currentPage = 1;
      renderExpenses();
    }
  });

  dateInput.addEventListener("input", () => {
    const value = dateInput.value;
    const today = getTodayLocalDate();

    dateError.textContent = "";
    dateInput.classList.remove("error");

    if (!value) {
      dateError.textContent = "Please select a valid date";
      dateInput.classList.add("error");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      dateError.textContent = "Use format YYYY-MM-DD";
      dateInput.classList.add("error");
      return;
    }

    const date = new Date(`${value}T00:00:00`);

    if (
      date.getFullYear() !== Number(value.slice(0, 4)) ||
      date.getMonth() + 1 !== Number(value.slice(5, 7)) ||
      date.getDate() !== Number(value.slice(8, 10))
    ) {
      dateError.textContent = "Please enter a valid calendar date";
      dateInput.classList.add("error");
      return;
    }

    if (value > today) {
      dateError.textContent = "Date cannot be after today";
      dateInput.classList.add("error");
      return;
    }

    dateError.textContent = "";
    dateInput.classList.remove("error");
  });

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderExpenses();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      currentPage++;
      renderExpenses();
    });
  }

  if (brandHome) {
    brandHome.addEventListener("click", resetDashboardView);
  }

  if (usernameWrapper) {
    usernameWrapper.addEventListener("click", () => {
      if (!isLoggedIn) {
        showAppToast("Login flow is not connected in this preview.");
        return;
      }
  
      const expanded = usernameWrapper.getAttribute("aria-expanded") === "true";
      usernameWrapper.setAttribute("aria-expanded", String(!expanded));
      usernameWrapper.classList.toggle("active");
    });
  
    usernameWrapper.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        usernameWrapper.click();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  if (expenseBody) {
    expenseBody.addEventListener("focusin", handleTableFocusIn);
    expenseBody.addEventListener("focusout", handleTableFocusOut);
    expenseBody.addEventListener("input", handleTableInput);
    expenseBody.addEventListener("change", handleTableChange);
    expenseBody.addEventListener("click", handleTableClick);
  }

  document.addEventListener("focusout", (e) => {
    const cell = e.target.closest("td[data-field]");
    if (cell) {
      cell.classList.remove("editing");
    }
  });

  document.addEventListener("click", closeUsernameMenuOnOutsideClick);

  window.addEventListener("scroll", handleHeaderFade);
}

function handleHeaderFade() {
  const header = document.querySelector(".header-full");
  if (!header) return;

  if (window.scrollY > 12) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
}

// ---------- Init ----------
bindEvents();
handleHeaderFade();
cancelTableBtn.classList.add("inactive");
editTableBtn.textContent = "Edit";

if (searchIconBtn) {
  searchIconBtn.disabled = true;
}

setTodayDate();
syncMonthFilterState();
renderAuthState();
loadExpenses();