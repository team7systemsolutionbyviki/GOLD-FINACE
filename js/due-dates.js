/**
 * All Due Dates Module
 */

const DueDates = {
    render: async function() {
        const container = document.getElementById('view-due-dates');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header flex-between">
                <h2>All Due Dates</h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-primary" onclick="DueDates.printDueDates()" title="Print Due Dates">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Print
                    </button>
                    <button class="btn btn-outline" style="color:#25D366; border-color:#25D366;" onclick="DueDates.printDueDates(true)" title="Send WhatsApp">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> WhatsApp
                    </button>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header flex-between">
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="dueDateSearch" placeholder="Search customer, loan no..." onkeyup="DueDates.filterTable()">
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table" id="dueDatesTable">
                        <thead>
                            <tr>
                                <th>Loan No</th>
                                <th>Customer Name</th>
                                <th>Contact</th>
                                <th>Principal</th>
                                <th>Due Date (DD/MM/YYYY)</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="dueDatesTableBody">
                            <tr><td colspan="6" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadData();
    },

    loadData: async function() {
        try {
            const loans = await db.getAll('loans');
            const customers = await db.getAll('customers');
            
            // Map for quick lookup
            const custMap = {};
            const phoneMap = {};
            customers.forEach(c => {
                custMap[c.id] = c.fullName;
                phoneMap[c.id] = c.phone || 'N/A';
            });

            const tbody = document.getElementById('dueDatesTableBody');
            
            // Filter only ACTIVE or OVERDUE loans
            const activeLoans = loans.filter(l => (l.status === 'ACTIVE' || l.status === 'OVERDUE') && l.dueDate);

            if (activeLoans.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No active loans found</td></tr>`;
                return;
            }

            // Sort by due date (oldest first)
            activeLoans.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

            const today = new Date();
            today.setHours(0,0,0,0);

            let html = '';

            activeLoans.forEach(loan => {
                const custName = custMap[loan.customerId] || 'Unknown';
                const phone = phoneMap[loan.customerId] || 'N/A';
                
                const due = new Date(loan.dueDate);
                due.setHours(0,0,0,0);
                
                let statusBadge = '';
                let statusText = '';
                
                if (due < today) {
                    statusBadge = 'badge-danger';
                    statusText = 'OVERDUE';
                } else {
                    const diffTime = due - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7) {
                        statusBadge = 'badge-warning';
                        statusText = `DUE IN ${diffDays} DAYS`;
                        if (diffDays === 0) statusText = 'DUE TODAY';
                    } else {
                        statusBadge = 'badge-success';
                        statusText = 'ACTIVE';
                    }
                }

                html += `
                    <tr>
                        <td><strong>${loan.loanNumber}</strong></td>
                        <td>${custName}</td>
                        <td>${phone}</td>
                        <td>${Utils.formatCurrency(loan.principal)}</td>
                        <td>${Utils.formatDate(loan.dueDate).replace(/-/g, '/')}</td>
                        <td><span class="badge ${statusBadge}">${statusText}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline" style="padding: 4px 8px;" onclick="DueDates.printCustomerStatement(${loan.customerId})" title="Print Customer Statement">
                                Print
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;

        } catch (err) {
            console.error(err);
            document.getElementById('dueDatesTableBody').innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading due dates</td></tr>`;
        }
    },

    filterTable: function() {
        const textFilter = document.getElementById('dueDateSearch').value.toLowerCase();
        const tbody = document.getElementById('dueDatesTableBody');
        const trs = tbody.getElementsByTagName('tr');

        for (let i = 0; i < trs.length; i++) {
            if (trs[i].children.length === 1) continue; // Skip "No items" row
            
            const text = trs[i].textContent || trs[i].innerText;
            
            if (text.toLowerCase().indexOf(textFilter) > -1) {
                trs[i].style.display = "";
            } else {
                trs[i].style.display = "none";
            }
        }
    },

    printDueDates: function(isWhatsApp = false) {
        const tableHtml = document.querySelector('#view-due-dates .table-responsive').innerHTML;
        const dateStr = Utils.formatDate(new Date().toISOString());
        
        const printContent = `
            <div class="print-header">
                <h1>All Due Dates Report</h1>
                <p>Date: ${dateStr}</p>
            </div>
            ${tableHtml}
            <div class="print-signatures" style="margin-top: 40px;">
                <div class="sig-box">Generated By</div>
                <div class="sig-box">Manager Signature</div>
            </div>
        `;
        
        const printContainer = document.getElementById('printContainer');
        if (printContainer) {
            printContainer.innerHTML = printContent;
            
            // Adjust table for print styles
            const table = printContainer.querySelector('table');
            if (table) {
                table.className = 'print-table';
                table.removeAttribute('id'); // Remove id to avoid conflicts
            }
            
            setTimeout(() => {
                if (isWhatsApp) {
                    Utils.shareToWhatsApp('printContainer');
                    printContainer.innerHTML = '';
                } else {
                    window.print();
                    setTimeout(() => {
                        printContainer.innerHTML = '';
                    }, 500);
                }
            }, 100);
        }
    },

    printCustomerStatement: async function(customerId) {
        try {
            const customer = await db.get('customers', customerId);
            if (!customer) return;

            const loans = await db.getByIndex('loans', 'customerId', customerId);
            const companyName = (await Settings.get('companyName')) || 'Gold Finance';
            const companyPhone = (await Settings.get('companyPhone')) || '';
            
            let html = `
                <div class="print-header">
                    <h1>${companyName}</h1>
                    <p>Phone: ${companyPhone}</p>
                    <h2 style="margin-top:10px; text-decoration:underline;">Customer Statement</h2>
                </div>
                <div style="margin-bottom: 20px; font-size: 14px;">
                    <strong>Name:</strong> ${customer.fullName} <br>
                    <strong>Contact:</strong> ${customer.mobile} <br>
                    <strong>Customer ID:</strong> ${customer.customerCode}
                </div>
                <table class="print-table" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Loan No</th>
                            <th>Date</th>
                            <th>Due Date</th>
                            <th style="text-align:right;">Principal</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            loans.sort((a,b) => new Date(b.loanDate) - new Date(a.loanDate));
            
            loans.forEach(l => {
                const isPaid = l.status === 'CLOSED';
                const statusColor = isPaid ? '#25D366' : '#d32f2f'; // Green for PAID, Red for NOT PAID
                const statusText = isPaid ? 'PAID' : 'NOT PAID';
                
                html += `
                    <tr>
                        <td>${l.loanNumber}</td>
                        <td>${Utils.formatDate(l.loanDate)}</td>
                        <td>${Utils.formatDate(l.dueDate)}</td>
                        <td style="text-align:right;">${Utils.formatCurrency(l.principal)}</td>
                        <td style="color: ${statusColor}; font-weight: bold;">${statusText}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
                <div class="print-signatures" style="margin-top: 40px;">
                    <div class="sig-box">Customer Signature</div>
                    <div class="sig-box">Manager Signature</div>
                </div>
            `;
            
            const printContainer = document.getElementById('printContainer');
            if (printContainer) {
                printContainer.innerHTML = html;
                window.print();
                setTimeout(() => {
                    printContainer.innerHTML = '';
                }, 500);
            }
        } catch (e) {
            console.error(e);
            Utils.showToast('Error', 'Failed to generate statement', 'error');
        }
    }
};

window.DueDates = DueDates;
