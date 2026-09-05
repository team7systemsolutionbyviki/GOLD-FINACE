/**
 * Expenses Module
 */

const Expenses = {
    render: async function() {
        const container = document.getElementById('view-expenses');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h2>Office Expenses</h2>
                <button class="btn btn-primary" onclick="Expenses.openExpenseModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add Expense</button>
            </div>
            
            <div class="dashboard-stats mb-4">
                <div class="stat-card">
                    <div class="stat-icon icon-red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
                    <div class="stat-details">
                        <div class="stat-title">Today's Expenses</div>
                        <div class="stat-value" id="exp_today">₹0.00</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon icon-gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></div>
                    <div class="stat-details">
                        <div class="stat-title">This Month</div>
                        <div class="stat-value" id="exp_month">₹0.00</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header flex-between">
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="date" id="expFilterDate" class="form-control" onchange="Expenses.loadExpenses()">
                    </div>
                    <select class="form-control" style="width: auto;" id="expFilterCategory" onchange="Expenses.loadExpenses()">
                        <option value="ALL">All Categories</option>
                        <option value="Rent">Rent</option>
                        <option value="Electricity">Electricity</option>
                        <option value="Salary">Salary</option>
                        <option value="Transport">Transport</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Office Expense">Office Expense</option>
                        <option value="Bank Charges">Bank Charges</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="table-responsive">
                    <table class="table" id="expensesTable">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Payment Mode</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="expensesTableBody">
                            <tr><td colspan="6" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadExpenses();
    },

    loadExpenses: async function() {
        try {
            const allExpenses = await db.getAll('expenses');
            const tbody = document.getElementById('expensesTableBody');
            
            const dateFilter = document.getElementById('expFilterDate').value;
            const catFilter = document.getElementById('expFilterCategory').value;

            // Stats calculation
            const today = Utils.getISODate();
            const thisMonthPrefix = today.substring(0, 7); // YYYY-MM
            
            let todayTotal = 0;
            let monthTotal = 0;
            
            allExpenses.forEach(e => {
                if (e.date === today) todayTotal += e.amount;
                if (e.date.startsWith(thisMonthPrefix)) monthTotal += e.amount;
            });
            
            document.getElementById('exp_today').textContent = Utils.formatCurrency(todayTotal);
            document.getElementById('exp_month').textContent = Utils.formatCurrency(monthTotal);

            // Filtering
            let filtered = allExpenses;
            if (dateFilter) filtered = filtered.filter(e => e.date === dateFilter);
            if (catFilter !== 'ALL') filtered = filtered.filter(e => e.category === catFilter);

            filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No expenses found for selected filters</td></tr>`;
                return;
            }

            let html = '';
            filtered.forEach(e => {
                html += `
                    <tr>
                        <td>${Utils.formatDate(e.date)}</td>
                        <td><span class="badge badge-gray">${e.category}</span></td>
                        <td>${e.description}</td>
                        <td class="text-danger font-weight-bold">${Utils.formatCurrency(e.amount)}</td>
                        <td>${e.paymentMode}</td>
                        <td>
                            <button class="btn btn-icon btn-text text-danger" onclick="Expenses.deleteExpense(${e.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;

        } catch (err) {
            console.error(err);
        }
    },

    openExpenseModal: function() {
        const modalId = 'expenseModal';
        const html = `
            <div class="modal-overlay active" id="${modalId}">
                <div class="modal modal-sm">
                    <div class="modal-header">
                        <h3>Add Expense</h3>
                        <button type="button" class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="expenseForm">
                            <div class="form-group">
                                <label>Date *</label>
                                <input type="date" id="expDate" class="form-control" value="${Utils.getISODate()}" required>
                            </div>
                            <div class="form-group">
                                <label>Category *</label>
                                <select id="expCategory" class="form-control" required>
                                    <option value="Rent">Rent</option>
                                    <option value="Electricity">Electricity</option>
                                    <option value="Salary">Salary</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Office Expense">Office Expense</option>
                                    <option value="Bank Charges">Bank Charges</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Amount *</label>
                                <input type="number" step="0.01" id="expAmount" class="form-control" required min="0.01">
                            </div>
                            <div class="form-group">
                                <label>Payment Mode *</label>
                                <select id="expMode" class="form-control" required>
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card">Card</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <input type="text" id="expDesc" class="form-control" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="Expenses.saveExpense()">Save Expense</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    saveExpense: async function() {
        const form = document.getElementById('expenseForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const expenseData = {
            date: document.getElementById('expDate').value,
            category: document.getElementById('expCategory').value,
            amount: parseFloat(document.getElementById('expAmount').value),
            paymentMode: document.getElementById('expMode').value,
            description: document.getElementById('expDesc').value,
            createdAt: new Date().toISOString()
        };

        try {
            const id = await db.add('expenses', expenseData);
            await db.logAudit('CREATE', 'Expenses', id, 'Added expense: ' + expenseData.description);
            
            document.getElementById('expenseModal').remove();
            Utils.showToast('Success', 'Expense recorded successfully', 'success');
            this.loadExpenses();
            
        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to save expense', 'error');
        }
    },

    deleteExpense: function(id) {
        Utils.confirmDialog('Delete Expense', 'Are you sure you want to delete this expense record?', async () => {
            try {
                await db.delete('expenses', id);
                await db.logAudit('DELETE', 'Expenses', id, 'Deleted expense record');
                Utils.showToast('Success', 'Expense deleted', 'success');
                this.loadExpenses();
            } catch (err) {
                console.error(err);
                Utils.showToast('Error', 'Failed to delete expense', 'error');
            }
        });
    }
};

window.Expenses = Expenses;
