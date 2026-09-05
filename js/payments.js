/**
 * Payment Module
 */

const Payments = {
    render: async function() {
        const container = document.getElementById('view-payments');
        if (!container) return;

        // Fetch configs
        const receiptPrefix = (await Settings.get('receiptPrefix')) || 'GF-REC-';
        const count = (await db.getAll('payments')).length + 1;
        const defaultReceipt = receiptPrefix + String(count).padStart(6, '0');

        container.innerHTML = `
            <div class="page-header">
                <h2>Receive Payment</h2>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h3>Search Loan</h3>
                </div>
                <div class="card-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Enter Loan Number</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="paymentSearch" class="form-control" placeholder="e.g. GF-LOAN-000001">
                                <button class="btn btn-primary" onclick="Payments.searchLoan()">Search</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="paymentDetailsArea" style="display: none;">
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Loan Outstanding Summary</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Customer Name</label>
                                <div class="readonly-value" id="pay_custName"></div>
                            </div>
                            <div class="form-group">
                                <label>Loan Amount</label>
                                <div class="readonly-value" id="pay_origPrincipal"></div>
                            </div>
                            <div class="form-group">
                                <label>Loan Date</label>
                                <div class="readonly-value" id="pay_loanDate"></div>
                            </div>
                            <div class="form-group">
                                <label>Interest Rate</label>
                                <div class="readonly-value" id="pay_interestRate"></div>
                            </div>
                        </div>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Outstanding Principal</label>
                                <div class="readonly-value text-danger" id="pay_outPrincipal"></div>
                            </div>
                            <div class="form-group">
                                <label>Accrued Interest (To Date)</label>
                                <div class="readonly-value text-danger" id="pay_accInterest"></div>
                            </div>
                            <div class="form-group">
                                <label>Total Outstanding</label>
                                <div class="readonly-value text-danger" style="font-size: 20px;" id="pay_totalOut"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Process Payment</h3>
                    </div>
                    <div class="card-body">
                        <form id="paymentForm" onsubmit="event.preventDefault(); Payments.processPayment();">
                            <input type="hidden" id="pay_loanId">
                            <input type="hidden" id="pay_customerId">
                            <input type="hidden" id="pay_rawOutPrincipal">
                            <input type="hidden" id="pay_rawAccInterest">
                            
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Receipt Number</label>
                                    <input type="text" id="pay_receiptNo" class="form-control" value="${defaultReceipt}" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Payment Date</label>
                                    <input type="date" id="pay_date" class="form-control" value="${Utils.getISODate()}" onchange="Payments.recalculateInterest()" required>
                                </div>
                            </div>
                            
                            <div class="form-grid mt-4">
                                <div class="form-group">
                                    <label>Interest Payment Amount *</label>
                                    <input type="number" id="pay_amountInterest" class="form-control" value="0" min="0" onkeyup="Payments.calcTotalPaying()" required>
                                </div>
                                <div class="form-group">
                                    <label>Principal Payment Amount</label>
                                    <input type="number" id="pay_amountPrincipal" class="form-control" value="0" min="0" onkeyup="Payments.calcTotalPaying()">
                                </div>
                                <div class="form-group">
                                    <label>Total Payment</label>
                                    <input type="number" id="pay_amountTotal" class="form-control" value="0" readonly>
                                </div>
                            </div>
                            
                            <div class="form-grid mt-4">
                                <div class="form-group">
                                    <label>Payment Mode</label>
                                    <select id="pay_mode" class="form-control" required>
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Card">Card</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Reference Number (Txn ID/Cheque No)</label>
                                    <input type="text" id="pay_ref" class="form-control">
                                </div>
                            </div>
                            
                            <div class="text-right mt-4">
                                <button type="submit" class="btn btn-primary" id="btnProcessPayment">Process Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Payment History</h3>
                    </div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Receipt No</th>
                                    <th>Principal Pd</th>
                                    <th>Interest Pd</th>
                                    <th>Total Pd</th>
                                    <th>Mode</th>
                                </tr>
                            </thead>
                            <tbody id="paymentHistoryBody">
                                <!-- Loaded dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    searchLoan: async function() {
        const searchVal = document.getElementById('paymentSearch').value.trim();
        if (!searchVal) {
            Utils.showToast('Error', 'Please enter a loan number', 'error');
            return;
        }

        try {
            const loans = await db.getByIndex('loans', 'loanNumber', searchVal);
            if (loans.length === 0) {
                Utils.showToast('Not Found', 'No loan found with this number', 'warning');
                document.getElementById('paymentDetailsArea').style.display = 'none';
                return;
            }

            const loan = loans[0];
            
            if (loan.status === 'CLOSED') {
                Utils.showToast('Info', 'This loan is already closed.', 'info');
                document.getElementById('paymentDetailsArea').style.display = 'none';
                return;
            }

            const customer = await db.get('customers', loan.customerId);

            // Fetch payment history to calculate current outstanding
            const payments = await db.getByIndex('payments', 'loanId', loan.id);
            
            // Calculate total principal paid
            const principalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.principalAmount) || 0), 0);
            const currentPrincipal = loan.principal - principalPaid;
            
            // Interest calculation
            const interestPaid = payments.reduce((sum, p) => sum + (parseFloat(p.interestAmount) || 0), 0);
            const accruedTotal = Utils.calculateInterest(loan.principal, loan.interestRate, loan.loanDate, Utils.getISODate(), loan.interestType || 'monthly');
            
            // Late Penalty calculation
            let penaltyAmount = 0;
            const targetDateStr = Utils.getISODate();
            if (loan.dueDate && targetDateStr > loan.dueDate && currentPrincipal > 0) {
                const penaltySetting = parseFloat(await Settings.get('latePenalty')) || 0;
                penaltyAmount = penaltySetting;
            }

            const currentAccrued = Math.max(0, accruedTotal - interestPaid) + penaltyAmount;

            // Populate UI
            document.getElementById('paymentDetailsArea').style.display = 'block';
            
            document.getElementById('pay_loanId').value = loan.id;
            document.getElementById('pay_customerId').value = loan.customerId;
            document.getElementById('pay_rawOutPrincipal').value = currentPrincipal;
            document.getElementById('pay_rawAccInterest').value = currentAccrued;
            
            document.getElementById('pay_custName').textContent = customer.fullName;
            document.getElementById('pay_origPrincipal').textContent = Utils.formatCurrency(loan.principal);
            document.getElementById('pay_loanDate').textContent = Utils.formatDate(loan.loanDate);
            document.getElementById('pay_interestRate').textContent = loan.interestRate + '% pm';
            
            document.getElementById('pay_outPrincipal').textContent = Utils.formatCurrency(currentPrincipal);
            document.getElementById('pay_accInterest').textContent = Utils.formatCurrency(currentAccrued);
            document.getElementById('pay_totalOut').textContent = Utils.formatCurrency(currentPrincipal + currentAccrued);
            
            // Auto fill interest amount to pay
            document.getElementById('pay_amountInterest').value = currentAccrued;
            this.calcTotalPaying();

            // Render History
            this.renderHistory(payments);

        } catch (error) {
            console.error(error);
            Utils.showToast('Error', 'Failed to load loan details', 'error');
        }
    },

    recalculateInterest: async function() {
        // Recalculate if the payment date changes
        const loanId = document.getElementById('pay_loanId').value;
        if (!loanId) return;
        
        const loan = await db.get('loans', parseInt(loanId));
        const payments = await db.getByIndex('payments', 'loanId', loan.id);
        const targetDate = document.getElementById('pay_date').value;
        
        const interestPaid = payments.reduce((sum, p) => sum + (parseFloat(p.interestAmount) || 0), 0);
        const accruedTotal = Utils.calculateInterest(loan.principal, loan.interestRate, loan.loanDate, targetDate, loan.interestType || 'monthly');
        
        let penaltyAmount = 0;
        const outstandingPrincipal = loan.principal - payments.reduce((sum, p) => sum + (parseFloat(p.principalAmount) || 0), 0);
        if (loan.dueDate && targetDate > loan.dueDate && outstandingPrincipal > 0) {
            const penaltySetting = parseFloat(await Settings.get('latePenalty')) || 0;
            penaltyAmount = penaltySetting;
        }

        const currentAccrued = Math.max(0, accruedTotal - interestPaid) + penaltyAmount;
        
        document.getElementById('pay_rawAccInterest').value = currentAccrued;
        document.getElementById('pay_accInterest').textContent = Utils.formatCurrency(currentAccrued);
        
        const currentPrincipal = parseFloat(document.getElementById('pay_rawOutPrincipal').value);
        document.getElementById('pay_totalOut').textContent = Utils.formatCurrency(currentPrincipal + currentAccrued);
        
        document.getElementById('pay_amountInterest').value = currentAccrued;
        this.calcTotalPaying();
    },

    calcTotalPaying: function() {
        const intP = parseFloat(document.getElementById('pay_amountInterest').value) || 0;
        const prinP = parseFloat(document.getElementById('pay_amountPrincipal').value) || 0;
        document.getElementById('pay_amountTotal').value = intP + prinP;
    },

    renderHistory: function(payments) {
        const tbody = document.getElementById('paymentHistoryBody');
        if (payments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No past payments</td></tr>`;
            return;
        }
        
        // Sort descending
        payments.sort((a,b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        
        let html = '';
        payments.forEach(p => {
            html += `
                <tr>
                    <td>${Utils.formatDate(p.paymentDate)}</td>
                    <td>${p.receiptNumber}</td>
                    <td>${Utils.formatCurrency(p.principalAmount)}</td>
                    <td>${Utils.formatCurrency(p.interestAmount)}</td>
                    <td><strong>${Utils.formatCurrency(p.totalAmount)}</strong></td>
                    <td>${p.paymentMode}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    processPayment: async function() {
        const btn = document.getElementById('btnProcessPayment');
        btn.disabled = true;

        const prinAmt = parseFloat(document.getElementById('pay_amountPrincipal').value) || 0;
        const intAmt = parseFloat(document.getElementById('pay_amountInterest').value) || 0;
        const outPrin = parseFloat(document.getElementById('pay_rawOutPrincipal').value) || 0;

        if (prinAmt === 0 && intAmt === 0) {
            Utils.showToast('Error', 'Payment amount cannot be zero', 'error');
            btn.disabled = false;
            return;
        }

        if (prinAmt > outPrin) {
            Utils.showToast('Error', 'Principal payment cannot exceed outstanding principal', 'error');
            btn.disabled = false;
            return;
        }

        const paymentData = {
            receiptNumber: document.getElementById('pay_receiptNo').value,
            loanId: parseInt(document.getElementById('pay_loanId').value),
            customerId: parseInt(document.getElementById('pay_customerId').value),
            paymentDate: document.getElementById('pay_date').value,
            principalAmount: prinAmt,
            interestAmount: intAmt,
            totalAmount: prinAmt + intAmt,
            paymentMode: document.getElementById('pay_mode').value,
            referenceNumber: document.getElementById('pay_ref').value,
            createdAt: new Date().toISOString()
        };

        try {
            const newId = await db.add('payments', paymentData);
            await db.logAudit('CREATE', 'Payments', newId, 'Received payment ' + paymentData.receiptNumber);
            
            Utils.showToast('Success', 'Payment recorded successfully', 'success');
            
            // Navigate to receipts module and auto-print
            if (window.Receipts) {
                App.navigate('receipts');
                setTimeout(() => {
                    document.getElementById('rcpt_type').value = 'payment';
                    document.getElementById('rcpt_search').value = paymentData.receiptNumber;
                    Receipts.generateReceipt();
                }, 200);
            } else {
                this.render();
            }

        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to process payment', 'error');
            btn.disabled = false;
        }
    }
};

window.Payments = Payments;
