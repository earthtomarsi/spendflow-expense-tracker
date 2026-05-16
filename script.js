let expenses = [];
let draftExpenses = [];

const API_BASE = "http://localhost:3000";
const AUTH_TOKEN = "PASTE_YOUR_CURRENT_JWT_TOKEN_HERE";

let categoryChart = null;
let pieChart = null;
let currentFilter = "All";
let currentSort = "added-desc";
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
let dateManualInput = document.getElementById("date-manual");
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
const filterMenu = document.getElementById("filter-menu");
const sortMenu = document.getElementById("sort-menu");
const sortMenuLabel = document.getElementById("sort-menu-label");
const monthMenu = document.getElementById("month-menu");
const monthMenuPanel = document.getElementById("month-menu-panel");
const monthMenuLabel = document.getElementById("month-menu-label");
const datePicker = document.getElementById("date-picker");
const dateTrigger = document.getElementById("date-trigger");
const dateTriggerLabel = document.getElementById("date-trigger-label");
const datePickerGrid = document.getElementById("date-picker-grid");
const datePickerMonthLabel = document.getElementById("date-picker-month-label");
const datePrevMonthBtn = document.getElementById("date-prev-month");
const dateNextMonthBtn = document.getElementById("date-next-month");
const datePickerTodayBtn = document.getElementById("date-picker-today");
let datePickerViewDate = null;
let addExpenseCategoryMenu = null;
let addExpenseCategoryMenuLabel = null;

/**
 * Ensures the Add Expense date field has a visible typed input.
 *
 * Older HTML versions only had the hidden #date value and custom calendar
 * button. This creates #date-manual when it is missing, so users can type
 * MM/DD/YYYY while the backend still receives YYYY-MM-DD from #date.
 */
function ensureTypedDateInput() {
  if (!dateInput) return;

  const fieldGroup =
    dateInput.closest(".date-field-group") ||
    datePicker?.closest(".date-field-group") ||
    dateInput.parentElement;

  if (!fieldGroup) return;

  // Keep #date as the hidden ISO field used by validation and the backend.
  dateInput.type = "hidden";

  let shell = fieldGroup.querySelector(".date-input-shell");

  if (!shell) {
    shell = document.createElement("div");
    shell.className = "date-input-shell";

    const insertBeforeTarget =
      document.getElementById("date-helper") ||
      document.getElementById("date-error") ||
      null;

    fieldGroup.insertBefore(shell, insertBeforeTarget);
  }

  if (!dateManualInput) {
    dateManualInput = document.createElement("input");
    dateManualInput.id = "date-manual";
    dateManualInput.className = "date-manual-input";
    dateManualInput.type = "text";
    dateManualInput.inputMode = "numeric";
    dateManualInput.autocomplete = "off";
    dateManualInput.placeholder = "MM/DD/YYYY";
    dateManualInput.setAttribute("aria-describedby", "date-helper date-error");
  }

  if (dateManualInput.parentElement !== shell) {
    shell.insertBefore(dateManualInput, shell.firstChild);
  }

  if (datePicker && datePicker.parentElement !== shell) {
    shell.appendChild(datePicker);
  }
}


/**
 * Builds a custom dropdown for the Add Expense category field.
 *
 * The native #category select is kept hidden for form logic and backend values,
 * while the custom dropdown visually matches the Filter, Sort, Month, and
 * Logout menus.
 */
function ensureAddExpenseCategoryMenu() {
  if (!categoryInput || addExpenseCategoryMenu) return;

  const fieldGroup = categoryInput.closest(".field-group") || categoryInput.parentElement;
  if (!fieldGroup) return;

  const nativeWrapper = categoryInput.closest(".select-wrapper");

  // Hide the original native select UI, including its old arrow wrapper.
  // The original #category value is still used by addExpense() and the backend.
  categoryInput.classList.add("native-control-hidden", "add-expense-category-native");
  categoryInput.setAttribute("aria-hidden", "true");
  categoryInput.tabIndex = -1;

  if (nativeWrapper) {
    nativeWrapper.classList.add("add-expense-category-hidden-wrapper");
  }

  const details = document.createElement("details");
  details.id = "add-expense-category-menu";
  details.className = "toolbar-menu add-expense-category-menu";

  details.innerHTML = `
    <summary class="toolbar-button add-expense-category-trigger" aria-label="Choose category">
      <span id="add-expense-category-label">Category</span>
      <span class="toolbar-chevron" aria-hidden="true">›</span>
    </summary>
    <div class="toolbar-menu-panel add-expense-category-panel"></div>
  `;

  if (nativeWrapper && nativeWrapper.parentElement === fieldGroup) {
    fieldGroup.insertBefore(details, nativeWrapper);
  } else if (categoryInput.parentElement === fieldGroup) {
    fieldGroup.insertBefore(details, categoryInput);
  } else {
    fieldGroup.appendChild(details);
  }

  addExpenseCategoryMenu = details;
  addExpenseCategoryMenuLabel = details.querySelector("#add-expense-category-label");

  buildAddExpenseCategoryOptions();
  syncAddExpenseCategoryMenu();
}


/**
 * Rebuilds custom category options from the native #category select.
 * This keeps both controls in sync if the original select options change later.
 */
function buildAddExpenseCategoryOptions() {
  if (!categoryInput || !addExpenseCategoryMenu) return;

  const panel = addExpenseCategoryMenu.querySelector(".add-expense-category-panel");
  if (!panel) return;

  panel.innerHTML = Array.from(categoryInput.options)
    .map(option => `
      <button
        class="add-expense-category-option"
        type="button"
        data-category-value="${escapeHtml(option.value)}"
      >
        ${escapeHtml(option.textContent.trim())}
      </button>
    `)
    .join("");
}

/**
 * Updates the custom dropdown label and active option from #category.
 */
function syncAddExpenseCategoryMenu() {
  if (!categoryInput || !addExpenseCategoryMenu) return;

  const selectedOption =
    categoryInput.selectedOptions?.[0] ||
    Array.from(categoryInput.options).find(option => option.value === categoryInput.value);

  if (addExpenseCategoryMenuLabel) {
    addExpenseCategoryMenuLabel.textContent = selectedOption?.textContent?.trim() || "Category";
  }

  addExpenseCategoryMenu.querySelectorAll(".add-expense-category-option").forEach(option => {
    option.classList.toggle("active", option.dataset.categoryValue === categoryInput.value);
  });
}

/**
 * Sets the hidden native category value from the custom dropdown.
 */
function setAddExpenseCategoryValue(value) {
  if (!categoryInput) return;

  categoryInput.value = value;
  categoryInput.dispatchEvent(new Event("change", { bubbles: true }));

  syncAddExpenseCategoryMenu();

  if (addExpenseCategoryMenu) {
    addExpenseCategoryMenu.open = false;
  }
}

ensureTypedDateInput();
ensureAddExpenseCategoryMenu();


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

function formatMonthDisplay(value) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "Month";

  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric"
  });
}

function getSortLabel(value) {
  const option = document.querySelector(`.sort-option[data-sort-value="${value}"]`);
  return option ? option.textContent.trim() : "Date: Most Recent";
}

function closeToolbarMenus(except = null) {
  [filterMenu, sortMenu, monthMenu, datePicker, addExpenseCategoryMenu].forEach(menu => {
    if (menu && menu !== except) menu.open = false;
  });
}


function closeProfileMenu() {
  if (!usernameWrapper) return;

  const profile = usernameWrapper.closest(".profile");

  usernameWrapper.classList.remove("active");
  usernameWrapper.setAttribute("aria-expanded", "false");

  if (profile) {
    profile.classList.remove("menu-open");
  }
}


/**
 * Chart tooltip helpers
 *
 * These custom Chart.js tooltip positioners keep tooltips close to the hovered
 * chart item while preserving native Chart.js tooltip pointers/caret tips.
 */
/**
 * Chart tooltip helpers
 *
 * The line chart uses a small native tooltip positioner.
 * The category doughnut uses a custom HTML tooltip so it can sit outside
 * the ring and avoid covering the center total.
 */
function setupChartTooltips() {
  if (!window.Chart || !Chart.Tooltip || !Chart.Tooltip.positioners) return;

  Chart.Tooltip.positioners.monthlyPoint = function(elements) {
    if (!elements.length) return false;

    const point = elements[0].element;

    return {
      x: point.x,
      y: point.y,
      xAlign: "center",
      yAlign: "bottom"
    };
  };
}

setupChartTooltips();

/**
 * Creates the custom tooltip element used by the category doughnut chart.
 * It is appended to <body>, not inside the canvas, so it will not be clipped
 * by the chart card or overlap the center total.
 */
function getOrCreatePieTooltip() {
  let tooltipEl = document.getElementById("pie-chart-tooltip");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "pie-chart-tooltip";
    tooltipEl.className = "chart-external-tooltip";
    document.body.appendChild(tooltipEl);
  }

  return tooltipEl;
}

/**
 * Positions the category tooltip close to the hovered doughnut slice.
 * The tooltip is pushed outside the ring and given a pointer tip using CSS.
 */
function externalPieTooltip(context) {
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreatePieTooltip();

  if (!tooltip || tooltip.opacity === 0 || !tooltip.dataPoints || tooltip.dataPoints.length === 0) {
    tooltipEl.classList.remove("is-visible", "is-right", "is-left");
    return;
  }

  const point = tooltip.dataPoints[0];
  const arc = point.element;
  const label = point.label || "";
  const value = Number(point.raw) || 0;
  const dataset = chart.data.datasets[point.datasetIndex];
  const total = dataset.data.reduce((sum, item) => sum + (Number(item) || 0), 0);
  const percentage = total ? ((value / total) * 100).toFixed(1) : "0.0";
  const color = Array.isArray(dataset.backgroundColor)
    ? dataset.backgroundColor[point.dataIndex]
    : dataset.backgroundColor;

  const angle = (arc.startAngle + arc.endAngle) / 2;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const canvasRect = chart.canvas.getBoundingClientRect();

  // Horizontal distance keeps the tooltip outside the ring.
  // A small vertical adjustment keeps it visually tied to the hovered slice.
  const tooltipX = canvasRect.left + window.scrollX + arc.x + directionX * (arc.outerRadius + 22);
  const tooltipY = canvasRect.top + window.scrollY + arc.y + directionY * Math.min(arc.outerRadius * 0.42, 46);

  tooltipEl.style.transition = "opacity 0.32s ease, transform 0.32s ease, left 0.32s ease, top 0.32s ease";

  tooltipEl.innerHTML = `
    <div class="chart-external-tooltip-title">${escapeHtml(label)}</div>
    <div class="chart-external-tooltip-row">
      <span class="chart-external-tooltip-dot" style="background:${color}"></span>
      <span>${formatCurrency(value)} · ${percentage}%</span>
    </div>
  `;

  tooltipEl.style.left = `${tooltipX}px`;
  tooltipEl.style.top = `${tooltipY}px`;
  tooltipEl.style.transform = directionX >= 0
    ? "translate(14px, -50%)"
    : "translate(calc(-100% - 14px), -50%)";

  tooltipEl.classList.toggle("is-right", directionX >= 0);
  tooltipEl.classList.toggle("is-left", directionX < 0);
  tooltipEl.classList.add("is-visible");
}
function syncSortMenuState() {
  const sortValue = document.getElementById("sort-select")?.value || currentSort || "added-desc";

  if (sortMenuLabel) {
    sortMenuLabel.textContent = getSortLabel(sortValue);
  }

  document.querySelectorAll(".sort-option").forEach(option => {
    option.classList.toggle("active", option.dataset.sortValue === sortValue);
  });
}

function buildMonthMenuOptions() {
  if (!monthMenuPanel) return;

  const today = getTodayLocalDate();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = today.slice(0, 7);
  const months = Array.from({ length: 12 }, (_, index) => {
    const value = `${currentYear}-${String(index + 1).padStart(2, "0")}`;
    const label = new Date(currentYear, index, 1).toLocaleString("en-US", { month: "short" });
    return { value, label };
  });

  monthMenuPanel.innerHTML = `
    <p class="month-menu-title">${currentYear}</p>
    <button class="month-option month-option-wide" data-month-value="${currentMonth}" type="button">This month</button>
    <div class="month-options-grid">
      ${months.map(month => `
        <button class="month-option" data-month-value="${month.value}" type="button">${month.label}</button>
      `).join("")}
    </div>
  `;

  syncMonthMenuState();
}

function syncMonthMenuState() {
  if (monthMenuLabel) {
    monthMenuLabel.textContent = monthFilterInput?.value ? formatMonthDisplay(monthFilterInput.value) : "Month";
  }

  document.querySelectorAll(".month-option").forEach(option => {
    option.classList.toggle("active", option.dataset.monthValue === monthFilterInput?.value);
  });
}

function setMonthFilterValue(value) {
  if (!monthFilterInput) return;

  monthFilterInput.value = value;
  monthFilterInput.dispatchEvent(new Event("change", { bubbles: true }));
  closeToolbarMenus();
}

function getDateFromInputValue(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Converts a user-typed date into the ISO format used by the backend.
 * Accepted formats:
 * - MM/DD/YYYY or M/D/YYYY
 * - YYYY-MM-DD
 */
function parseTypedDateToIso(value) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slashMatch) return null;

  const [, monthRaw, dayRaw, yearRaw] = slashMatch;
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const year = Number(yearRaw);

  if (!Number.isInteger(month) || !Number.isInteger(day) || !Number.isInteger(year)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Syncs the visible typed date input into the hidden ISO #date input.
 * This keeps the backend payload unchanged while allowing users to type dates.
 */
function syncTypedDateToHidden(showError = false) {
  if (!dateManualInput || !dateInput) return true;

  const typedValue = dateManualInput.value.trim();
  const isoValue = parseTypedDateToIso(typedValue);

  dateManualInput.classList.remove("error");
  dateInput.classList.remove("error");
  if (dateError) dateError.textContent = "";

  if (!typedValue) {
    dateInput.value = "";
    dateInput.classList.remove("has-value");

    if (showError) {
      dateError.textContent = "Please enter or select a date";
      dateManualInput.classList.add("error");
      dateInput.classList.add("error");
    }

    syncExpenseDateControl();
    return !showError;
  }

  if (!isoValue || !isValidDate(isoValue)) {
    if (showError) {
      dateError.textContent = "Use a valid date in MM/DD/YYYY or YYYY-MM-DD";
      dateManualInput.classList.add("error");
      dateInput.classList.add("error");
    }

    syncExpenseDateControl();
    return false;
  }

  dateInput.value = isoValue;
  dateInput.classList.add("has-value");
  datePickerViewDate = getDateFromInputValue(isoValue);

  syncExpenseDateControl();
  renderExpenseDatePicker();
  return true;
}

function syncExpenseDateControl() {
  if (!dateTrigger || !dateTriggerLabel) return;

  const value = dateInput?.value || "";
  const displayValue = value ? formatDateDisplay(value) : "";

  if (dateManualInput && document.activeElement !== dateManualInput) {
    dateManualInput.value = displayValue;
  }

  dateTriggerLabel.textContent = value
    ? `Open calendar for ${displayValue}`
    : "Open calendar";

  dateTrigger.classList.toggle("has-value", Boolean(value));
  dateTrigger.classList.toggle("error", Boolean(dateInput?.classList.contains("error")));

  if (dateManualInput) {
    dateManualInput.classList.toggle("has-value", Boolean(value));
    dateManualInput.classList.toggle("error", Boolean(dateInput?.classList.contains("error")));
  }
}

function renderExpenseDatePicker() {
  if (!datePickerGrid || !datePickerMonthLabel) return;

  const todayValue = getTodayLocalDate();
  const todayDate = getDateFromInputValue(todayValue);
  const selectedDate = getDateFromInputValue(dateInput?.value || "");
  const viewDate = datePickerViewDate || selectedDate || todayDate;
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  datePickerMonthLabel.textContent = viewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });

  const firstDay = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const selectedValue = dateInput?.value || "";
  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push(`<span class="date-day empty" aria-hidden="true"></span>`);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const value = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isSelected = value === selectedValue;
    const isToday = value === todayValue;
    const isFuture = value > todayValue;

    cells.push(`
      <button class="date-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}" data-date-value="${value}" type="button"${isFuture ? " disabled" : ""}>
        ${day}
      </button>
    `);
  }

  datePickerGrid.innerHTML = cells.join("");

  if (dateNextMonthBtn) {
    const nextMonthValue = new Date(viewYear, viewMonth + 1, 1);
    const currentMonthValue = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    dateNextMonthBtn.disabled = nextMonthValue > currentMonthValue;
  }
}

function setExpenseDateValue(value) {
  if (!dateInput) return;

  dateInput.value = value;
  dateInput.classList.toggle("has-value", Boolean(value));
  dateInput.classList.remove("error");

  if (dateManualInput) {
    dateManualInput.value = value ? formatDateDisplay(value) : "";
    dateManualInput.classList.toggle("has-value", Boolean(value));
    dateManualInput.classList.remove("error");
  }

  if (dateError) dateError.textContent = "";
  dateInput.dispatchEvent(new Event("input", { bubbles: true }));
  syncExpenseDateControl();
  renderExpenseDatePicker();

  if (datePicker) {
    datePicker.open = false;
  }
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

  const tooltipEl = document.getElementById("pie-chart-tooltip");
  if (tooltipEl) {
    tooltipEl.classList.remove("is-visible", "is-right", "is-left");
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
        return dateB - dateA || Number(b.id || 0) - Number(a.id || 0);
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

/**
 * Moves the Expense History table to the page containing a specific expense.
 *
 * This is used after adding a new expense. The new row may not belong on page 1
 * because the table is sorted by date/amount/name, so we calculate its true
 * position in the current filtered + sorted list before rendering the highlight.
 */
function jumpToExpensePage(expenseId) {
  if (expenseId == null) return false;

  const filteredExpenses = getFilteredExpenses(expenses, true);
  const targetIndex = filteredExpenses.findIndex(exp =>
    String(exp.id) === String(expenseId)
  );

  if (targetIndex === -1) return false;

  currentPage = Math.floor(targetIndex / rowsPerPage) + 1;
  return true;
}


function syncMonthFilterState() {
  if (!monthFilterInput) return;

  if (monthFilterInput.value) {
    monthFilterInput.classList.add("has-value");
  } else {
    monthFilterInput.classList.remove("has-value");
  }

  syncMonthMenuState();
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
  datePickerViewDate = getDateFromInputValue(today);

  if (dateInput.value) {
    dateInput.classList.add("has-value");
  } else {
    dateInput.classList.remove("has-value");
  }

  syncExpenseDateControl();
  renderExpenseDatePicker();
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
      <span class="cell-text">${escapeHtml(expense.amount)}</span>
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
      <span class="cell-text">${escapeHtml(formatDateDisplay(expense.date) || "")}</span>
    </td>

   <td
      class="editable description-cell ${lockedClass}"
      data-field="description"
      data-index="${index}"
      contenteditable="${editableValue}"
    >
      <span class="cell-text">${escapeHtml(expense.description || "")}</span>
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
  const overview = document.getElementById("pie-overview");
  const subtitle = document.getElementById("pie-subtitle");

  if (entries.length === 0) {
    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }

    const tooltipEl = document.getElementById("pie-chart-tooltip");
    if (tooltipEl) {
      tooltipEl.classList.remove("is-visible", "is-right", "is-left");
    }

    if (overview) {
      overview.innerHTML = `<div class="pie-overview-empty">No category data yet</div>`;
    }

    if (subtitle) {
      subtitle.textContent = "Spending share by category";
    }

    return;
  }

  const categoryColors = {
    Food: "#58E66F",
    Transport: "#38BDF8",
    Bills: "#FBBF24",
    Leisure: "#A78BFA",
    Shopping: "#FB7185",
    Uncategorized: "#CBD5E1"
  };

  const labels = entries.map(([category]) => category);
  const data = entries.map(([, total]) => total);
  const backgroundColor = labels.map(label => categoryColors[label] || "#94A3B8");
  const total = data.reduce((sum, value) => sum + value, 0);

  if (subtitle) {
    subtitle.textContent = `${formatCurrency(total)} total across ${entries.length} ${entries.length === 1 ? "category" : "categories"}`;
  }

  // Keep percentages visible beside the chart, so the breakdown is readable
  // without needing to hover every doughnut slice.
  if (overview) {
    overview.innerHTML = entries.map(([category, value]) => {
      const percentage = total ? (value / total) * 100 : 0;
      const color = categoryColors[category] || "#94A3B8";

      return `
        <div class="pie-overview-item">
          <div class="pie-overview-topline">
            <span class="pie-overview-label">
              <span class="pie-overview-dot" style="background:${color}"></span>
              ${escapeHtml(category)}
            </span>
            <strong>${percentage.toFixed(0)}%</strong>
          </div>
          <div class="pie-overview-value">${formatCurrency(value)}</div>
        </div>
      `;
    }).join("");
  }

  const canvas = document.getElementById("pieChart");
  if (!canvas) return;

  if (pieChart) pieChart.destroy();

  const centerTextPlugin = {
    id: "centerText",
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;
      const compactTotal = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1
      }).format(total);

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillStyle = "#111827";
      ctx.font = "700 19px Inter, Arial, sans-serif";
      ctx.fillText(compactTotal, centerX, centerY - 7);

      ctx.fillStyle = "#8A948F";
      ctx.font = "500 11px Inter, Arial, sans-serif";
      ctx.fillText("Total", centerX, centerY + 15);

      ctx.restore();
    }
  };

  pieChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor,
        hoverBackgroundColor: backgroundColor,
        borderColor: "rgba(255, 255, 255, 0.96)",
        borderWidth: 4,
        hoverBorderWidth: 4,
        hoverOffset: 4,
        spacing: 3,
        borderRadius: 12,

        // Balanced size: large enough to read but not so large that the
        // percentage overview drops below the chart.
        cutout: "73%",
        radius: "92%"
      }]
    },
    plugins: [centerTextPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        duration: 850,
        easing: "easeOutQuart"
      },
      layout: {
        padding: {
          top: 12,
          right: 22,
          bottom: 12,
          left: 22
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          // Custom HTML tooltip avoids the center total and keeps a pointer tip.
          enabled: false,
          external: externalPieTooltip,

          animations: {
            numbers: {
              duration: 650,
              easing: "easeOutCubic"
            }
          },

          caretSize: 8,
          caretPadding: 8,
          displayColors: true,
          boxPadding: 6,
          backgroundColor: "rgba(17, 24, 39, 0.94)",
          titleColor: "#FFFFFF",
          bodyColor: "#FFFFFF",
          borderColor: "rgba(255, 255, 255, 0.12)",
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
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
  const total = data.reduce((sum, value) => sum + value, 0);
  const average = data.length ? total / data.length : 0;
  const averageLine = labels.map(() => average);

  const canvas = document.getElementById("categoryChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const chartWidth = canvas.parentElement?.clientWidth || window.innerWidth;

  const xTickLimit =
    chartWidth < 520 ? 4 :
    chartWidth < 760 ? 5 :
    chartWidth < 1100 ? 7 :
    9;

  if (categoryChart) categoryChart.destroy();

  const lineGradient = ctx.createLinearGradient(0, 0, canvas.clientWidth || 1000, 0);
  lineGradient.addColorStop(0, "#58E66F");
  lineGradient.addColorStop(1, "#48DDB6");

  categoryChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Monthly Spending",
          data,
          borderColor: lineGradient,
          backgroundColor: "rgba(72, 221, 182, 0.08)",

          // A lower tension keeps the curve modern without exaggerating the line.
          tension: data.length > 2 ? 0.18 : 0,
          cubicInterpolationMode: "monotone",
          fill: false,

          // Prevents first/last hover circles from being clipped.
          clip: false,

          pointRadius: data.length === 1 ? 5 : 0,
          pointHoverRadius: 7,
          pointBackgroundColor: "#FFFFFF",
          pointBorderColor: "#48DDB6",
          pointBorderWidth: 3,
          pointHoverBorderWidth: 4,
          hitRadius: 14,

          borderWidth: 2.8
        },
        {
          label: "Average",
          data: averageLine,
          borderColor: "rgba(245, 158, 11, 0.95)",
          backgroundColor: "rgba(245, 158, 11, 0.12)",
          borderDash: [5, 6],
          tension: 0,
          fill: false,
          clip: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 850,
        easing: "easeOutQuart"
      },
      interaction: {
        mode: "nearest",
        intersect: false
      },
      layout: {
        padding: {
          top: 18,
          right: 18,
          bottom: 8,
          left: 18
        }
      },
      plugins: {
        legend: {
          display: true,
          align: "center",

          // Prevents Chart.js from hiding lines and striking legend labels.
          onClick: () => {},

          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 8,
            boxHeight: 8,
            padding: 18,
            color: "#7B857F",
            font: {
              family: "Inter, Arial, sans-serif",
              size: 12,
              weight: "500"
            }
          }
        },
        tooltip: {
          enabled: true,

          // Anchors the tooltip to the hovered point.
          position: "monthlyPoint",
          xAlign: "center",
          yAlign: "bottom",
          caretPadding: 8,
          caretSize: 8,

          backgroundColor: "rgba(17, 24, 39, 0.96)",
          titleColor: "#FFFFFF",
          bodyColor: "#FFFFFF",
          borderColor: "rgba(255, 255, 255, 0.12)",
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
          displayColors: false,
          callbacks: {
            title(context) {
              return context?.[0]?.label || "";
            },
            label(context) {
              return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          // Keeps the line stretched across the x-axis instead of centered/narrow.
          offset: false,
          bounds: "ticks",
          ticks: {
            autoSkip: true,
            maxTicksLimit: xTickLimit,
            align: "inner",
            padding: 12,
            maxRotation: 0,
            minRotation: 0,
            color: "#8A948F",
            font: {
              family: "Inter, Arial, sans-serif",
              size: 12,
              weight: "500"
            }
          },
          grid: {
            display: false,
            drawBorder: false,
            offset: false
          },
          border: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grace: "10%",
          ticks: {
            padding: 10,
            color: "#8A948F",
            font: {
              family: "Inter, Arial, sans-serif",
              size: 12,
              weight: "500"
            },
            callback(value) {
              return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                notation: "compact",
                maximumFractionDigits: 1
              }).format(Number(value));
            }
          },
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
            drawBorder: false,
            borderDash: [4, 6]
          },
          border: {
            display: false
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

  const typedDateIsValid = syncTypedDateToHidden(true);

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

  if (!typedDateIsValid) {
    hasError = true;
  } else if (dateInput.value === "" || dateInput.value == null) {
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

  syncExpenseDateControl();

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
    }

    // After the saved expenses reload, move to the actual page where the
    // newly added row belongs based on the current sort/filter/search state.
    // This prevents old-dated expenses from being highlighted on a hidden page.
    if (newlyAddedExpenseId != null) {
      const foundNewExpensePage = jumpToExpensePage(newlyAddedExpenseId);

      if (foundNewExpensePage) {
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

    requestAnimationFrame(() => {
      const highlightedRow = document.querySelector("#expense-table tr.new-expense-row");

      if (highlightedRow) {
        highlightedRow.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    });

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
    currentSort = "added-desc";
    syncSortMenuState();
  }

  if (monthFilterInput) {
    monthFilterInput.value = "";
    syncMonthFilterState();
  }

  expenseNameInput.value = "";
  amountInput.value = "";

  if (categoryInput) {
    categoryInput.selectedIndex = 0;
    syncAddExpenseCategoryMenu();
  }

  descInput.value = "";
  descCounter.textContent = `0/${DESCRIPTION_LIMIT}`;

  expenseNameError.textContent = "";
  amountError.textContent = "";
  dateError.textContent = "";
  descError.textContent = "";

  expenseNameInput.classList.remove("error");
  amountInput.classList.remove("error");
  dateInput.classList.remove("error");
  syncExpenseDateControl();
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

function renderAuthState() {
  const profile = document.querySelector(".profile");
  const dropdown = document.querySelector(".dropdown");
  const username = document.querySelector(".username");
  const arrow = document.querySelector(".arrow");
  const profilePic = document.querySelector(".profile-pic");

  if (!profile || !usernameWrapper) return;

  if (isLoggedIn) {
    profile.classList.remove("logged-out");
    profile.classList.remove("menu-open");

    usernameWrapper.classList.remove("login-header-btn");
    usernameWrapper.classList.remove("active");
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
  profile.classList.remove("menu-open");

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

function logout(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  isLoggedIn = false;

  closeProfileMenu();
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


  if (categoryInput) {
    categoryInput.addEventListener("change", syncAddExpenseCategoryMenu);
  }

  if (addExpenseCategoryMenu) {
    addExpenseCategoryMenu.addEventListener("click", (event) => {
      const option = event.target.closest(".add-expense-category-option");
      if (!option) return;

      setAddExpenseCategoryValue(option.dataset.categoryValue || "");
      closeToolbarMenus();
    });

    addExpenseCategoryMenu.addEventListener("toggle", () => {
      if (addExpenseCategoryMenu.open) {
        closeToolbarMenus(addExpenseCategoryMenu);
      }
    });
  }

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

      closeToolbarMenus();
    });
  });

  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      syncSortMenuState();
      renderExpenses();
    });
  }

  document.querySelectorAll(".sort-option").forEach(option => {
    option.addEventListener("click", () => {
      const value = option.dataset.sortValue;
      const select = document.getElementById("sort-select");

      if (select) {
        select.value = value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        currentSort = value;
        currentPage = 1;
        syncSortMenuState();
        renderExpenses();
      }

      closeToolbarMenus();
    });
  });

  monthFilterInput.addEventListener("change", (e) => {
    currentMonthFilter = e.target.value || "All";
    currentPage = 1;
    syncMonthFilterState();
    renderExpenses();
  });

  clearMonthBtn.addEventListener("click", () => {
    currentFilter = "All";
    currentSort = "added-desc";
    currentMonthFilter = "All";
    currentSearch = "";
    pendingSearch = "";
    currentPage = 1;

    if (expenseSearchInput) {
      expenseSearchInput.value = "";
    }

    if (searchIconBtn) {
      searchIconBtn.disabled = true;
    }

    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.category === "All");
    });

    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
      sortSelect.value = "added-desc";
    }

    if (monthFilterInput) {
      monthFilterInput.value = "";
    }

    syncSortMenuState();
    syncMonthMenuState();
    closeToolbarMenus();
    renderExpenses();
  });

  if (monthMenuPanel) {
    monthMenuPanel.addEventListener("click", (event) => {
      const option = event.target.closest(".month-option");
      if (!option) return;
      setMonthFilterValue(option.dataset.monthValue || "");
    });
  }

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


  if (dateManualInput) {
    dateManualInput.addEventListener("input", () => {
      dateManualInput.classList.remove("error");
      dateInput.classList.remove("error");
      if (dateError) dateError.textContent = "";

      // Do not show errors on every keystroke. Sync quietly when the date becomes valid.
      syncTypedDateToHidden(false);
    });

    dateManualInput.addEventListener("blur", () => {
      syncTypedDateToHidden(Boolean(dateManualInput.value.trim()));
    });

    dateManualInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        syncTypedDateToHidden(true);
        dateManualInput.blur();
      }
    });
  }

  dateInput.addEventListener("input", () => {
    const value = dateInput.value;
    const today = getTodayLocalDate();

    dateError.textContent = "";
    dateInput.classList.remove("error");

    if (!value) {
      dateError.textContent = "Please select a valid date";
      dateInput.classList.add("error");
      syncExpenseDateControl();
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      dateError.textContent = "Use format YYYY-MM-DD";
      dateInput.classList.add("error");
      syncExpenseDateControl();
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
      syncExpenseDateControl();
      return;
    }

    if (value > today) {
      dateError.textContent = "Date cannot be after today";
      dateInput.classList.add("error");
      syncExpenseDateControl();
      return;
    }

    dateError.textContent = "";
    dateInput.classList.remove("error");
    syncExpenseDateControl();
  });

  document.querySelectorAll(".toolbar-menu").forEach(menu => {
    menu.addEventListener("toggle", () => {
      if (menu.open) closeToolbarMenus(menu);
    });
  });

  document.addEventListener("pointerdown", (event) => {
    const clickedInsideMenu = event.target.closest(".toolbar-menu, .date-picker, .dropdown, .username-wrapper");
    if (!clickedInsideMenu) {
      closeToolbarMenus();
      closeProfileMenu();
    }
  }, true);

  document.addEventListener("click", (event) => {
    const clickedInsideMenu = event.target.closest(".toolbar-menu, .date-picker, .dropdown, .username-wrapper");
    if (!clickedInsideMenu) {
      closeToolbarMenus();
      closeProfileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolbarMenus();
      closeProfileMenu();
    }
  });

  if (datePickerGrid) {
    datePickerGrid.addEventListener("click", (event) => {
      const dayButton = event.target.closest(".date-day[data-date-value]");
      if (!dayButton || dayButton.disabled) return;
      setExpenseDateValue(dayButton.dataset.dateValue);
    });
  }

  if (datePrevMonthBtn) {
    datePrevMonthBtn.addEventListener("click", () => {
      const base = datePickerViewDate || getDateFromInputValue(dateInput.value) || getDateFromInputValue(getTodayLocalDate());
      datePickerViewDate = new Date(base.getFullYear(), base.getMonth() - 1, 1);
      renderExpenseDatePicker();
    });
  }

  if (dateNextMonthBtn) {
    dateNextMonthBtn.addEventListener("click", () => {
      const base = datePickerViewDate || getDateFromInputValue(dateInput.value) || getDateFromInputValue(getTodayLocalDate());
      datePickerViewDate = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      renderExpenseDatePicker();
    });
  }

  if (datePickerTodayBtn) {
    datePickerTodayBtn.addEventListener("click", () => {
      const today = getTodayLocalDate();
      datePickerViewDate = getDateFromInputValue(today);
      setExpenseDateValue(today);
    });
  }

  if (datePicker) {
    datePicker.addEventListener("toggle", () => {
      if (datePicker.open) {
        closeToolbarMenus(datePicker);
        datePickerViewDate = getDateFromInputValue(dateInput.value) || getDateFromInputValue(getTodayLocalDate());
        renderExpenseDatePicker();
      }
    });
  }

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
    usernameWrapper.addEventListener("click", (event) => {
      event.stopPropagation();
    
      if (!isLoggedIn) {
        showAppToast("Login flow is not connected in this preview.");
        return;
      }
    
      const profile = usernameWrapper.closest(".profile");
      const expanded = usernameWrapper.getAttribute("aria-expanded") === "true";
      const nextExpanded = !expanded;
    
      usernameWrapper.setAttribute("aria-expanded", String(nextExpanded));
      usernameWrapper.classList.toggle("active", nextExpanded);
    
      if (profile) {
        profile.classList.toggle("menu-open", nextExpanded);
      }
    });
  
    usernameWrapper.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        usernameWrapper.click();
      }
    });
  }

  if (logoutBtn) {
    // Use pointerdown so logout still runs before the dropdown can lose focus/close.
    logoutBtn.addEventListener("pointerdown", logout);
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
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

buildMonthMenuOptions();
syncSortMenuState();
setTodayDate();
syncMonthFilterState();
loadExpenses();
renderAuthState();