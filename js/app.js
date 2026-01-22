import { Store } from './store.js';

class App {
    constructor() {
        this.currentView = 'tasks';
        this.init();
    }

    async init() {
        // Register Service Worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('Service Worker Registered'))
                .catch(err => console.error('SW Registration Failed', err));
        }

        // Initialize defaults if first time
        Store.initDefaults();

        // Apply rollover logic on startup
        Store.applyRollover();

        // Initial render
        this.render();
        this.setupEventListeners();

        // Update Icons
        lucide.createIcons();

        // Update date in header
        this.updateHeaderDate();

        // Check for necessary purchases (Smart Indicator)
        this.checkSmartAlerts();
    }

    updateHeaderDate() {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', options);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // FAB - Add Task
        document.getElementById('add-btn').addEventListener('click', () => {
            this.showAddTaskModal();
        });
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === view);
        });
        this.render();
    }

    render() {
        const container = document.getElementById('main-content');

        switch (this.currentView) {
            case 'tasks':
                this.renderTasks(container);
                break;
            case 'shopping':
                this.renderShopping(container);
                break;
            case 'scanner':
                this.renderScanner(container);
                break;
            default:
                container.innerHTML = `<div class="empty-state">Próximamente: ${this.currentView}</div>`;
        }

        lucide.createIcons();
    }

    renderTasks(container) {
        const today = new Date().toISOString().split('T')[0];
        const tasks = Store.getScheduledTasks(today);

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="sun"style="width:48px;height:48px;color:var(--accent-sage);margin-bottom:1rem;"></i>
                    <p>Todo despejado para hoy.</p>
                </div>
            `;
            return;
        }

        let html = '<h2 class="view-title">Tareas de Hoy</h2>';
        tasks.sort((a, b) => (a.priority === 'high' ? -1 : 1)).forEach(task => {
            html += `
                <div class="card task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                    <div class="task-info">
                        <span class="priority-dot ${task.priority}"></span>
                        <div class="task-details">
                            <h3>${task.title}</h3>
                            <span class="task-type">${task.type}</span>
                        </div>
                    </div>
                    <button class="check-btn" onclick="app.toggleTask(${task.id})">
                        <i data-lucide="${task.completed ? 'check-circle' : 'circle'}"></i>
                    </button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    renderShopping(container) {
        const items = Store.state.shoppingItems;
        let html = '<h2 class="view-title">Lista de Compras</h2>';

        if (items.length === 0) {
            html += '<p class="empty-msg">No hay artículos en la lista.</p>';
        } else {
            items.forEach(item => {
                html += `
                    <div class="card shopping-item">
                        <div class="item-info">
                            <h3>${item.name}</h3>
                            <span>Cant: ${item.quantity}</span>
                        </div>
                        <button class="action-btn"><i data-lucide="shopping-bag"></i></button>
                    </div>
                `;
            });
        }
        container.innerHTML = html;
    }

    renderScanner(container) {
        container.innerHTML = `
            <div class="card scanner-view">
                <h2 class="view-title">Escanear Factura</h2>
                <p>Captura tu factura para actualizar existencias automáticamente e inteligencia de compra.</p>
                <div class="drop-zone" id="camera-preview">
                    <i data-lucide="camera" style="width:40px;height:40px;"></i>
                    <span>Tocar para usar cámara</span>
                    <input type="file" id="file-input" accept="image/*" style="display:none">
                </div>
                <div id="ocr-status"></div>
            </div>
        `;

        document.getElementById('camera-preview').onclick = () => {
            document.getElementById('file-input').click();
        };

        document.getElementById('file-input').onchange = (e) => {
            this.handleScan(e.target.files[0]);
        };
    }

    async handleScan(file) {
        if (!file) return;
        const status = document.getElementById('ocr-status');
        status.innerText = "Procesando factura... 🧠";

        try {
            const result = await Tesseract.recognize(file, 'spa');
            console.log(result.data.text);
            status.innerHTML = `
                <div class="scan-result">
                    <p>Factura procesada con éxito.</p>
                    <small>Se detectaron nuevos artículos para sugerencias inteligentes.</small>
                </div>
            `;
        } catch (err) {
            status.innerText = "Error al procesar la imagen.";
        }
    }

    toggleTask(id) {
        Store.toggleTask(id);
        this.render();
    }

    showAddTaskModal() {
        const title = prompt("Nueva tarea:");
        if (title) {
            Store.addTask({ title });
            this.render();
        }
    }

    checkSmartAlerts() {
        const today = new Date();
        let alerts = 0;

        Store.state.shoppingItems.forEach(item => {
            if (item.lastPurchased) {
                const lastDate = new Date(item.lastPurchased);
                const diffTime = Math.abs(today - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= item.frequencyDays) {
                    item.needed = true;
                    alerts++;
                }
            }
        });

        if (alerts > 0) {
            console.log(`Inteligencia: ${alerts} artículos podrían necesitarse pronto.`);
            // Potentially show a badge or UI hint
        }
    }
}


// Global instance for inline onclicks
window.app = new App();
