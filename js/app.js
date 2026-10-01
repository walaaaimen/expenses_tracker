const API_URL = "http://localhost:3000/api/expenses";

let allExpenses = [];
let currentFilter = "All";
let editModalInstance = null;



const spinner = document.getElementById("spinner");
const alertBox = document.getElementById("alertBox");
const expensesTable = document.getElementById("expensesTable");
const totalAmountEl = document.getElementById("totalAmount");
const totalCountEl = document.getElementById("totalCount");
const highestExpenseEl = document.getElementById("highestExpense");
const tableInfo = document.getElementById("tableInfo");
const expenseForm = document.getElementById("expenseForm");
const filterCategory = document.getElementById("filterCategory");
const editForm = document.getElementById("editForm");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");




function showSpinner() {
    spinner.classList.remove("d-none");
}

function hideSpinner() {
    spinner.classList.add("d-none");
}

function showAlert(message, type = "danger") {
    alertBox.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
}

function clearAlert() {
    alertBox.innerHTML = "";
}

function formatAmount(amount) {
    return "$" + Number(amount).toFixed(2);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// API Functions

// GET 
async function getExpenses() {
    const response = await fetch(API_URL);

    if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
    }

    return await response.json();
}

// POST 
async function addExpense(data) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
    }

    return result;
}

// PUT 
async function updateExpense(id, data) {
    const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
    }

    return result;
}

// DELETE 
async function deleteExpense(id) {
    const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
    }

    return result;
}


function renderTable(list) {
    if (list.length === 0) {
        expensesTable.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-5">
          No expenses found
        </td>
      </tr>
    `;
        tableInfo.textContent = "0 expenses";
        return;
    }

    expensesTable.innerHTML = list.map(expense => `
    <tr>
      <td class="fw-semibold">${escapeHtml(expense.title)}</td>
      <td class="amount-cell">${formatAmount(expense.amount)}</td>
      <td>
        <span class="badge-category badge-${expense.category}">
          ${expense.category}
        </span>
      </td>
      <td class="text-muted">${expense.date}</td>
      <td class="text-end">
        <button class="btn-action btn-edit me-1" data-id="${expense.id}" title="Edit">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn-action btn-delete" data-id="${expense.id}" title="Delete">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join("");

    tableInfo.textContent = `Showing ${list.length} of ${allExpenses.length} expenses`;
}

//  Summary Cards
function renderSummary(list) {
    const total = list.reduce((sum, e) => sum + Number(e.amount), 0);
    const count = list.length;
    const highest = list.length > 0
        ? Math.max(...list.map(e => Number(e.amount)))
        : 0;

    totalAmountEl.textContent = formatAmount(total);
    totalCountEl.textContent = count;
    highestExpenseEl.textContent = formatAmount(highest);
}

function applyFilter() {
    if (currentFilter === "All") {
        renderTable(allExpenses);
    } else {
        const filtered = allExpenses.filter(e => e.category === currentFilter);
        renderTable(filtered);
    }
}


async function refresh() {
    try {
        clearAlert();
        showSpinner();

        allExpenses = await getExpenses();

        applyFilter();
        renderSummary(allExpenses);

    } catch (error) {
        showAlert(`Failed to load expenses: ${error.message}`);
    } finally {
        hideSpinner();
    }
}

// Event Listeners

// Form submit 
expenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        title: document.getElementById("title").value.trim(),
        amount: Number(document.getElementById("amount").value),
        category: document.getElementById("category").value,
        date: document.getElementById("date").value
    };

    try {
        clearAlert();
        showSpinner();

        await addExpense(data);

        expenseForm.reset();
        showAlert("Expense added successfully", "success");

        await refresh();

    } catch (error) {
        showAlert(`Failed to add expense: ${error.message}`);
    } finally {
        hideSpinner();
    }
});

// Filter change
filterCategory.addEventListener("change", (e) => {
    currentFilter = e.target.value;
    applyFilter();
});

// Table actions (Edit + Delete)
expensesTable.addEventListener("click", async (e) => {
    const editBtn = e.target.closest(".btn-edit");
    const deleteBtn = e.target.closest(".btn-delete");

    // Edit
    if (editBtn) {
        const id = editBtn.dataset.id;
        const expense = allExpenses.find(x => x.id == id);
        if (expense) {
            document.getElementById("editId").value = expense.id;
            document.getElementById("editTitle").value = expense.title;
            document.getElementById("editAmount").value = expense.amount;
            document.getElementById("editCategory").value = expense.category;
            document.getElementById("editDate").value = expense.date;

            if (!editModalInstance) {
                editModalInstance = new bootstrap.Modal(document.getElementById("editModal"));
            }
            editModalInstance.show();
        }
    }

    // Delete
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;

        if (!confirm("Are you sure you want to delete this expense?")) return;

        try {
            clearAlert();
            showSpinner();

            await deleteExpense(id);
            showAlert("Expense deleted successfully", "success");

            await refresh();

        } catch (error) {
            showAlert(`Failed to delete expense: ${error.message}`);
        } finally {
            hideSpinner();
        }
    }
});

//  Edit Form (Save Changes)
editForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("editId").value;

    const data = {
        title: document.getElementById("editTitle").value.trim(),
        amount: Number(document.getElementById("editAmount").value),
        category: document.getElementById("editCategory").value,
        date: document.getElementById("editDate").value
    };

    try {
        clearAlert();
        showSpinner();

        await updateExpense(id, data);

        if (editModalInstance) {
            editModalInstance.hide();
        }

        showAlert("Expense updated successfully", "success");

        await refresh();

    } catch (error) {
        showAlert(`Failed to update expense: ${error.message}`);
    } finally {
        hideSpinner();
    }
});



// Theme (Dark Mode)

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);

    if (theme === "dark") {
        themeIcon.classList.remove("bi-moon");
        themeIcon.classList.add("bi-sun");
    } else {
        themeIcon.classList.remove("bi-sun");
        themeIcon.classList.add("bi-moon");
    }

}

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    applyTheme(savedTheme);
}

themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("theme", next);
});




initTheme();
refresh();










