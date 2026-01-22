export const Store = {
    state: {
        tasks: JSON.parse(localStorage.getItem('zen_tasks')) || [],
        shoppingItems: JSON.parse(localStorage.getItem('zen_shopping')) || [],
        settings: JSON.parse(localStorage.getItem('zen_settings')) || {
            userName: 'User',
            autoRollover: true,
            initialized: false
        }
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


    save() {
        localStorage.setItem('zen_tasks', JSON.stringify(this.state.tasks));
        localStorage.setItem('zen_shopping', JSON.stringify(this.state.shoppingItems));
        localStorage.setItem('zen_settings', JSON.stringify(this.state.settings));
    },

    // Task Logic
    addTask(task) {
        const newTask = {
            id: Date.now(),
            title: task.title,
            type: task.type || 'hogar', // hogar, limpieza, compras
            priority: task.priority || 'medium',
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

    // Intelligent Rollover
    applyRollover() {
        const today = new Date().toISOString().split('T')[0];
        let changes = false;

        this.state.tasks.forEach(task => {
            if (!task.completed && task.dueDate < today) {
                task.dueDate = today;
                task.priority = 'high'; // Prioritize if rolled over
                changes = true;
            }
        });

        if (changes) this.save();
    },

    // Shopping Logic
    addShoppingItem(item) {
        const newItem = {
            id: Date.now(),
            name: item.name,
            quantity: item.quantity || 1,
            lastPurchased: item.lastPurchased || null,
            frequencyDays: item.frequencyDays || 7, // Default weekly
            needed: true
        };
        this.state.shoppingItems.push(newItem);
        this.save();
    },

    getScheduledTasks(date) {
        return this.state.tasks.filter(t => t.dueDate === date);
    }
};
