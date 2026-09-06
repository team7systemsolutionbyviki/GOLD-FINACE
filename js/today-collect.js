/**
 * Today Collect Module
 * Displays all collections (payments & closures) for the current day.
 */

const TodayCollect = {
    render: async function() {
        const container = document.getElementById('view-today-collect');
        if (!container) return;
        
        const today = Utils.getISODate();

        try {
            // Fetch all payments
            const allPayments = await db.getAll('payments');
            
            // Filter by today
            const todayPayments = allPayments.filter(p => p.paymentDate === today);
            
            // Calculate totals
            let totalPrincipal = 0;
            let totalInterest = 0;
            let totalAmount = 0;
            let totalDiscount = 0;
            
            let tableRows = '';
            
            for (const payment of todayPayments) {
                const prin = parseFloat(payment.principalAmount) || 0;
                const int = parseFloat(payment.interestAmount) || 0;
                const total = parseFloat(payment.totalAmount) || 0;
                const disc = parseFloat(payment.discountAmount) || 0;
                
                totalPrincipal += prin;
                totalInterest += int;
                totalAmount += total;
                totalDiscount += disc;
                
                // Get customer name for display
                let custName = 'Unknown';
                try {
                    const cust = await db.get('customers', payment.customerId);
                    if (cust) custName = cust.fullName;
                } catch(e) {}
                
                let typeBadge = '';
                if (payment.referenceNumber === 'CLOSURE') {
                    typeBadge = '<span class="badge" style="background-color: var(--danger-color); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">Closure</span>';
                } else if (payment.referenceNumber === 'ADJUSTMENT') {
                    typeBadge = '<span class="badge" style="background-color: var(--warning-color); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">Adjustment</span>';
                } else {
                    typeBadge = '<span class="badge" style="background-color: var(--primary-color); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">Payment</span>';
                }

                tableRows += `
                    <tr>
                        <td>${payment.receiptNumber}</td>
                        <td>${custName}</td>
                        <td>${typeBadge}</td>
                        <td>${Utils.formatCurrency(prin)}</td>
                        <td>${Utils.formatCurrency(int)}</td>
                        <td>${disc > 0 ? Utils.formatCurrency(disc) : '-'}</td>
                        <td><strong>${Utils.formatCurrency(total)}</strong></td>
                    </tr>
                `;
            }
            
            if (todayPayments.length === 0) {
                tableRows = `<tr><td colspan="7" class="text-center text-muted">No collections recorded today.</td></tr>`;
            }

            container.innerHTML = `
                <div class="page-header flex-between">
                    <h2>Today's Collection <span class="text-muted" style="font-size: 0.6em; margin-left: 10px;">${Utils.formatDate(new Date())}</span></h2>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-secondary btn-sm" onclick="Utils.printSection('view-today-collect')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:5px;vertical-align:text-bottom;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print Report
                        </button>
                        <button class="btn btn-sm" style="background:#25D366; color:white; border:none;" onclick="Utils.shareToWhatsApp('view-today-collect')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:5px;vertical-align:text-bottom;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> WhatsApp
                        </button>
                    </div>
                </div>

                <div class="dashboard-stats mb-4">
                    <div class="stat-card">
                        <div class="stat-icon icon-blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        </div>
                        <div class="stat-details">
                            <div class="stat-title">Principal Collected</div>
                            <div class="stat-value text-primary">${Utils.formatCurrency(totalPrincipal)}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon icon-green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                        </div>
                        <div class="stat-details">
                            <div class="stat-title">Interest Collected</div>
                            <div class="stat-value text-success">${Utils.formatCurrency(totalInterest)}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon icon-gold">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        </div>
                        <div class="stat-details">
                            <div class="stat-title">Total Collected</div>
                            <div class="stat-value" style="color: var(--text-main);">${Utils.formatCurrency(totalAmount)}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon icon-red">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                        </div>
                        <div class="stat-details">
                            <div class="stat-title">Discounts Given</div>
                            <div class="stat-value text-warning">${Utils.formatCurrency(totalDiscount)}</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3>Transactions Today</h3>
                    </div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Receipt No.</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Principal</th>
                                    <th>Interest</th>
                                    <th>Discount</th>
                                    <th>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                            ${todayPayments.length > 0 ? `
                            <tfoot style="background-color: var(--bg-color); font-weight: 600;">
                                <tr>
                                    <td colspan="3" class="text-right">Totals:</td>
                                    <td>${Utils.formatCurrency(totalPrincipal)}</td>
                                    <td>${Utils.formatCurrency(totalInterest)}</td>
                                    <td>${Utils.formatCurrency(totalDiscount)}</td>
                                    <td>${Utils.formatCurrency(totalAmount)}</td>
                                </tr>
                            </tfoot>
                            ` : ''}
                        </table>
                    </div>
                </div>
            `;
            
        } catch(e) {
            console.error(e);
            container.innerHTML = `<div class="alert alert-danger">Error loading today's collections.</div>`;
        }
    }
};

window.TodayCollect = TodayCollect;
