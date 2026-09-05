/**
 * Reports Module
 */

const Reports = {
    render: async function() {
        const container = document.getElementById('view-reports');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h2>Reports</h2>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h3>Report Generator</h3>
                </div>
                <div class="card-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Report Type</label>
                            <select id="rep_type" class="form-control" onchange="Reports.toggleFilters()">
                                <option value="collection">Collection Report</option>
                                <option value="loan">Loan Status Report</option>
                                <option value="customer">Customer List</option>
                                <option value="expense">Expense Report</option>
                                <option value="gold">Gold Inventory Report</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" id="rep_startDate" class="form-control" value="${Utils.getISODate(new Date(Date.now() - 30*24*60*60*1000))}">
                        </div>
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" id="rep_endDate" class="form-control" value="${Utils.getISODate()}">
                        </div>
                    </div>
                    <div class="text-right mt-4">
                        <button class="btn btn-outline mr-2" onclick="Reports.exportCSV()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export CSV</button>
                        <button class="btn btn-primary" onclick="Reports.generateReport()">Generate Report</button>
                    </div>
                </div>
            </div>

            <div class="card" id="reportOutput" style="display: none;">
                <div class="card-header flex-between">
                    <h3 id="reportTitle">Report Results</h3>
                    <button class="btn btn-icon btn-outline" onclick="window.print()" title="Print Report"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button>
                </div>
                <div class="table-responsive" id="reportPrintArea">
                    <div class="print-header" style="display: none;">
                        <h1 id="printCompanyName">Gold Finance</h1>
                        <h2 id="printReportTitle">Report</h2>
                        <p id="printDateRange"></p>
                    </div>
                    <table class="table print-table" id="reportTable">
                        <thead id="reportTableHead"></thead>
                        <tbody id="reportTableBody"></tbody>
                        <tfoot id="reportTableFoot" style="font-weight: bold; background-color: var(--bg-color);"></tfoot>
                    </table>
                </div>
            </div>
        `;
        
        // Setup company name for print
        const companyName = await Settings.get('companyName') || 'Gold Finance';
        const printCompany = document.getElementById('printCompanyName');
        if(printCompany) printCompany.textContent = companyName;
    },

    toggleFilters: function() {
        const type = document.getElementById('rep_type').value;
        const start = document.getElementById('rep_startDate');
        const end = document.getElementById('rep_endDate');
        
        // Disable dates for customer and gold reports
        if (type === 'customer' || type === 'gold') {
            start.disabled = true;
            end.disabled = true;
        } else {
            start.disabled = false;
            end.disabled = false;
        }
    },

    generateReport: async function() {
        const type = document.getElementById('rep_type').value;
        const start = document.getElementById('rep_startDate').value;
        const end = document.getElementById('rep_endDate').value;
        
        document.getElementById('reportOutput').style.display = 'block';
        const titleEl = document.getElementById('reportTitle');
        const printTitleEl = document.getElementById('printReportTitle');
        const printDateEl = document.getElementById('printDateRange');
        
        printDateEl.textContent = `Period: ${Utils.formatDate(start)} to ${Utils.formatDate(end)}`;

        let title = '';
        try {
            switch(type) {
                case 'collection':
                    title = 'Collection Report';
                    await this.runCollectionReport(start, end);
                    break;
                case 'loan':
                    title = 'Loan Status Report';
                    await this.runLoanReport(start, end);
                    break;
                case 'customer':
                    title = 'Customer List';
                    printDateEl.textContent = `Generated on: ${Utils.formatDate(new Date())}`;
                    await this.runCustomerReport();
                    break;
                case 'expense':
                    title = 'Expense Report';
                    await this.runExpenseReport(start, end);
                    break;
                case 'gold':
                    title = 'Gold Inventory Report';
                    printDateEl.textContent = `Generated on: ${Utils.formatDate(new Date())}`;
                    await this.runGoldReport();
                    break;
            }
            
            titleEl.textContent = title;
            printTitleEl.textContent = title;
            
        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to generate report', 'error');
        }
    },

    runCollectionReport: async function(start, end) {
        const payments = await db.getAll('payments');
        const loans = await db.getAll('loans');
        
        const filtered = payments.filter(p => p.paymentDate >= start && p.paymentDate <= end);
        
        const thead = document.getElementById('reportTableHead');
        const tbody = document.getElementById('reportTableBody');
        const tfoot = document.getElementById('reportTableFoot');
        
        thead.innerHTML = `<tr><th>Date</th><th>Receipt No</th><th>Loan No</th><th>Principal</th><th>Interest</th><th>Total</th><th>Mode</th></tr>`;
        
        let tp = 0, ti = 0, tt = 0;
        let html = '';
        
        filtered.sort((a,b) => new Date(a.paymentDate) - new Date(b.paymentDate));
        
        filtered.forEach(p => {
            const loan = loans.find(l => l.id === p.loanId);
            const loanNo = loan ? loan.loanNumber : 'N/A';
            
            tp += p.principalAmount;
            ti += p.interestAmount;
            tt += p.totalAmount;
            
            html += `<tr>
                <td>${Utils.formatDate(p.paymentDate)}</td>
                <td>${p.receiptNumber}</td>
                <td>${loanNo}</td>
                <td>${Utils.formatCurrency(p.principalAmount)}</td>
                <td>${Utils.formatCurrency(p.interestAmount)}</td>
                <td>${Utils.formatCurrency(p.totalAmount)}</td>
                <td>${p.paymentMode}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="7" class="text-center">No data found</td></tr>';
        
        if (filtered.length > 0) {
            tfoot.innerHTML = `<tr><td colspan="3" class="text-right">TOTAL</td>
                <td>${Utils.formatCurrency(tp)}</td>
                <td>${Utils.formatCurrency(ti)}</td>
                <td>${Utils.formatCurrency(tt)}</td>
                <td></td></tr>`;
        } else {
            tfoot.innerHTML = '';
        }
    },

    runLoanReport: async function(start, end) {
        const loans = await db.getAll('loans');
        const customers = await db.getAll('customers');
        
        const filtered = loans.filter(l => l.loanDate >= start && l.loanDate <= end);
        
        const thead = document.getElementById('reportTableHead');
        const tbody = document.getElementById('reportTableBody');
        const tfoot = document.getElementById('reportTableFoot');
        
        thead.innerHTML = `<tr><th>Loan Date</th><th>Loan No</th><th>Customer</th><th>Principal</th><th>Int. Rate</th><th>Status</th></tr>`;
        
        let tp = 0;
        let html = '';
        
        filtered.sort((a,b) => new Date(a.loanDate) - new Date(b.loanDate));
        
        filtered.forEach(l => {
            const cust = customers.find(c => c.id === l.customerId);
            tp += l.principal;
            
            html += `<tr>
                <td>${Utils.formatDate(l.loanDate)}</td>
                <td>${l.loanNumber}</td>
                <td>${cust ? cust.fullName : 'N/A'}</td>
                <td>${Utils.formatCurrency(l.principal)}</td>
                <td>${l.interestRate}%</td>
                <td>${l.status}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="6" class="text-center">No data found</td></tr>';
        
        if (filtered.length > 0) {
            tfoot.innerHTML = `<tr><td colspan="3" class="text-right">TOTAL PRINCIPAL DISBURSED</td>
                <td colspan="3">${Utils.formatCurrency(tp)}</td></tr>`;
        } else {
            tfoot.innerHTML = '';
        }
    },

    runCustomerReport: async function() {
        const customers = await db.getAll('customers');
        
        const thead = document.getElementById('reportTableHead');
        const tbody = document.getElementById('reportTableBody');
        const tfoot = document.getElementById('reportTableFoot');
        
        thead.innerHTML = `<tr><th>Customer Code</th><th>Full Name</th><th>Mobile</th><th>Address</th><th>City</th><th>Reg. Date</th></tr>`;
        
        let html = '';
        customers.sort((a,b) => b.id - a.id);
        
        customers.forEach(c => {
            html += `<tr>
                <td>${c.customerCode}</td>
                <td>${c.fullName}</td>
                <td>${c.mobile}</td>
                <td>${c.address || '-'}</td>
                <td>${c.city || '-'}</td>
                <td>${Utils.formatDate(c.createdAt)}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="6" class="text-center">No customers found</td></tr>';
        tfoot.innerHTML = `<tr><td colspan="6">Total Customers: ${customers.length}</td></tr>`;
    },
    
    runExpenseReport: async function(start, end) {
        const expenses = await db.getAll('expenses');
        const filtered = expenses.filter(e => e.date >= start && e.date <= end);
        
        const thead = document.getElementById('reportTableHead');
        const tbody = document.getElementById('reportTableBody');
        const tfoot = document.getElementById('reportTableFoot');
        
        thead.innerHTML = `<tr><th>Date</th><th>Category</th><th>Description</th><th>Mode</th><th>Amount</th></tr>`;
        
        let total = 0;
        let html = '';
        
        filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
        
        filtered.forEach(e => {
            total += e.amount;
            html += `<tr>
                <td>${Utils.formatDate(e.date)}</td>
                <td>${e.category}</td>
                <td>${e.description}</td>
                <td>${e.paymentMode}</td>
                <td>${Utils.formatCurrency(e.amount)}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="5" class="text-center">No expenses found</td></tr>';
        if (filtered.length > 0) {
            tfoot.innerHTML = `<tr><td colspan="4" class="text-right">TOTAL</td><td>${Utils.formatCurrency(total)}</td></tr>`;
        } else {
            tfoot.innerHTML = '';
        }
    },
    
    runGoldReport: async function() {
        const items = await db.getAll('goldItems');
        const loans = await db.getAll('loans');
        
        const thead = document.getElementById('reportTableHead');
        const tbody = document.getElementById('reportTableBody');
        const tfoot = document.getElementById('reportTableFoot');
        
        thead.innerHTML = `<tr><th>Loan No</th><th>Item Type</th><th>Qty</th><th>Net Wt (g)</th><th>Purity</th><th>Status</th></tr>`;
        
        let totalPledged = 0;
        let totalReleased = 0;
        let html = '';
        
        items.sort((a,b) => b.id - a.id);
        
        items.forEach(i => {
            const loan = loans.find(l => l.id === i.loanId);
            if(i.status === 'PLEDGED') totalPledged += i.netWeight;
            if(i.status === 'RELEASED') totalReleased += i.netWeight;
            
            html += `<tr>
                <td>${loan ? loan.loanNumber : 'Unknown'}</td>
                <td>${i.type}</td>
                <td>${i.qty}</td>
                <td>${i.netWeight.toFixed(2)}</td>
                <td>${i.purity}</td>
                <td>${i.status}</td>
            </tr>`;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="6" class="text-center">No inventory found</td></tr>';
        tfoot.innerHTML = `<tr><td colspan="6">
            Total Pledged Weight: <strong>${totalPledged.toFixed(2)} g</strong> | 
            Total Released Weight: <strong>${totalReleased.toFixed(2)} g</strong>
        </td></tr>`;
    },
    
    exportCSV: function() {
        const table = document.getElementById('reportTable');
        if (!table) return;
        
        let csv = [];
        const rows = table.querySelectorAll('tr');
        
        for (let i = 0; i < rows.length; i++) {
            let row = [], cols = rows[i].querySelectorAll('td, th');
            for (let j = 0; j < cols.length; j++) {
                // Escape quotes and commas
                let data = cols[j].innerText.replace(/"/g, '""');
                row.push('"' + data + '"');
            }
            csv.push(row.join(','));
        }
        
        const csvFile = new Blob([csv.join('\n')], {type: "text/csv"});
        const downloadLink = document.createElement("a");
        downloadLink.download = "report_export_" + Date.now() + ".csv";
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
};

window.Reports = Reports;
