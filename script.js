let expenses = [];

// DOM elements
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const addBtn = document.getElementById("add-btn");
document.getElementById("total").textContent = formatCurrency(0);

// Event listeners
addBtn.addEventListener("click", addExpense);

nameInput.addEventListener("input", validateInputs);
amountInput.addEventListener("input", validateInputs);
categoryInput.addEventListener("change", validateInputs);

// Initial state
validateInputs();

function addExpense() {
  const name = nameInput.value.trim();
  const amount = Number(amountInput.value);
  const amountRaw = amountInput.value;
  const category = categoryInput.value;

  if (!name || isNaN(amount)) return;

  const expense = { name, amount, category };
  expenses.push(expense);

  renderExpenses();

  // clear inputs
  nameInput.value = "";
  amountInput.value = "";

  validateInputs();
}

function renderExpenses() {
  const list = document.getElementById("expense-list");
  list.innerHTML = "";

  if (expenses.length === 0) {
    list.innerHTML = "<p>No expenses yet</p>";
    document.getElementById("total").textContent = formatCurrency(0);
    document.getElementById("category-totals").innerHTML = "";
    return;
  }

  let total = 0;

  expenses.forEach((expense, index) => {
    total += expense.amount;

    const li = document.createElement("li");
    li.className = "expense-item";

    li.innerHTML = `
      <span>${expense.name} (${formatCurrency(expense.amount)}) - ${expense.category}</span>
      <button onclick="deleteExpense(${index})">X</button>
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

function validateInputs() {
    const name = nameInput.value.trim();
    const amountRaw = amountInput.value;
    const helper = document.getElementById("amount-helper");
  
    let amountValid = true;
  
    helper.textContent = "";
    helper.classList.remove("error");
    amountInput.classList.remove("error");
  
    // ✅ Empty input (no error message)
    if (amountRaw === "") {
      amountValid = false;
    }
  
    else {
      const amount = Number(amountRaw);
  
      // Invalid number
      if (isNaN(amount)) {
        helper.textContent = "Please enter a valid number";
        helper.classList.add("error");
        amountInput.classList.add("error");
        amountValid = false;
      }
  
      // Zero or negative
      else if (amount <= 0) {
        helper.textContent = "Amount must be greater than 0";
        helper.classList.add("error");
        amountInput.classList.add("error");
        amountValid = false;
      }
    }
  
    const isFormValid =
      name !== "" &&
      amountValid;
  
    addBtn.disabled = !isFormValid;
}