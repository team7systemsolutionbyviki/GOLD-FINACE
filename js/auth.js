/**
 * Authentication & Session Management
 */

const Auth = {
    init: async function() {
        // Ensure default users exist
        let users = await db.getAll('users');
        
        // Ensure SUPER_ADMIN VIKI exists
        const vikiUser = users.find(u => u.username === 'VIKI');
        if (!vikiUser) {
            await db.add('users', {
                username: 'VIKI',
                password: 'VIKI1101', 
                role: 'SUPER_ADMIN',
                createdAt: new Date().toISOString()
            });
            console.log("Super admin created: VIKI");
        }

        // Ensure default admin exists
        const adminUser = users.find(u => u.username === 'admin');
        if (!adminUser) {
            await db.add('users', {
                username: 'admin',
                password: 'admin123',
                role: 'ADMIN',
                createdAt: new Date().toISOString()
            });
            console.log("Default admin created: admin");
        }

        // Setup Event Listeners
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.logout.bind(this));
        }

        // Check login state
        this.checkSession();
    },

    handleLogin: async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value; // Keeping simple for now

        const users = await db.getByIndex('users', 'username', username);
        if (users.length > 0) {
            const user = users[0];
            if (user.password === password) {
                // Success
                sessionStorage.setItem('gf_user', JSON.stringify({
                    id: user.id,
                    username: user.username,
                    role: user.role
                }));
                Utils.showToast('Login Successful', 'Welcome to Gold Finance', 'success');
                
                // Trigger Auto-Backup on fresh login
                if (window.Backup) {
                    setTimeout(() => {
                        Backup.runAutoBackup(false).catch(console.error);
                    }, 3000); // Wait 3 seconds before auto-backing up to not freeze UI
                }

                this.checkSession();
            } else {
                Utils.showToast('Login Failed', 'Invalid username or password', 'error');
            }
        } else {
            Utils.showToast('Login Failed', 'User not found', 'error');
        }
    },

    logout: function() {
        sessionStorage.removeItem('gf_user');
        this.checkSession();
    },

    checkSession: function() {
        const userJson = sessionStorage.getItem('gf_user');
        const loginScreen = document.getElementById('loginScreen');
        const appScreen = document.getElementById('appScreen');
        
        if (userJson) {
            const user = JSON.parse(userJson);
            
            // Set periodic backup every 15 minutes (900000 ms)
            if (window.Backup && !window._backupInterval) {
                window._backupInterval = setInterval(() => {
                    Backup.runAutoBackup(false).catch(console.error);
                }, 900000);
            }

            // Update UI with user info
            if(document.getElementById('loggedUserName')) {
                document.getElementById('loggedUserName').textContent = user.username;
                document.getElementById('loggedUserRole').textContent = user.role === 'ADMIN' ? 'Administrator' : 'Staff';
                document.getElementById('userInitial').textContent = user.username.charAt(0).toUpperCase();
            }

            // Show or hide Staff Management depending on role
            const navUsersItem = document.getElementById('nav-users-item');
            if (navUsersItem) {
                if (user.role === 'SUPER_ADMIN') {
                    navUsersItem.style.display = 'block';
                } else {
                    navUsersItem.style.display = 'none';
                }
            }

            // Show app, hide login
            if (loginScreen) loginScreen.style.display = 'none';
            if (appScreen) appScreen.style.display = 'flex';
            
            // Initialize main app if not done yet
            if (window.App && !window.App.initialized) {
                window.App.init();
            }
        } else {
            // Show login, hide app
            if (loginScreen) loginScreen.style.display = 'flex';
            if (appScreen) appScreen.style.display = 'none';
        }
    },
    
    getCurrentUser: function() {
        const userStr = sessionStorage.getItem('gf_user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

// Initialize auth immediately on script load, after DOM
document.addEventListener('DOMContentLoaded', () => {
    // delay slightly to let DB initialize
    setTimeout(() => {
        Auth.init();
    }, 100);
});
