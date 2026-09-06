/**
 * Dashboard Module
 */

const Dashboard = {
    render: async function() {
        const container = document.getElementById('view-dashboard');
        if (!container) return;

        // Display basic skeleton
        container.innerHTML = `
            <div class="page-header">
                <h2>Dashboard Overview</h2>
                <div class="date-display">Data as of today</div>
            </div>
            
            <div class="dashboard-stats" id="dashboardStats">
                <div class="stat-card"><div class="stat-icon icon-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div><div class="stat-details"><div class="stat-title">Total Customers</div><div class="stat-value" id="stat-customers">...</div></div></div>
                <div class="stat-card"><div class="stat-icon icon-gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div><div class="stat-details"><div class="stat-title">Active Loans</div><div class="stat-value" id="stat-active-loans">...</div></div></div>
                <div class="stat-card"><div class="stat-icon icon-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div><div class="stat-details"><div class="stat-title">Outstanding Principal</div><div class="stat-value" id="stat-outstanding">...</div></div></div>
                <div class="stat-card"><div class="stat-icon icon-red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div><div class="stat-details"><div class="stat-title">Today's Collection</div><div class="stat-value" id="stat-collection-today">...</div></div></div>
                <div class="stat-card"><div class="stat-icon icon-gold" style="background-color: #ffedd5; color: #ea580c;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div><div class="stat-details"><div class="stat-title">Upcoming Due</div><div class="stat-value" id="stat-upcoming-due">...</div></div></div>
            </div>

            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <h3>Monthly Loan Disbursement</h3>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" id="disbursementChart">
                            <!-- CSS Chart generated here -->
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3>Due Soon / Overdue Loans</h3>
                    </div>
                    <div class="card-body">
                        <div class="status-list" id="overdueList">
                            <!-- Items injected here -->
                            <div class="empty-state"><p>No overdue loans found.</p></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    loadData: async function() {
        try {
            // 1. Customers
            const customers = await db.getAll('customers');
            document.getElementById('stat-customers').textContent = customers.length;

            // 2. Loans
            const loans = await db.getAll('loans');
            const activeLoans = loans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');
            document.getElementById('stat-active-loans').textContent = activeLoans.length;

            // Outstanding Principal (Simplification: just sum of active principal)
            // In a real scenario, this would subtract principal already paid
            const totalPrincipal = activeLoans.reduce((sum, loan) => sum + Number(loan.principal || 0), 0);
            document.getElementById('stat-outstanding').textContent = Utils.formatCurrency(totalPrincipal);

            // 3. Payments (Today's Collection)
            const payments = await db.getAll('payments');
            const todayStr = Utils.getISODate(new Date());
            const todaysPayments = payments.filter(p => p.paymentDate === todayStr);
            const totalCollectionToday = todaysPayments.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
            document.getElementById('stat-collection-today').textContent = Utils.formatCurrency(totalCollectionToday);

            // 3.5. Upcoming Due (Next 7 days)
            const todayDate = new Date();
            todayDate.setHours(0,0,0,0);
            const upcomingLoans = activeLoans.filter(l => {
                if(!l.dueDate) return false;
                const due = new Date(l.dueDate);
                due.setHours(0,0,0,0);
                const diffTime = due - todayDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                return diffDays >= 0 && diffDays <= 7;
            });
            document.getElementById('stat-upcoming-due').textContent = upcomingLoans.length;

            // 4. Generate basic CSS Chart for Monthly Disbursements (Last 6 months)
            this.generateChart(loans);
            
            // 5. Generate Due/Overdue list
            this.generateOverdueList(activeLoans, customers);

        } catch (error) {
            console.error("Dashboard data load error:", error);
        }
    },
    
    generateChart: function(loans) {
        const chartContainer = document.getElementById('disbursementChart');
        if (!chartContainer) return;
        
        // Very simple logic to group last 6 months
        const monthsData = [];
        for(let i=5; i>=0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const yearMonth = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
            
            // Sum loans for this month
            const monthlySum = loans
                .filter(l => l.loanDate && l.loanDate.startsWith(yearMonth))
                .reduce((sum, l) => sum + Number(l.principal), 0);
                
            monthsData.push({ label: monthName, value: monthlySum });
        }
        
        const maxVal = Math.max(...monthsData.map(m => m.value), 1); // Avoid div by 0
        
        let html = '';
        monthsData.forEach(m => {
            const heightPercent = (m.value / maxVal) * 100;
            // Format to basic K value
            const displayVal = m.value > 1000 ? (m.value/1000).toFixed(1) + 'k' : m.value;
            html += `
                <div class="bar-wrapper">
                    <div class="bar-value">${m.value > 0 ? displayVal : ''}</div>
                    <div class="bar" style="height: ${Math.max(heightPercent, 2)}%;"></div>
                    <div class="bar-label">${m.label}</div>
                </div>
            `;
        });
        
        chartContainer.innerHTML = html;
    },
    
    generateOverdueList: function(activeLoans, customers) {
        const listContainer = document.getElementById('overdueList');
        if (!listContainer) return;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const dueLoans = activeLoans.filter(l => {
            if(!l.dueDate) return false;
            const due = new Date(l.dueDate);
            due.setHours(0,0,0,0);
            // Overdue or due in next 7 days
            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            return diffDays <= 7;
        });
        
        // Sort by dueDate
        dueLoans.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
        
        if (dueLoans.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><p>No overdue loans found.</p></div>`;
            return;
        }
        
        // Take top 5
        let html = '';
        dueLoans.slice(0, 5).forEach(loan => {
            const customer = customers.find(c => c.id === loan.customerId);
            const custName = customer ? customer.fullName : 'Unknown';
            
            const due = new Date(loan.dueDate);
            due.setHours(0,0,0,0);
            const isOverdue = due < today;
            
            html += `
                <div class="status-item">
                    <div class="status-item-icon ${isOverdue ? 'icon-red' : 'icon-gold'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    </div>
                    <div class="status-item-details">
                        <div class="status-item-title">${loan.loanNumber} - ${custName}</div>
                        <div class="status-item-sub">Due: ${Utils.formatDate(loan.dueDate)}</div>
                    </div>
                    <div class="status-item-amount ${isOverdue ? 'text-danger' : 'text-warning'}">
                        ${Utils.formatCurrency(loan.principal)}
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
    }
};

window.Dashboard = Dashboard;
