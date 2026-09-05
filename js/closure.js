/**
 * Loan Closure Module
 */

const Closure = {
    render: async function() {
        const container = document.getElementById('view-loan-closure');
        if (!container) return;

        const receiptPrefix = (await Settings.get('receiptPrefix')) || 'GF-REC-';
        const count = (await db.getAll('payments')).length + 1;
        const defaultReceipt = receiptPrefix + String(count).padStart(6, '0');

        container.innerHTML = `
            <div class="page-header">
                <h2>Loan Closure & Settlement</h2>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h3>Search Loan for Closure</h3>
                </div>
                <div class="card-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Enter Loan Number</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="closureSearch" class="form-control" placeholder="e.g. GF-LOAN-000001">
                                <button class="btn btn-primary" onclick="Closure.searchLoan()">Search</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="closureDetailsArea" style="display: none;">
                <div class="card mb-4 border-danger" style="border-color: var(--warning-color);">
                    <div class="card-header" style="background-color: var(--warning-color); color: white;">
                        <h3>Settlement Summary</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Customer Name</label>
                                <div class="readonly-value" id="close_custName"></div>
                            </div>
                            <div class="form-group">
                                <label>Loan Amount</label>
                                <div class="readonly-value" id="close_origPrincipal"></div>
                            </div>
                            <div class="form-group">
                                <label>Outstanding Principal</label>
                                <div class="readonly-value text-danger" id="close_outPrincipal"></div>
                            </div>
                            <div class="form-group">
                                <label>Outstanding Interest</label>
                                <div class="readonly-value text-danger" id="close_accInterest"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-header">
                        <h3>Process Final Settlement</h3>
                    </div>
                    <div class="card-body">
                        <form id="closureForm" onsubmit="event.preventDefault(); Closure.processClosure();">
                            <input type="hidden" id="close_loanId">
                            <input type="hidden" id="close_customerId">
                            
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Closure Receipt Number</label>
                                    <input type="text" id="close_receiptNo" class="form-control" value="${defaultReceipt}" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Closure Date</label>
                                    <input type="date" id="close_date" class="form-control" value="${Utils.getISODate()}" required onchange="Closure.recalculateInterest()">
                                </div>
                            </div>
                            
                            <div class="form-grid mt-4">
                                <div class="form-group">
                                    <label>Principal Amount</label>
                                    <input type="number" id="close_amountPrincipal" class="form-control" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Interest Amount</label>
                                    <input type="number" id="close_amountInterest" class="form-control" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Discount / Waiver (-)</label>
                                    <input type="number" id="close_discount" class="form-control" value="0" min="0" onkeyup="Closure.calcFinalAmount()">
                                </div>
                                <div class="form-group">
                                    <label>Final Settlement Amount</label>
                                    <input type="number" id="close_amountTotal" class="form-control" readonly style="font-weight: bold; color: var(--success-color);">
                                </div>
                            </div>
                            
                            <div class="form-grid mt-4">
                                <div class="form-group">
                                    <label>Payment Mode</label>
                                    <select id="close_mode" class="form-control" required>
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div class="text-right mt-4">
                                <button type="submit" class="btn btn-warning" id="btnCloseLoan">Settle & Close Loan</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    searchLoan: async function() {
        const searchVal = document.getElementById('closureSearch').value.trim();
        if (!searchVal) return;

        try {
            const loans = await db.getByIndex('loans', 'loanNumber', searchVal);
            if (loans.length === 0) {
                Utils.showToast('Not Found', 'No loan found', 'warning');
                return;
            }

            const loan = loans[0];
            if (loan.status === 'CLOSED') {
                Utils.showToast('Info', 'Loan already closed', 'info');
                return;
            }

            const customer = await db.get('customers', loan.customerId);
            const payments = await db.getByIndex('payments', 'loanId', loan.id);
            
            const principalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.principalAmount) || 0), 0);
            const interestPaid = payments.reduce((sum, p) => sum + (parseFloat(p.interestAmount) || 0), 0);
            
            const currentPrincipal = loan.principal - principalPaid;
            const accruedTotal = Utils.calculateInterest(loan.principal, loan.interestRate, loan.loanDate, Utils.getISODate(), loan.interestType || 'monthly');
            const currentAccrued = Math.max(0, accruedTotal - interestPaid);

            document.getElementById('closureDetailsArea').style.display = 'block';
            document.getElementById('close_loanId').value = loan.id;
            document.getElementById('close_customerId').value = loan.customerId;
            
            document.getElementById('close_custName').textContent = customer.fullName;
            document.getElementById('close_origPrincipal').textContent = Utils.formatCurrency(loan.principal);
            document.getElementById('close_outPrincipal').textContent = Utils.formatCurrency(currentPrincipal);
            document.getElementById('close_accInterest').textContent = Utils.formatCurrency(currentAccrued);
            
            document.getElementById('close_amountPrincipal').value = currentPrincipal;
            document.getElementById('close_amountInterest').value = currentAccrued;
            
            this.calcFinalAmount();

        } catch (err) {
            console.error(err);
        }
    },

    recalculateInterest: async function() {
        const loanId = document.getElementById('close_loanId').value;
        if (!loanId) return;
        
        const loan = await db.get('loans', parseInt(loanId));
        const payments = await db.getByIndex('payments', 'loanId', loan.id);
        const targetDate = document.getElementById('close_date').value;
        
        const interestPaid = payments.reduce((sum, p) => sum + (parseFloat(p.interestAmount) || 0), 0);
        const accruedTotal = Utils.calculateInterest(loan.principal, loan.interestRate, loan.loanDate, targetDate, loan.interestType || 'monthly');
        const currentAccrued = Math.max(0, accruedTotal - interestPaid);
        
        document.getElementById('close_accInterest').textContent = Utils.formatCurrency(currentAccrued);
        document.getElementById('close_amountInterest').value = currentAccrued;
        this.calcFinalAmount();
    },

    calcFinalAmount: function() {
        const p = parseFloat(document.getElementById('close_amountPrincipal').value) || 0;
        const i = parseFloat(document.getElementById('close_amountInterest').value) || 0;
        const d = parseFloat(document.getElementById('close_discount').value) || 0;
        document.getElementById('close_amountTotal').value = Math.max(0, (p + i) - d);
    },

    processClosure: function() {
        Utils.confirmDialog('Confirm Closure', 'Are you sure you want to close this loan? This will mark gold items as released.', async () => {
            const btn = document.getElementById('btnCloseLoan');
            btn.disabled = true;

            const loanId = parseInt(document.getElementById('close_loanId').value);
            const prinAmt = parseFloat(document.getElementById('close_amountPrincipal').value) || 0;
            const intAmt = parseFloat(document.getElementById('close_amountInterest').value) || 0;
            const discAmt = parseFloat(document.getElementById('close_discount').value) || 0;
            const finalAmt = parseFloat(document.getElementById('close_amountTotal').value) || 0;

            const paymentData = {
                receiptNumber: document.getElementById('close_receiptNo').value,
                loanId: loanId,
                customerId: parseInt(document.getElementById('close_customerId').value),
                paymentDate: document.getElementById('close_date').value,
                principalAmount: prinAmt,
                interestAmount: Math.max(0, intAmt - discAmt), // Discount applied to interest for accounting
                discountAmount: discAmt,
                totalAmount: finalAmt,
                paymentMode: document.getElementById('close_mode').value,
                referenceNumber: 'CLOSURE',
                createdAt: new Date().toISOString()
            };

            try {
                // 1. Save final payment
                if (finalAmt > 0 || discAmt > 0) {
                    await db.add('payments', paymentData);
                }

                // 2. Update Loan Status
                const loan = await db.get('loans', loanId);
                loan.status = 'CLOSED';
                loan.closedDate = paymentData.paymentDate;
                await db.put('loans', loan);

                // 3. Update Gold Items
                const goldItems = await db.getByIndex('goldItems', 'loanId', loanId);
                for (const item of goldItems) {
                    item.status = 'RELEASED';
                    item.releaseDate = paymentData.paymentDate;
                    await db.put('goldItems', item);
                }

                await db.logAudit('UPDATE', 'Closure', loanId, 'Closed loan ' + loan.loanNumber);
                
                Utils.showToast('Success', 'Loan Successfully Closed', 'success');
                this.render(); // Reset

            } catch (err) {
                console.error(err);
                Utils.showToast('Error', 'Failed to close loan', 'error');
                btn.disabled = false;
            }
        });
    }
};

window.Closure = Closure;
