let expenses = [];
const API_BASE = "";
let categoryChart = null;
let pieChart = null;
let currentFilter = "All";
let currentSort = "date-desc";
let currentMonthFilter = "All";

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

async function loadExpenses() {
  try {
    const response = await fetch(`${API_BASE}/expenses`);
    const data = await response.json();

    expenses = data.map(exp => ({
      ...exp,
      dateError: ""
    }));

    renderExpenses();
  } catch (error) {
    console.error("Failed to load expenses:", error);
  }
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

async function createExpenseInDatabase(expense) {
  const response = await fetch(`${API_BASE}/expenses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildExpensePayload(expense))
  });

  if (!response.ok) {
    throw new Error("Failed to update expense");
  }

  return await response.json();
}

async function deleteExpenseFromDatabase(id) {
  const response = await fetch(`${API_BASE}/expenses/${id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to delete expense");
  }

  return await response.json();
}

// Event listeners
addBtn.addEventListener("click", addExpense);

// Clear name error as user types in name
expenseNameInput.addEventListener("input", () => {
  expenseNameError.textContent = "";
  expenseNameInput.classList.remove("error");
});

// Clear amount error + live validation as user types in amount
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
  descCounter.textContent = `${length}/70`;

  if (length >= 70) {
    descError.textContent = "Max 70 characters";
  } else {
    descError.textContent = "";
  }
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentFilter = btn.dataset.category;

    renderExpenses();
  });
});

document.getElementById("sort-select").addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderExpenses();
});

monthFilterInput.addEventListener("change", (e) => {
  currentMonthFilter = e.target.value || "All";
  syncMonthFilterState();
  renderExpenses();
});

clearMonthBtn.addEventListener("click", () => {
  currentMonthFilter = "All";
  monthFilterInput.value = "";
  syncMonthFilterState();
  renderExpenses();
});

function getTodayLocalDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

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

  const date = new Date(value);

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

function hasInvalidLeadingZero(value) {
  return /^0\d/.test(value.trim());
}

async function addExpense() {
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

  // NAME validation
  if (!expenseName) {
    expenseNameError.textContent = "Please enter an expense name";
    expenseNameInput.classList.add("error");
    hasError = true;
  } else {
    expenseNameInput.classList.remove("error");
  }

  // AMOUNT validation
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

  // DATE validation
  if (dateInput.value === "" || dateInput.value == null) {
    dateError.textContent = "Please select a date";
    dateInput.classList.add("error");
    hasError = true;
  } else {
    dateInput.classList.remove("error");
  }

  // DESCRIPTION
  if (!description) {
    descError.textContent = "Please enter a description";
    descInput.classList.add("error");
    hasError = true;
  } else if (description.length > 70) {
    descError.textContent = "Max 70 characters";
    descInput.classList.add("error");
    hasError = true;
  } else {
    descInput.classList.remove("error");
  }

  if (hasError) return;

  try {
    const newExpense = await createExpenseInDatabase({
      expenseName,
      amount,
      category,
      date,
      description
    });

    expenses.push({ ...newExpense, dateError: "" });
    renderExpenses();
  } catch (error) {
    console.error("Create failed:", error);
    alert("Failed to save expense to database");
    return;
  }

  // Clear inputs
  expenseNameInput.value = "";
  amountInput.value = "";
  dateInput.value = "";
  descInput.value = "";
  descCounter.textContent = "0/70";

  setTodayDate();
}

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
  } else {
    amountInput.classList.remove("error");
  }
}

function renderExpenses() {
  const body = document.getElementById("expense-body");
  body.innerHTML = "";

  let filtered = [...expenses];

// MONTH FILTER
if (currentMonthFilter !== "All") {
  filtered = filtered.filter(exp => exp.date && exp.date.slice(0, 7) === currentMonthFilter);
}

// CATEGORY FILTER
if (currentFilter !== "All") {
  filtered = filtered.filter(exp => exp.category === currentFilter);
}

// SORT
filtered.sort((a, b) => {
  switch (currentSort) {
    case "amount-asc":
      return a.amount - b.amount;

    case "amount-desc":
      return b.amount - a.amount;

    case "name-asc":
      return a.expenseName.localeCompare(b.expenseName);

    case "name-desc":
      return b.expenseName.localeCompare(a.expenseName);

    case "date-asc":
      return new Date(a.date) - new Date(b.date);

    case "date-desc":
    default:
      return new Date(b.date) - new Date(a.date);
  }
});

  if (expenses.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state-cell">
          No expenses yet
        </td>
      </tr>
    `;

    document.getElementById("total").textContent = formatCurrency(0);
    document.getElementById("category-totals").innerHTML = "";

    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }

    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }

    const trendSection = document.querySelector(".trend-section");
    if (trendSection) {
      trendSection.style.display = "none";
    }

    return;
  }

  if (filtered.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state-cell">
          No expenses found for this filter
        </td>
      </tr>
    `;

    return;
  }

  let total = 0;

  filtered.forEach((expense) => {
    const index = expenses.indexOf(expense);
    total += expense.amount;

    const row = document.createElement("tr");

    const categoryOptions = Array.from(categoryInput.options)
      .map(opt => `<option value="${opt.value}" ${opt.value === expense.category ? "selected" : ""}>${opt.text}</option>`)
      .join("");

    row.innerHTML = `
      <td class="editable"
          contenteditable="true"
          onfocus="this.classList.add('editing')"
          onblur="this.classList.remove('editing'); updateExpense(${index}, 'expenseName', this.innerText)">
        ${expense.expenseName}
      </td>

      <td class="editable"
          contenteditable="true"
          onfocus="this.classList.add('editing')"
          onblur="this.classList.remove('editing'); updateExpense(${index}, 'amount', this.innerText, this)">
        ${expense.amount}
      </td>

      <td class="category-cell">
        <select class="editable"
                onchange="updateExpense(${index}, 'category', this.value)">
          ${categoryOptions}
        </select>
      </td>

      <td class="editable date-cell" contenteditable="true"
        onblur="updateExpense(${index}, 'date', this.innerText, this)">${expense.date || ""}
      </td>

      <td class="editable"
          contenteditable="true"
          onblur="updateExpense(${index}, 'description', this.innerText)">
        ${expense.description || ""}
      </td>

      <td>
        <button class="delete-btn" onclick="deleteExpense(${index})">×</button>
      </td>
    `;

    body.appendChild(row);
  });

  const trendSection = document.querySelector(".trend-section");
  if (trendSection) {
    trendSection.style.display = "block";
  }

  document.getElementById("total").textContent = formatCurrency(total);
  updateCategoryTotals();
  renderChart();
  renderPieChart();
}

function getCategoryTotals() {
  const totals = {};

  expenses.forEach(exp => {
    if (!totals[exp.category]) {
      totals[exp.category] = 0;
    }
    totals[exp.category] += exp.amount;
  });

  return totals;
}

function getSortedCategoryEntries() {
  const totals = {};

  expenses.forEach(exp => {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  });

  let entries = Object.entries(totals);

  // sort highest to lowest
  entries.sort((a, b) => b[1] - a[1]);

  // if filtered, move selected category to the front
  if (currentFilter !== "All") {
    const selectedIndex = entries.findIndex(([category]) => category === currentFilter);

    if (selectedIndex > -1) {
      const [selectedEntry] = entries.splice(selectedIndex, 1);
      entries.unshift(selectedEntry);
    }
  }

  return entries;
}

function syncMonthFilterState() {
  if (monthFilterInput.value) {
    monthFilterInput.classList.add("has-value");
  } else {
    monthFilterInput.classList.remove("has-value");
  }
}

function updateCategoryTotals() {
  const container = document.getElementById("category-totals");
  container.innerHTML = "";

  const entries = getSortedCategoryEntries();

  entries.forEach(([category, total]) => {
    const div = document.createElement("div");
    div.className = "category-item";

    div.innerHTML = `
      <span>${category}</span>
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

function formatCurrency(amount) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

async function deleteExpense(index) {
  try {
    const expenseId = expenses[index].id;

    await deleteExpenseFromDatabase(expenseId);
    expenses.splice(index, 1);
    renderExpenses();
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete expense from database");
  }
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);

  if (year > 2026) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(value);

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function placeCursorAtEnd(el) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

async function updateExpense(index, field, value, el = null) {
  value = value.trim();

  if (field === "date") {
    const trimmed = value;

    if (!/^\d{0,4}(-\d{0,2}){0,2}$/.test(trimmed)) {
      if (el) el.innerText = expenses[index].date || "";
      return;
    }

    if (trimmed.length === 10 && !isValidDate(trimmed)) {
      expenses[index].dateError = "Invalid calendar date";

      if (el) {
        el.innerText = expenses[index].date || "";
      }

      renderExpenses();
      return;
    }

    expenses[index].dateError = "";
    expenses[index].date = trimmed;

    try {
      await updateExpenseInDatabase(expenses[index]);
      renderExpenses();
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update expense in database");
    }

    return;
  }

  if (field === "amount") {
    const elValue = value.trim();
    const previousValue = expenses[index].amount.toString();

    if (hasInvalidLeadingZero(elValue)) {
      if (el) el.innerText = previousValue;
      return;
    }

    const isValid = /^\d+(\.\d{1,2})?$/.test(elValue);

    if (!isValid) {
      if (el) el.innerText = previousValue;
      return;
    }

    const numericValue = Number(elValue);

    if (numericValue <= 0 || isNaN(numericValue)) {
      if (el) el.innerText = previousValue;
      return;
    }

    expenses[index].amount = numericValue;

    if (el) {
      el.innerText = String(numericValue);
    }

    try {
      await updateExpenseInDatabase(expenses[index]);
      renderExpenses();
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update expense in database");
    }

    return;
  }

  expenses[index][field] = value;

  try {
    await updateExpenseInDatabase(expenses[index]);
    renderExpenses();
  } catch (error) {
    console.error("Update failed:", error);
    alert("Failed to update expense in database");
  }
}

function updateTotalsOnly() {
  let total = 0;

  expenses.forEach(exp => {
    total += exp.amount;
  });

  document.getElementById("total").textContent = formatCurrency(total);

  updateCategoryTotals();
  renderChart();
}

function renderChart() {
  const monthlyTotals = {};

  expenses.forEach(exp => {
    if (!exp.date) return;

    const date = new Date(exp.date);

    const monthKey = date.toLocaleString("en-US", {
      month: "short",
      year: "numeric"
    });

    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + exp.amount;
  });

  const sorted = Object.entries(monthlyTotals).sort((a, b) => {
    return new Date(a[0]) - new Date(b[0]);
  });

  const labels = sorted.map(item => item[0]);
  const data = sorted.map(item => item[1]);

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

const usernameWrapper = document.querySelector(".username-wrapper");
const profile = document.querySelector(".profile");

usernameWrapper.addEventListener("click", function () {
  this.classList.toggle("active");
});

profile.addEventListener("mouseleave", () => {
  usernameWrapper.classList.remove("active");
});

function logout() {
  alert("Logged out");
}

document.addEventListener("focusout", (e) => {
  if (e.target.classList.contains("editable")) {
    e.target.classList.remove("editing");
  }
});

function setTodayDate() {
  const today = getTodayLocalDate();
  dateInput.max = today;
  dateInput.value = today;
  dateInput.classList.add("has-value");
}

function resetDashboardView() {
  // reset table controls
  currentFilter = "All";
  currentSort = "date-desc";
  currentMonthFilter = "All";

  // reset filter buttons
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.remove("active");
    if (btn.dataset.category === "All") {
      btn.classList.add("active");
    }
  });

  // reset sort + month controls
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.value = "date-desc";
  }

  if (monthFilterInput) {
    monthFilterInput.value = "";
    syncMonthFilterState();
  }

  // reset form inputs
  expenseNameInput.value = "";
  amountInput.value = "";
  descInput.value = "";
  descCounter.textContent = "0/70";

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

  setTodayDate();
  renderExpenses();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
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

window.addEventListener("scroll", handleHeaderFade);
handleHeaderFade();

setTodayDate();
syncMonthFilterState();
loadExpenses();