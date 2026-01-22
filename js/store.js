export const Store = {
    state: {
        tasks: JSON.parse(localStorage.getItem('zen_tasks')) || [],
        shoppingItems: JSON.parse(localStorage.getItem('zen_shopping')) || [],
        inventory: JSON.parse(localStorage.getItem('zen_inventory')) || [],
        settings: JSON.parse(localStorage.getItem('zen_settings')) || {
            userName: 'User',
            autoRollover: true,
            initialized: false,
            tutorialComplete: false,
            notifWindow: { start: "18:00", end: "22:00" },
            notificationsEnabled: false,
            dinnerOffset: 2,
            workStartTime: "09:00",
            cleaningFrequencies: { clothes: 3, sheets: 7 },
            lastDeepClean: { clothes: null, sheets: null },
            marketFrequency: 7,
            lastMarketDate: null
        }
    },

    generateId() {
        return Date.now() + Math.floor(Math.random() * 1000);
    },

    save() {
        localStorage.setItem('zen_tasks', JSON.stringify(this.state.tasks));
        localStorage.setItem('zen_shopping', JSON.stringify(this.state.shoppingItems));
        localStorage.setItem('zen_inventory', JSON.stringify(this.state.inventory));
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
            id: this.generateId(),
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
    },

    // Automated Reasoning for Zen Life
    runDailyIntelligence() {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const settings = this.state.settings;
        const existingTasks = this.getScheduledTasks(today);

        // 1. MANDATORY: Cooking Task (High Priority)
        if (!existingTasks.find(t => t.title.toLowerCase().includes('cocinar') || t.title.toLowerCase().includes('cena'))) {
            this.addTask({
                title: 'Cocinar Cena (Horario Zen)',
                type: 'hogar',
                priority: 'high',
                dueDate: today
            });
        }

        // 2. Clothes Cleaning Logic
        const lastClothes = settings.lastDeepClean.clothes ? new Date(settings.lastDeepClean.clothes) : null;
        const daysSinceClothes = lastClothes ? Math.floor((now - lastClothes) / (1000 * 60 * 60 * 24)) : 999;
        if (daysSinceClothes >= settings.cleaningFrequencies.clothes) {
            if (!existingTasks.find(t => t.title.toLowerCase().includes('ropa'))) {
                this.addTask({ title: 'Lavar ropa y prendas', type: 'limpieza', priority: 'medium', dueDate: today });
            }
        }

        // 3. Sheets Cleaning Logic
        const lastSheets = settings.lastDeepClean.sheets ? new Date(settings.lastDeepClean.sheets) : null;
        const daysSinceSheets = lastSheets ? Math.floor((now - lastSheets) / (1000 * 60 * 60 * 24)) : 999;
        if (daysSinceSheets >= settings.cleaningFrequencies.sheets) {
            if (!existingTasks.find(t => t.title.toLowerCase().includes('sábanas'))) {
                this.addTask({ title: 'Cambiar y lavar sábanas', type: 'limpieza', priority: 'low', dueDate: today });
            }
        }

        // 4. Market Cycle Reasoning
        if (settings.lastMarketDate) {
            const lastMarket = new Date(settings.lastMarketDate);
            const daysSinceMarket = Math.floor((now - lastMarket) / (1000 * 60 * 60 * 24));
            if (daysSinceMarket >= settings.marketFrequency - 1) { // 1 day before market
                if (!existingTasks.find(t => t.title.toLowerCase().includes('mercado'))) {
                    this.addTask({ title: 'Hacer Mercado (Reabastecer)', type: 'compras', priority: 'high', dueDate: today });
                }
            }
        }
    },

    registerMarket() {
        this.state.settings.lastMarketDate = new Date().toISOString();
        this.save();
    },

    // INVENTORY MANAGEMENT
    updateInventory(name, quantityBatch) {
        const item = this.state.inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
        if (item) {
            item.quantity += quantityBatch;
            item.lastUpdated = new Date().toISOString();
        } else {
            this.state.inventory.push({
                id: this.generateId(),
                name: name,
                quantity: quantityBatch,
                consumed: 0,
                lastUpdated: new Date().toISOString()
            });
        }
        this.save();
    },

    consumeItem(id, amount = 1) {
        const item = this.state.inventory.find(i => i.id === id);
        if (item && item.quantity >= amount) {
            item.quantity -= amount;
            item.consumed += amount;
            item.lastUpdated = new Date().toISOString();
            this.save();
            return true;
        }
        return false;
    }
};
