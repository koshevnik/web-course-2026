// Массив для хранения задач
let tasks = [];
let currentFilter = 'all'; 


const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const activeCountSpan = document.getElementById('active-count');
const completedCountSpan = document.getElementById('completed-count');
const filterBtns = document.querySelectorAll('.filter-btn');

// Добавление задачи по клику на кнопку
addBtn.addEventListener('click', addTask);

// Добавление задачи по нажатию клавиши Enter в поле ввода
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Обработка переключения фильтров
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.getAttribute('data-filter');
        render();
    });
});

// Функция добавления новой задачи
function addTask() {
    const text = taskInput.value.trim();
    
    // Проверка на пустую строку
    if (text === '') {
        alert('Введите текст задачи!');
        return;
    }

    const newTask = {
        id: Date.now(), // уникальный идентификатор(Создание объекта задачи)
        text: text,
        completed: false
    };

    tasks.push(newTask);
    taskInput.value = ''; // очищаем поле ввода
    render();
}

// Функция переключения статуса задачи (выполнена / не выполнена)
function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    render();
}

// Функция удаления задачи
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    render();
}

// Функция отрисовки (рендеринга) интерфейса
function render() {
    // 1. Фильтрация задач с помощью метода filter
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true; // для 'all'
    });

    // 2. Очистка текущего списка на экране
    taskList.innerHTML = '';

    // 3. Генерация HTML-разметки для каждой задачи через map и innerHTML
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        if (task.completed) {
            li.classList.add('completed');
        }

        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text">${escapeHtml(task.text)}</span>
            <button class="delete-btn">Удалить</button>
        `;

        // Обработчик для чекбокса
        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => toggleTask(task.id));

        // Обработчик для кнопки удаления
        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        taskList.appendChild(li);
    });

    // 4. Обновление счётчиков
    const activeCount = tasks.filter(task => !task.completed).length;
    const completedCount = tasks.filter(task => task.completed).length;

    activeCountSpan.textContent = `Осталось: ${activeCount}`;
    completedCountSpan.textContent = `Выполнено: ${completedCount}`;
}

// Защита от XSS-инъекций при выводе текста
function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}