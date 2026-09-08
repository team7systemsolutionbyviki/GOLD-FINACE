/**
 * Staff/Users Management Module
 */

const Users = {
    render: async function() {
        const container = document.getElementById('view-users');
        if (!container) return;

        // Security check - Only SUPER_ADMIN can view this page
        const currentUser = Auth.getCurrentUser();
        if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
            container.innerHTML = `
                <div class="page-header">
                    <h2>Access Denied</h2>
                </div>
                <div class="card p-4 text-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-danger mb-3" style="width: 48px; height: 48px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <h3 class="text-danger">Unauthorized</h3>
                    <p class="text-muted">Only the Super Administrator can access this module.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="page-header">
                <h2>Staff Management</h2>
                <button class="btn btn-primary" onclick="Users.openUserModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg> Add New User</button>
            </div>
            
            <div class="card">
                <div class="table-responsive">
                    <table class="table" id="usersTable">
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Password</th>
                                <th>Role</th>
                                <th>Created Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody">
                            <tr><td colspan="4" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadUsers();
    },

    loadUsers: async function() {
        try {
            const users = await db.getAll('users');
            const tbody = document.getElementById('usersTableBody');
            
            let html = '';
            users.forEach(u => {
                const isSuper = u.role === 'SUPER_ADMIN';
                const badgeClass = isSuper ? 'badge-warning' : 'badge-primary';
                const displayPassword = isSuper ? '<span class="text-muted">••••••••</span>' : `<span style="font-family: monospace;">${u.password}</span>`;
                
                html += `
                    <tr>
                        <td><strong>${u.username}</strong></td>
                        <td>${displayPassword}</td>
                        <td><span class="badge ${badgeClass}">${u.role}</span></td>
                        <td>${Utils.formatDate(u.createdAt)}</td>
                        <td>
                            ${!isSuper ? `
                                <button class="btn btn-icon btn-outline text-danger" title="Delete User" onclick="Users.deleteUser(${u.id}, '${u.username}')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            ` : '<span class="text-muted" style="font-size: 12px;">No Actions</span>'}
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to load users', 'error');
        }
    },

    openUserModal: function() {
        const modalId = 'userModal';
        const html = `
            <div class="modal-overlay active" id="${modalId}">
                <div class="modal modal-sm">
                    <div class="modal-header">
                        <h3>Add New User</h3>
                        <button type="button" class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="userForm">
                            <div class="form-group">
                                <label>Username *</label>
                                <input type="text" id="newUsername" class="form-control" required pattern="[A-Za-z0-9_]{3,20}" title="3-20 letters, numbers, or underscores">
                            </div>
                            <div class="form-group">
                                <label>Password *</label>
                                <input type="password" id="newPassword" class="form-control" required minlength="6">
                            </div>
                            <div class="form-group">
                                <label>Role</label>
                                <select id="newUserRole" class="form-control">
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="STAFF">STAFF</option>
                                </select>
                                <small class="text-muted mt-1" style="display:block;">Select ADMIN or STAFF. SUPER_ADMIN is reserved.</small>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="Users.saveUser()">Create User</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    saveUser: async function() {
        const form = document.getElementById('userForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;

        try {
            // Check if user already exists
            const existing = await db.getByIndex('users', 'username', username);
            if (existing.length > 0) {
                Utils.showToast('Error', 'Username already exists', 'error');
                return;
            }

            const role = document.getElementById('newUserRole').value;

            const userData = {
                username: username,
                password: password,
                role: role,
                createdAt: new Date().toISOString()
            };

            const id = await db.add('users', userData);
            await db.logAudit('CREATE', 'Users', id, 'Created new user: ' + username);
            
            document.getElementById('userModal').remove();
            Utils.showToast('Success', 'User created successfully', 'success');
            this.loadUsers();

        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to create user', 'error');
        }
    },

    deleteUser: function(id, username) {
        Utils.confirmDialog('Delete User', `Are you sure you want to delete user '${username}'?`, async () => {
            try {
                // Ensure we aren't deleting the currently logged in user
                const current = Auth.getCurrentUser();
                if (current.id === id) {
                    Utils.showToast('Error', 'You cannot delete yourself!', 'error');
                    return;
                }

                await db.delete('users', id);
                await db.logAudit('DELETE', 'Users', id, 'Deleted user: ' + username);
                Utils.showToast('Success', 'User deleted successfully', 'success');
                this.loadUsers();
            } catch (err) {
                console.error(err);
                Utils.showToast('Error', 'Failed to delete user', 'error');
            }
        });
    }
};

window.Users = Users;
