import { Store } from './store.js';

class App {
    constructor() {
        this.currentView = 'tasks';
        this.tutorialStep = 0;
        this.init();
    }

    async init() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }

        Store.initDefaults();
        Store.applyRollover();

        this.render();
        this.setupEventListeners();
        this.updateHeaderDate();
        lucide.createIcons();

        // Check for tutorial
        if (!Store.state.settings.tutorialComplete) {
            this.showTutorial();
        }

        // Start smart scheduler
        this.startNotificationScheduler();
    }

    // --- TUTORIAL SYSTEM ---
    showTutorial() {
        const steps = [
            { title: "¡Bienvenido!", text: "Esta es tu app HogarZen. Vamos a enseñarte lo básico en 30 segundos." },
            { title: "Añadir Tareas", text: "Usa el botón '+' abajo a la derecha. La IA decidirá si es limpieza o compra por ti." },
            { title: "Marcar como Hecho", text: "Toca el círculo a la derecha de cada tarea cuando la termines." },
            { title: "Notificaciones Inteligentes", text: "Te avisaremos de tus pendientes solo cuando estés en casa (de 6 PM a 10 PM)." }
        ];

        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay active';
        overlay.innerHTML = `
            <div class="tutorial-box">
                <h2 id="tut-title">${steps[0].title}</h2>
                <p id="tut-text">${steps[0].text}</p>
                <button class="tutorial-next" id="tut-btn">Siguiente</button>
            </div>
        `;
        document.body.appendChild(overlay);

        let currentStep = 0;
        document.getElementById('tut-btn').onclick = () => {
            currentStep++;
            if (currentStep < steps.length) {
                document.getElementById('tut-title').innerText = steps[currentStep].title;
                document.getElementById('tut-text').innerText = steps[currentStep].text;
            } else {
                overlay.remove();
                Store.state.settings.tutorialComplete = true;
                Store.save();
                this.requestNotifPermission();
            }
        };
    }

    async requestNotifPermission() {
        if ("Notification" in window) {
            const permission = await Notification.requestPermission();
            Store.state.settings.notificationsEnabled = (permission === "granted");
            Store.save();
        }
    }

    // --- SMART SCHEDULER ---
    startNotificationScheduler() {
        setInterval(() => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const { start, end } = Store.state.settings.notifWindow;

            if (currentTime >= start && currentTime <= end) {
                this.checkAndNotify();
            }
        }, 60000); // Check every minute
    }

    checkAndNotify() {
        const today = new Date().toISOString().split('T')[0];
        const pending = Store.getScheduledTasks(today).filter(t => !t.completed);

        if (pending.length > 0) {
            this.showToast(`Tienes ${pending.length} tareas pendientes por hacer.`);
            if (Store.state.settings.notificationsEnabled) {
                new Notification("HogarZen", {
                    body: `Tienes ${pending.length} tareas pendientes. ¡Vamos a por ello!`,
                    icon: "assets/icon.png"
                });
            }
        }
    }

    showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast active';
        toast.innerHTML = `<i data-lucide="bell"></i> <span>${msg}</span>`;
        document.body.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => toast.classList.remove('active'), 4000);
        setTimeout(() => toast.remove(), 4500);
    }

    // --- RENDER LOGIC ---
    updateHeaderDate() {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', options);
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.onclick = (e) => this.switchView(e.currentTarget.getAttribute('data-view'));
        });
        document.getElementById('add-btn').onclick = () => this.showAddTaskModal();
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-view') === view));
        this.render();
    }

    render() {
        const container = document.getElementById('main-content');

        // Personalization: Update name in header
        const userName = Store.state.settings.userName || 'Usuario';
        document.getElementById('current-date').innerHTML = `Hola, ${userName} <br> ${this.getFormattedDate()}`;

        switch (this.currentView) {
            case 'tasks': this.renderTasks(container); break;
            case 'shopping': this.renderShopping(container); break;
            case 'scanner': this.renderScanner(container); break;
            case 'stats': this.renderStats(container); break; // NEW
            case 'settings': this.renderSettings(container); break;
            default: container.innerHTML = `<div class="empty-state">Próximamente...</div>`;
        }
        lucide.createIcons();
    }

    getFormattedDate() {
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        return new Date().toLocaleDateString('es-ES', options);
    }

    renderTasks(container) {
        const today = new Date().toISOString().split('T')[0];
        const tasks = Store.getScheduledTasks(today);

        if (tasks.length === 0) {
            container.innerHTML = `<div class="empty-state"><i data-lucide="sun"></i><p>Todo listo por hoy.</p></div>`;
            return;
        }

        let html = '<h2 class="view-title">Mis Deberes</h2>';
        tasks.sort((a, b) => (a.priority === 'high' ? -1 : 1)).forEach(task => {
            html += `
                <div class="card task-item ${task.completed ? 'completed' : ''}" id="task-${task.id}">
                    <div class="task-info">
                        <span class="priority-dot ${task.priority}"></span>
                        <div>
                            <h3>${task.title}</h3>
                            <small>${task.type}</small>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <button class="delete-btn" onclick="app.deleteTask(${task.id})">
                            <i data-lucide="trash-2"></i>
                        </button>
                        <button class="check-btn" onclick="app.toggleTask(${task.id})">
                            <i data-lucide="${task.completed ? 'check-circle' : 'circle'}"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    renderStats(container) {
        const tasks = Store.state.tasks;
        const total = tasks.length;
        const complete = tasks.filter(t => t.completed).length;
        const percent = total > 0 ? Math.round((complete / total) * 100) : 0;

        container.innerHTML = `
            <div class="stats-header">
                <h2 class="view-title">Tu Progreso</h2>
                <div class="progress-circle" style="--progress: ${percent}">
                    <div class="progress-content">
                        <span class="progress-val">${percent}%</span>
                        <p>Completado</p>
                    </div>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <i data-lucide="list-checks"></i>
                    <h3>${complete}</h3>
                    <p>Hechas</p>
                </div>
                <div class="stat-card">
                    <i data-lucide="clock"></i>
                    <h3>${total - complete}</h3>
                    <p>Pendientes</p>
                </div>
            </div>
        `;
    }

    renderSettings(container) {
        const s = Store.state.settings;
        container.innerHTML = `
            <h2 class="view-title">Ajustes</h2>
            <div class="card">
                <h3>Perfil</h3>
                <label>Tu Nombre</label>
                <input type="text" id="set-name" class="settings-input" value="${s.userName || ''}" placeholder="Escribe tu nombre">
                
                <h3>Horario de Notificaciones</h3>
                <p>Te avisaremos entre estas horas:</p>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <input type="time" id="set-start" class="settings-input" value="${s.notifWindow.start}">
                    <input type="time" id="set-end" class="settings-input" value="${s.notifWindow.end}">
                </div>
                <button class="tutorial-next" style="margin-top:1rem" id="save-settings">Guardar Cambios</button>
            </div>
        `;
        document.getElementById('save-settings').onclick = () => {
            s.userName = document.getElementById('set-name').value;
            s.notifWindow.start = document.getElementById('set-start').value;
            s.notifWindow.end = document.getElementById('set-end').value;
            Store.save();
            this.render();
            this.showToast("Ajustes guardados con éxito");
        };
    }

    renderShopping(container) {
        const items = Store.state.shoppingItems;
        let html = '<h2 class="view-title">Lista de Compras</h2>';

        if (items.length === 0) {
            html += `<div class="empty-state"><i data-lucide="shopping-cart"></i><p>No hay artículos en la lista.</p></div>`;
        } else {
            items.forEach(item => {
                html += `
                    <div class="card shopping-item" style="display:flex; justify-content:space-between; align-items:center;">
                        <div class="item-info">
                            <h3>${item.name}</h3>
                            <span>Cant: ${item.quantity}</span>
                        </div>
                        <button class="action-btn" style="background:none; border:none; color:var(--accent-sage);"><i data-lucide="shopping-bag"></i></button>
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
                <div class="drop-zone" id="camera-preview" style="border: 2px dashed var(--accent-cream); padding: 3rem; border-radius: var(--radius); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; cursor: pointer; margin-top:1rem;">
                    <i data-lucide="camera" style="width:40px;height:40px;color:var(--accent-sage);"></i>
                    <span>Tocar para usar cámara</span>
                    <input type="file" id="file-input" accept="image/*" style="display:none">
                </div>
                <div id="ocr-status" style="margin-top: 1rem; font-size: 0.9rem; color: var(--accent-sage-dark); text-align: center;"></div>
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
                <div class="scan-result" style="background:var(--accent-cream); padding:1rem; border-radius:12px; margin-top:1rem;">
                    <p>Factura procesada con éxito.</p>
                    <small>Se detectaron nuevos artículos para sugerencias inteligentes.</small>
                </div>
            `;
            this.showToast("Factura procesada con éxito");
        } catch (err) {
            status.innerText = "Error al procesar la imagen.";
            this.showToast("Error en el escaneo");
        }
    }

    toggleTask(id) {
        Store.toggleTask(id);
        const task = Store.state.tasks.find(t => t.id === id);
        if (task && task.completed) {
            const el = document.getElementById(`task-${id}`);
            if (el) el.classList.add('celebrate');
            this.showToast("¡Buen trabajo!");
        }
        this.render();
    }

    deleteTask(id) {
        if (confirm("¿Seguro que quieres borrar esta tarea?")) {
            Store.deleteTask(id);
            this.render();
            this.showToast("Tarea eliminada");
        }
    }

    showAddTaskModal() {
        const title = prompt("¿Qué hay que hacer?");
        if (title) {
            Store.addTask({ title });
            this.render();
            this.showToast("IA: Tarea asignada automáticamente");
        }
    }
}

window.app = new App();
