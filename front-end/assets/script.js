class TodoApp {
    constructor() {
        this.api = new TodoAPI();
        this.currentProject = null;
        this.projects = [];
        this.todos = [];
        this.currentFilter = 'all';
        this.initializeElements();
        this.bindEvents();
        this.loadProjects();
    }

    initializeElements() {
        this.todoInput = document.getElementById('todoInput');
        this.addButton = document.getElementById('addTodo');
        this.todoList = document.getElementById('todoList');
        this.taskCount = document.getElementById('taskCount');
        this.clearCompleted = document.getElementById('clearCompleted');
        this.themeToggle = document.getElementById('themeToggle');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.projectSelect = document.getElementById('projectSelect');
        this.newProjectBtn = document.getElementById('newProject');
        this.deleteProjectBtn = document.getElementById('deleteProject');
        this.todoContent = document.getElementById('todoContent');
        this.loadingIndicator = document.getElementById('loadingIndicator');
    }

    bindEvents() {
        this.addButton.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        this.clearCompleted.addEventListener('click', () => this.clearCompletedTodos());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });
        this.projectSelect.addEventListener('change', () => this.changeProject());
        this.newProjectBtn.addEventListener('click', () => this.createProject());
        this.deleteProjectBtn.addEventListener('click', () => this.deleteProject());
    }

    showLoading(show = true) {
        this.loadingIndicator.classList.toggle('hidden', !show);
    }

    async loadProjects() {
        try {
            this.showLoading();
            this.projects = await this.api.getProjects();
            this.renderProjects();
        } catch (error) {
            this.showError('Failed to load projects');
        } finally {
            this.showLoading(false);
        }
    }

    renderProjects() {
        const options = this.projects.map(project => 
            `<option value="${project.id}">${project.name}</option>`
        ).join('');
        this.projectSelect.innerHTML = '<option value="">Select Project</option>' + options;
    }

    async createProject() {
        const name = prompt('Enter project name:');
        if (!name) return;

        try {
            this.showLoading();
            const project = await this.api.createProject(name);
            this.projects.push(project);
            this.renderProjects();
            this.projectSelect.value = project.id;
            await this.changeProject();
        } catch (error) {
            this.showError('Failed to create project');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteProject() {
        if (!this.currentProject || !confirm('Delete this project?')) return;

        try {
            this.showLoading();
            await this.api.deleteProject(this.currentProject);
            this.projects = this.projects.filter(p => p.id !== this.currentProject);
            this.currentProject = null;
            this.renderProjects();
            this.todoContent.classList.add('hidden');
        } catch (error) {
            this.showError('Failed to delete project');
        } finally {
            this.showLoading(false);
        }
    }

    async changeProject() {
        const projectId = this.projectSelect.value;
        if (!projectId) {
            this.todoContent.classList.add('hidden');
            return;
        }

        try {
            this.showLoading();
            this.currentProject = projectId;
            this.todos = await this.api.getTodos(projectId);
            this.todoContent.classList.remove('hidden');
            this.render();
        } catch (error) {
            this.showError('Failed to load todos');
        } finally {
            this.showLoading(false);
        }
    }

    async addTodo() {
        const text = this.todoInput.value.trim();
        if (!text || !this.currentProject) return;

        try {
            this.showLoading();
            const todo = await this.api.createTodo(this.currentProject, {
                text,
                completed: false
            });
            this.todos.push(todo);
            this.todoInput.value = '';
            this.render();
        } catch (error) {
            this.showError('Failed to add todo');
        } finally {
            this.showLoading(false);
        }
    }

    async toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        try {
            this.showLoading();
            const updated = await this.api.updateTodo(
                this.currentProject,
                id,
                { completed: !todo.completed }
            );
            this.todos = this.todos.map(t => t.id === id ? updated : t);
            this.render();
        } catch (error) {
            this.showError('Failed to update todo');
        } finally {
            this.showLoading(false);
        }
    }

    async deleteTodo(id) {
        try {
            this.showLoading();
            await this.api.deleteTodo(this.currentProject, id);
            this.todos = this.todos.filter(t => t.id !== id);
            this.render();
        } catch (error) {
            this.showError('Failed to delete todo');
        } finally {
            this.showLoading(false);
        }
    }

    showError(message) {
        const error = document.createElement('div');
        error.className = 'error';
        error.textContent = message;
        this.todoList.insertAdjacentElement('beforebegin', error);
        setTimeout(() => error.remove(), 3000);
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.render();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            default:
                return this.todos;
        }
    }

    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateTheme();
    }

    updateTheme() {
        const theme = document.documentElement.getAttribute('data-theme');
        this.themeToggle.innerHTML = theme === 'light' 
            ? '<i class="fas fa-moon"></i>' 
            : '<i class="fas fa-sun"></i>';
    }

    render() {
        const filteredTodos = this.getFilteredTodos();
        this.todoList.innerHTML = filteredTodos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <input type="checkbox" class="todo-checkbox" 
                    ${todo.completed ? 'checked' : ''} 
                    onchange="todoApp.toggleTodo(${todo.id})">
                <span class="todo-text">${todo.text}</span>
                <button class="delete-btn" onclick="todoApp.deleteTodo(${todo.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        const activeTodos = this.todos.filter(todo => !todo.completed).length;
        this.taskCount.textContent = `${activeTodos} task${activeTodos !== 1 ? 's' : ''} left`;
    }
}

const todoApp = new TodoApp();

// Load theme from localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);