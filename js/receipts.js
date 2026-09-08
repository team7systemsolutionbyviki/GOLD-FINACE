/**
 * Receipts & Printing Module
 */

const Receipts = {
    render: async function() {
        const container = document.getElementById('view-receipts');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h2>Generate Receipts</h2>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h3>Print Receipt</h3>
                </div>
                <div class="card-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Receipt Type</label>
                            <select id="rcpt_type" class="form-control">
                                <option value="payment">Payment Receipt</option>
                                <option value="disbursement">Loan Disbursement Receipt</option>
                                <option value="closure">Loan Closure Receipt</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Enter Search (Name or Number)</label>
                            <div class="autocomplete-container">
                                <input type="text" id="rcpt_search" class="form-control" placeholder="e.g. Vignesh, 000001, GF-REC..." onkeyup="Receipts.handleSearchInput(this.value)">
                                <div id="rcpt_searchResults" class="autocomplete-dropdown"></div>
                            </div>
                        </div>
                    </div>
                    <div class="text-right mt-4">
                        <button class="btn btn-primary" onclick="Receipts.generateReceipt()">Generate & Print</button>
                    </div>
                </div>
            </div>
            
            <!-- Quick links to recent transactions could go here -->
            <div class="card">
                <div class="card-header">
                    <h3>Recent Transactions</h3>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Receipt No</th>
                                <th>Loan No</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="recentReceiptsBody">
                            <tr><td colspan="5" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            const container = document.querySelector('.autocomplete-container');
            const dropdown = document.getElementById('rcpt_searchResults');
            if (container && dropdown && !container.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        this.loadRecent();
    },

    handleSearchInput: async function(query) {
        const dropdown = document.getElementById('rcpt_searchResults');
        if (!query || query.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        const q = query.toLowerCase();
        try {
            const payments = await db.getAll('payments');
            const loans = await db.getAll('loans');
            const customers = await db.getAll('customers');

            let results = [];

            // 1. Search Payments
            payments.forEach(p => {
                const loan = loans.find(l => l.id === p.loanId);
                const customer = loan ? customers.find(c => c.id === loan.customerId) : null;
                const custName = customer ? customer.fullName.toLowerCase() : '';
                const rcptNum = (p.receiptNumber || '').toLowerCase();
                
                if (rcptNum.includes(q) || custName.includes(q)) {
                    results.push({
                        type: p.referenceNumber === 'CLOSURE' ? 'closure' : 'payment',
                        number: p.receiptNumber,
                        title: `${p.referenceNumber === 'CLOSURE' ? 'Closure' : 'Payment'} Receipt: ${p.receiptNumber}`,
                        subtitle: `${customer ? customer.fullName : 'Unknown'} | Date: ${Utils.formatDate(p.paymentDate)} | ₹${p.totalAmount}`
                    });
                }
            });

            // 2. Search Loans (Disbursement)
            loans.forEach(l => {
                const customer = customers.find(c => c.id === l.customerId);
                const custName = customer ? customer.fullName.toLowerCase() : '';
                const loanNum = (l.loanNumber || '').toLowerCase();

                if (loanNum.includes(q) || custName.includes(q)) {
                    results.push({
                        type: 'disbursement',
                        number: l.loanNumber,
                        title: `Disbursement Receipt: ${l.loanNumber}`,
                        subtitle: `${customer ? customer.fullName : 'Unknown'} | Date: ${Utils.formatDate(l.loanDate)} | ₹${l.principal}`
                    });
                }
            });

            if (results.length > 0) {
                // Show top 10 matches
                results = results.slice(0, 10);
                dropdown.innerHTML = results.map(r => `
                    <div class="autocomplete-item" onclick="Receipts.selectSearchResult('${r.type}', '${r.number}')">
                        <div class="title">${r.title}</div>
                        <div class="subtitle">${r.subtitle}</div>
                    </div>
                `).join('');
                dropdown.style.display = 'block';
            } else {
                dropdown.innerHTML = `<div class="autocomplete-item text-muted">No matches found</div>`;
                dropdown.style.display = 'block';
            }

        } catch (e) {
            console.error(e);
        }
    },

    selectSearchResult: function(type, number) {
        document.getElementById('rcpt_type').value = type;
        document.getElementById('rcpt_search').value = number;
        document.getElementById('rcpt_searchResults').style.display = 'none';
        
        // Auto generate receipt on click
        this.generateReceipt();
    },

    loadRecent: async function() {
        try {
            const payments = await db.getAll('payments');
            const loans = await db.getAll('loans');
            const tbody = document.getElementById('recentReceiptsBody');
            
            if (payments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center">No recent transactions</td></tr>`;
                return;
            }
            
            // Sort by latest
            payments.sort((a,b) => b.id - a.id);
            
            let html = '';
            // Show top 10
            payments.slice(0,10).forEach(p => {
                const loan = loans.find(l => l.id === p.loanId);
                const loanNo = loan ? loan.loanNumber : 'N/A';
                
                html += `
                    <tr>
                        <td>${Utils.formatDate(p.paymentDate)}</td>
                        <td>${p.receiptNumber}</td>
                        <td>${loanNo}</td>
                        <td>${Utils.formatCurrency(p.totalAmount)}</td>
                        <td>
                            <button class="btn btn-sm btn-outline" onclick="document.getElementById('rcpt_type').value = '${p.referenceNumber === 'CLOSURE' ? 'closure' : 'payment'}'; document.getElementById('rcpt_search').value = '${p.receiptNumber}'; Receipts.generateReceipt(false);">Print</button>
                            <button class="btn btn-sm" style="background:#25D366; color:white; border:none;" onclick="document.getElementById('rcpt_type').value = '${p.referenceNumber === 'CLOSURE' ? 'closure' : 'payment'}'; document.getElementById('rcpt_search').value = '${p.receiptNumber}'; Receipts.generateReceipt(true);">WA</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } catch (e) {
            console.error(e);
        }
    },

    generateReceipt: async function(isWhatsApp = false) {
        const type = document.getElementById('rcpt_type').value;
        const searchVal = document.getElementById('rcpt_search').value.trim();
        
        if (!searchVal) {
            Utils.showToast('Error', 'Please enter a search number', 'error');
            return;
        }

        try {
            const companyName = await Settings.get('companyName') || 'Gold Finance';
            const companyAddress = await Settings.get('companyAddress') || '';
            const companyPhone = await Settings.get('companyPhone') || '';
            const companyGST = await Settings.get('companyGST') || '';

            let headerHtml = `
                <div class="print-header">
                    <h1>${companyName}</h1>
                    <p>${companyAddress}</p>
                    <p>Phone: ${companyPhone} ${companyGST ? '| GST: ' + companyGST : ''}</p>
                </div>
            `;

            let bodyHtml = '';
            const printContainer = document.getElementById('printContainer');

            if (type === 'payment' || type === 'closure') {
                const payments = await db.getByIndex('payments', 'receiptNumber', searchVal);
                if (payments.length === 0) {
                    Utils.showToast('Not Found', 'Receipt not found', 'warning');
                    return;
                }
                const payment = payments[0];
                const loan = await db.get('loans', payment.loanId);
                const customer = await db.get('customers', loan.customerId);

                bodyHtml = `
                    <h2 style="text-align:center; margin-bottom: 20px; text-decoration: underline;">
                        ${type === 'closure' ? 'LOAN CLOSURE RECEIPT' : 'PAYMENT RECEIPT'}
                    </h2>
                    <div class="print-row">
                        <div><strong>Receipt No:</strong> ${payment.receiptNumber}</div>
                        <div><strong>Date:</strong> ${Utils.formatDate(payment.paymentDate)}</div>
                    </div>
                    <div class="print-row">
                        <div><strong>Loan No:</strong> ${loan.loanNumber}</div>
                        <div><strong>Payment Mode:</strong> ${payment.paymentMode}</div>
                    </div>
                    <hr style="margin: 15px 0;">
                    <div style="margin-bottom: 15px;">
                        <strong>Received with thanks from:</strong> ${customer.fullName} <br>
                        <strong>Customer ID:</strong> ${customer.customerCode} <br>
                        <strong>Mobile:</strong> ${customer.mobile}
                    </div>
                    
                    <table class="print-table">
                        <tr>
                            <th>Description</th>
                            <th style="text-align:right;">Amount</th>
                        </tr>
                        <tr>
                            <td>Principal Repayment</td>
                            <td style="text-align:right;">${Utils.formatCurrency(payment.principalAmount)}</td>
                        </tr>
                        <tr>
                            <td>Interest Payment</td>
                            <td style="text-align:right;">${Utils.formatCurrency(payment.interestAmount)}</td>
                        </tr>
                        ${payment.discountAmount ? `
                        <tr>
                            <td>Discount Applied (-)</td>
                            <td style="text-align:right;">${Utils.formatCurrency(payment.discountAmount)}</td>
                        </tr>
                        ` : ''}
                        <tr>
                            <th>Total Amount Received</th>
                            <th style="text-align:right;">${Utils.formatCurrency(payment.totalAmount)}</th>
                        </tr>
                    </table>
                    
                    <div class="print-signatures">
                        <div class="sig-box">Customer Signature</div>
                        <div class="sig-box">Authorized Signatory</div>
                    </div>
                `;
            } 
            else if (type === 'disbursement') {
                const loans = await db.getByIndex('loans', 'loanNumber', searchVal);
                if (loans.length === 0) {
                    Utils.showToast('Not Found', 'Loan not found', 'warning');
                    return;
                }
                const loan = loans[0];
                const customer = await db.get('customers', loan.customerId);
                const goldItems = await db.getByIndex('goldItems', 'loanId', loan.id);
                
                let goldHtml = '';
                let totalValue = 0;
                goldItems.forEach(g => {
                    const val = (g.valuationMethod === 'CALCULATED' ? g.calculatedValue : g.appraisedValue) || g.appraisedValue || 0;
                    totalValue += val;
                    
                    let weightStr = '-';
                    if (g.valuationMethod === 'CALCULATED') {
                        weightStr = `N: ${g.netWeight !== undefined ? g.netWeight.toFixed(2) : '-'}g`;
                    } else if (g.caratWeight) {
                        weightStr = `${g.caratWeight.toFixed(2)} ct`;
                    } else if (g.weight) {
                        weightStr = `${g.weight} ${g.weightUnit}`;
                    }
                    
                    let purityStr = g.purity || '-';
                    if (g.material === 'Diamond') purityStr = `${g.color||''} ${g.clarity||''} ${g.cut||''}`.trim() || '-';
                    if (g.material === 'Ruby' || g.material === 'Stone') purityStr = g.rubyType || g.stoneType || '-';
                    if (g.material === 'Other') purityStr = g.otherName || '-';

                    goldHtml += `<tr>
                        <td>${g.material || 'Gold'} - ${g.type} ${g.description ? '('+g.description+')' : ''}</td>
                        <td>${g.qty}</td>
                        <td>${weightStr}</td>
                        <td>${purityStr}</td>
                        <td>${g.valuationMethod || 'CALCULATED'}</td>
                        <td style="text-align:right;">${Utils.formatCurrency(val)}</td>
                    </tr>`;
                });

                bodyHtml = `
                    <h2 style="text-align:center; margin-bottom: 20px; text-decoration: underline;">LOAN DISBURSEMENT RECEIPT</h2>
                    
                    <div class="print-row">
                        <div><strong>Loan No:</strong> ${loan.loanNumber}</div>
                        <div><strong>Date:</strong> ${Utils.formatDate(loan.loanDate)}</div>
                    </div>
                    <hr style="margin: 15px 0;">
                    
                    <div style="margin-bottom: 15px;">
                        <strong>Customer Name:</strong> ${customer.fullName} <br>
                        <strong>Customer ID:</strong> ${customer.customerCode} <br>
                        <strong>Address:</strong> ${customer.address || ''}, ${customer.city || ''}
                    </div>
                    
                    <h4 style="margin-bottom: 5px;">Pledged Item Details</h4>
                    <table class="print-table">
                        <tr>
                            <th>Item</th><th>Qty</th><th>Weight/Carat</th><th>Purity/Grade</th><th>Method</th><th style="text-align:right;">Value</th>
                        </tr>
                        ${goldHtml}
                        <tr>
                            <td colspan="5" style="text-align:right; font-weight:bold;">Total Pledged Value:</td>
                            <td style="font-weight:bold; text-align:right;">${Utils.formatCurrency(totalValue)}</td>
                        </tr>
                    </table>
                    
                    <h4 style="margin-bottom: 5px;">Loan Details</h4>
                    <table class="print-table">
                        <tr>
                            <td>Principal Amount</td>
                            <td style="text-align:right;">${Utils.formatCurrency(loan.principal)}</td>
                        </tr>
                        <tr>
                            <td>Interest Rate</td>
                            <td style="text-align:right;">${loan.interestRate}% ${loan.interestType === 'monthly' ? '(PER MONTH)' : loan.interestType === 'weekly' ? '(PER WEEK)' : loan.interestType === 'daily' ? '(PER DAY)' : loan.interestType === 'yearly' ? '(PER YEAR)' : ''}</td>
                        </tr>
                        <tr>
                            <td>Processing Fee Deducted</td>
                            <td style="text-align:right;">${Utils.formatCurrency(loan.processingFeeAmount || 0)}</td>
                        </tr>
                    </table>
                    
                    <p style="font-size: 11px; color: #555; margin-top: 20px;">
                        Declaration: I hereby pledge the above gold items and agree to the terms and conditions of the loan.
                    </p>
                    
                    <div class="print-signatures">
                        <div class="sig-box">Customer Signature</div>
                        <div class="sig-box">Authorized Signatory</div>
                    </div>
                `;
            }

            printContainer.innerHTML = headerHtml + bodyHtml;
            
            // Trigger print or WhatsApp
            setTimeout(() => {
                if (isWhatsApp) {
                    Utils.shareToWhatsApp('printContainer', customer ? customer.mobile : '');
                    printContainer.innerHTML = ''; // clean up immediately
                } else {
                    window.print();
                    setTimeout(() => printContainer.innerHTML = '', 500);
                }
            }, 500);

        } catch(err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to generate receipt', 'error');
        }
    }
};

window.Receipts = Receipts;
