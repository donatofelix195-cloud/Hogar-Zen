export const Store = {
    state: {
        tasks: JSON.parse(localStorage.getItem('zen_tasks')) || [],
        shoppingItems: JSON.parse(localStorage.getItem('zen_shopping')) || [],
        settings: JSON.parse(localStorage.getItem('zen_settings')) || {
            userName: 'User',
            autoRollover: true,
            initialized: false,
            tutorialComplete: false,
            notifWindow: { start: "18:00", end: "22:00" },
            notificationsEnabled: false
        }
    },

    save() {
        localStorage.setItem('zen_tasks', JSON.stringify(this.state.tasks));
        localStorage.setItem('zen_shopping', JSON.stringify(this.state.shoppingItems));
        localStorage.setItem('zen_settings', JSON.stringify(this.state.settings));
    },

    initDefaults() {
        if (!this.state.settings.initialized) {
            const today = new Date().toISOString().split('T')[0];
            this.addTask({ title: 'Limpieza de cocina', type: 'limpieza', priority: 'medium', dueDate: today });
            this.addTask({ title: 'Revisar inventario de mercado', type: 'compras', priority: 'high', dueDate: today });
            this.state.settings.initialized = true;
            this.save();
        }
    },

    // Intelligent Designation
    designateTask(title) {
        let type = 'hogar';
        let priority = 'medium';
        const t = title.toLowerCase();

        if (t.includes('limpia') || t.includes('lavar') || t.includes('barrer') || t.includes('trapear')) {
            type = 'limpieza';
        } else if (t.includes('comprar') || t.includes('mercado') || t.includes('super')) {
            type = 'compras';
            priority = 'high';
        }

        if (t.includes('urgente') || t.includes('importante')) {
            priority = 'high';
        }

        return { type, priority };
    },

    addTask(task) {
        const intel = this.designateTask(task.title);
        const newTask = {
            id: Date.now(),
            title: task.title,
            type: task.type || intel.type,
            priority: task.priority || intel.priority,
            dueDate: task.dueDate || new Date().toISOString().split('T')[0],
            completed: false,
            createdAt: new Date().toISOString()
        };
        this.state.tasks.push(newTask);
        this.save();
        return newTask;
    },

    toggleTask(id) {
        const task = this.state.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.save();
        }
    },

    deleteTask(id) {
        this.state.tasks = this.state.tasks.filter(t => t.id !== id);
        this.save();
    },

    applyRollover() {
        const today = new Date().toISOString().split('T')[0];
        let changes = false;
        this.state.tasks.forEach(task => {
            if (!task.completed && task.dueDate < today) {
                task.dueDate = today;
                task.priority = 'high';
                changes = true;
            }
        });
        if (changes) this.save();
    },

    getScheduledTasks(date) {
        return this.state.tasks.filter(t => t.dueDate === date);
    }
};
