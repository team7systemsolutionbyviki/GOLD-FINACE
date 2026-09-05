/**
 * Main Application Logic & View Routing
 */

const App = {
    initialized: false,
    currentView: 'dashboard',
    
    // List of available modules (matching the data-view attributes)
    modules: [
        'dashboard', 'today-collect', 'customers', 'new-loan', 'active-loans', 
        'payments', 'loan-closure', 'gold-inventory', 'expenses', 
        'reports', 'receipts', 'backup-restore', 'settings', 'users'
    ],

    init: async function() {
        if (this.initialized) return;
        this.initialized = true;

        this.setupNavigation();
        this.setupOfflineListener();
        this.updateDateDisplay();
        this.setupTheme();
        
        // Ensure settings are loaded first, then initialize the dashboard
        await this.loadInitialSettings();
        
        // Generate placeholder views in the viewsContainer
        this.generateViews();

        // Load dashboard by default
        this.navigate('dashboard');
        
        // Mobile menu toggle
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
        
        // Global Search Setup
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    // Quick route to a search results view or filter lists based on query
                    console.log("Searching for: ", searchInput.value);
                    Utils.showToast('Search', 'Global search functionality to be implemented fully', 'info');
                }
            });
        }
    },
    
    loadInitialSettings: async function() {
        const companyName = await db.get('settings', 'companyName');
        if (companyName) {
            document.getElementById('companyNameSidebar').textContent = companyName.value;
        } else {
            // Setup default settings if missing
            await db.put('settings', { key: 'companyName', value: 'Gold Finance' });
            await db.put('settings', { key: 'currencySymbol', value: '₹' });
            await db.put('settings', { key: 'goldRate22K', value: 7000 });
            await db.put('settings', { key: 'ltvPercentage', value: 75 });
            await db.put('settings', { key: 'interestRate', value: 2 }); // 2% per month
            await db.put('settings', { key: 'customerPrefix', value: 'GF-CUST-' });
            await db.put('settings', { key: 'loanPrefix', value: 'GF-LOAN-' });
            await db.put('settings', { key: 'receiptPrefix', value: 'GF-REC-' });
        }
    },

    setupNavigation: function() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewName = item.getAttribute('data-view');
                if (viewName) {
                    this.navigate(viewName);
                    // Close sidebar on mobile after clicking
                    if(window.innerWidth <= 768) {
                        document.querySelector('.sidebar').classList.remove('open');
                    }
                }
            });
        });
    },

    setupTheme: function() {
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const themeIcon = document.getElementById('themeIcon');
        
        // Check saved theme
        const savedTheme = localStorage.getItem('appTheme') || 'light';
        
        const setDarkTheme = (isDark) => {
            if (isDark) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('appTheme', 'dark');
                // Moon icon
                if (themeIcon) {
                    themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
                }
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('appTheme', 'light');
                // Sun icon
                if (themeIcon) {
                    themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle>
                                           <line x1="12" y1="1" x2="12" y2="3"></line>
                                           <line x1="12" y1="21" x2="12" y2="23"></line>
                                           <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                           <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                           <line x1="1" y1="12" x2="3" y2="12"></line>
                                           <line x1="21" y1="12" x2="23" y2="12"></line>
                                           <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                           <line x1="18.36" y1="4.22" x2="19.78" y2="5.64"></line>`;
                }
            }
        };

        // Initialize on load
        setDarkTheme(savedTheme === 'dark');

        // Toggle on click
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const isCurrentlyDark = document.body.classList.contains('dark-theme');
                setDarkTheme(!isCurrentlyDark);
            });
        }
    },

    generateViews: function() {
        const container = document.getElementById('viewsContainer');
        this.modules.forEach(module => {
            // Only create if it doesn't exist
            if (!document.getElementById(`view-${module}`)) {
                const div = document.createElement('div');
                div.id = `view-${module}`;
                div.className = 'view-section';
                // HTML content will be injected by the respective module JS files
                div.innerHTML = `<div class="empty-state"><h2>Loading ${module.replace('-', ' ')}...</h2></div>`;
                container.appendChild(div);
            }
        });
    },

    navigate: function(viewName) {
        // Update Nav UI
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === viewName) {
                item.classList.add('active');
                document.getElementById('pageTitle').textContent = item.textContent.trim();
            }
        });

        // Update Views
        document.querySelectorAll('.view-section').forEach(view => {
            view.classList.remove('active');
        });
        
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active');
        }

        this.currentView = viewName;
        
        // Trigger module specific render function based on viewName
        this.triggerModuleRender(viewName);
    },
    
    triggerModuleRender: function(viewName) {
        switch(viewName) {
            case 'dashboard':
                if (window.Dashboard) window.Dashboard.render();
                break;
            case 'today-collect':
                if (window.TodayCollect) window.TodayCollect.render();
                break;
            case 'customers':
                if (window.Customers) window.Customers.render();
                break;
            case 'settings':
                if (window.Settings) window.Settings.render();
                break;
            case 'new-loan':
                if (window.Loans) window.Loans.renderNewForm();
                break;
            case 'active-loans':
                if (window.Loans) window.Loans.renderActiveLoans();
                break;
            case 'payments':
                if (window.Payments) window.Payments.render();
                break;
            case 'loan-closure':
                if (window.Closure) window.Closure.render();
                break;
            case 'gold-inventory':
                if (window.Gold) window.Gold.render();
                break;
            case 'expenses':
                if (window.Expenses) window.Expenses.render();
                break;
            case 'reports':
                if (window.Reports) window.Reports.render();
                break;
            case 'receipts':
                if (window.Receipts) window.Receipts.render();
                break;
            case 'users':
                if (window.Users) window.Users.render();
                break;
            case 'backup-restore':
                if (window.Backup) window.Backup.render();
                break;
        }
    },

    updateDateDisplay: function() {
        const dateElement = document.getElementById('currentDateDisplay');
        if (dateElement) {
            dateElement.textContent = Utils.formatDate(new Date());
        }
    },

    setupOfflineListener: function() {
        const indicator = document.getElementById('offlineIndicator');
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                indicator.classList.remove('offline');
                indicator.title = 'Online Mode (Local DB)';
            } else {
                indicator.classList.add('offline');
                indicator.title = 'Offline Mode (Local DB)';
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus(); // Initial check
    }
};

window.App = App;
