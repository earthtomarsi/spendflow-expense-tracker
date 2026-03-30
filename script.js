let expenses = [];

// DOM elements
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const addBtn = document.getElementById("add-btn");
const nameError = document.getElementById("name-error");
const amountError = document.getElementById("amount-error");

// Event listeners
addBtn.addEventListener("click", addExpense);

// Clear name error as user types in name
nameInput.addEventListener("input", () => {
  nameError.textContent = "";
});

// Clear amount error + live validation as user types in amount
amountInput.addEventListener("input", () => {
  amountError.textContent = "";
  validateAmountLive();
});

function addExpense() {
    const name = nameInput.value.trim();
    const amountRaw = amountInput.value;
    const amount = Number(amountRaw);
    const category = categoryInput.value;
  
    nameError.textContent = "";
    amountError.textContent = "";
  
    let hasError = false;
  
    // NAME validation
    if (!name) {
      nameError.textContent = "Please enter an expense name";
      hasError = true;
    }
  
    // AMOUNT validation
    if (!amountRaw) {
      amountError.textContent = "Please enter an expense amount";
      hasError = true;
    } else if (isNaN(amount) || amount <= 0) {
      amountError.textContent = "Please enter a valid amount greater than 0";
      hasError = true;
    }
  
    if (hasError) return;
  
    expenses.push({ name, amount, category });
    renderExpenses();
  
    // Clear inputs
    nameInput.value = "";
    amountInput.value = "";
    document.getElementById("amount-helper").textContent = "";
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
    } else if (amount <= 0) {
      helper.textContent = "Amount must be greater than 0";
      helper.classList.add("error");
    }
}

function renderExpenses() {
    const list = document.getElementById("expense-list");
    const emptyState = document.getElementById("empty-state");
  
    list.innerHTML = "";
  
    if (expenses.length === 0) {
      emptyState.style.display = "block";
      document.getElementById("total").textContent = formatCurrency(0);
      document.getElementById("category-totals").innerHTML = "";
      return;
    }
  
    // hide empty state when there are expenses
    emptyState.style.display = "none";
  
    let total = 0;
  
    expenses.forEach((expense, index) => {
      total += expense.amount;
  
      const li = document.createElement("li");
      li.className = "expense-item";
  
      li.innerHTML = `
        <span>
          ${expense.name} (${formatCurrency(expense.amount)}) - ${expense.category}
        </span>
        <button class="delete-btn" onclick="deleteExpense(${index})">×</button>
      `;
  
      list.appendChild(li);
    });
  
    document.getElementById("total").textContent = formatCurrency(total);
    updateCategoryTotals();
}

function deleteExpense(index) {
  expenses.splice(index, 1);
  renderExpenses();
}

function updateCategoryTotals() {
  const totals = {};

  expenses.forEach(exp => {
    if (!totals[exp.category]) {
      totals[exp.category] = 0;
    }
    totals[exp.category] += exp.amount;
  });

  const container = document.getElementById("category-totals");
  container.innerHTML = "";

  for (let category in totals) {
    const div = document.createElement("div");
    div.textContent = `${category}: ${formatCurrency(totals[category])}`;
    container.appendChild(div);
  }
}

function formatCurrency(amount) {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

// Initial render
renderExpenses();