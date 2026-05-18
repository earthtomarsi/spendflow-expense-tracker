let expenses = [];
let draftExpenses = [];

const API_BASE =
  window.SPENDFLOW_API_BASE ||
  (["5500", "5173"].includes(window.location.port) || window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin);
const TOKEN_STORAGE_KEY = "spendflowToken";
const USER_STORAGE_KEY = "spendflowUser";

let categoryChart = null;
let pieChart = null;
let currentFilter = "All";
let currentSort = "added-desc";
let currentMonthFilter = "All";
let currentSearch = "";
let pendingSearch = "";
let currentPage = 1;
let monthMenuYear = new Date().getFullYear();
const rowsPerPage = 10;
const adminUsersRowsPerPage = rowsPerPage;
let adminUsersPage = 1;
const DESCRIPTION_LIMIT = 70;
const MAX_VALID_YEAR = new Date().getFullYear();
let isEditMode = false;
let newlyAddedExpenseId = null;
let highlightTimeoutId = null;
let appToastTimeoutId = null;
let unsavedChangesDialogResolve = null;
let unsavedChangesLastFocusedElement = null;
let deleteUserDialogResolve = null;
let tableActionHighlightTimeoutId = null;
let activeEditCell = null;
let selectedEditRowIndex = null;
let editModeOrderIds = [];
let authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
let currentUser = getStoredUser();
let isLoggedIn = Boolean(authToken);
let adminUsers = [];
let adminActivity = [];
let isAdminPanelOpen = false;
let authMode = "login";
let isAdminEditMode = false;
let selectedAdminUserIndex = null;
let draftAdminUsers = [];
let adminUserSearch = "";
let adminRoleFilter = "All";
let adminUserSort = "username-asc";
let adminUserInvalidCells = {};

// DOM elements
const expenseNameInput = document.getElementById("expenseName");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const addBtn = document.getElementById("add-btn");
let addExpenseModeError = document.getElementById("add-expense-mode-error");
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
const heroGreeting = document.querySelector(".hero-copy h2");
let loginPanel = document.getElementById("login-panel");
let loginForm = document.getElementById("login-form");
let loginIdentifierInput = document.getElementById("login-identifier");
let loginPasswordInput = document.getElementById("login-password");
let loginIdentifierError = document.getElementById("login-identifier-error");
let loginPasswordError = document.getElementById("login-password-error");
let loginSubmitBtn = document.getElementById("login-submit-btn");
let authPage = document.getElementById("auth-page");
const brandHome = document.getElementById("brand-home");
const usernameWrapper = document.querySelector(".username-wrapper");
const logoutBtn = document.getElementById("logout-btn");
let userProfileBtn = document.getElementById("user-profile-btn");
const trendSection = document.querySelector(".trend-section");
const tableSection = document.querySelector(".table-section");
const filterMenu = document.getElementById("filter-menu");
const filterMenuLabel = document.getElementById("filter-menu-label");
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
  }

  dateManualInput.type = "hidden";
  dateManualInput.className = "date-manual-input";
  dateManualInput.setAttribute("aria-hidden", "true");
  dateManualInput.tabIndex = -1;

  if (dateManualInput.parentElement !== shell) {
    shell.appendChild(dateManualInput);
  }

  let segmentedInput = shell.querySelector("#date-segmented-input");

  if (!segmentedInput) {
    segmentedInput = document.createElement("div");
    segmentedInput.id = "date-segmented-input";
    segmentedInput.className = "add-date-segmented-input";
    segmentedInput.setAttribute("role", "group");
    segmentedInput.setAttribute("aria-label", "Expense date");

    segmentedInput.innerHTML = `
      <input
        class="add-date-segment add-date-month"
        data-add-date-segment="month"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="2"
        placeholder="MM"
        aria-label="Month"
      >
      <span class="add-date-separator" aria-hidden="true">/</span>
      <input
        class="add-date-segment add-date-day"
        data-add-date-segment="day"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="2"
        placeholder="DD"
        aria-label="Day"
      >
      <span class="add-date-separator" aria-hidden="true">/</span>
      <input
        class="add-date-segment add-date-year"
        data-add-date-segment="year"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="4"
        placeholder="YYYY"
        aria-label="Year"
      >
    `;

    shell.insertBefore(segmentedInput, dateManualInput);
  }

  if (datePicker && datePicker.parentElement !== shell) {
    shell.appendChild(datePicker);
  }

  bindAddExpenseSegmentedDateEvents();
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

if (amountInput) {
  amountInput.type = "text";
  amountInput.inputMode = "decimal";
  amountInput.autocomplete = "off";
  amountInput.placeholder = "$0.00";
}

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
    dateError: expense.dateError ?? "",
    amountError: expense.amountError ?? "",
    dateEditValue: expense.dateEditValue ?? "",
    amountEditValue: expense.amountEditValue ?? ""
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

function formatActivityTimestamp(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
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

  // Anchor the tooltip to the vertical midpoint of the hovered doughnut section.
  // The side is chosen from the slice midpoint, while the Y position uses the
  // median radius of the slice band so the pointer aligns to the section itself.
  const pointerGap = 14;
  const medianRadius = (arc.innerRadius + arc.outerRadius) / 2;
  const tooltipAnchorX = canvasRect.left + window.scrollX + arc.x + directionX * (arc.outerRadius + 8);
  const tooltipAnchorY = canvasRect.top + window.scrollY + arc.y + directionY * medianRadius;
  const tooltipX = tooltipAnchorX + (directionX >= 0 ? -pointerGap : pointerGap);
  const tooltipY = tooltipAnchorY;

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

function syncFilterMenuState() {
  const filterValue = currentFilter || "All";

  if (filterMenuLabel) {
    filterMenuLabel.textContent = `Filter: ${filterValue}`;
  }

  document.querySelectorAll(".filter-btn").forEach(option => {
    option.classList.toggle("active", option.dataset.category === filterValue);
  });
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
  const visibleYear = monthMenuYear || currentYear;
  const months = Array.from({ length: 12 }, (_, index) => {
    const value = `${visibleYear}-${String(index + 1).padStart(2, "0")}`;
    const label = new Date(visibleYear, index, 1).toLocaleString("en-US", { month: "short" });
    return { value, label };
  });

  monthMenuPanel.innerHTML = `
    <div class="month-menu-year-nav">
      <button class="month-year-btn" data-month-year-direction="-1" type="button" aria-label="Previous year">‹</button>
      <p class="month-menu-title">${visibleYear}</p>
      <button class="month-year-btn" data-month-year-direction="1" type="button" aria-label="Next year" ${visibleYear >= currentYear ? "disabled" : ""}>›</button>
    </div>
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

  if (/^\d{4}-\d{2}$/.test(value)) {
    monthMenuYear = Number(value.slice(0, 4));
  }

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

function validateTypedDateInput(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return {
      isValid: false,
      error: "Please enter or select a date",
      isoDate: ""
    };
  }

  if (/[^0-9\/-]/.test(raw)) {
    return {
      isValid: false,
      error: "Please use numbers only for the date",
      isoDate: ""
    };
  }

  const isoDate = parseTypedDateToIso(raw);

  if (!isoDate) {
    return {
      isValid: false,
      error: "Please use a valid date",
      isoDate: ""
    };
  }

  const year = Number(isoDate.slice(0, 4));

  if (year > MAX_VALID_YEAR) {
    return {
      isValid: false,
      error: `Year cannot be after ${MAX_VALID_YEAR}`,
      isoDate
    };
  }

  if (!isValidDate(isoDate, { allowFuture: true })) {
    return {
      isValid: false,
      error: "Please use a valid date",
      isoDate
    };
  }

  if (isoDate > getTodayLocalDate()) {
    return {
      isValid: false,
      error: "Date cannot be after today",
      isoDate
    };
  }

  return {
    isValid: true,
    error: "",
    isoDate
  };
}

/**
 * Syncs the visible typed date input into the hidden ISO #date input.
 * This keeps the backend payload unchanged while allowing users to type dates.
 */
function syncTypedDateToHidden(showError = false) {
  if (!dateInput) return true;

  const { root } = getAddExpenseDateSegments();
  const typedValue = root
    ? getAddExpenseDateDisplayValue()
    : dateManualInput?.value.trim() || "";

  const dateValidation = validateTypedDateInput(typedValue);

  root?.classList.remove("error");
  dateManualInput?.classList.remove("error");
  dateInput.classList.remove("error");

  if (dateError) dateError.textContent = "";

  if (!dateValidation.isValid) {
    dateInput.value = "";
    dateInput.classList.remove("has-value");

    if (showError) {
      if (dateError) dateError.textContent = dateValidation.error;

      root?.classList.add("error");
      dateManualInput?.classList.add("error");
      dateInput.classList.add("error");

      resetAddExpenseDateSegmentsToPlaceholders();
    }

    syncExpenseDateControl();
    return false;
  }

  dateInput.value = dateValidation.isoDate;
  dateInput.classList.add("has-value");

  if (dateManualInput) {
    dateManualInput.value = formatDateDisplay(dateValidation.isoDate);
  }

  datePickerViewDate = getDateFromInputValue(dateValidation.isoDate);

  if (root && !root.contains(document.activeElement)) {
    setAddExpenseDateSegmentsFromIsoOrDisplay(dateValidation.isoDate);
  }

  syncExpenseDateControl();
  renderExpenseDatePicker();
  return true;
}

function syncExpenseDateControl() {
  if (!dateTrigger || !dateTriggerLabel) return;

  const value = dateInput?.value || "";
  const displayValue = value ? formatDateDisplay(value) : "";
  const { root } = getAddExpenseDateSegments();

  if (dateManualInput) {
    dateManualInput.value = displayValue;
  }

  if (root && !root.contains(document.activeElement)) {
    setAddExpenseDateSegmentsFromIsoOrDisplay(value);
  } else if (dateManualInput && document.activeElement !== dateManualInput && !root) {
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

  if (root) {
    root.classList.toggle("has-value", Boolean(value));
    root.classList.toggle("error", Boolean(dateInput?.classList.contains("error")));
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

  const { root } = getAddExpenseDateSegments();

  if (root) {
    setAddExpenseDateSegmentsFromIsoOrDisplay(value);
    root.classList.toggle("has-value", Boolean(value));
    root.classList.remove("error");
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

/**
 * Creates an inline Add Expense warning if the HTML does not already include one.
 * This keeps the warning close to the Add Expense button instead of relying only
 * on the top status banner, which may be off-screen.
 */
function ensureAddExpenseModeError() {
  if (addExpenseModeError || !addBtn) return;

  const error = document.createElement("p");
  error.id = "add-expense-mode-error";
  error.className = "error-text add-expense-mode-error";
  error.hidden = true;
  error.setAttribute("role", "alert");
  error.setAttribute("aria-live", "polite");

  const buttonSection = addBtn.closest(".button-section") || addBtn.parentElement;

  if (buttonSection) {
    buttonSection.insertAdjacentElement("afterend", error);
  }

  addExpenseModeError = error;
}

function showAddExpenseModeError(message) {
  ensureAddExpenseModeError();

  if (addExpenseModeError) {
    addExpenseModeError.textContent = message;
    addExpenseModeError.hidden = false;
  }

  // No heading here: this is a guided warning, not a system failure.
  showAppToast(message, "error", {
    label: "Go to table edits",
    onClick: scrollToTableEditActions
  });
}

function clearAddExpenseModeError() {
  if (!addExpenseModeError) return;

  addExpenseModeError.textContent = "";
  addExpenseModeError.hidden = true;
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

function ensureToastActionButton(toast) {
  let actionBtn = document.getElementById("app-toast-action");

  if (actionBtn) return actionBtn;

  actionBtn = document.createElement("button");
  actionBtn.id = "app-toast-action";
  actionBtn.className = "app-toast-action";
  actionBtn.type = "button";
  actionBtn.hidden = true;

  const closeBtn = document.getElementById("app-toast-close");

  if (closeBtn) {
    toast.insertBefore(actionBtn, closeBtn);
  } else {
    toast.appendChild(actionBtn);
  }

  return actionBtn;
}

function highlightTableActionButton(button) {
  if (!button) return;

  document.querySelectorAll(".table-action-attention").forEach(activeButton => {
    activeButton.classList.remove("table-action-attention");
  });

  button.classList.add("table-action-attention");

  if (tableActionHighlightTimeoutId) {
    clearTimeout(tableActionHighlightTimeoutId);
  }

  tableActionHighlightTimeoutId = setTimeout(() => {
    button.classList.remove("table-action-attention");
    tableActionHighlightTimeoutId = null;
  }, 3200);
}

function highlightTableEditActions() {
  highlightTableActionButton(editTableBtn);
}

function scrollToTableEditActions() {
  const target = document.querySelector(".table-actions") || tableSection;

  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  setTimeout(() => {
    highlightTableEditActions();

    if (editTableBtn) {
      editTableBtn.focus({ preventScroll: true });
    }
  }, 450);
}

function getActiveEditableTableSaveButton() {
  if (isAdminEditMode) {
    const adminSaveBtn = document.getElementById("admin-edit-users-btn");
    if (adminSaveBtn) return adminSaveBtn;
  }

  if (isEditMode && editTableBtn) {
    return editTableBtn;
  }

  return null;
}

function scrollToActiveEditableTableSaveButton() {
  const saveButton = getActiveEditableTableSaveButton();

  if (!saveButton) {
    if (unsavedChangesLastFocusedElement?.focus) {
      unsavedChangesLastFocusedElement.focus({ preventScroll: true });
    }

    return;
  }

  const target =
    saveButton.closest(".admin-table-actions") ||
    saveButton.closest(".table-actions") ||
    saveButton;

  target.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  setTimeout(() => {
    highlightTableActionButton(saveButton);
    saveButton.focus({ preventScroll: true });
  }, 450);
}

function showAppToast(message, type = "success", action = null, title = null) {
  const toast = document.getElementById("app-toast");
  const messageEl = document.getElementById("app-toast-message");
  const iconEl = document.getElementById("app-toast-icon");

  if (!toast || !messageEl) return;

  const actionBtn = ensureToastActionButton(toast);
  const hasAction = Boolean(action?.label && typeof action.onClick === "function");

  // Use an explicit title only when the caller provides one.
  // This keeps field/table validation errors short and context-specific.
  const toastTitle = title ?? "";

  messageEl.innerHTML = "";

  if (toastTitle) {
    const titleEl = document.createElement("div");
    titleEl.className = "app-toast-title";
    titleEl.textContent = toastTitle;
    messageEl.appendChild(titleEl);
  }

  const bodyEl = document.createElement("div");
  bodyEl.className = "app-toast-body";
  bodyEl.textContent = message;
  messageEl.appendChild(bodyEl);

  toast.classList.remove("success", "error", "has-action");
  toast.classList.add(type);

  if (hasAction) {
    toast.classList.add("has-action");
  }

  if (iconEl) {
    iconEl.innerHTML = type === "error"
      ? `
        <svg class="toast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7.5v5.2"></path>
          <path d="M12 16.5h.01"></path>
        </svg>
      `
      : `
        <svg class="toast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M8.5 12.3l2.3 2.3 4.7-5.2"></path>
        </svg>
      `;

    iconEl.setAttribute(
      "aria-label",
      type === "error" ? "Error notification" : "Success notification"
    );
  }

  if (hasAction) {
    actionBtn.textContent = action.label;
    actionBtn.hidden = false;
    actionBtn.onclick = () => {
      hideAppToast();
      action.onClick();
    };
  } else {
    actionBtn.textContent = "";
    actionBtn.hidden = true;
    actionBtn.onclick = null;
  }

  toast.hidden = false;
  toast.classList.add("show");

  if (appToastTimeoutId) {
    clearTimeout(appToastTimeoutId);
  }

  const messageLength = String(message || "").length + String(toastTitle || "").length;
  const baseDuration = hasAction ? 9000 : type === "error" ? 7200 : 5600;
  const readingBuffer = Math.min(2200, Math.max(0, (messageLength - 80) * 32));
  const toastDuration = Math.min(hasAction ? 11200 : 9200, baseDuration + readingBuffer);

  appToastTimeoutId = setTimeout(() => {
    hideAppToast();
  }, toastDuration);
}

function hideAppToast() {
  const toast = document.getElementById("app-toast");
  if (!toast) return;

  const actionBtn = document.getElementById("app-toast-action");

  if (actionBtn) {
    actionBtn.onclick = null;
    actionBtn.hidden = true;
    actionBtn.textContent = "";
  }

  if (appToastTimeoutId) {
    clearTimeout(appToastTimeoutId);
    appToastTimeoutId = null;
  }

  toast.classList.remove("show", "has-action");

  setTimeout(() => {
    toast.hidden = true;
  }, 180);
}


function getExpenseDraftValue(expense, field) {
  if (!expense) return "";

  if (field === "amount") {
    const value = expense.amountEditValue !== "" && expense.amountEditValue != null
      ? expense.amountEditValue
      : expense.amount;

    return Number(parseCurrencyInput(value));
  }

  if (field === "date") {
    return expense.dateEditValue !== "" && expense.dateEditValue != null
      ? String(expense.dateEditValue || "").trim()
      : String(expense.date || "").trim();
  }

  return String(expense[field] ?? "").trim();
}

function hasExpenseUnsavedChanges(options = {}) {
  if (!isEditMode) return false;

  const { commitActive = true } = options;

  if (commitActive) {
    commitActiveTableCell();
  }

  if (draftExpenses.length !== expenses.length) return true;

  const savedById = new Map(expenses.map(expense => [String(expense.id), expense]));

  return draftExpenses.some(draftExpense => {
    const savedExpense = savedById.get(String(draftExpense.id));

    if (!savedExpense) return true;
    if (draftExpense.amountError || draftExpense.dateError) return true;

    return (
      String(savedExpense.expenseName || "").trim() !== getExpenseDraftValue(draftExpense, "expenseName") ||
      String(savedExpense.category || "").trim() !== getExpenseDraftValue(draftExpense, "category") ||
      Number(savedExpense.amount) !== getExpenseDraftValue(draftExpense, "amount") ||
      String(savedExpense.date || "").trim() !== getExpenseDraftValue(draftExpense, "date") ||
      String(savedExpense.description || "").trim() !== getExpenseDraftValue(draftExpense, "description")
    );
  });
}

function hasAdminUsersUnsavedChanges(options = {}) {
  if (!isAdminEditMode) return false;

  const { commitActive = true } = options;

  if (commitActive) {
    commitAdminEditableCell(document.activeElement?.closest?.("[data-admin-field]"));
  }

  if (draftAdminUsers.length !== adminUsers.length) return true;

  const savedById = new Map(adminUsers.map(user => [String(user.id), user]));

  return draftAdminUsers.some(draftUser => {
    const savedUser = savedById.get(String(draftUser.id));
    return !savedUser || isAdminUserDifferent(savedUser, draftUser);
  });
}

function hasEditableTableUnsavedChanges(options = {}) {
  return hasExpenseUnsavedChanges(options) || hasAdminUsersUnsavedChanges(options);
}

function discardUnsavedEditableTableChanges() {
  if (isEditMode) {
    draftExpenses = cloneExpenses(expenses);
    isEditMode = false;
    selectedEditRowIndex = null;
    activeEditCell = null;
    clearEditModeOrder();

    if (editTableBtn) editTableBtn.textContent = "Edit";
    if (cancelTableBtn) cancelTableBtn.classList.add("inactive");

    clearStatus();
    clearAddExpenseModeError();
    renderExpenses();
  }

  if (isAdminEditMode) {
    isAdminEditMode = false;
    selectedAdminUserIndex = null;
    draftAdminUsers = adminUsers.map(user => ({ ...user }));
    adminUserInvalidCells = {};
    updateAdminEditButtons();
    renderAdminUsers();
  }
}

function ensureUnsavedChangesDialog() {
  let dialog = document.getElementById("unsaved-changes-dialog");

  if (dialog) return dialog;

  dialog = document.createElement("div");
  dialog.id = "unsaved-changes-dialog";
  dialog.className = "unsaved-changes-modal";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "unsaved-changes-title");
  dialog.setAttribute("aria-describedby", "unsaved-changes-message");

  dialog.innerHTML = `
    <div class="unsaved-changes-dialog-card" role="document">
      <button id="unsaved-changes-close-btn" class="unsaved-changes-close-btn" type="button" aria-label="Close dialog">×</button>
      <div class="unsaved-changes-icon" aria-hidden="true">!</div>
      <div class="unsaved-changes-copy">
        <h3 id="unsaved-changes-title">Unsaved Changes</h3>
        <p id="unsaved-changes-message">Are you sure you want to leave this page?</p>
        <p id="unsaved-changes-warning">Your changes will be lost.</p>
      </div>
      <div class="unsaved-changes-actions">
        <button id="unsaved-changes-stay-btn" type="button" class="table-action-btn">Keep editing</button>
        <button id="unsaved-changes-leave-btn" type="button" class="table-action-btn secondary">Leave without saving</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector("#unsaved-changes-stay-btn")?.addEventListener("click", () => {
    closeUnsavedChangesDialog(false);
  });

  dialog.querySelector("#unsaved-changes-leave-btn")?.addEventListener("click", () => {
    closeUnsavedChangesDialog(true);
  });

  dialog.querySelector("#unsaved-changes-close-btn")?.addEventListener("click", () => {
    closeUnsavedChangesDialog(false);
  });

  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeUnsavedChangesDialog(false);
    }
  });

  return dialog;
}

function closeUnsavedChangesDialog(shouldLeave) {
  const dialog = document.getElementById("unsaved-changes-dialog");

  if (dialog) {
    dialog.classList.remove("show");

    setTimeout(() => {
      dialog.hidden = true;
    }, 180);
  }

  document.body.classList.remove("modal-open");

  const resolver = unsavedChangesDialogResolve;
  unsavedChangesDialogResolve = null;

  if (!shouldLeave) {
    setTimeout(() => {
      scrollToActiveEditableTableSaveButton();
      unsavedChangesLastFocusedElement = null;
    }, 210);
  } else {
    unsavedChangesLastFocusedElement = null;
  }

  if (resolver) {
    resolver(Boolean(shouldLeave));
  }
}

function showUnsavedChangesDialog() {
  const dialog = ensureUnsavedChangesDialog();

  if (unsavedChangesDialogResolve) {
    return new Promise(resolve => {
      const previousResolve = unsavedChangesDialogResolve;
      unsavedChangesDialogResolve = value => {
        previousResolve(value);
        resolve(value);
      };
    });
  }

  unsavedChangesLastFocusedElement = document.activeElement;
  dialog.hidden = false;
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    dialog.classList.add("show");
    dialog.querySelector("#unsaved-changes-stay-btn")?.focus({ preventScroll: true });
  });

  return new Promise(resolve => {
    unsavedChangesDialogResolve = resolve;
  });
}

function ensureDeleteUserDialog() {
  let dialog = document.getElementById("delete-user-dialog");

  if (dialog) return dialog;

  dialog = document.createElement("div");
  dialog.id = "delete-user-dialog";
  dialog.className = "unsaved-changes-modal";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "delete-user-title");
  dialog.setAttribute("aria-describedby", "delete-user-message");

  dialog.innerHTML = `
    <div class="unsaved-changes-dialog-card" role="document">
      <button id="delete-user-close-btn" class="unsaved-changes-close-btn" type="button" aria-label="Close dialog">×</button>
      <div class="unsaved-changes-icon" aria-hidden="true">!</div>
      <div class="unsaved-changes-copy">
        <h3 id="delete-user-title">Remove User</h3>
        <p id="delete-user-message">Are you sure you want to remove this user?</p>
        <p id="delete-user-warning">This also removes their expenses.</p>
      </div>
      <div class="unsaved-changes-actions">
        <button id="delete-user-cancel-btn" type="button" class="table-action-btn">Keep user</button>
        <button id="delete-user-confirm-btn" type="button" class="table-action-btn secondary">Remove user</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  dialog.querySelector("#delete-user-cancel-btn")?.addEventListener("click", () => {
    closeDeleteUserDialog(false);
  });

  dialog.querySelector("#delete-user-confirm-btn")?.addEventListener("click", () => {
    closeDeleteUserDialog(true);
  });

  dialog.querySelector("#delete-user-close-btn")?.addEventListener("click", () => {
    closeDeleteUserDialog(false);
  });

  dialog.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDeleteUserDialog(false);
    }
  });

  return dialog;
}

function closeDeleteUserDialog(shouldDelete) {
  const dialog = document.getElementById("delete-user-dialog");

  if (dialog) {
    dialog.classList.remove("show");

    setTimeout(() => {
      dialog.hidden = true;
    }, 180);
  }

  document.body.classList.remove("modal-open");

  const resolver = deleteUserDialogResolve;
  deleteUserDialogResolve = null;

  if (resolver) {
    resolver(Boolean(shouldDelete));
  }
}

function showDeleteUserDialog(user) {
  const dialog = ensureDeleteUserDialog();
  const message = dialog.querySelector("#delete-user-message");
  const warning = dialog.querySelector("#delete-user-warning");
  const userLabel = getAdminUserErrorLabel(user);

  if (message) {
    message.textContent = `Are you sure you want to remove ${userLabel}?`;
  }

  if (warning) {
    warning.textContent = "This also removes their expenses.";
  }

  if (deleteUserDialogResolve) {
    return new Promise(resolve => {
      const previousResolve = deleteUserDialogResolve;
      deleteUserDialogResolve = value => {
        previousResolve(value);
        resolve(value);
      };
    });
  }

  dialog.hidden = false;
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    dialog.classList.add("show");
    dialog.querySelector("#delete-user-cancel-btn")?.focus({ preventScroll: true });
  });

  return new Promise(resolve => {
    deleteUserDialogResolve = resolve;
  });
}

function hasOpenEditableTableSession(options = {}) {
  const { commitActive = true } = options;

  if (!isEditMode && !isAdminEditMode) return false;

  if (commitActive) {
    if (isEditMode) {
      commitActiveTableCell();
    }

    if (isAdminEditMode) {
      commitAdminEditableCell(document.activeElement?.closest?.("[data-admin-field]"));
    }
  }

  return true;
}

async function confirmDiscardUnsavedChanges() {
  if (!hasOpenEditableTableSession()) return true;
  return showUnsavedChangesDialog();
}

async function guardedResetDashboardView(event) {
  event?.preventDefault?.();

  if (!(await confirmDiscardUnsavedChanges())) return;

  resetDashboardView();
}

async function handleAdminRefreshClick(event) {
  event?.preventDefault?.();

  if (!(await confirmDiscardUnsavedChanges())) return;

  discardUnsavedEditableTableChanges();
  await loadAdminProfileData();
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

function updateAdminUsersPaginationDisplay(totalItems, startIndex = 0, endIndex = 0) {
  const indicator = document.getElementById("admin-users-page-indicator");
  const prevBtn = document.getElementById("admin-users-prev-page-btn");
  const nextBtn = document.getElementById("admin-users-next-page-btn");

  if (!indicator || !prevBtn || !nextBtn) return;

  if (totalItems === 0) {
    indicator.textContent = "0-0 of 0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  indicator.textContent = `${startIndex}-${endIndex} of ${totalItems}`;
  prevBtn.disabled = adminUsersPage === 1;
  nextBtn.disabled = endIndex >= totalItems;
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


function getExpenseOrderKey(expense) {
  return expense?.id != null ? `id:${expense.id}` : `name:${expense?.expenseName || ""}|date:${expense?.date || ""}`;
}

function captureEditModeOrder() {
  // Capture the table order exactly as the user sees it before entering edit mode.
  // This prevents rows from moving while draft amount/date values are being edited.
  editModeOrderIds = getFilteredExpenses(expenses, true).map(getExpenseOrderKey);
}

function clearEditModeOrder() {
  editModeOrderIds = [];
}

function applyFrozenEditOrder(filtered) {
  if (!isEditMode || editModeOrderIds.length === 0) return filtered;

  const orderMap = new Map(editModeOrderIds.map((key, index) => [key, index]));
  const fallbackStart = editModeOrderIds.length + 1;

  return filtered.sort((a, b) => {
    const orderA = orderMap.has(getExpenseOrderKey(a))
      ? orderMap.get(getExpenseOrderKey(a))
      : fallbackStart;
    const orderB = orderMap.has(getExpenseOrderKey(b))
      ? orderMap.get(getExpenseOrderKey(b))
      : fallbackStart;

    return orderA - orderB;
  });
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

  if (isEditMode && editModeOrderIds.length > 0) {
    return applyFrozenEditOrder(filtered);
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

function parseCurrencyInput(value) {
  return String(value ?? "")
    .replace(/[$,\s]/g, "")
    .trim();
}

function getCurrencyNumber(value) {
  const cleanedValue = parseCurrencyInput(value);

  if (cleanedValue === "") return null;

  return Number(cleanedValue);
}

function formatAmountInputValue() {
  if (!amountInput) return;

  const amount = getCurrencyNumber(amountInput.value);

  if (amount === null || !Number.isFinite(amount)) return;

  amountInput.value = formatCurrency(amount);
}

function resetAmountInputToRawValue() {
  if (!amountInput) return;

  amountInput.value = parseCurrencyInput(amountInput.value);
}

function hasInvalidLeadingZero(value) {
  const normalizedValue = parseCurrencyInput(value);

  return /^0\d/.test(normalizedValue);
}

function isValidDate(value, options = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const { allowFuture = true } = options;
  const [year, month, day] = value.split("-").map(Number);

  if (year > MAX_VALID_YEAR) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(`${value}T00:00:00`);
  const isRealCalendarDate =
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day;

  if (!isRealCalendarDate) return false;

  if (!allowFuture && value > getTodayLocalDate()) return false;

  return true;
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

function formatAmountDisplay(value) {
  const amount = getCurrencyNumber(value);

  if (amount === null || !Number.isFinite(amount)) {
    return String(value ?? "");
  }

  return formatCurrency(amount);
}

function getAmountEditDisplay(value) {
  const rawValue = String(value ?? "").replace(/\n/g, "").trim();
  const withoutCurrencySymbol = rawValue.replace(/\$/g, "").trim();

  return `$${withoutCurrencySymbol}`;
}

function getDateEditDisplay(value) {
  const rawValue = String(value ?? "").replace(/\n/g, "").trim();
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 8);

  if (digitsOnly.length > 4) {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
  }

  if (digitsOnly.length > 2) {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  }

  return digitsOnly;
}

const DATE_SEGMENT_PLACEHOLDERS = {
  month: "MM",
  day: "DD",
  year: "YYYY"
};

let addExpenseDateSegmentsBound = false;

function getAddExpenseDateSegments() {
  const root = document.getElementById("date-segmented-input");

  return {
    root,
    month: root?.querySelector('[data-add-date-segment="month"]') || null,
    day: root?.querySelector('[data-add-date-segment="day"]') || null,
    year: root?.querySelector('[data-add-date-segment="year"]') || null
  };
}

function getAddDateSegmentMaxLength(segment) {
  return segment === "year" ? 4 : 2;
}

function getCleanAddDateSegmentValue(inputOrValue, segment = "") {
  const rawValue = typeof inputOrValue === "string"
    ? inputOrValue
    : inputOrValue?.value ?? "";

  return String(rawValue)
    .replace(/\D/g, "")
    .slice(0, getAddDateSegmentMaxLength(segment));
}

function updateAddDateSegmentState(input) {
  if (!input) return;

  const segment = input.dataset.addDateSegment || "";
  const cleanValue = getCleanAddDateSegmentValue(input, segment);

  input.value = cleanValue;
  input.classList.toggle("is-placeholder", cleanValue === "");
}

function updateAddExpenseDateSegmentStates() {
  const { month, day, year } = getAddExpenseDateSegments();

  [month, day, year].forEach(updateAddDateSegmentState);
}

function hasAnyAddExpenseDateSegmentValue() {
  const { month, day, year } = getAddExpenseDateSegments();

  return Boolean(
    getCleanAddDateSegmentValue(month, "month") ||
    getCleanAddDateSegmentValue(day, "day") ||
    getCleanAddDateSegmentValue(year, "year")
  );
}

function getAddExpenseDateDisplayValue() {
  const { month, day, year } = getAddExpenseDateSegments();

  const monthValue = getCleanAddDateSegmentValue(month, "month");
  const dayValue = getCleanAddDateSegmentValue(day, "day");
  const yearValue = getCleanAddDateSegmentValue(year, "year");

  if (!monthValue && !dayValue && !yearValue) return "";

  return `${monthValue}/${dayValue}/${yearValue}`;
}

function setAddExpenseDateSegmentsFromIsoOrDisplay(value = "") {
  const { root, month, day, year } = getAddExpenseDateSegments();
  if (!root || !month || !day || !year) return;

  const rawValue = String(value || "").trim();
  let monthValue = "";
  let dayValue = "";
  let yearValue = "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    yearValue = rawValue.slice(0, 4);
    monthValue = rawValue.slice(5, 7);
    dayValue = rawValue.slice(8, 10);
  } else {
    const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 8);
    monthValue = digitsOnly.slice(0, 2);
    dayValue = digitsOnly.slice(2, 4);
    yearValue = digitsOnly.slice(4, 8);
  }

  month.value = monthValue;
  day.value = dayValue;
  year.value = yearValue;

  updateAddExpenseDateSegmentStates();
}

function resetAddExpenseDateSegmentsToPlaceholders() {
  const { month, day, year } = getAddExpenseDateSegments();

  [month, day, year].forEach(input => {
    if (!input) return;
    input.value = "";
    input.classList.add("is-placeholder");
  });

  if (dateManualInput) {
    dateManualInput.value = "";
  }
}

function bindAddExpenseSegmentedDateEvents() {
  const { root } = getAddExpenseDateSegments();
  if (!root || addExpenseDateSegmentsBound) return;

  addExpenseDateSegmentsBound = true;

  root.addEventListener("focusin", event => {
    const input = event.target.closest(".add-date-segment");
    if (!input) return;

    root.classList.remove("error");
    dateInput?.classList.remove("error");
    if (dateError) dateError.textContent = "";

    updateAddDateSegmentState(input);

    requestAnimationFrame(() => {
      if (document.activeElement === input) {
        input.select();
      }
    });
  });

  root.addEventListener("beforeinput", event => {
    const input = event.target.closest(".add-date-segment");
    if (!input) return;

    const segment = input.dataset.addDateSegment || "";
    const maxLength = getAddDateSegmentMaxLength(segment);
    const currentValue = getCleanAddDateSegmentValue(input, segment);
    const selectionStart = input.selectionStart ?? currentValue.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;
    const selectedLength = Math.max(0, selectionEnd - selectionStart);

    if (event.inputType?.startsWith("insert")) {
      const insertedText = event.data || "";

      if (!/^\d*$/.test(insertedText)) {
        event.preventDefault();
        return;
      }

      const nextLength = currentValue.length - selectedLength + insertedText.length;

      if (nextLength > maxLength) {
        event.preventDefault();
        return;
      }
    }

    if (
      (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") &&
      currentValue.length === 0
    ) {
      event.preventDefault();
    }
  });

  root.addEventListener("keydown", event => {
    const input = event.target.closest(".add-date-segment");
    if (!input) return;

    const allowedKeys = [
      "Backspace", "Delete", "Tab", "Enter", "Escape",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];

    const segment = input.dataset.addDateSegment || "";
    const cleanValue = getCleanAddDateSegmentValue(input, segment);

    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
      return;
    }

    if ((event.key === "Backspace" || event.key === "Delete") && cleanValue.length === 0) {
      event.preventDefault();
      return;
    }

    if (!allowedKeys.includes(event.key) && event.key.length !== 1) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      syncTypedDateToHidden(true);
      input.blur();
    }
  });

  root.addEventListener("paste", event => {
    const input = event.target.closest(".add-date-segment");
    if (!input) return;

    event.preventDefault();

    const segment = input.dataset.addDateSegment || "";
    const maxLength = getAddDateSegmentMaxLength(segment);
    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, maxLength);

    input.value = pastedDigits;
    updateAddDateSegmentState(input);
    syncTypedDateToHidden(false);
  });

  root.addEventListener("input", event => {
    const input = event.target.closest(".add-date-segment");
    if (!input) return;

    updateAddDateSegmentState(input);

    root.classList.remove("error");
    dateInput?.classList.remove("error");
    if (dateError) dateError.textContent = "";

    syncTypedDateToHidden(false);
  });

  root.addEventListener("focusout", event => {
    if (root.contains(event.relatedTarget)) return;

    updateAddExpenseDateSegmentStates();
    syncTypedDateToHidden(hasAnyAddExpenseDateSegmentValue());
  });
}

ensureTypedDateInput();
ensureAddExpenseCategoryMenu();

function getDateDisplayParts(value) {
  const rawValue = String(value ?? "").trim();
  const displayValue = /^\d{4}-\d{2}-\d{2}$/.test(rawValue)
    ? formatDateDisplay(rawValue)
    : getDateEditDisplay(rawValue);
  const digitsOnly = String(displayValue ?? "").replace(/\D/g, "").slice(0, 8);

  return {
    month: digitsOnly.slice(0, 2),
    day: digitsOnly.slice(2, 4),
    year: digitsOnly.slice(4, 8)
  };
}

function getDateSegmentPlaceholder(segment) {
  return DATE_SEGMENT_PLACEHOLDERS[segment] || "";
}

function isDateSegmentPlaceholderValue(value, segment = "") {
  const rawValue = String(value ?? "").trim().toUpperCase();
  const placeholder = getDateSegmentPlaceholder(segment);

  if (placeholder) return rawValue === placeholder;

  return Object.values(DATE_SEGMENT_PLACEHOLDERS).includes(rawValue);
}

function getDateSegmentMaxLength(segment) {
  return segment === "year" ? 4 : 2;
}

function getCleanDateSegmentValue(inputOrValue, segment = "") {
  const rawValue = typeof inputOrValue === "string"
    ? inputOrValue
    : inputOrValue?.value ?? "";

  if (isDateSegmentPlaceholderValue(rawValue, segment)) return "";

  return String(rawValue).replace(/\D/g, "").slice(0, getDateSegmentMaxLength(segment));
}

function setDateSegmentPlaceholder(input) {
  if (!input) return;

  const segment = input.dataset.segment || "";
  const placeholder = getDateSegmentPlaceholder(segment);

  if (!placeholder) return;

  // Use the real input placeholder, not the input value.
  // This keeps MM/DD/YYYY visible but prevents users from deleting the
  // placeholder text or the / separators as editable content.
  input.placeholder = placeholder;

  if (isDateSegmentPlaceholderValue(input.value, segment)) {
    input.value = "";
  }

  if (!getCleanDateSegmentValue(input, segment)) {
    input.value = "";
    input.classList.add("is-placeholder");
  }

  input.setAttribute("aria-label", `${segment || "date"} ${placeholder}`);
}

function clearDateSegmentPlaceholder(input) {
  if (!input) return;

  const segment = input.dataset.segment || "";

  // Backward compatibility: older versions stored MM/DD/YYYY placeholders
  // inside value. Clear those only; normal placeholder text is not a value.
  if (isDateSegmentPlaceholderValue(input.value, segment)) {
    input.value = "";
  }

  input.classList.remove("is-placeholder");
}

function ensureDateSegmentPlaceholder(input) {
  if (!input) return;

  const segment = input.dataset.segment || "";
  const cleanValue = getCleanDateSegmentValue(input, segment);

  if (!cleanValue) {
    setDateSegmentPlaceholder(input);
    return;
  }

  input.value = cleanValue;
  input.classList.remove("is-placeholder");
}

function restoreDateEditorPlaceholders(editorOrCell) {
  const root = editorOrCell?.querySelector?.(".table-date-editor") || editorOrCell;
  if (!root) return;

  root.querySelectorAll(".table-date-segment").forEach(ensureDateSegmentPlaceholder);
}

function isDateSegmentValueComplete(segment, value) {
  return getCleanDateSegmentValue(value, segment).length === getDateSegmentMaxLength(segment);
}

function isDateSegmentValueValid(segment, value) {
  const cleanValue = getCleanDateSegmentValue(value, segment);

  if (!isDateSegmentValueComplete(segment, cleanValue)) return false;

  const numberValue = Number(cleanValue);

  if (segment === "month") return numberValue >= 1 && numberValue <= 12;
  if (segment === "day") return numberValue >= 1 && numberValue <= 31;
  if (segment === "year") return numberValue >= 1 && numberValue <= MAX_VALID_YEAR;

  return true;
}

function updateDateSegmentState(input) {
  if (!input) return;

  const segment = input.dataset.segment || "";
  const cleanValue = getCleanDateSegmentValue(input, segment);
  const isPlaceholder = cleanValue === "";
  const isComplete = isDateSegmentValueComplete(segment, cleanValue);
  const isInvalid = Boolean(cleanValue) && isComplete && !isDateSegmentValueValid(segment, cleanValue);

  if (isPlaceholder) {
    setDateSegmentPlaceholder(input);
  } else {
    input.value = cleanValue;
    input.classList.remove("is-placeholder");
  }

  input.classList.toggle("is-placeholder", isPlaceholder);
  input.classList.toggle("is-incomplete", Boolean(cleanValue) && !isComplete);
  input.classList.toggle("is-segment-invalid", isInvalid);
}

function updateDateEditorSegmentStates(editorOrCell) {
  const root = editorOrCell?.querySelector?.(".table-date-editor") || editorOrCell;
  if (!root) return;

  root.querySelectorAll(".table-date-segment").forEach(updateDateSegmentState);
}

function createDateEditorMarkup(value, index) {
  const parts = getDateDisplayParts(value);

  const segmentMarkup = (segment, className, label) => {
    const placeholder = getDateSegmentPlaceholder(segment);
    const rawValue = parts[segment] || "";
    const placeholderClass = rawValue ? "" : " is-placeholder";

    return `
      <input
        class="table-date-segment ${className}${placeholderClass}"
        data-field="date"
        data-index="${index}"
        data-segment="${segment}"
        data-placeholder-value="${placeholder}"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="${getDateSegmentMaxLength(segment)}"
        aria-label="${label}"
        placeholder="${placeholder}"
        value="${escapeHtml(rawValue)}"
      >
    `;
  };

  return `
    <div class="table-date-editor" data-index="${index}" aria-label="Edit date" contenteditable="false">
      ${segmentMarkup("month", "table-date-month", "Month")}
      <span class="table-date-separator" aria-hidden="true">/</span>
      ${segmentMarkup("day", "table-date-day", "Day")}
      <span class="table-date-separator" aria-hidden="true">/</span>
      ${segmentMarkup("year", "table-date-year", "Year")}
    </div>
  `;
}

function getDateEditValueFromCell(cell) {
  const input = cell?.querySelector?.(".table-date-input");

  if (input) {
    return getDateEditDisplay(input.value || "");
  }

  // Date cells use segmented inputs so the / characters are never editable text.
  const editor = cell?.querySelector?.(".table-date-editor");

  if (!editor) {
    return getDateEditDisplay(cell?.innerText || "");
  }

  const monthInput = editor.querySelector('[data-segment="month"]');
  const dayInput = editor.querySelector('[data-segment="day"]');
  const yearInput = editor.querySelector('[data-segment="year"]');

  const month = getCleanDateSegmentValue(monthInput, "month");
  const day = getCleanDateSegmentValue(dayInput, "day");
  const year = getCleanDateSegmentValue(yearInput, "year");

  return `${month}/${day}/${year}`;
}

function normalizeDateInputValue(input) {
  if (!input) return;

  const previousValue = input.value;
  const selectionStart = input.selectionStart ?? previousValue.length;
  const digitsBeforeCaret = previousValue.slice(0, selectionStart).replace(/\D/g, "").length;
  const nextValue = getDateEditDisplay(previousValue);

  if (previousValue !== nextValue) {
    input.value = nextValue;
    const nextCaret = getDateCaretOffsetFromDigitCount(nextValue, digitsBeforeCaret);
    requestAnimationFrame(() => {
      input.setSelectionRange(nextCaret, nextCaret);
    });
  }
}

function sanitizeDateSegmentInput(input) {
  if (!input) return;

  const segment = input.dataset.segment || "";
  const maxLength = getDateSegmentMaxLength(segment);
  const sanitizedValue = getCleanDateSegmentValue(input, segment).slice(0, maxLength);

  if (input.value !== sanitizedValue) {
    const selectionStart = Math.min(input.selectionStart ?? sanitizedValue.length, sanitizedValue.length);
    input.value = sanitizedValue;

    requestAnimationFrame(() => {
      input.setSelectionRange(selectionStart, selectionStart);
    });
  }

  if (sanitizedValue) {
    input.classList.remove("is-placeholder");
  } else {
    setDateSegmentPlaceholder(input);
  }

  updateDateSegmentState(input);
}

function prepareDateSegmentForEdit(input) {
  if (!input) return;

  clearDateSegmentPlaceholder(input);

  requestAnimationFrame(() => {
    if (document.activeElement === input) {
      input.select();
    }
  });
}

function selectDateSegment(input) {
  prepareDateSegmentForEdit(input);
}

function selectDateInput(input) {
  if (!input) return;

  requestAnimationFrame(() => {
    if (typeof input.setSelectionRange === "function") {
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
  });
}

function syncDateCellFromEditor(cell) {
  if (!cell || !isEditMode) return;

  updateDateEditorSegmentStates(cell);

  const index = Number(cell.dataset.index);
  if (!Number.isInteger(index)) return;

  const value = getDateEditValueFromCell(cell);
  const dateResult = validateEditedDateValue(value);

  draftExpenses[index].dateError = dateResult.error;
  draftExpenses[index].dateEditValue = value;

  if (dateResult.error) {
    cell.classList.add("invalid-edit-cell");
    cell.title = dateResult.error;
    return;
  }

  // Keep the typed date in dateEditValue until Save so the row never re-sorts
  // while the user is still editing. validateDraftTableEdits() commits it.
  cell.classList.remove("invalid-edit-cell");
  cell.title = formatDateDisplay(dateResult.isoDate);
}


function getEditableCellTextSurface(cell) {
  if (!cell) return null;

  let surface = cell.querySelector?.(":scope > .cell-text") || cell.querySelector?.(".cell-text");

  // Amount/title/description cells rely on .cell-text for the edit border.
  // If previous editing replaced the td contents with raw text, restore the span
  // instead of leaving the cell without a border target.
  if (!surface && !cell.querySelector?.(".table-date-editor")) {
    const text = cell.textContent || "";
    cell.textContent = "";
    surface = document.createElement("span");
    surface.className = "cell-text";
    surface.textContent = text;
    cell.appendChild(surface);
  }

  return surface;
}

function getEditableCellText(cell) {
  const surface = getEditableCellTextSurface(cell);
  return surface ? surface.textContent : (cell?.innerText || "");
}

function setEditableCellText(cell, value, caretOffset = null) {
  const surface = getEditableCellTextSurface(cell);

  if (surface) {
    surface.textContent = String(value ?? "");

    if (caretOffset != null) {
      setCaretCharacterOffsetWithin(surface, caretOffset);
    }

    return;
  }

  if (cell) {
    cell.innerText = String(value ?? "");

    if (caretOffset != null) {
      setCaretCharacterOffsetWithin(cell, caretOffset);
    }
  }
}

function getCaretCharacterOffsetWithin(element) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();

  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}

function setCaretCharacterOffsetWithin(element, offset) {
  if (!element) return;

  const selection = window.getSelection();
  if (!selection) return;

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  const safeOffset = Math.max(0, Math.min(offset, element.textContent.length));
  let remaining = safeOffset;
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent.length;

    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    remaining -= length;
    node = walker.nextNode();
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function getDateCaretOffsetFromDigitCount(value, digitCount) {
  if (digitCount <= 0) return 0;

  let digitsSeen = 0;

  for (let i = 0; i < value.length; i++) {
    if (/\d/.test(value[i])) {
      digitsSeen++;
    }

    if (digitsSeen >= digitCount) {
      return i + 1;
    }
  }

  return value.length;
}

function normalizeEditableAmountCell(cell) {
  if (!cell) return;

  const currentValue = getEditableCellText(cell).replace(/\n/g, "");
  const caretOffset = getCaretCharacterOffsetWithin(cell);
  const normalizedValue = getAmountEditDisplay(currentValue);

  if (currentValue === normalizedValue) {
    getEditableCellTextSurface(cell);
    return;
  }

  const wasMissingCurrencySymbol = !currentValue.trim().startsWith("$");
  const nextCaretOffset = wasMissingCurrencySymbol
    ? Math.max(1, caretOffset + 1)
    : Math.max(1, caretOffset);

  setEditableCellText(cell, normalizedValue, nextCaretOffset);
}

function normalizeEditableDateCell(cell) {
  if (!cell) return;

  const currentValue = cell.innerText.replace(/\n/g, "");
  const caretOffset = getCaretCharacterOffsetWithin(cell);
  const digitCountBeforeCaret = currentValue.slice(0, caretOffset).replace(/\D/g, "").length;
  const normalizedValue = getDateEditDisplay(currentValue);

  if (currentValue === normalizedValue) return;

  cell.innerText = normalizedValue;
  setCaretCharacterOffsetWithin(
    cell,
    getDateCaretOffsetFromDigitCount(normalizedValue, digitCountBeforeCaret)
  );
}

function validateEditedAmountValue(value) {
  const rawValue = String(value ?? "").trim();
  const cleanedValue = parseCurrencyInput(rawValue);

  if (cleanedValue === "") {
    return "Amount is required";
  }

  if (hasInvalidLeadingZero(rawValue)) {
    return "Amount cannot start with 0";
  }

  if (!/^\d+(\.\d{1,2})?$/.test(cleanedValue)) {
    return "Use a valid amount";
  }

  const numericValue = Number(cleanedValue);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "Amount must be greater than 0";
  }

  return "";
}

function validateEditedDateValue(value) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return {
      error: "Date is required",
      isoDate: ""
    };
  }

  if (/[^0-9\/-]/.test(rawValue)) {
    return {
      error: "Use numbers only for the date",
      isoDate: rawValue
    };
  }

  const isoDate = parseTypedDateToIso(rawValue);

  if (!isoDate) {
    return {
      error: "Use a valid date",
      isoDate: rawValue
    };
  }

  const year = Number(isoDate.slice(0, 4));

  if (year > MAX_VALID_YEAR) {
    return {
      error: `Year cannot be after ${MAX_VALID_YEAR}`,
      isoDate
    };
  }

  if (!isValidDate(isoDate, { allowFuture: true })) {
    return {
      error: "Use a valid date",
      isoDate: rawValue
    };
  }

  if (isoDate > getTodayLocalDate()) {
    return {
      error: "Date cannot be after today",
      isoDate
    };
  }

  return {
    error: "",
    isoDate
  };
}

function validateDraftTableEdits() {
  let hasInvalidValues = false;
  const validatedValues = [];

  draftExpenses.forEach(expense => {
    const amountValueToValidate =
      expense.amountEditValue !== "" && expense.amountEditValue != null
        ? expense.amountEditValue
        : expense.amount;

    const dateValueToValidate =
      expense.dateEditValue !== "" && expense.dateEditValue != null
        ? expense.dateEditValue
        : expense.date;

    const amountError = validateEditedAmountValue(amountValueToValidate);
    const dateResult = validateEditedDateValue(dateValueToValidate);

    expense.amountError = amountError;
    expense.dateError = dateResult.error;

    if (amountError) {
      expense.amountEditValue = String(amountValueToValidate ?? "");
      hasInvalidValues = true;
    }

    if (dateResult.error) {
      // Invalid table dates reset to MM/DD/YYYY segmented placeholders after Save.
      // The slash separators remain protected because they are not editable inputs.
      expense.dateEditValue = "";
      hasInvalidValues = true;
    }

    validatedValues.push({
      expense,
      amountValueToValidate,
      dateResult
    });
  });

  // Do not commit any draft amount/date into the saved fields until every
  // edited value is valid. This keeps table order stable after a failed Save.
  if (hasInvalidValues) {
    return false;
  }

  validatedValues.forEach(({ expense, amountValueToValidate, dateResult }) => {
    expense.amount = Number(parseCurrencyInput(amountValueToValidate));
    expense.amountEditValue = "";
    expense.date = dateResult.isoDate;
    expense.dateEditValue = "";
  });

  return true;
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

function createExpenseCategoryCellMarkup(selectedCategory, index, isEditable) {
  const options = Array.from(categoryInput.options);
  const activeOption =
    options.find(option => option.value === selectedCategory) ||
    options[0];
  const label = activeOption?.textContent?.trim() || selectedCategory || "Category";
  const tabIndex = isEditable ? "0" : "-1";

  return `
    <details class="expense-category-menu" data-expense-category-menu>
      <summary
        class="expense-category-trigger"
        data-field="category"
        data-index="${index}"
        aria-label="Category: ${escapeHtml(label)}"
        tabindex="${tabIndex}"
      >
        <span class="expense-category-label">${escapeHtml(label)}</span>
        <span class="toolbar-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="expense-category-menu-panel">
        ${options.map(option => {
          const value = option.value;
          const text = option.textContent.trim();

          return `
            <button
              class="expense-category-option ${value === selectedCategory ? "active" : ""}"
              data-expense-category-value="${escapeHtml(value)}"
              data-index="${index}"
              type="button"
              ${!isEditable ? "disabled" : ""}
            >${escapeHtml(text)}</button>
          `;
        }).join("")}
      </div>
    </details>
  `;
}

function applyRowTooltips(row, expense) {
  const rowCells = row.querySelectorAll("td");
  const titleCell = row.querySelector("td.title-cell");
  const titleText = titleCell?.querySelector(".cell-text");
  const categoryTrigger = row.querySelector("td.category-cell .expense-category-trigger");
  const dateCell = row.querySelector("td.date-cell");
  const dateText = dateCell?.querySelector(".cell-text");

  const titleTooltip = expense.expenseName || "";
  const amountTooltip = expense.amountError
    ? expense.amountError
    : expense.amount != null
      ? formatAmountDisplay(expense.amount)
      : "";
  const dateTooltip = expense.dateError
    ? expense.dateError
    : formatDateDisplay(expense.date) || "";
  const descriptionTooltip = expense.description || "No description";

  if (titleCell) titleCell.title = titleTooltip;
  if (titleText) titleText.title = titleTooltip;

  if (rowCells[1]) {
    rowCells[1].title = amountTooltip;
  }

  if (categoryTrigger) {
    categoryTrigger.title = expense.category || "";
  }

  if (dateCell) dateCell.title = dateTooltip;
  if (dateText) dateText.title = dateTooltip;

  if (rowCells[4]) {
    rowCells[4].title = descriptionTooltip;
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
    captureEditModeOrder();
    isEditMode = true;
    draftExpenses = cloneExpenses(expenses);
    editTableBtn.textContent = "Save";
    cancelTableBtn.classList.remove("inactive");
  }

  selectedEditRowIndex = Number.isInteger(Number(index)) ? Number(index) : null;

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
  const rowIsEditable = isEditMode && (selectedEditRowIndex == null || selectedEditRowIndex === index);
  const lockedClass = rowIsEditable ? "" : "locked";
  const editableValue = rowIsEditable ? "true" : "false";
  const isNewlyAdded = String(expense.id) === String(newlyAddedExpenseId);
  const hasAmountError = Boolean(expense.amountError);
  const hasDateError = Boolean(expense.dateError);
  const hasAmountEditValue = isEditMode && expense.amountEditValue !== "" && expense.amountEditValue != null;
  const hasDateEditValue = isEditMode && expense.dateEditValue !== "" && expense.dateEditValue != null;

  const amountDisplay = hasAmountError
    ? getAmountEditDisplay(expense.amountEditValue)
    : hasAmountEditValue
      ? formatAmountDisplay(expense.amountEditValue)
      : formatAmountDisplay(expense.amount);

  const dateDisplay = hasDateEditValue
    ? expense.dateEditValue
    : formatDateDisplay(expense.date) || "";

  if (isNewlyAdded) {
    row.classList.add("new-expense-row");
  }

  if (isEditMode && selectedEditRowIndex === index) {
    row.classList.add("selected-edit-row");
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
      class="editable amount-cell ${lockedClass} ${hasAmountError ? "invalid-edit-cell" : ""}"
      data-field="amount"
      data-index="${index}"
      contenteditable="${editableValue}"
      title="${hasAmountError ? escapeHtml(expense.amountError) : escapeHtml(amountDisplay)}"
    >
      <span class="cell-text">${escapeHtml(amountDisplay)}</span>
    </td>

    <td class="category-cell ${lockedClass}">
      ${createExpenseCategoryCellMarkup(expense.category, index, rowIsEditable)}
    </td>

    <td
      class="editable date-cell ${lockedClass} ${hasDateError ? "invalid-edit-cell" : ""}"
      data-field="date"
      data-index="${index}"
      contenteditable="false"
      title="${hasDateError ? escapeHtml(expense.dateError) : escapeHtml(formatDateDisplay(validateEditedDateValue(dateDisplay).isoDate || expense.date) || dateDisplay)}"
    >
      ${rowIsEditable
        ? createDateEditorMarkup(dateDisplay, index)
        : `<span class="cell-text">${escapeHtml(formatDateDisplay(expense.date) || "")}</span>`}
    </td>

    <td
      class="editable description-cell ${lockedClass} ${expense.description ? "" : "empty-description"}"
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
          <svg viewBox="0 0 448 512" aria-hidden="true">
            <path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0h120.4c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64s14.3-32 32-32h96l7.2-14.3zM32 128h384l-21.2 339c-1.6 25.3-22.6 45-47.9 45H101.1c-25.3 0-46.3-19.7-47.9-45L32 128zm96 64c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"></path>
          </svg>
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
    headers: getAuthHeaders(true),
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
    headers: getAuthHeaders(true),
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
    headers: getAuthHeaders()
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

  const value = field === "date"
    ? getDateEditValueFromCell(cell)
    : field === "amount"
      ? getEditableCellText(cell)
      : cell.innerText;

  updateExpense(index, field, value, cell);
  cell.classList.remove("editing", "active-edit-cell");
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
  if (!authToken) {
    expenses = [];
    draftExpenses = [];
    renderExpenses();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/expenses`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401 || response.status === 403) {
      clearSessionData();
      renderAuthState();
      renderExpenses();
      showAppToast("Your session expired. Please log in again.", "error");
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load expenses");
    }

    const data = await response.json();
    const rawExpenses = getExpensesArrayFromResponse(data);

    expenses = rawExpenses
      .map(normalizeExpense)
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

    draftExpenses = cloneExpenses(expenses);
    if (!isEditMode) clearEditModeOrder();
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

          pointRadius: data.length ? 3.5 : 0,
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
          pointRadius: labels.length ? 3.5 : 0,
          pointHoverRadius: 5.5,
          pointBackgroundColor: "#FFFFFF",
          pointBorderColor: "rgba(245, 158, 11, 0.95)",
          pointBorderWidth: 2,
          pointHoverBorderWidth: 3,
          hitRadius: 12,
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
  const expenseTable = document.getElementById("expense-table");

  if (expenseTable) {
    expenseTable.classList.toggle("global-edit-mode", isEditMode && selectedEditRowIndex == null);
    expenseTable.classList.toggle("row-edit-mode", isEditMode && selectedEditRowIndex != null);
  }

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
  const amountValue = getCurrencyNumber(amountRaw);
  const helper = document.getElementById("amount-helper");

  helper.textContent = "";
  helper.classList.remove("error");
  amountInput.classList.remove("error");

  if (amountRaw.trim() === "") return;

  if (amountValue === null || isNaN(amountValue)) {
    helper.textContent = "Please enter a valid number";
    helper.classList.add("error");
    amountInput.classList.add("error");
  } else if (hasInvalidLeadingZero(amountRaw)) {
    helper.textContent = "Amount cannot start with 0";
    helper.classList.add("error");
    amountInput.classList.add("error");
  } else if (amountValue <= 0) {
    helper.textContent = "Amount must be greater than 0";
    helper.classList.add("error");
    amountInput.classList.add("error");
  }
}

// ---------- Actions ----------
async function addExpense() {
  if (!isLoggedIn || !authToken) {
    focusLoginPanel();
    showAppToast("Please log in to add expenses.", "error");
    return;
  }

  if (isEditMode) {
    showAddExpenseModeError("Save or cancel your table edits before adding a new expense.");
    return;
  }

  clearAddExpenseModeError();

  const typedDateIsValid = syncTypedDateToHidden(true);

  const expenseName = expenseNameInput.value.trim();
  const amountRaw = amountInput.value;
  const amountCleaned = parseCurrencyInput(amountRaw);
  const amount = amountCleaned === "" ? null : Number(amountCleaned);
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

  if (description.length > DESCRIPTION_LIMIT) {
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

    if (newlyAddedExpenseId != null) {
      jumpToExpensePage(newlyAddedExpenseId);
    } else {
      currentPage = 1;
    }

    clearStatus();
    clearAddExpenseModeError();
    renderExpenses();

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

    showAppToast("Expense added successfully.", "success");

    expenseNameInput.value = "";
    amountInput.value = "";
    descInput.value = "";
    descCounter.textContent = `0/${DESCRIPTION_LIMIT}`;

    expenseNameInput.classList.remove("error");
    amountInput.classList.remove("error");
    dateInput.classList.remove("error");
    descInput.classList.remove("error");

    expenseNameError.textContent = "";
    amountError.textContent = "";
    dateError.textContent = "";
    descError.textContent = "";

    const amountHelper = document.getElementById("amount-helper");
    if (amountHelper) {
      amountHelper.textContent = "";
      amountHelper.classList.remove("error");
    }

    setTodayDate();

    if (categoryInput) {
      categoryInput.selectedIndex = 0;
      syncAddExpenseCategoryMenu();
    }
  } catch (error) {
    console.error("Create failed:", error);

    const message = "Failed to save expense. Please check the server and try again.";
    showStatus(message, "error");
    showAppToast(message, "error");
  }
}

async function deleteExpense(index) {
  if (isEditMode) {
    draftExpenses.splice(index, 1);

    if (selectedEditRowIndex === index) {
      selectedEditRowIndex = null;
    } else if (selectedEditRowIndex != null && selectedEditRowIndex > index) {
      selectedEditRowIndex -= 1;
    }

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
    const message = "Failed to delete expense from the database.";
    showStatus(message, "error");
    showAppToast(message, "error");
  }
}

function updateExpense(index, field, value, el = null) {
  if (!isEditMode) return;

  const targetExpenses = draftExpenses;
  value = String(value ?? "").trim();

  if (field === "date") {
    const dateValue = el?.querySelector?.(".table-date-editor")
      ? getDateEditValueFromCell(el)
      : getDateEditDisplay(value);
    const dateResult = validateEditedDateValue(dateValue);

    targetExpenses[index].dateError = dateResult.error;
    targetExpenses[index].dateEditValue = dateValue;

    if (dateResult.error) {
      if (el) {
        el.classList.add("invalid-edit-cell");
        el.title = dateResult.error;

        if (!el.querySelector(".table-date-editor")) {
          el.innerText = getDateEditDisplay(dateValue);
        }
      }

      return;
    }

    // Do not update targetExpenses[index].date here. Keeping the saved date
    // stable prevents the row from re-sorting before the Save action succeeds.
    if (el) {
      el.classList.remove("invalid-edit-cell");
      el.title = formatDateDisplay(dateResult.isoDate);

      if (!el.querySelector(".table-date-editor")) {
        el.innerText = formatDateDisplay(dateResult.isoDate);
      }
    }

    return;
  }

  if (field === "amount") {
    const amountError = validateEditedAmountValue(value);
    const normalizedAmountValue = getAmountEditDisplay(value);

    targetExpenses[index].amountError = amountError;
    targetExpenses[index].amountEditValue = normalizedAmountValue;

    if (amountError) {
      if (el) {
        setEditableCellText(el, normalizedAmountValue);
        el.classList.add("invalid-edit-cell");
        el.title = amountError;
      }

      return;
    }

    // Do not update targetExpenses[index].amount here. validateDraftTableEdits()
    // commits the parsed number on Save, which keeps row order stable while editing.
    if (el) {
      const formattedAmount = formatCurrency(Number(parseCurrencyInput(value)));
      setEditableCellText(el, formattedAmount);
      el.classList.remove("invalid-edit-cell");
      el.title = formattedAmount;
    }

    return;
  }

  if (field === "expenseName") {
    const titleValue = value.replace(/\n/g, " ");
    targetExpenses[index].expenseName = titleValue;

    if (el) {
      const titleSurface = getEditableCellTextSurface(el);
      el.title = titleValue;

      if (titleSurface) {
        titleSurface.title = titleValue;
      }
    }

    return;
  }

  if (field === "description") {
    const limitedValue = value.slice(0, DESCRIPTION_LIMIT);
    targetExpenses[index].description = limitedValue;

    if (el) {
      el.title = limitedValue;

      const descriptionSurface = getEditableCellTextSurface(el);
      if (descriptionSurface) {
        descriptionSurface.title = limitedValue;
      }

      if (el.innerText !== limitedValue) {
        el.innerText = limitedValue;
        focusEditableCellAtEnd(el);
      }
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
  selectedEditRowIndex = null;
  clearEditModeOrder();

  if (expenseSearchInput) {
    expenseSearchInput.value = "";
  }

  if (searchIconBtn) {
    searchIconBtn.disabled = true;
  }

  editTableBtn.textContent = "Edit";
  cancelTableBtn.classList.add("inactive");

  syncFilterMenuState();

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
  clearAddExpenseModeError();
  setTodayDate();
  isAdminPanelOpen = false;
  isAdminEditMode = false;
  selectedAdminUserIndex = null;
  draftAdminUsers = [];
  renderAdminPanelState();
  renderPageSections();
  renderExpenses();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || "null");
  } catch (error) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

function cacheLoginElements() {
  loginPanel = document.getElementById("login-panel");
  loginForm = document.getElementById("login-form");
  loginIdentifierInput = document.getElementById("login-identifier");
  loginPasswordInput = document.getElementById("login-password");
  loginIdentifierError = document.getElementById("login-identifier-error");
  loginPasswordError = document.getElementById("login-password-error");
  loginSubmitBtn = document.getElementById("login-submit-btn");
}

function cacheAuthPageElements() {
  authPage = document.getElementById("auth-page");
  loginForm = document.getElementById("login-form");
  loginIdentifierInput = document.getElementById("login-identifier");
  loginPasswordInput = document.getElementById("login-password");
  loginIdentifierError = document.getElementById("login-identifier-error");
  loginPasswordError = document.getElementById("login-password-error");
  loginSubmitBtn = document.getElementById("login-submit-btn");
}

function ensureAuthPage() {
  if (!authPage) {
    const section = document.createElement("section");
    section.id = "auth-page";
    section.className = "auth-page";

    section.innerHTML = `
      <div class="auth-copy">
        <p class="auth-kicker">Welcome to Spendflow</p>
        <h2 id="auth-heading">Hi there, ready to start tracking your spending?</h2>
        <p>
          Log in or register to manage your expenses, review spending patterns,
          and keep your account activity connected to your profile.
        </p>
      </div>

      <div class="auth-card">
        <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button id="auth-login-tab" class="auth-tab active" type="button" data-auth-mode="login">Log in</button>
          <button id="auth-register-tab" class="auth-tab" type="button" data-auth-mode="register">Register</button>
        </div>

        <form id="login-form" class="auth-form" novalidate>
          <div class="field-group login-field-group">
            <label for="login-identifier">Email or username</label>
            <input
              id="login-identifier"
              type="text"
              placeholder="Email or username"
              autocomplete="username"
            >
            <p id="login-identifier-error" class="error-text"></p>
          </div>

          <div class="field-group login-field-group">
            <label for="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Password"
              autocomplete="current-password"
            >
            <p id="login-password-error" class="error-text"></p>
          </div>

          <button id="login-submit-btn" class="login-submit-btn auth-submit-btn" type="submit">
            Log in
          </button>
        </form>

        <form id="register-form" class="auth-form" novalidate hidden>
          <div class="field-group">
            <label for="register-username">Username</label>
            <input id="register-username" type="text" placeholder="Username" autocomplete="username">
            <p id="register-username-error" class="error-text"></p>
          </div>

          <div class="field-group">
            <label for="register-email">Email</label>
            <input id="register-email" type="email" placeholder="Email" autocomplete="email">
            <p id="register-email-error" class="error-text"></p>
          </div>

          <div class="field-group">
            <label for="register-password">Password</label>
            <input id="register-password" type="password" placeholder="At least 6 characters" autocomplete="new-password">
            <p id="register-password-error" class="error-text"></p>
          </div>

          <button id="register-submit-btn" class="login-submit-btn auth-submit-btn" type="submit">
            Create account
          </button>
        </form>
      </div>
    `;

    const main = document.querySelector("main");
    const status = document.getElementById("app-status");

    if (status) {
      status.insertAdjacentElement("afterend", section);
    } else {
      main?.prepend(section);
    }

    authPage = section;
  }

  if (!authPage.dataset.bound) {
    authPage.dataset.bound = "true";
    authPage.addEventListener("click", handleAuthPageClick);
    authPage.querySelector("#register-form")?.addEventListener("submit", handleRegisterSubmit);
  }

  cacheAuthPageElements();
}

function ensureLoginPanel() {
  ensureAuthPage();
  cacheLoginElements();
}

function getDisplayNameFromLoginValue(value) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "";

  const displayValue = cleanValue.includes("@") ? cleanValue.split("@")[0] : cleanValue;

  return capitalizeFirstLetter(displayValue);
}

function capitalizeFirstLetter(value) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) return "";

  return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
}

function getCurrentDisplayName() {
  const displayName = (
    currentUser?.displayName ||
    currentUser?.username ||
    getDisplayNameFromLoginValue(currentUser?.email) ||
    currentUser?.name ||
    "Marsi"
  );

  return capitalizeFirstLetter(displayName);
}

function updateGreetingText() {
  if (!heroGreeting) return;

  const displayName = isLoggedIn ? getCurrentDisplayName() : "there";
  heroGreeting.textContent = `Hi ${displayName}, ready to track today’s spending?`;
}

function setLoginFieldError(input, errorElement, message) {
  input?.classList.add("error");

  if (errorElement) {
    errorElement.textContent = message;
  }
}

function clearLoginErrors() {
  loginIdentifierInput?.classList.remove("error");
  loginPasswordInput?.classList.remove("error");

  if (loginIdentifierError) loginIdentifierError.textContent = "";
  if (loginPasswordError) loginPasswordError.textContent = "";
}

function isValidEmailFormat(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function validateLoginForm() {
  const loginValue = loginIdentifierInput?.value.trim() || "";
  const passwordValue = loginPasswordInput?.value || "";
  let hasError = false;

  clearLoginErrors();

  if (!loginValue) {
    setLoginFieldError(loginIdentifierInput, loginIdentifierError, "Email or username");
    hasError = true;
  } else if (loginValue.includes("@") && !isValidEmailFormat(loginValue)) {
    setLoginFieldError(loginIdentifierInput, loginIdentifierError, "Please enter a valid email");
    hasError = true;
  }

  if (!passwordValue) {
    setLoginFieldError(loginPasswordInput, loginPasswordError, "Password");
    hasError = true;
  }

  return {
    isValid: !hasError,
    loginValue,
    passwordValue
  };
}

function clearRegisterErrors() {
  ["username", "email", "password"].forEach(field => {
    const input = document.getElementById(`register-${field}`);
    const error = document.getElementById(`register-${field}-error`);

    input?.classList.remove("error");
    if (error) error.textContent = "";
  });
}

function setRegisterFieldError(field, message) {
  const input = document.getElementById(`register-${field}`);
  const error = document.getElementById(`register-${field}-error`);

  input?.classList.add("error");
  if (error) error.textContent = message;
}

function validateRegisterForm() {
  const username = document.getElementById("register-username")?.value.trim() || "";
  const email = document.getElementById("register-email")?.value.trim() || "";
  const password = document.getElementById("register-password")?.value || "";
  let hasError = false;

  clearRegisterErrors();

  if (!username) {
    setRegisterFieldError("username", "Username is required");
    hasError = true;
  }

  if (!email) {
    setRegisterFieldError("email", "Email is required");
    hasError = true;
  } else if (!isValidEmailFormat(email)) {
    setRegisterFieldError("email", "Please enter a valid email");
    hasError = true;
  }

  if (!password) {
    setRegisterFieldError("password", "Password is required");
    hasError = true;
  } else if (password.length < 6) {
    setRegisterFieldError("password", "Use at least 6 characters");
    hasError = true;
  }

  return {
    isValid: !hasError,
    username,
    email,
    password
  };
}

function setAuthMode(mode) {
  authMode = mode === "register" ? "register" : "login";

  const loginTab = document.getElementById("auth-login-tab");
  const registerTab = document.getElementById("auth-register-tab");
  const registerForm = document.getElementById("register-form");
  const heading = document.getElementById("auth-heading");

  loginForm = document.getElementById("login-form");

  if (loginTab) loginTab.classList.toggle("active", authMode === "login");
  if (registerTab) registerTab.classList.toggle("active", authMode === "register");
  if (loginForm) loginForm.hidden = authMode !== "login";
  if (registerForm) registerForm.hidden = authMode !== "register";
  if (heading) {
    heading.textContent = "Hi there, ready to start tracking your spending?";
  }

  clearLoginErrors();
  clearRegisterErrors();
}

function handleAuthPageClick(event) {
  const tab = event.target.closest("[data-auth-mode]");

  if (!tab) return;

  setAuthMode(tab.dataset.authMode);
}

async function handleRegisterSubmit(event) {
  event.preventDefault();

  const validation = validateRegisterForm();
  const submitBtn = document.getElementById("register-submit-btn");

  if (!validation.isValid) return;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating...";
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: validation.username,
        email: validation.email,
        password: validation.password
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Could not create account");
    }

    document.getElementById("register-form")?.reset();
    setAuthMode("login");

    if (loginIdentifierInput) {
      loginIdentifierInput.value = validation.username;
    }

    showAppToast("Account created. Log in to continue.", "success");
  } catch (error) {
    console.error("Registration failed:", error);
    setRegisterFieldError("password", error.message || "Could not create account");
    showAppToast(error.message || "Could not create account", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  }
}

function focusLoginPanel() {
  ensureLoginPanel();
  renderAuthState();

  setAuthMode("login");

  setTimeout(() => {
    loginIdentifierInput?.focus({ preventScroll: true });
  }, 150);
}

function clearSessionData() {
  authToken = "";
  currentUser = null;
  isLoggedIn = false;
  adminUsers = [];
  adminActivity = [];
  adminUsersPage = 1;
  isAdminPanelOpen = false;

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function getAuthHeaders(includeJson = false) {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

function isAdminUser() {
  return currentUser?.role === "admin";
}

function ensureAdminProfileControls() {
  const dropdown = document.querySelector(".dropdown");

  if (!dropdown) return;

  userProfileBtn = document.getElementById("user-profile-btn");

  if (!userProfileBtn) {
    userProfileBtn = document.createElement("button");
    userProfileBtn.id = "user-profile-btn";
    userProfileBtn.className = "user-profile-btn";
    userProfileBtn.type = "button";
    userProfileBtn.textContent = "User profile";

    if (logoutBtn && logoutBtn.parentElement === dropdown) {
      dropdown.insertBefore(userProfileBtn, logoutBtn);
    } else {
      dropdown.prepend(userProfileBtn);
    }

    userProfileBtn.addEventListener("click", handleUserProfileClick);
  }

  userProfileBtn.hidden = !isLoggedIn || !isAdminUser();
}

function ensureAdminPanel() {
  let panel = document.getElementById("admin-profile-panel");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "admin-profile-panel";
    panel.className = "admin-profile-panel";
    panel.hidden = true;

    panel.innerHTML = `
      <div class="admin-profile-header">
        <div>
          <h3>Admin account management</h3>
          <p>Edit existing user accounts and review login, logout, and CRUD activity.</p>
        </div>
      </div>

      <div class="admin-profile-grid">
        <div class="admin-card admin-users-card">
          <div class="admin-card-header">
            <div>
              <h4>Users</h4>
              <p>Review accounts, edit profile details, and adjust access roles.</p>
            </div>
            <span id="admin-user-count">0 accounts</span>
          </div>
          <div class="table-toolbar admin-users-toolbar" aria-label="User account controls">
            <div class="table-search admin-user-search">
              <label class="sr-only" for="admin-user-search">Search users</label>
              <input id="admin-user-search" type="text" placeholder="Search users">
              <button class="search-icon-btn" type="button" aria-label="Search users" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="M20 20l-3.4-3.4"></path>
                </svg>
              </button>
            </div>

            <details id="admin-role-filter-menu" class="toolbar-menu filter-menu">
              <summary class="toolbar-button filter-menu-trigger">
                <span id="admin-role-filter-label">Role: All</span>
                <span class="toolbar-chevron" aria-hidden="true">›</span>
              </summary>
              <div class="toolbar-menu-panel filter-menu-panel">
                <button class="admin-role-filter-option filter-btn active" data-admin-role-filter="All" type="button">All</button>
                <button class="admin-role-filter-option filter-btn" data-admin-role-filter="admin" type="button">Admin</button>
                <button class="admin-role-filter-option filter-btn" data-admin-role-filter="user" type="button">User</button>
              </div>
            </details>

            <details id="admin-user-sort-menu" class="toolbar-menu sort-menu admin-user-sort-menu">
              <summary class="toolbar-button sort-menu-trigger">
                <span id="admin-user-sort-label">Username: A to Z</span>
                <span class="toolbar-chevron" aria-hidden="true">›</span>
              </summary>
              <div class="toolbar-menu-panel sort-menu-panel">
                <button class="admin-user-sort-option sort-option active" data-admin-user-sort="username-asc" type="button">Username: A to Z</button>
                <button class="admin-user-sort-option sort-option" data-admin-user-sort="username-desc" type="button">Username: Z to A</button>
              </div>
            </details>

            <button id="admin-users-clear-btn" class="toolbar-clear" type="button">Clear</button>
          </div>
          <div class="admin-table-shell">
            <table class="admin-table admin-users-table">
              <thead>
                <tr>
                  <th><span class="th-text">Username</span></th>
                  <th><span class="th-text">Email</span></th>
                  <th><span class="th-text">Role</span></th>
                  <th class="actions-header"><span class="th-text"></span></th>
                </tr>
              </thead>
              <tbody id="admin-users-body">
                <tr>
                  <td colspan="4">No users loaded yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer admin-users-footer">
            <div class="table-pagination admin-users-pagination">
              <span id="admin-users-page-indicator" class="page-indicator">0-0 of 0</span>
              <button id="admin-users-prev-page-btn" type="button" class="page-btn" aria-label="Previous users page">&#8249;</button>
              <button id="admin-users-next-page-btn" type="button" class="page-btn" aria-label="Next users page">&#8250;</button>
            </div>
          </div>
          <div class="admin-table-actions">
            <button id="admin-edit-users-btn" type="button" class="table-action-btn">Edit</button>
            <button id="admin-cancel-users-btn" type="button" class="table-action-btn secondary inactive">Cancel</button>
          </div>
        </div>
      </div>

      <div class="admin-card admin-activity-card">
        <div class="admin-card-header">
          <h4>User activity</h4>
          <span id="admin-activity-count">0 events</span>
        </div>
        <div class="admin-table-shell">
          <table class="admin-table admin-activity-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="admin-activity-body">
              <tr>
                <td colspan="4">No activity loaded yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const hero = document.querySelector(".add.expense-hero");

    if (hero) {
      hero.insertAdjacentElement("beforebegin", panel);
    } else {
      document.querySelector("main")?.appendChild(panel);
    }
  }

  if (!panel.dataset.bound) {
    panel.dataset.bound = "true";

    panel.querySelector("#admin-edit-users-btn")?.addEventListener("click", handleAdminEditUsersClick);
    panel.querySelector("#admin-cancel-users-btn")?.addEventListener("click", cancelAdminUserEdits);
    panel.querySelector("#admin-user-search")?.addEventListener("input", handleAdminUserSearchInput);
    panel.addEventListener("focusout", handleAdminUsersFocusOut);
    panel.addEventListener("change", handleAdminPanelChange);
    panel.addEventListener("click", handleAdminPanelClick);
  }

  return panel;
}

function renderAdminPanelState() {
  const panel = ensureAdminPanel();

  if (!panel) return;

  panel.hidden = !isLoggedIn || !isAdminUser() || !isAdminPanelOpen;
}

function renderPageSections() {
  ensureAuthPage();

  if (authPage) {
    authPage.hidden = isLoggedIn;
  }

  const showDashboard = isLoggedIn && !isAdminPanelOpen;

  document.querySelector(".add.expense-hero")?.toggleAttribute("hidden", !showDashboard);
  tableSection?.toggleAttribute("hidden", !showDashboard);
  trendSection?.toggleAttribute("hidden", !showDashboard);

  document.querySelector(".summary-section")?.toggleAttribute("hidden", !showDashboard);
  document.querySelector(".summary-grid")?.toggleAttribute("hidden", !showDashboard);
  document.querySelector(".summary-right")?.toggleAttribute("hidden", !showDashboard);
  document.querySelector(".chart-container")?.toggleAttribute("hidden", !showDashboard);
}

function getAdminUsername(user) {
  return String(
    user?.username ||
    user?.name ||
    getDisplayNameFromLoginValue(user?.email) ||
    ""
  ).trim();
}

function getAdminEditableUsername(user) {
  return String(user?.username || user?.name || "").trim();
}

function getAdminUserErrorLabel(user) {
  return getAdminEditableUsername(user) || String(user?.email || "").trim() || "this user";
}

function getVisibleAdminUsers(sourceUsers) {
  const search = adminUserSearch.trim().toLowerCase();

  return sourceUsers
    .map((user, index) => ({ user, index }))
    .filter(({ user }) => {
      const roleMatches = adminRoleFilter === "All" || user.role === adminRoleFilter;

      if (!roleMatches) return false;
      if (!search) return true;

      return [
        getAdminUsername(user),
        user.email,
        user.role
      ].some(value => String(value || "").toLowerCase().includes(search));
    })
    .sort((a, b) => {
      const aName = getAdminUsername(a.user).toLowerCase();
      const bName = getAdminUsername(b.user).toLowerCase();
      const comparison = aName.localeCompare(bName);
      return adminUserSort === "username-desc" ? -comparison : comparison;
    });
}

function syncAdminUserToolbarState() {
  const searchInput = document.getElementById("admin-user-search");
  const searchBtn = document.querySelector(".admin-user-search .search-icon-btn");
  const roleLabel = document.getElementById("admin-role-filter-label");
  const sortLabel = document.getElementById("admin-user-sort-label");

  if (searchInput && searchInput.value !== adminUserSearch) {
    searchInput.value = adminUserSearch;
  }

  if (searchBtn) {
    searchBtn.disabled = adminUserSearch.trim() === "";
  }

  if (roleLabel) {
    roleLabel.textContent = `Role: ${adminRoleFilter === "All" ? "All" : capitalizeFirstLetter(adminRoleFilter)}`;
  }

  if (sortLabel) {
    sortLabel.textContent = adminUserSort === "username-desc"
      ? "Username: Z to A"
      : "Username: A to Z";
  }

  document.querySelectorAll(".admin-role-filter-option").forEach(option => {
    option.classList.toggle("active", option.dataset.adminRoleFilter === adminRoleFilter);
  });

  document.querySelectorAll(".admin-user-sort-option").forEach(option => {
    option.classList.toggle("active", option.dataset.adminUserSort === adminUserSort);
  });
}

function renderAdminUsers() {
  const body = document.getElementById("admin-users-body");
  const count = document.getElementById("admin-user-count");
  const usersTable = document.querySelector(".admin-users-card .admin-table");

  if (!body) return;

  const sourceUsers = isAdminEditMode ? draftAdminUsers : adminUsers;
  const visibleUsers = getVisibleAdminUsers(sourceUsers);
  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / adminUsersRowsPerPage));

  if (adminUsersPage > totalPages) {
    adminUsersPage = totalPages;
  }

  if (adminUsersPage < 1) {
    adminUsersPage = 1;
  }

  const startIndex = (adminUsersPage - 1) * adminUsersRowsPerPage;
  const endIndex = startIndex + adminUsersRowsPerPage;
  const paginatedUsers = visibleUsers.slice(startIndex, endIndex);

  syncAdminUserToolbarState();

  if (usersTable) {
    usersTable.classList.toggle("global-edit-mode", isAdminEditMode && selectedAdminUserIndex == null);
    usersTable.classList.toggle("row-edit-mode", isAdminEditMode && selectedAdminUserIndex != null);
  }

  if (count) {
    count.textContent = `${visibleUsers.length} ${visibleUsers.length === 1 ? "account" : "accounts"}`;
  }

  if (visibleUsers.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4">No users found.</td>
      </tr>
    `;
    updateAdminUsersPaginationDisplay(0);
    return;
  }

  body.innerHTML = paginatedUsers.map(({ user, index }) => {
    const isCurrentUser = Number(user.id) === Number(currentUser?.id);
    const username = getAdminUsername(user);
    const rowIsEditable = isAdminEditMode && (selectedAdminUserIndex == null || selectedAdminUserIndex === index);
    const lockedClass = rowIsEditable ? "" : "locked";
    const editableValue = rowIsEditable ? "true" : "false";
    const deleteLabel = isCurrentUser ? "Current user" : "Delete";
    const usernameInvalid = Boolean(adminUserInvalidCells[`${index}:username`]);
    const emailInvalid = Boolean(adminUserInvalidCells[`${index}:email`]);
    const roleInvalid = Boolean(adminUserInvalidCells[`${index}:role`]);

    return `
      <tr class="${isAdminEditMode && selectedAdminUserIndex === index ? "selected-edit-row" : ""}">
        <td
          class="editable admin-username-cell ${lockedClass} ${usernameInvalid ? "invalid-edit-cell" : ""}"
          data-admin-field="username"
          data-admin-index="${index}"
          contenteditable="${editableValue}"
        >
          <span class="cell-text">
            ${escapeHtml(username)}
          </span>
        </td>
        <td
          class="editable admin-email-cell ${lockedClass} ${emailInvalid ? "invalid-edit-cell" : ""}"
          data-admin-field="email"
          data-admin-index="${index}"
          contenteditable="${editableValue}"
        >
          <span class="cell-text">${escapeHtml(user.email)}</span>
        </td>
        <td class="admin-role-cell ${lockedClass} ${roleInvalid ? "invalid-edit-cell" : ""}">
          ${createAdminRoleCellMarkup(user.role, index, rowIsEditable)}
        </td>
        <td>
          <div class="admin-row-actions">
            <button
              class="row-icon-btn edit-row-btn ${isAdminEditMode ? "hidden-edit" : ""}"
              data-admin-action="edit-user"
              data-admin-index="${index}"
              type="button"
              aria-label="Edit user"
              title="Edit user"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z"></path>
                <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"></path>
              </svg>
            </button>
            <button
              class="row-icon-btn delete-btn ${!isAdminEditMode ? "hidden-delete" : ""}"
              data-admin-action="delete-user"
              data-admin-index="${index}"
              type="button"
              aria-label="${deleteLabel}"
              title="${deleteLabel}"
              ${isCurrentUser ? "disabled" : ""}
            >
              <svg viewBox="0 0 448 512" aria-hidden="true">
                <path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0h120.4c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64s14.3-32 32-32h96l7.2-14.3zM32 128h384l-21.2 339c-1.6 25.3-22.6 45-47.9 45H101.1c-25.3 0-46.3-19.7-47.9-45L32 128zm96 64c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16v224c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  const startDisplay = startIndex + 1;
  const endDisplay = Math.min(endIndex, visibleUsers.length);
  updateAdminUsersPaginationDisplay(visibleUsers.length, startDisplay, endDisplay);
}

function createAdminRoleCellMarkup(role, index, isEditable) {
  const cleanRole = role === "admin" ? "admin" : "user";
  const label = capitalizeFirstLetter(cleanRole);
  const tabIndex = isEditable ? "0" : "-1";

  return `
    <details class="admin-role-menu" data-admin-role-menu>
      <summary
        class="admin-role-trigger"
        data-admin-field="role"
        data-admin-index="${index}"
        aria-label="Role: ${escapeHtml(label)}"
        tabindex="${tabIndex}"
      >
        <span class="admin-role-label">${escapeHtml(label)}</span>
        <span class="toolbar-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="admin-role-menu-panel">
        <button
          class="admin-role-option ${cleanRole === "user" ? "active" : ""}"
          data-admin-role-value="user"
          data-admin-index="${index}"
          type="button"
          ${!isEditable ? "disabled" : ""}
        >User</button>
        <button
          class="admin-role-option ${cleanRole === "admin" ? "active" : ""}"
          data-admin-role-value="admin"
          data-admin-index="${index}"
          type="button"
          ${!isEditable ? "disabled" : ""}
        >Admin</button>
      </div>
    </details>
  `;
}

function closeAdminRoleMenus(except = null) {
  document.querySelectorAll(".admin-role-menu[open]").forEach(menu => {
    if (menu !== except) {
      menu.open = false;
    }
  });
}

function closeExpenseCategoryMenus(except = null) {
  document.querySelectorAll(".expense-category-menu[open]").forEach(menu => {
    if (menu !== except) {
      menu.open = false;
    }
  });
}

function renderAdminActivity() {
  const body = document.getElementById("admin-activity-body");
  const count = document.getElementById("admin-activity-count");

  if (!body) return;

  if (count) {
    count.textContent = `${adminActivity.length} ${adminActivity.length === 1 ? "event" : "events"}`;
  }

  if (adminActivity.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4">No activity found.</td>
      </tr>
    `;
    return;
  }

  body.innerHTML = adminActivity.map(item => {
    const userLabel = item.name || item.username || item.email || "Deleted user";

    return `
      <tr>
        <td>${escapeHtml(formatActivityTimestamp(item.created_at))}</td>
        <td>${escapeHtml(userLabel)}</td>
        <td><span class="admin-activity-action">${escapeHtml(item.action)}</span></td>
        <td>${escapeHtml(item.details || "")}</td>
      </tr>
    `;
  }).join("");
}

async function fetchAdminJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(options.body ? true : false),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    clearSessionData();
    renderAuthState();
    renderExpenses();
    throw new Error(data.message || "Your session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Admin request failed");
  }

  return data;
}

async function loadAdminProfileData() {
  if (!isAdminUser()) return;

  ensureAdminPanel();

  try {
    const [users, activity] = await Promise.all([
      fetchAdminJson("/admin/users"),
      fetchAdminJson("/admin/activity")
    ]);

    adminUsers = Array.isArray(users) ? users : [];
    draftAdminUsers = adminUsers.map(user => ({ ...user }));
    adminUsersPage = 1;
    adminUserInvalidCells = {};
    adminActivity = Array.isArray(activity) ? activity : [];
    updateAdminEditButtons();
    renderAdminUsers();
    renderAdminActivity();
  } catch (error) {
    console.error("Failed to load admin profile:", error);
    showAppToast(error.message || "Could not load admin profile.", "error", null, "");
  }
}

function updateAdminEditButtons() {
  const editBtn = document.getElementById("admin-edit-users-btn");
  const cancelBtn = document.getElementById("admin-cancel-users-btn");

  if (editBtn) editBtn.textContent = isAdminEditMode ? "Save" : "Edit";
  if (cancelBtn) cancelBtn.classList.toggle("inactive", !isAdminEditMode);
}

function startAdminRowEdit(index) {
  if (!isAdminEditMode) {
    isAdminEditMode = true;
    draftAdminUsers = adminUsers.map(user => ({ ...user }));
    adminUserInvalidCells = {};
  }

  selectedAdminUserIndex = Number.isInteger(Number(index)) ? Number(index) : null;
  updateAdminEditButtons();
  renderAdminUsers();

  requestAnimationFrame(() => {
    const cell = document.querySelector(
      `[data-admin-field="username"][data-admin-index="${index}"]`
    );
    focusEditableCellAtEnd(cell);
  });
}

function getAdminEditableCellText(cell) {
  const text = cell?.querySelector(".cell-text");
  return (text ? text.innerText : cell?.innerText || "").trim();
}

function updateDraftAdminUser(index, field, value) {
  if (!isAdminEditMode || !draftAdminUsers[index]) return;

  draftAdminUsers[index][field] = String(value || "").trim();
  delete adminUserInvalidCells[`${index}:${field}`];

  if (field === "username") {
    draftAdminUsers[index].name = draftAdminUsers[index].username;
  }
}

function commitAdminEditableCell(cell) {
  if (!cell || !isAdminEditMode) return;

  const index = Number(cell.dataset.adminIndex);
  const field = cell.dataset.adminField;

  if (!Number.isInteger(index) || !field) return;
  if (field === "role") return;

  updateDraftAdminUser(index, field, getAdminEditableCellText(cell));
}

function handleAdminUsersFocusOut(event) {
  const cell = event.target.closest("[data-admin-field]");
  if (cell?.dataset.adminField === "role") return;
  commitAdminEditableCell(cell);
}

function validateDraftAdminUsers() {
  adminUserInvalidCells = {};
  let firstError = "";

  draftAdminUsers.forEach((user, index) => {
    const username = getAdminEditableUsername(user);
    const email = String(user.email || "").trim();
    const userLabel = getAdminUserErrorLabel(user);

    if (!username) {
      adminUserInvalidCells[`${index}:username`] = true;
      firstError ||= "Username is required.";
    }

    if (!email) {
      adminUserInvalidCells[`${index}:email`] = true;
      firstError ||= `Email is required for ${userLabel}.`;
    } else if (!isValidEmailFormat(email)) {
      adminUserInvalidCells[`${index}:email`] = true;
      firstError ||= `Please enter a valid email address for ${userLabel}.`;
    }

    if (!["admin", "user"].includes(user.role)) {
      adminUserInvalidCells[`${index}:role`] = true;
      firstError ||= `Please choose a valid role for ${userLabel}.`;
    }
  });

  return firstError;
}

function isAdminUserDifferent(savedUser, draftUser) {
  return (
    getAdminEditableUsername(savedUser) !== getAdminEditableUsername(draftUser) ||
    String(savedUser.email || "").trim() !== String(draftUser.email || "").trim() ||
    savedUser.role !== draftUser.role
  );
}

async function saveAdminUserEdits() {
  const validationError = validateDraftAdminUsers();

  if (validationError) {
    renderAdminUsers();
    showAppToast(validationError, "error", null, "");
    return false;
  }

  const savedById = new Map(adminUsers.map(user => [Number(user.id), user]));
  const changedUsers = draftAdminUsers.map((user, index) => ({ user, index })).filter(({ user }) => {
    const savedUser = savedById.get(Number(user.id));
    return savedUser && isAdminUserDifferent(savedUser, user);
  });

  for (const { user, index } of changedUsers) {
    let savedUser;

    try {
      const username = getAdminEditableUsername(user);

      savedUser = await fetchAdminJson(`/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: username,
          username,
          email: String(user.email || "").trim(),
          role: user.role
        })
      });
    } catch (error) {
      const message = String(error.message || "");

      if (/email/i.test(message)) {
        adminUserInvalidCells[`${index}:email`] = true;
      }

      if (/username|user name|user|name/i.test(message) && !/email/i.test(message)) {
        adminUserInvalidCells[`${index}:username`] = true;
      }

      if (/role/i.test(message)) {
        adminUserInvalidCells[`${index}:role`] = true;
      }

      renderAdminUsers();
      throw error;
    }

    if (Number(savedUser.id) === Number(currentUser?.id)) {
      currentUser = {
        ...currentUser,
        ...savedUser,
        displayName: capitalizeFirstLetter(getAdminUsername(savedUser) || currentUser.displayName)
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
    }
  }

  await loadAdminProfileData();
  adminUserInvalidCells = {};

  if (!isAdminUser()) {
    isAdminPanelOpen = false;
    renderAuthState();
  }

  return true;
}

async function handleAdminEditUsersClick() {
  if (!isAdminEditMode) {
    isAdminEditMode = true;
    selectedAdminUserIndex = null;
    draftAdminUsers = adminUsers.map(user => ({ ...user }));
    adminUserInvalidCells = {};
    updateAdminEditButtons();
    renderAdminUsers();
    return;
  }

  try {
    commitAdminEditableCell(document.activeElement?.closest?.("[data-admin-field]"));
    const saved = await saveAdminUserEdits();
    if (!saved) return;

    isAdminEditMode = false;
    selectedAdminUserIndex = null;
    updateAdminEditButtons();
    renderAdminUsers();
    showAppToast("User changes saved successfully.", "success");
  } catch (error) {
    console.error("Failed to save users:", error);
    showAppToast(error.message || "Could not save user changes.", "error", null, "");
  }
}

function cancelAdminUserEdits() {
  if (!isAdminEditMode) return;

  isAdminEditMode = false;
  selectedAdminUserIndex = null;
  draftAdminUsers = adminUsers.map(user => ({ ...user }));
  adminUserInvalidCells = {};
  updateAdminEditButtons();
  renderAdminUsers();
}

function handleAdminPanelChange(event) {
  // Backward compatibility for older native-select role cells.
  const roleSelect = event.target.closest('select[data-admin-field="role"]');

  if (!roleSelect) return;

  const index = Number(roleSelect.dataset.adminIndex);

  if (Number.isInteger(index)) {
    updateDraftAdminUser(index, "role", roleSelect.value);
  }
}

function handleAdminUserSearchInput(event) {
  adminUserSearch = event.target.value || "";
  adminUsersPage = 1;
  renderAdminUsers();
}

async function handleAdminPanelClick(event) {
  const roleTrigger = event.target.closest(".admin-role-trigger");

  if (roleTrigger) {
    const roleCell = roleTrigger.closest(".admin-role-cell");
    const roleMenu = roleTrigger.closest(".admin-role-menu");

    if (!isAdminEditMode || roleCell?.classList.contains("locked")) {
      event.preventDefault();
      if (roleMenu) roleMenu.open = false;
      return;
    }

    closeAdminRoleMenus(roleMenu);
    return;
  }

  const roleOption = event.target.closest(".admin-role-option");

  if (roleOption) {
    event.preventDefault();

    const index = Number(roleOption.dataset.adminIndex);
    const value = roleOption.dataset.adminRoleValue || "user";

    if (Number.isInteger(index)) {
      updateDraftAdminUser(index, "role", value);
    }

    const roleMenu = roleOption.closest(".admin-role-menu");
    if (roleMenu) roleMenu.open = false;

    renderAdminUsers();
    return;
  }

  const adminPrevPageBtn = event.target.closest("#admin-users-prev-page-btn");

  if (adminPrevPageBtn) {
    if (adminUsersPage > 1) {
      adminUsersPage--;
      renderAdminUsers();
    }
    return;
  }

  const adminNextPageBtn = event.target.closest("#admin-users-next-page-btn");

  if (adminNextPageBtn) {
    adminUsersPage++;
    renderAdminUsers();
    return;
  }

  const roleFilterOption = event.target.closest(".admin-role-filter-option");

  if (roleFilterOption) {
    adminRoleFilter = roleFilterOption.dataset.adminRoleFilter || "All";
    adminUsersPage = 1;
    document.getElementById("admin-role-filter-menu").open = false;
    renderAdminUsers();
    return;
  }

  const sortOption = event.target.closest(".admin-user-sort-option");

  if (sortOption) {
    adminUserSort = sortOption.dataset.adminUserSort || "username-asc";
    adminUsersPage = 1;
    document.getElementById("admin-user-sort-menu").open = false;
    renderAdminUsers();
    return;
  }

  const adminClearBtn = event.target.closest("#admin-users-clear-btn");

  if (adminClearBtn) {
    adminUserSearch = "";
    adminRoleFilter = "All";
    adminUserSort = "username-asc";
    adminUsersPage = 1;

    const roleMenu = document.getElementById("admin-role-filter-menu");
    const sortMenu = document.getElementById("admin-user-sort-menu");

    if (roleMenu) roleMenu.open = false;
    if (sortMenu) sortMenu.open = false;

    renderAdminUsers();
    return;
  }

  const actionButton = event.target.closest("[data-admin-action]");

  if (!actionButton) return;

  const userIndex = Number(actionButton.dataset.adminIndex);
  const user = (isAdminEditMode ? draftAdminUsers : adminUsers)[userIndex];

  if (!user) return;

  if (actionButton.dataset.adminAction === "edit-user") {
    startAdminRowEdit(userIndex);
    return;
  }

  if (actionButton.dataset.adminAction === "delete-user") {
    if (Number(user.id) === Number(currentUser?.id)) return;

    const confirmed = await showDeleteUserDialog(user);

    if (!confirmed) return;

    try {
      await fetchAdminJson(`/admin/users/${user.id}`, { method: "DELETE" });
      isAdminEditMode = false;
      selectedAdminUserIndex = null;
      updateAdminEditButtons();
      await loadAdminProfileData();
      showAppToast("User deleted successfully.", "success");
    } catch (error) {
      console.error("Failed to delete user:", error);
      showAppToast(error.message || "Could not delete user.", "error", null, "");
    }
  }
}

async function handleUserProfileClick(event) {
  event.preventDefault();
  event.stopPropagation();

  if (!isAdminUser()) return;

  if (!(await confirmDiscardUnsavedChanges())) return;

  discardUnsavedEditableTableChanges();

  isAdminPanelOpen = !isAdminPanelOpen;
  renderAdminPanelState();
  renderPageSections();
  closeProfileMenu();

  if (isAdminPanelOpen) {
    isAdminEditMode = false;
    selectedAdminUserIndex = null;
    adminUsersPage = 1;
    await loadAdminProfileData();
    document.getElementById("admin-profile-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  const validation = validateLoginForm();

  if (!validation.isValid) return;

  if (loginSubmitBtn) {
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = "Logging in...";
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        login: validation.loginValue,
        password: validation.passwordValue
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Invalid email/username or password");
    }

    const displayName =
      getDisplayNameFromLoginValue(validation.loginValue) ||
      data.user?.username ||
      getDisplayNameFromLoginValue(data.user?.email) ||
      data.user?.name ||
      "User";

    authToken = data.token;
    currentUser = {
      ...(data.user || {}),
      displayName
    };
    isLoggedIn = Boolean(authToken);

    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));

    clearLoginErrors();

    if (loginForm) {
      loginForm.reset();
    }

    closeProfileMenu();
    clearStatus();
    renderAuthState();

    await loadExpenses();

    showAppToast("Logged in successfully.", "success");
  } catch (error) {
    console.error("Login failed:", error);

    const message = error.message || "Invalid email/username or password";
    loginIdentifierInput?.classList.add("error");
    setLoginFieldError(loginPasswordInput, loginPasswordError, message);
    showAppToast(message, "error");
  } finally {
    if (loginSubmitBtn) {
      loginSubmitBtn.disabled = false;
      loginSubmitBtn.textContent = "Log in";
    }
  }
}


function renderAuthState() {
  ensureLoginPanel();
  ensureAdminProfileControls();
  renderAdminPanelState();
  renderPageSections();

  const profile = document.querySelector(".profile");
  const dropdown = document.querySelector(".dropdown");
  const username = document.querySelector(".username");
  const arrow = document.querySelector(".arrow");

  if (!profile || !usernameWrapper) return;

  updateGreetingText();

  if (loginPanel) {
    loginPanel.hidden = true;
  }

  profile.hidden = !isLoggedIn;

  if (isLoggedIn) {
    profile.classList.remove("logged-out");
    profile.classList.remove("menu-open");

    usernameWrapper.classList.remove("login-header-btn");
    usernameWrapper.classList.remove("active");
    usernameWrapper.setAttribute("aria-expanded", "false");
    usernameWrapper.setAttribute("role", "button");
    usernameWrapper.setAttribute("tabindex", "0");

    if (username) username.textContent = getCurrentDisplayName();
    if (arrow) arrow.hidden = false;
    if (dropdown) dropdown.hidden = false;

    return;
  }

  closeProfileMenu();
  profile.classList.add("logged-out");
}

async function logout(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!(await confirmDiscardUnsavedChanges())) return;

  discardUnsavedEditableTableChanges();

  const tokenForLogout = authToken;

  if (tokenForLogout) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenForLogout}`
        }
      });
    } catch (error) {
      console.error("Logout activity could not be recorded:", error);
    }
  }

  clearSessionData();

  expenses = [];
  draftExpenses = [];
  currentPage = 1;
  newlyAddedExpenseId = null;

  closeProfileMenu();
  clearStatus();
  renderAuthState();
  renderExpenses();
  showAppToast("Logged out successfully.", "success");
}

// ---------- Table event delegation ----------
function clearActiveTableCellStyles(exceptCell = null) {
  document
    .querySelectorAll("#expense-table td.editing, #expense-table td.active-edit-cell")
    .forEach(cell => {
      if (cell !== exceptCell) {
        cell.classList.remove("editing", "active-edit-cell");
      }
    });
}

function activateEditableCell(cell) {
  if (!cell || cell.classList.contains("locked")) return;

  activeEditCell = cell;
  clearActiveTableCellStyles(cell);

  cell.classList.remove("editing", "active-edit-cell");
  // Force a style recalculation so re-selecting the same previously active cell
  // reliably redraws the green/red edit ring.
  void cell.offsetWidth;
  cell.classList.add("editing", "active-edit-cell");

  requestAnimationFrame(() => {
    if (activeEditCell === cell && cell.isConnected && !cell.classList.contains("locked")) {
      cell.classList.add("editing", "active-edit-cell");
    }
  });
}

function updateAmountCellLive(cell) {
  if (!cell || !isEditMode) return;

  const index = Number(cell.dataset.index);
  if (!Number.isInteger(index)) return;

  normalizeEditableAmountCell(cell);

  const value = getEditableCellText(cell);
  const amountError = validateEditedAmountValue(value);

  draftExpenses[index].amountError = amountError;
  draftExpenses[index].amountEditValue = getAmountEditDisplay(value);

  if (amountError) {
    cell.classList.add("invalid-edit-cell");
    cell.title = amountError;
    return;
  }

  // Keep the typed amount in amountEditValue until Save so amount-based sorting
  // cannot move the row while the user is still editing.
  cell.classList.remove("invalid-edit-cell");
  cell.title = formatCurrency(Number(parseCurrencyInput(value)));
}

function handleTablePointerDown(event) {
  if (!isEditMode) return;

  const cell = event.target.closest("td[data-field]");
  if (!cell || cell.classList.contains("locked")) return;

  activateEditableCell(cell);

  // Amount/title/description cells are contenteditable on the td. Calling focus()
  // here makes re-clicking an already edited amount cell redraw the same active ring
  // instead of relying on the browser to re-fire focusin.
  if (cell.isContentEditable && document.activeElement !== cell) {
    requestAnimationFrame(() => {
      if (activeEditCell === cell && cell.isConnected && !cell.classList.contains("locked")) {
        cell.focus({ preventScroll: true });
      }
    });
  }
}

function handleTableBeforeInput(event) {
  const cell = event.target.closest("td[data-field]");
  if (!cell || cell.classList.contains("locked")) return;

  const field = cell.dataset.field;

  if (field === "date") {
    const dateSegment = event.target.closest(".table-date-segment");

    if (dateSegment) {
      const segment = dateSegment.dataset.segment || "";
      const maxLength = getDateSegmentMaxLength(segment);
      const currentValue = getCleanDateSegmentValue(dateSegment, segment);
      const selectionStart = dateSegment.selectionStart ?? currentValue.length;
      const selectionEnd = dateSegment.selectionEnd ?? selectionStart;
      const selectedLength = Math.max(0, selectionEnd - selectionStart);

      if (event.inputType?.startsWith("insert")) {
        const insertedText = event.data || "";

        if (!/^\d*$/.test(insertedText)) {
          event.preventDefault();
          return;
        }

        const nextLength = currentValue.length - selectedLength + insertedText.length;
        if (nextLength > maxLength) {
          event.preventDefault();
          return;
        }
      }

      if (
        (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") &&
        currentValue.length === 0
      ) {
        event.preventDefault();
        setDateSegmentPlaceholder(dateSegment);
        return;
      }

      return;
    }

    const dateInputEl = event.target.closest(".table-date-input");

    if (dateInputEl) {
      const value = dateInputEl.value || "";
      const selectionStart = dateInputEl.selectionStart ?? value.length;
      const selectionEnd = dateInputEl.selectionEnd ?? selectionStart;
      const selectedText = value.slice(selectionStart, selectionEnd);

      if (event.inputType?.startsWith("insert") && selectedText.includes("/")) {
        event.preventDefault();
        return;
      }

      if ((event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") && selectedText.includes("/")) {
        event.preventDefault();
        return;
      }

      if (event.inputType === "deleteContentBackward" && selectionStart === selectionEnd && value[selectionStart - 1] === "/") {
        event.preventDefault();
        dateInputEl.setSelectionRange(selectionStart - 1, selectionStart - 1);
        return;
      }

      if (event.inputType === "deleteContentForward" && selectionStart === selectionEnd && value[selectionStart] === "/") {
        event.preventDefault();
        dateInputEl.setSelectionRange(selectionStart + 1, selectionStart + 1);
        return;
      }

      return;
    }

    // Protect the segmented date structure itself. Only the individual
    // MM, DD, or YYYY inputs are editable; the slashes and placeholder layout
    // should never be deleted as one text selection.
    if (event.inputType?.startsWith("delete") || event.inputType?.startsWith("insert")) {
      event.preventDefault();
      restoreDateEditorPlaceholders(cell);
      return;
    }
  }

  if (field === "description" && event.inputType?.startsWith("insert")) {
    const currentValue = cell.innerText.replace(/\n/g, " ");
    const selectedText = window.getSelection()?.toString() || "";
    const insertedText = event.data || "";
    const nextLength = currentValue.length - selectedText.length + insertedText.length;

    if (nextLength > DESCRIPTION_LIMIT) {
      event.preventDefault();
    }
  }

  if (field === "amount" && event.inputType === "deleteContentBackward") {
    const selection = window.getSelection();
    const caretOffset = getCaretCharacterOffsetWithin(cell);

    if (cell.innerText.trim().startsWith("$") && caretOffset <= 1 && selection?.isCollapsed) {
      event.preventDefault();
    }
  }
}

function handleTableFocusIn(event) {
  const dateSegment = event.target.closest(".table-date-segment");
  const dateInputEl = event.target.closest(".table-date-input");
  const cell = event.target.closest("td[data-field]");
  if (!cell || cell.classList.contains("locked")) return;

  activateEditableCell(cell);

  if (dateInputEl) {
    normalizeDateInputValue(dateInputEl);
    selectDateInput(dateInputEl);
    syncDateCellFromEditor(cell);
    return;
  }

  if (dateSegment) {
    selectDateSegment(dateSegment);
    syncDateCellFromEditor(cell);
    return;
  }

  if (cell.dataset.field === "amount") {
    normalizeEditableAmountCell(cell);
    updateAmountCellLive(cell);
  }
}

function handleTableFocusOut(event) {
  const cell = event.target.closest("td[data-field]");
  if (!cell || cell.classList.contains("locked")) return;

  const lostDateSegment = event.target.closest(".table-date-segment");
  if (lostDateSegment) {
    ensureDateSegmentPlaceholder(lostDateSegment);
    updateDateEditorSegmentStates(cell);
    syncDateCellFromEditor(cell);
  }

  if (cell.contains(event.relatedTarget)) return;

  const index = Number(cell.dataset.index);
  const field = cell.dataset.field;

  if (Number.isInteger(index) && field) {
    const value = field === "date"
      ? getDateEditValueFromCell(cell)
      : field === "amount"
        ? getEditableCellText(cell)
        : cell.innerText;

    updateExpense(index, field, value, cell);
  }

  if (field === "date") {
    restoreDateEditorPlaceholders(cell);
    updateDateEditorSegmentStates(cell);
  }

  // Do not remove the active/editing classes here. Focusout fires before the
  // next cell fully receives focus, and removing classes in this handler caused
  // previously selected cells to lose their green border when clicked again.
  // Active-cell styling is now controlled by pointerdown/focusin activation and
  // cleared only when the user clicks outside the table.
}

function handleTableChange(event) {
  const select = event.target.closest("select[data-field='category']");
  if (!select) return;

  const index = Number(select.dataset.index);
  updateExpense(index, "category", select.value);
}

function handleTableInput(event) {
  const dateInputEl = event.target.closest(".table-date-input");

  if (dateInputEl) {
    normalizeDateInputValue(dateInputEl);
    const cell = dateInputEl.closest("td[data-field='date']");
    activateEditableCell(cell);
    syncDateCellFromEditor(cell);
    return;
  }

  const dateSegment = event.target.closest(".table-date-segment");

  if (dateSegment) {
    sanitizeDateSegmentInput(dateSegment);
    const cell = dateSegment.closest("td[data-field='date']");
    activateEditableCell(cell);
    syncDateCellFromEditor(cell);
    return;
  }

  const cell = event.target.closest("td[data-field]");
  if (!cell || cell.classList.contains("locked")) return;

  const index = Number(cell.dataset.index);
  const field = cell.dataset.field;

  if (!Number.isInteger(index)) return;

  activateEditableCell(cell);

  if (field === "amount") {
    updateAmountCellLive(cell);
    return;
  }

  if (field === "date") {
    syncDateCellFromEditor(cell);
    return;
  }

  if (field === "expenseName") {
    const value = getEditableCellText(cell).replace(/\n/g, " ");
    const titleSurface = getEditableCellTextSurface(cell);

    cell.title = value;

    if (titleSurface) {
      titleSurface.title = value;
    }

    cell.classList.remove("invalid-edit-cell");
    draftExpenses[index].expenseName = value;
    return;
  }

  if (field !== "description") return;

  let value = cell.innerText.replace(/\n/g, " ");

  if (value.length > DESCRIPTION_LIMIT) {
    value = value.slice(0, DESCRIPTION_LIMIT);
    cell.innerText = value;
    focusEditableCellAtEnd(cell);
  }

  const descriptionSurface = getEditableCellTextSurface(cell);

  cell.title = value;

  if (descriptionSurface) {
    descriptionSurface.title = value;
  }

  cell.classList.remove("invalid-edit-cell");
  draftExpenses[index].description = value;
}

function handleMaskedCellKeydown(event) {
  const dateSegment = event.target.closest(".table-date-segment");

  if (dateSegment) {
    const allowedKeys = [
      "Backspace", "Delete", "Tab", "Enter", "Escape",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];
    const segment = dateSegment.dataset.segment || "";
    const cleanValue = getCleanDateSegmentValue(dateSegment, segment);

    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
      return;
    }

    if ((event.key === "Backspace" || event.key === "Delete") && cleanValue.length === 0) {
      event.preventDefault();
      setDateSegmentPlaceholder(dateSegment);
      return;
    }

    if (!allowedKeys.includes(event.key) && event.key.length !== 1) {
      return;
    }

    return;
  }

  const dateInputEl = event.target.closest(".table-date-input");

  if (dateInputEl) {
    const allowedKeys = [
      "Backspace", "Delete", "Tab", "Enter", "Escape",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"
    ];

    const value = dateInputEl.value || "";
    const selectionStart = dateInputEl.selectionStart ?? value.length;
    const selectionEnd = dateInputEl.selectionEnd ?? selectionStart;
    const selectedText = value.slice(selectionStart, selectionEnd);

    if ((event.key === "Backspace" || event.key === "Delete") && selectedText.includes("/")) {
      event.preventDefault();
      return;
    }

    if (event.key === "Backspace" && selectionStart === selectionEnd && value[selectionStart - 1] === "/") {
      event.preventDefault();
      dateInputEl.setSelectionRange(selectionStart - 1, selectionStart - 1);
      return;
    }

    if (event.key === "Delete" && selectionStart === selectionEnd && value[selectionStart] === "/") {
      event.preventDefault();
      dateInputEl.setSelectionRange(selectionStart + 1, selectionStart + 1);
      return;
    }

    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
      return;
    }

    if (!allowedKeys.includes(event.key) && event.key.length !== 1) {
      return;
    }
  }

  const dateCell = event.target.closest("td[data-field='date']");
  if (dateCell && !event.target.closest(".table-date-segment, .table-date-input")) {
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      restoreDateEditorPlaceholders(dateCell);
      return;
    }
  }

  const amountCell = event.target.closest("td[data-field='amount']");

  if (amountCell && !amountCell.classList.contains("locked") && amountCell.innerText.trim() === "$" && event.key === "Backspace") {
    event.preventDefault();
  }
}

function handleTableClick(event) {
  const categoryTrigger = event.target.closest(".expense-category-trigger");

  if (categoryTrigger) {
    const categoryCell = categoryTrigger.closest(".category-cell");
    const categoryMenu = categoryTrigger.closest(".expense-category-menu");

    if (!isEditMode || categoryCell?.classList.contains("locked")) {
      event.preventDefault();
      if (categoryMenu) categoryMenu.open = false;
      return;
    }

    closeExpenseCategoryMenus(categoryMenu);
    return;
  }

  const categoryOption = event.target.closest(".expense-category-option");

  if (categoryOption) {
    event.preventDefault();

    const index = Number(categoryOption.dataset.index);
    const value = categoryOption.dataset.expenseCategoryValue || "";

    if (Number.isInteger(index)) {
      updateExpense(index, "category", value);
    }

    const categoryMenu = categoryOption.closest(".expense-category-menu");
    if (categoryMenu) categoryMenu.open = false;

    renderExpenses();
    return;
  }

  if (isEditMode) {
    const clickedCell = event.target.closest("td[data-field]");
    if (clickedCell && !clickedCell.classList.contains("locked")) {
      activateEditableCell(clickedCell);
      requestAnimationFrame(() => activateEditableCell(clickedCell));
    }
  }

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
  ensureLoginPanel();

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  [loginIdentifierInput, loginPasswordInput].forEach(input => {
    input?.addEventListener("input", clearLoginErrors);
  });

  ["username", "email", "password"].forEach(field => {
    document.getElementById(`register-${field}`)?.addEventListener("input", clearRegisterErrors);
  });

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

    if (raw !== "" && hasInvalidLeadingZero(raw)) {
      amountInput.value = "";
      helper.textContent = "Amount cannot start with 0";
      helper.classList.add("error");
      amountInput.classList.add("error");
      return;
    }

    validateAmountLive();
  });

  amountInput.addEventListener("focus", () => {
    resetAmountInputToRawValue();
  });

  amountInput.addEventListener("blur", () => {
    if (!amountInput.classList.contains("error") && amountInput.value.trim() !== "") {
      formatAmountInputValue();
    }
  });

  if (categoryInput) {
    categoryInput.addEventListener("change", syncAddExpenseCategoryMenu);
  }

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
      currentFilter = btn.dataset.category || "All";
      currentPage = 1;
      syncFilterMenuState();
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

    syncFilterMenuState();

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
      const yearButton = event.target.closest(".month-year-btn");
      if (yearButton) {
        event.preventDefault();
        event.stopPropagation();

        const direction = Number(yearButton.dataset.monthYearDirection);
        const today = getTodayLocalDate();
        const currentYear = Number(today.slice(0, 4));
        const nextYear = monthMenuYear + direction;

        if (!Number.isFinite(direction) || nextYear > currentYear) return;

        monthMenuYear = nextYear;
        buildMonthMenuOptions();
        if (monthMenu) monthMenu.open = true;
        return;
      }

      const option = event.target.closest(".month-option");
      if (!option) return;
      setMonthFilterValue(option.dataset.monthValue || "");
    });
  }

  if (addExpenseCategoryMenu) {
    addExpenseCategoryMenu.addEventListener("click", (event) => {
      const option = event.target.closest(".add-expense-category-option");
      if (!option) return;
      setAddExpenseCategoryValue(option.dataset.categoryValue || "");
    });
  }

  editTableBtn.addEventListener("click", async () => {
    if (!isEditMode) {
      captureEditModeOrder();
      isEditMode = true;
      draftExpenses = cloneExpenses(expenses);
      activeEditCell = null;
      selectedEditRowIndex = null;
      editTableBtn.textContent = "Save";
      cancelTableBtn.classList.remove("inactive");
      renderExpenses();
      return;
    }

    try {
      commitActiveTableCell();

      if (!validateDraftTableEdits()) {
        renderExpenses();

        showAppToast(
          "Some edited amount or date values are invalid. Fix the highlighted cells, then try saving again.",
          "error",
          null,
          "Changes were not saved"
        );

        return;
      }

      await saveDraftChanges();

      isEditMode = false;
      activeEditCell = null;
      selectedEditRowIndex = null;
      clearEditModeOrder();
      editTableBtn.textContent = "Edit";
      cancelTableBtn.classList.add("inactive");

      await loadExpenses();

      clearStatus();
      clearAddExpenseModeError();
      showAppToast("Changes saved successfully.");
    } catch (error) {
      console.error("Save failed:", error);
      const message = "Failed to save table changes. Please try again.";
      showStatus(message, "error");
      showAppToast(message, "error");
    }
  });

  cancelTableBtn.addEventListener("click", () => {
    draftExpenses = cloneExpenses(expenses);
    isEditMode = false;
    selectedEditRowIndex = null;
    activeEditCell = null;
    clearEditModeOrder();
    editTableBtn.textContent = "Edit";
    cancelTableBtn.classList.add("inactive");
    clearStatus();
    clearAddExpenseModeError();
    renderExpenses();
  });

  expenseSearchInput.addEventListener("input", (e) => {
    pendingSearch = e.target.value.trim().toLowerCase();
    currentSearch = pendingSearch;
    currentPage = 1;

    if (searchIconBtn) {
      searchIconBtn.disabled = pendingSearch === "";
    }

    renderExpenses();
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
      dateError.textContent = "Please use a valid date";
      dateInput.classList.add("error");
      syncExpenseDateControl();
      return;
    }

    if (Number(value.slice(0, 4)) > MAX_VALID_YEAR) {
      dateError.textContent = `Year cannot be after ${MAX_VALID_YEAR}`;
      dateInput.classList.add("error");
      syncExpenseDateControl();
      return;
    }

    if (!isValidDate(value, { allowFuture: true })) {
      dateError.textContent = "Please use a valid date";
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
    const clickedTableCell = event.target.closest("#expense-table td[data-field]");

    if (!clickedTableCell && activeEditCell) {
      clearActiveTableCellStyles();
      activeEditCell = null;
    }

    if (!clickedInsideMenu) {
      closeToolbarMenus();
      closeProfileMenu();
    }
  }, true);

  document.addEventListener("click", (event) => {
    const clickedInsideDropdown = event.target.closest(".toolbar-menu");
    const openDropdowns = document.querySelectorAll(".toolbar-menu[open]");
  
    openDropdowns.forEach((dropdown) => {
      if (dropdown !== clickedInsideDropdown) {
        dropdown.open = false; // Close dropdown if the click was outside
      }
    });
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
    brandHome.addEventListener("click", guardedResetDashboardView);
  }

  if (usernameWrapper) {
    usernameWrapper.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!isLoggedIn) {
        focusLoginPanel();
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

    usernameWrapper.addEventListener("blur", closeProfileMenu);

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
    expenseBody.addEventListener("pointerdown", handleTablePointerDown, true);
    expenseBody.addEventListener("mousedown", handleTablePointerDown, true);
    expenseBody.addEventListener("beforeinput", handleTableBeforeInput);
    expenseBody.addEventListener("focusin", handleTableFocusIn);
    expenseBody.addEventListener("focusout", handleTableFocusOut);
    expenseBody.addEventListener("keydown", handleMaskedCellKeydown);
    expenseBody.addEventListener("input", handleTableInput);
    expenseBody.addEventListener("change", handleTableChange);
    expenseBody.addEventListener("click", handleTableClick);
  }

  document.addEventListener("pointerdown", (event) => {
    if (!isEditMode) return;

    const clickedEditableCell = event.target.closest?.("#expense-table td[data-field]");

    if (clickedEditableCell && !clickedEditableCell.classList.contains("locked")) {
      activateEditableCell(clickedEditableCell);
      return;
    }

    if (!event.target.closest?.("#expense-table")) {
      activeEditCell = null;
      clearActiveTableCellStyles();
    }
  }, true);

  // Active table-cell styling is cleared by the pointerdown-outside handler.
  // Avoid clearing it on focusout because focus timing can remove the border
  // from a cell that the user is trying to reselect.

  document.addEventListener("click", event => {
    if (!event.target.closest?.(".admin-role-menu")) {
      closeAdminRoleMenus();
    }

    if (!event.target.closest?.(".expense-category-menu")) {
      closeExpenseCategoryMenus();
    }
  });

  window.addEventListener("beforeunload", event => {
    if (!hasOpenEditableTableSession({ commitActive: false })) return;

    event.preventDefault();
    event.returnValue = "";
  });

  window.addEventListener("scroll", handleHeaderFade);
  window.addEventListener("resize", () => {
    if (expenses.length > 0) {
      renderChart();
    }
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

// ---------- Init ----------
ensureLoginPanel();
bindEvents();
handleHeaderFade();
cancelTableBtn.classList.add("inactive");
editTableBtn.textContent = "Edit";

if (searchIconBtn) {
  searchIconBtn.disabled = true;
}

buildMonthMenuOptions();
syncFilterMenuState();
syncSortMenuState();
setTodayDate();
syncMonthFilterState();
renderAuthState();

if (isLoggedIn) {
  loadExpenses();
} else {
  renderExpenses();
}
