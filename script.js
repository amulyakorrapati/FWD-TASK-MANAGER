// DOM Elements
const taskInput = document.querySelector("#task-input");
const taskPriorityInput = document.querySelector("#task-priority");
const taskDueDateInput = document.querySelector("#task-due-date");
const taskSection = document.querySelector(".tasks");
const taskForm = document.querySelector("#newtask");
const progressBar = document.querySelector("#progress-bar");
const progressText = document.querySelector("#progress-text");
const taskChartCanvas = document.querySelector("#taskChart");

// Data Storage
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let stats = JSON.parse(localStorage.getItem("stats")) || {}; // { "YYYY-MM-DD": count of completed tasks that day }

// Migrate old tasks to new format (backward compatibility)
function migrateTasks() {
  let hasChanges = false;
  tasks.forEach(task => {
    if (task.priority === undefined) {
      task.priority = "medium";
      hasChanges = true;
    }
    if (task.dueDate === undefined) {
      task.dueDate = null;
      hasChanges = true;
    }
    if (task.createdAt === undefined) {
      task.createdAt = new Date().toISOString();
      hasChanges = true;
    }
  });
  if (hasChanges) saveTasks();
}
migrateTasks();

// Chart.js Setup
let taskChart = null;
const ctx = taskChartCanvas ? taskChartCanvas.getContext("2d") : null;

// Initialize
renderTasks();
updateProgress();
if (ctx) updateChart();

// Event Listeners
if (taskForm) {
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    createTask();
  });
}

// Chart.js
function createChart() {
  if (taskChart) taskChart.destroy();

  const today = new Date();
  const labels = [];
  const data = [];
  const colors = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    labels.push(date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    data.push(stats[dateKey] || 0);
    colors.push("rgba(79, 70, 229, 0.6)");
  }

  taskChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Tasks Completed",
        data,
        backgroundColor: colors,
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}
function updateChart() { if (ctx && taskChartCanvas) createChart(); }

// Create Task
function createTask() {
  const value = taskInput.value.trim();
  const priority = taskPriorityInput.value;
  const dueDate = taskDueDateInput.value;

  if (!value) {
    alert("The task field is blank. Enter a task name and try again.");
    taskInput.focus();
    return;
  }

  tasks.push({
    text: value,
    completed: false,
    priority,
    dueDate: dueDate || null,
    createdAt: new Date().toISOString()
  });

  saveTasks();
  renderTasks();
  taskInput.value = "";
  taskPriorityInput.value = "medium";
  taskDueDateInput.value = "";
  taskInput.focus();
}

// Render Tasks
function renderTasks() {
  if (!taskSection) return;
  taskSection.innerHTML = "";

  if (tasks.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "No tasks yet. Add one above! 🎉";
    emptyMessage.style.textAlign = "center";
    emptyMessage.style.color = "#9ca3af";
    emptyMessage.style.fontStyle = "italic";
    emptyMessage.style.padding = "2rem";
    taskSection.appendChild(emptyMessage);
    return;
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
    if (priorityDiff !== 0) return priorityDiff;

    const aDate = a.dueDate ? new Date(a.dueDate) : null;
    const bDate = b.dueDate ? new Date(b.dueDate) : null;
    if (aDate && bDate) return aDate - bDate;
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    return 0;
  });

  const today = new Date().toISOString().split("T")[0];
  sortedTasks.forEach(task => {
    const originalIndex = tasks.indexOf(task);
    const taskDiv = document.createElement("div");
    taskDiv.classList.add("task");
    taskDiv.setAttribute("data-priority", task.priority || "medium");

    const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (taskDueDate && !task.completed && taskDueDate < new Date(today)) {
      taskDiv.classList.add("overdue");
    }

    const label = document.createElement("label");
    label.style.flex = "1";
    label.style.cursor = "pointer";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => toggleTask(originalIndex));

    const text = document.createElement("p");
    text.textContent = task.text;
    if (task.completed) text.classList.add("checked");

    const detailsSpan = document.createElement("span");
    detailsSpan.style.display = "flex";
    detailsSpan.style.alignItems = "center";
    detailsSpan.style.flexWrap = "wrap";
    detailsSpan.style.gap = "0.5em";

    const prioritySpan = document.createElement("span");
    prioritySpan.classList.add("task-priority-display");
    prioritySpan.textContent = `(${(task.priority || "medium")[0].toUpperCase() + (task.priority || "medium").slice(1)})`;
    detailsSpan.appendChild(prioritySpan);

    if (task.dueDate) {
      const dueDateSpan = document.createElement("span");
      dueDateSpan.classList.add("task-due-date-display");
      dueDateSpan.textContent = `Due: ${new Date(task.dueDate).toLocaleDateString()}`;
      detailsSpan.appendChild(dueDateSpan);
    }

    label.appendChild(checkbox);
    label.appendChild(text);
    label.appendChild(detailsSpan);

    const btnGroup = document.createElement("div");
    btnGroup.classList.add("btn-group");

    const editBtn = document.createElement("button");
    editBtn.classList.add("edit");
    editBtn.innerHTML = '<i class="uil uil-edit"></i>';
    editBtn.setAttribute("aria-label", "Edit task");
    editBtn.addEventListener("click", e => {
      e.stopPropagation();
      editTask(originalIndex);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("delete");
    deleteBtn.innerHTML = '<i class="uil uil-trash"></i>';
    deleteBtn.setAttribute("aria-label", "Delete task");
    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this task?")) {
        deleteTask(originalIndex);
      }
    });

    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(deleteBtn);
    taskDiv.appendChild(label);
    taskDiv.appendChild(btnGroup);
    taskSection.appendChild(taskDiv);
  });

  updateProgress();
}

// Toggle Task
function toggleTask(index) {
  if (index < 0 || index >= tasks.length) return;
  const task = tasks[index];
  task.completed = !task.completed;

  const today = new Date().toISOString().split("T")[0];
  if (task.completed) {
    stats[today] = (stats[today] || 0) + 1;
  } else {
    if (stats[today] && stats[today] > 0) stats[today]--;
  }
  saveStats();
  updateChart();
  saveTasks();
  renderTasks();
}

// Edit Task
function editTask(index) {
  if (index < 0 || index >= tasks.length) return;
  const currentTask = tasks[index];

  const newText = prompt("Edit task description:", currentTask.text);
  if (newText !== null && newText.trim() !== "") currentTask.text = newText.trim();

  const newPriorityInput = prompt(`Edit priority (current: ${currentTask.priority}). Enter 'low', 'medium', or 'high':`);
  if (newPriorityInput && ["low", "medium", "high"].includes(newPriorityInput.toLowerCase().trim())) {
    currentTask.priority = newPriorityInput.toLowerCase().trim();
  }

  let newDueDate = prompt(`Edit due date (current: ${currentTask.dueDate ? new Date(currentTask.dueDate).toLocaleDateString() : 'None'}). Enter YYYY-MM-DD or leave blank to remove:`);
  newDueDate = newDueDate ? newDueDate.trim() : "";
  if (newDueDate === "") {
    currentTask.dueDate = null;
  } else if (newDueDate && !isNaN(Date.parse(newDueDate))) {
    currentTask.dueDate = newDueDate;
  } else if (newDueDate) {
    alert("Invalid date format. Please use YYYY-MM-DD.");
    return;
  }

  saveTasks();
  renderTasks();
}

// Delete Task
function deleteTask(index) {
  if (index < 0 || index >= tasks.length) return;
  if (tasks[index].completed) {
    const today = new Date().toISOString().split("T")[0];
    if (stats[today] && stats[today] > 0) stats[today]--;
    saveStats();
    updateChart();
  }
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
}

// Update Progress
function updateProgress() {
  if (!progressBar || !progressText) return;
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  progressBar.style.setProperty("--progress-width", `${percentage}%`);
  progressText.textContent = `${percentage}% Completed`;

  let barColor;
  if (percentage >= 80) {
    barColor = "#10b981";
    progressText.style.color = "#10b981";
  } else if (percentage >= 50) {
    barColor = "#f59e0b";
    progressText.style.color = "#f59e0b";
  } else {
    barColor = "#ef4444";
    progressText.style.color = "#ef4444";
  }
  progressBar.style.setProperty("--progress-color", barColor);
}

// Save
function saveTasks() { localStorage.setItem("tasks", JSON.stringify(tasks)); }
function saveStats() { localStorage.setItem("stats", JSON.stringify(stats)); }
function cleanupOldStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];
  Object.keys(stats).forEach(dateKey => { if (dateKey < cutoff) delete stats[dateKey]; });
  saveStats(); updateChart();
}
cleanupOldStats();


// =================== THEME TOGGLE =================== //
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector("#theme-icon"); // <-- add id="theme-icon" to <i> in index.html

function setThemeIcon() {
  if (document.body.classList.contains("dark-mode")) {
    themeIcon.classList.remove("uil-moon");
    themeIcon.classList.add("uil-sun");
  } else {
    themeIcon.classList.remove("uil-sun");
    themeIcon.classList.add("uil-moon");
  }
}

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
}
setThemeIcon();

// Toggle on click
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    setThemeIcon();
  });
}
