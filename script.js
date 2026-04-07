let expenses = [];
let draftExpenses = [];
const API_BASE = "";

let categoryChart = null;
let pieChart = null;
let currentFilter = "All";
let currentSort = "date-desc";
let currentMonthFilter = "All";
let currentSearch = "";
let pendingSearch = "";
let currentPage = 1;
const rowsPerPage = 10;
let isEditMode = false;

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

function cloneExpenses(expenseList) {
  return expenseList.map(exp => ({ ...exp }));
}

function getTableExpenses() {
  return isEditMode ? draftExpenses : expenses;
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
      exp.expenseName.toLowerCase().includes(currentSearch)
    );
  }

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

  return filtered;
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

function isExpenseDifferent(a, b) {
  return (
    a.expenseName !== b.expenseName ||
    a.category !== b.category ||
    Number(a.amount) !== Number(b.amount) ||
    a.date !== b.date ||
    a.description !== b.description
  );
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
    const response = await fetch(`${API_BASE}/expenses`);
    const data = await response.json();

    expenses = data.map(exp => ({
      ...exp,
      dateError: ""
    }));

    draftExpenses = cloneExpenses(expenses);
    renderExpenses();
  } catch (error) {
    console.error("Failed to load expenses:", error);
  }
}

// Event listeners
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
    editTableBtn.textContent = "Save";
    cancelTableBtn.classList.remove("inactive");
    renderExpenses();
    return;
  }

  try {
    await saveDraftChanges();
    isEditMode = false;
    editTableBtn.textContent = "Edit";
    cancelTableBtn.classList.add("inactive");
    draftExpenses = cloneExpenses(expenses);
    renderExpenses();
  } catch (error) {
    console.error("Save failed:", error);
    alert("Failed to save changes");
  }
});

cancelTableBtn.addEventListener("click", () => {
  draftExpenses = cloneExpenses(expenses);
  isEditMode = false;
  editTableBtn.textContent = "Edit";
  cancelTableBtn.classList.add("inactive");
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

function hasInvalidLeadingZero(value) {
  return /^0\d/.test(value.trim());
}

async function addExpense() {
  if (isEditMode) {
    alert("Save or cancel your table edits before adding a new expense.");
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

    const normalized = { ...newExpense, dateError: "" };
    expenses.push(normalized);
    draftExpenses = cloneExpenses(expenses);
    currentPage = 1;
    renderExpenses();
  } catch (error) {
    console.error("Create failed:", error);
    alert("Failed to save expense to database");
    return;
  }

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

    if (pageIndicator) pageIndicator.textContent = "0-0 of 0";
    if (prevPageBtn) prevPageBtn.disabled = true;
    if (nextPageBtn) nextPageBtn.disabled = true;

    return;
  }

  if (filtered.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state-cell">
          No expenses found
        </td>
      </tr>
    `;

    document.getElementById("total").textContent = formatCurrency(
      savedFiltered.reduce((sum, exp) => sum + exp.amount, 0)
    );
    updateCategoryTotals();
    renderChart();
    renderPieChart();

    if (pageIndicator) pageIndicator.textContent = "Page 1 of 1";
    if (prevPageBtn) prevPageBtn.disabled = true;
    if (nextPageBtn) nextPageBtn.disabled = true;

    return;
  }

  paginatedExpenses.forEach((expense) => {
    const index = sourceExpenses.indexOf(expense);
    const categoryOptions = Array.from(categoryInput.options)
      .map(opt => `<option value="${opt.value}" ${opt.value === expense.category ? "selected" : ""}>${opt.text}</option>`)
      .join("");

    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="editable title-cell ${!isEditMode ? "locked" : ""}"
          contenteditable="${isEditMode}"
          onfocus="if(${isEditMode}) this.classList.add('editing')"
          onblur="this.classList.remove('editing'); if(${isEditMode}) updateExpense(${index}, 'expenseName', this.innerText)">
        <span class="cell-text">${expense.expenseName}</span>
      </td>

      <td class="editable ${!isEditMode ? "locked" : ""}"
          contenteditable="${isEditMode}"
          onfocus="if(${isEditMode}) this.classList.add('editing')"
          onblur="this.classList.remove('editing'); if(${isEditMode}) updateExpense(${index}, 'amount', this.innerText, this)">
        ${expense.amount}
      </td>

      <td class="category-cell ${!isEditMode ? "locked" : ""}">
        <select class="editable"
                ${!isEditMode ? "disabled" : ""}
                onchange="updateExpense(${index}, 'category', this.value)">
          ${categoryOptions}
        </select>
      </td>

      <td class="editable date-cell ${!isEditMode ? "locked" : ""}"
          contenteditable="${isEditMode}"
          onfocus="if(${isEditMode}) this.classList.add('editing')"
          onblur="this.classList.remove('editing'); if(${isEditMode}) updateExpense(${index}, 'date', this.innerText, this)">
        ${formatDateDisplay(expense.date) || ""}
      </td>

      <td class="editable ${!isEditMode ? "locked" : ""}"
          contenteditable="${isEditMode}"
          onfocus="if(${isEditMode}) this.classList.add('editing')"
          onblur="this.classList.remove('editing'); if(${isEditMode}) updateExpense(${index}, 'description', this.innerText)">
        ${expense.description || ""}
      </td>

      <td>
        <button class="delete-btn ${!isEditMode ? "hidden-delete" : ""}" onclick="deleteExpense(${index})">×</button>
      </td>
    `;

    body.appendChild(row);
  });

  const trendSection = document.querySelector(".trend-section");
  if (trendSection) {
    trendSection.style.display = "block";
  }

  document.getElementById("total").textContent = formatCurrency(
    savedFiltered.reduce((sum, exp) => sum + exp.amount, 0)
  );
  updateCategoryTotals();
  renderChart();
  renderPieChart();

  const startDisplay = filtered.length === 0 ? 0 : startIndex + 1;
  const endDisplay = filtered.length === 0 ? 0 : Math.min(endIndex, filtered.length);

  if (pageIndicator) {
    pageIndicator.textContent = `${startDisplay}-${endDisplay} of ${filtered.length}`;
  }

  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = endDisplay >= filtered.length || filtered.length === 0;
}

function getSortedCategoryEntries() {
  const totals = {};

  expenses.forEach(exp => {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
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
    renderExpenses();
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete expense from database");
  }
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const today = getTodayLocalDate();

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (value > today) return false;

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

function updateExpense(index, field, value, el = null) {
  if (!isEditMode) return;

  const targetExpenses = draftExpenses;
  value = value.trim();

  if (field === "date") {
    const trimmed = value;

    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!match) {
      if (el) el.innerText = formatDateDisplay(targetExpenses[index].date || "");
      return;
    }

    const [, month, day, year] = match;
    const isoDate = `${year}-${month}-${day}`;

    if (!isValidDate(isoDate)) {
      targetExpenses[index].dateError = "Invalid calendar date";
      if (el) el.innerText = formatDateDisplay(targetExpenses[index].date || "");
      renderExpenses();
      return;
    }

    targetExpenses[index].dateError = "";
    targetExpenses[index].date = isoDate;
    renderExpenses();
    return;
  }

  if (field === "amount") {
    const elValue = value.trim();
    const previousValue = targetExpenses[index].amount.toString();

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

    targetExpenses[index].amount = numericValue;

    if (el) {
      el.innerText = String(numericValue);
    }

    renderExpenses();
    return;
  }

  targetExpenses[index][field] = value;
  renderExpenses();
}

function updateTotalsOnly() {
  const filtered = getFilteredExpenses(expenses, false);
  const total = filtered.reduce((sum, exp) => sum + exp.amount, 0);

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
  currentFilter = "All";
  currentSort = "date-desc";
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
    sortSelect.value = "date-desc";
  }

  if (monthFilterInput) {
    monthFilterInput.value = "";
    syncMonthFilterState();
  }

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

cancelTableBtn.classList.add("inactive");
editTableBtn.textContent = "Edit";

if (searchIconBtn) {
  searchIconBtn.disabled = true;
}

setTodayDate();
syncMonthFilterState();
loadExpenses();