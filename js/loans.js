/**
 * Loan Management Module (New Loan & Active Loans)
 */

const Loans = {
    tempGoldItems: [], // Store items temporarily while creating a loan

    // ----- NEW LOAN -----
    renderNewForm: async function() {
        const container = document.getElementById('view-new-loan');
        if (!container) return;

        this.tempGoldItems = []; // Reset

        // Fetch configs
        const loanPrefix = (await Settings.get('loanPrefix')) || 'GF-LOAN-';
        const count = (await db.getAll('loans')).length + 1;
        const defaultLoanNumber = loanPrefix + String(count).padStart(6, '0');
        const defaultInterest = (await Settings.get('interestRate')) || 2;
        const defaultInterestWeekly = (await Settings.get('interestRateWeekly')) || 0.5;
        const defaultInterestDaily = (await Settings.get('interestRateDaily')) || 0.1;
        const defaultInterestYearly = (await Settings.get('interestRateYearly')) || 24;
        const processingFee = (await Settings.get('processingFee')) || 1;

        // Fetch customers for dropdown
        const customers = await db.getAll('customers');
        let customerOptions = '<option value="">-- Select Customer --</option>';
        customers.forEach(c => {
            customerOptions += `<option value="${c.id}">${c.customerCode} - ${c.fullName} (${c.mobile})</option>`;
        });

        // Determine Role for access control
        const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
        const role = currentUser ? currentUser.role : 'STAFF';
        const isStaff = role === 'STAFF';
        const readonlyAttr = isStaff ? 'readonly title="Only Admins can change this"' : '';
        const pointerEvents = isStaff ? 'style="pointer-events: none; opacity: 0.7; flex: 1;"' : 'style="flex: 1;"';

        container.innerHTML = `
            <div class="page-header">
                <h2>New Gold Loan</h2>
            </div>
            
            <form id="newLoanForm" onsubmit="event.preventDefault(); Loans.saveLoan();">
                <div class="card mb-4">
                    <div class="card-header">
                        <h3>1. Loan Information</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Loan Number (Auto)</label>
                                <input type="text" id="loanNumber" class="form-control" value="${defaultLoanNumber}" readonly>
                            </div>
                            <div class="form-group">
                                <label>Customer *</label>
                                <select id="loanCustomer" class="form-control" required>
                                    ${customerOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Loan Date *</label>
                                <input type="date" id="loanDate" class="form-control" value="${Utils.getISODate()}" required>
                            </div>
                            <div class="form-group">
                                <label>Interest Rate *</label>
                                <div style="display: flex; gap: 10px;">
                                    <input type="number" step="0.01" id="loanInterestRate" class="form-control" value="${defaultInterest}" required ${readonlyAttr} style="flex: 1;">
                                    <select id="loanInterestType" class="form-control" style="flex: 1;" onchange="
                                        const type = this.value;
                                        const rateInput = document.getElementById('loanInterestRate');
                                        if(type === 'monthly') rateInput.value = ${defaultInterest};
                                        if(type === 'weekly') rateInput.value = ${defaultInterestWeekly};
                                        if(type === 'daily') rateInput.value = ${defaultInterestDaily};
                                        if(type === 'yearly') rateInput.value = ${defaultInterestYearly};
                                    ">
                                        <option value="monthly">Per Month</option>
                                        <option value="weekly">Per Week</option>
                                        <option value="daily">Per Day</option>
                                        <option value="yearly">Per Year</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Loan Term *</label>
                                <select id="loanTerm" class="form-control" onchange="Loans.handleTermChange()" required>
                                    <option value="1">1 Month</option>
                                    <option value="3">3 Months</option>
                                    <option value="6">6 Months</option>
                                    <option value="12" selected>1 Year</option>
                                    <option value="custom">Custom Date</option>
                                </select>
                            </div>
                            <div class="form-group" id="customDateGroup" style="display: none;">
                                <label>Custom Due Date (DD/MM/YYYY) *</label>
                                <input type="date" id="loanCustomDueDate" class="form-control" value="${Utils.getISODate()}" onchange="Loans.handleTermChange()">
                            </div>
                            <div class="form-group">
                                <label>Calculated Due Date (DD/MM/YYYY)</label>
                                <div class="readonly-value" id="calcDueDateDisplay" style="font-weight: 600; color: var(--primary-color);"></div>
                            </div>
                            <div class="form-group">
                                <label>Total Loan Days</label>
                                <div class="readonly-value" id="calcDueDaysDisplay"></div>
                            </div>
                            <div class="form-group">
                                <label>Processing Fee (%)</label>
                                <input type="number" step="0.01" id="loanProcessingFee" class="form-control" value="${processingFee}" onchange="Loans.calculateTotals()" ${readonlyAttr}>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-header flex-between">
                        <h3>2. Gold Items</h3>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="Loans.openAddGoldModal()">+ Add Gold Item</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Qty</th>
                                    <th>Gross Wt (g)</th>
                                    <th>Net Wt (g)</th>
                                    <th>Purity</th>
                                    <th>Appraised Value</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="goldItemsList">
                                <tr><td colspan="7" class="text-center text-muted">No gold items added yet.</td></tr>
                            </tbody>
                            <tfoot style="background-color: var(--bg-color); font-weight: 600;">
                                <tr>
                                    <td colspan="3" class="text-right">Total Net Weight:</td>
                                    <td id="totalNetWeight">0.00 g</td>
                                    <td class="text-right">Total Value:</td>
                                    <td id="totalGoldValue">₹0.00</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div class="card mb-4">
                    <div class="card-header">
                        <h3>3. Loan Approval</h3>
                    </div>
                    <div class="card-body">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Max Eligible Loan (based on LTV)</label>
                                <div class="readonly-value text-success" id="eligibleLoanValue">₹0.00</div>
                            </div>
                            <div class="form-group">
                                <label>Requested Principal Amount *</label>
                                <input type="number" id="loanPrincipal" class="form-control" required min="1" onkeyup="Loans.calculateTotals()">
                            </div>
                            <div class="form-group">
                                <label>Deductions (Processing Fee)</label>
                                <div class="readonly-value text-danger" id="deductionAmount">₹0.00</div>
                            </div>
                            <div class="form-group">
                                <label>Final Disbursement Amount</label>
                                <div class="readonly-value" id="disbursementAmount">₹0.00</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="text-right mb-4">
                    <button type="submit" class="btn btn-primary" id="btnApproveLoan" disabled>Approve & Generate Loan</button>
                </div>
            </form>
        `;
        this.tempGoldItems = [];
        this.calculateTotals();
        
        // Initial setup for the due date display
        setTimeout(() => {
            document.getElementById('loanDate').addEventListener('change', () => Loans.handleTermChange());
            this.handleTermChange();
        }, 100);
    },

    handleTermChange: function() {
        const termSelect = document.getElementById('loanTerm');
        if (!termSelect) return;
        
        const customGroup = document.getElementById('customDateGroup');
        const term = termSelect.value;
        const loanDateVal = document.getElementById('loanDate').value;
        
        if (!loanDateVal) return;
        
        let dDate = new Date(loanDateVal);
        
        if (term === 'custom') {
            customGroup.style.display = 'block';
            const customDateVal = document.getElementById('loanCustomDueDate').value;
            if (customDateVal) {
                dDate = new Date(customDateVal);
            }
        } else {
            customGroup.style.display = 'none';
            const months = parseInt(term);
            dDate.setMonth(dDate.getMonth() + months);
        }
        
        const finalDueDateStr = Utils.getISODate(dDate);
        
        // Calculate days
        const startDate = new Date(loanDateVal);
        const diffTime = Math.abs(dDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        document.getElementById('calcDueDateDisplay').textContent = Utils.formatDate(finalDueDateStr);
        document.getElementById('calcDueDaysDisplay').textContent = `${diffDays} Days`;
    },

    openAddGoldModal: async function() {
        // Fetch current rates
        const rate24K = (await Settings.get('goldRate24K')) || 0;
        const rate22K = (await Settings.get('goldRate22K')) || 0;
        const rate21K = (await Settings.get('goldRate21K')) || 0;
        const rate20K = (await Settings.get('goldRate20K')) || 0;
        const rate18K = (await Settings.get('goldRate18K')) || 0;
        
        if (rate22K == 0 && rate24K == 0) {
            Utils.showToast('Warning', 'Please set Gold Rates in Settings first.', 'warning');
            return;
        }

        const modalId = 'addGoldModal';
        const html = `
            <div class="modal-overlay active" id="${modalId}">
                <div class="modal modal-md">
                    <div class="modal-header">
                        <h3>Add Gold Item</h3>
                        <button type="button" class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="goldItemForm">
                            <div class="form-group">
                                <label>Item Type</label>
                                <select id="goldType" class="form-control">
                                    <option value="Chain">Chain</option>
                                    <option value="Ring">Ring</option>
                                    <option value="Bangle">Bangle</option>
                                    <option value="Necklace">Necklace</option>
                                    <option value="Earring">Earring</option>
                                    <option value="Bracelet">Bracelet</option>
                                    <option value="Coin">Coin</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <input type="text" id="goldDesc" class="form-control">
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Quantity</label>
                                    <input type="number" id="goldQty" class="form-control" value="1" min="1" required>
                                </div>
                                <div class="form-group">
                                    <label>Purity</label>
                                    <select id="goldPurity" class="form-control" onchange="Loans.calcItemValue()">
                                        <option value="24K">24K (99.9%)</option>
                                        <option value="22K">22K (91.6%)</option>
                                        <option value="21K">21K (87.5%)</option>
                                        <option value="20K">20K (83.3%)</option>
                                        <option value="18K">18K (75.0%)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Gross Weight (g)</label>
                                    <input type="number" step="0.01" id="goldGross" class="form-control" required onkeyup="Loans.calcNetWeight()">
                                </div>
                                <div class="form-group">
                                    <label>Stone/Dust Weight (g)</label>
                                    <input type="number" step="0.01" id="goldStone" class="form-control" value="0" required onkeyup="Loans.calcNetWeight()">
                                </div>
                            </div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Net Weight (g)</label>
                                    <input type="number" step="0.01" id="goldNet" class="form-control" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Appraised Value</label>
                                    <input type="number" id="goldValue" class="form-control" readonly>
                                </div>
                            </div>
                            <input type="hidden" id="sysRate24K" value="${rate24K}">
                            <input type="hidden" id="sysRate22K" value="${rate22K}">
                            <input type="hidden" id="sysRate21K" value="${rate21K}">
                            <input type="hidden" id="sysRate20K" value="${rate20K}">
                            <input type="hidden" id="sysRate18K" value="${rate18K}">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="Loans.addGoldItemToList()">Add Item</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    calcNetWeight: function() {
        const gross = parseFloat(document.getElementById('goldGross').value) || 0;
        const stone = parseFloat(document.getElementById('goldStone').value) || 0;
        const net = Math.max(0, gross - stone);
        document.getElementById('goldNet').value = net.toFixed(2);
        this.calcItemValue();
    },

    calcItemValue: function() {
        const net = parseFloat(document.getElementById('goldNet').value) || 0;
        const purity = document.getElementById('goldPurity').value;
        const rate24 = parseFloat(document.getElementById('sysRate24K').value) || 0;
        const rate22 = parseFloat(document.getElementById('sysRate22K').value) || 0;
        const rate21 = parseFloat(document.getElementById('sysRate21K').value) || 0;
        const rate20 = parseFloat(document.getElementById('sysRate20K').value) || 0;
        const rate18 = parseFloat(document.getElementById('sysRate18K').value) || 0;

        let rateToUse = rate22; // default
        
        // Use explicitly defined rate if available, otherwise fallback to derived rate from 22K
        if (purity === '24K') rateToUse = rate24 > 0 ? rate24 : rate22 * (99.9/91.6);
        if (purity === '22K') rateToUse = rate22;
        if (purity === '21K') rateToUse = rate21 > 0 ? rate21 : rate22 * (87.5/91.6);
        if (purity === '20K') rateToUse = rate20 > 0 ? rate20 : rate22 * (83.3/91.6);
        if (purity === '18K') rateToUse = rate18 > 0 ? rate18 : rate22 * (75.0/91.6);

        const value = Math.round(net * rateToUse);
        document.getElementById('goldValue').value = value;
    },

    addGoldItemToList: function() {
        const form = document.getElementById('goldItemForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const item = {
            id: 'temp_' + Date.now(),
            type: document.getElementById('goldType').value,
            description: document.getElementById('goldDesc').value,
            qty: parseInt(document.getElementById('goldQty').value),
            grossWeight: parseFloat(document.getElementById('goldGross').value),
            stoneWeight: parseFloat(document.getElementById('goldStone').value),
            netWeight: parseFloat(document.getElementById('goldNet').value),
            purity: document.getElementById('goldPurity').value,
            appraisedValue: parseFloat(document.getElementById('goldValue').value),
            status: 'PLEDGED'
        };

        this.tempGoldItems.push(item);
        document.getElementById('addGoldModal').remove();
        this.renderGoldItemsTable();
    },

    removeGoldItem: function(id) {
        this.tempGoldItems = this.tempGoldItems.filter(i => i.id !== id);
        this.renderGoldItemsTable();
    },

    renderGoldItemsTable: async function() {
        const tbody = document.getElementById('goldItemsList');
        if (this.tempGoldItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No gold items added yet.</td></tr>`;
            document.getElementById('totalNetWeight').textContent = '0.00 g';
            document.getElementById('totalGoldValue').textContent = '₹0.00';
            this.updateEligibleLoan(0);
            return;
        }

        let html = '';
        let totalNet = 0;
        let totalValue = 0;

        this.tempGoldItems.forEach(item => {
            totalNet += item.netWeight;
            totalValue += item.appraisedValue;
            html += `
                <tr>
                    <td>${item.type} ${item.description ? '('+item.description+')' : ''}</td>
                    <td>${item.qty}</td>
                    <td>${item.grossWeight.toFixed(2)}</td>
                    <td>${item.netWeight.toFixed(2)}</td>
                    <td>${item.purity}</td>
                    <td>${Utils.formatCurrency(item.appraisedValue)}</td>
                    <td>
                        <button type="button" class="btn btn-icon btn-text text-danger" onclick="Loans.removeGoldItem('${item.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        document.getElementById('totalNetWeight').textContent = totalNet.toFixed(2) + ' g';
        document.getElementById('totalGoldValue').textContent = Utils.formatCurrency(totalValue);
        
        this.updateEligibleLoan(totalValue);
    },

    updateEligibleLoan: async function(totalGoldValue) {
        const ltv = (await Settings.get('ltvPercentage')) || 75;
        const eligible = Math.floor(totalGoldValue * (ltv / 100));
        
        // Store on window for easy access during calculation
        window.tempEligibleLoan = eligible;
        
        document.getElementById('eligibleLoanValue').textContent = Utils.formatCurrency(eligible);
        this.calculateTotals();
    },

    calculateTotals: function() {
        const principalStr = document.getElementById('loanPrincipal').value;
        const principal = parseFloat(principalStr) || 0;
        const feePercent = parseFloat(document.getElementById('loanProcessingFee').value) || 0;
        
        const feeAmount = Math.round(principal * (feePercent / 100));
        const disbursement = principal - feeAmount;
        
        document.getElementById('deductionAmount').textContent = Utils.formatCurrency(feeAmount);
        document.getElementById('disbursementAmount').textContent = Utils.formatCurrency(disbursement);

        // Validation logic to enable/disable button
        const eligible = window.tempEligibleLoan || 0;
        const btn = document.getElementById('btnApproveLoan');
        
        if (principal > 0 && principal <= eligible && this.tempGoldItems.length > 0) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
            // Show warning if exceeding
            if (principal > eligible && principal > 0) {
                document.getElementById('eligibleLoanValue').classList.add('text-danger');
            } else {
                document.getElementById('eligibleLoanValue').classList.remove('text-danger');
            }
        }
    },

    saveLoan: async function() {
        if (this.tempGoldItems.length === 0) {
            Utils.showToast('Error', 'Add at least one gold item.', 'error');
            return;
        }

        const btn = document.getElementById('btnApproveLoan');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            const customerId = parseInt(document.getElementById('loanCustomer').value);
            const principal = parseFloat(document.getElementById('loanPrincipal').value);
            const loanDate = document.getElementById('loanDate').value;
            
            const loanTerm = document.getElementById('loanTerm').value;
            let finalDueDate = '';
            
            if (loanTerm === 'custom') {
                finalDueDate = document.getElementById('loanCustomDueDate').value;
            } else {
                const months = parseInt(loanTerm);
                const dDate = new Date(loanDate);
                dDate.setMonth(dDate.getMonth() + months);
                finalDueDate = Utils.getISODate(dDate);
            }

            const loanData = {
                loanNumber: document.getElementById('loanNumber').value,
                customerId: customerId,
                loanDate: loanDate,
                dueDate: finalDueDate,
                principal: principal,
                interestRate: parseFloat(document.getElementById('loanInterestRate').value),
                interestType: document.getElementById('loanInterestType').value,
                processingFeePercent: parseFloat(document.getElementById('loanProcessingFee').value),
                processingFeeAmount: Math.round(principal * (parseFloat(document.getElementById('loanProcessingFee').value) / 100)),
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            };

            // Remove temp IDs from gold items
            const goldToSave = this.tempGoldItems.map(g => {
                const {id, ...rest} = g;
                return rest;
            });

            // Use transactional save
            const savedLoanId = await db.saveLoanWithGoldItems(loanData, goldToSave);
            
            await db.logAudit('CREATE', 'Loans', savedLoanId, 'Created loan ' + loanData.loanNumber);
            
            Utils.showToast('Success', 'Loan Approved Successfully', 'success');
            
            // Generate Disbursement Receipt (Trigger print via Receipts module in real flow, here we just route)
            setTimeout(() => {
                App.navigate('active-loans');
            }, 1000);

        } catch (error) {
            console.error(error);
            Utils.showToast('Error', 'Failed to save loan: ' + error, 'error');
            btn.disabled = false;
            btn.textContent = 'Approve & Generate Loan';
        }
    },

    // ----- ACTIVE LOANS -----
    renderActiveLoans: async function() {
        const container = document.getElementById('view-active-loans');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h2>Active Loans</h2>
                <div class="search-bar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="loanSearch" placeholder="Search Loan No..." onkeyup="Loans.filterActiveLoans()">
                </div>
            </div>
            
            <div class="card">
                <div class="table-responsive">
                    <table class="table" id="activeLoansTable">
                        <thead>
                            <tr>
                                <th>Loan No</th>
                                <th>Customer Name</th>
                                <th>Date</th>
                                <th>Principal</th>
                                <th>Int. Rate</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="activeLoansTableBody">
                            <tr><td colspan="7" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadActiveLoans();
    },

    loadActiveLoans: async function() {
        try {
            const allLoans = await db.getAll('loans');
            // Show Active and Overdue
            const activeLoans = allLoans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');
            
            const tbody = document.getElementById('activeLoansTableBody');
            
            if (activeLoans.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No active loans found.</td></tr>`;
                return;
            }

            activeLoans.sort((a,b) => b.id - a.id);
            
            // Get customers for mapping
            const customers = await db.getAll('customers');
            const custMap = {};
            customers.forEach(c => custMap[c.id] = c.fullName);

            let html = '';
            activeLoans.forEach(loan => {
                const isOverdue = loan.status === 'OVERDUE';
                html += `
                    <tr>
                        <td><strong>${loan.loanNumber}</strong></td>
                        <td>${custMap[loan.customerId] || 'Unknown'}</td>
                        <td>${Utils.formatDate(loan.loanDate)}</td>
                        <td>${Utils.formatCurrency(loan.principal)}</td>
                        <td>${loan.interestRate}%</td>
                        <td><span class="badge ${isOverdue ? 'badge-danger' : 'badge-success'}">${loan.status}</span></td>
                        <td>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-sm btn-outline" onclick="App.navigate('payments'); setTimeout(()=>document.getElementById('paymentSearch').value='${loan.loanNumber}', 100);">Pay</button>
                                <button class="btn btn-sm btn-secondary" onclick="Loans.printSchedule(${loan.id})" title="Print Due Schedule">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;

        } catch (error) {
            console.error(error);
            document.getElementById('activeLoansTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading loans</td></tr>`;
        }
    },
    
    filterActiveLoans: function() {
        const input = document.getElementById('loanSearch');
        const filter = input.value.toLowerCase();
        const tbody = document.getElementById('activeLoansTableBody');
        const trs = tbody.getElementsByTagName('tr');

        for (let i = 0; i < trs.length; i++) {
            const tds = trs[i].getElementsByTagName('td');
            if (tds.length > 0) {
                const text = trs[i].textContent || trs[i].innerText;
                if (text.toLowerCase().indexOf(filter) > -1) {
                    trs[i].style.display = "";
                } else {
                    trs[i].style.display = "none";
                }
            }
        }
    },
    
    printSchedule: async function(loanId) {
        try {
            const loan = await db.get('loans', loanId);
            const customer = await db.get('customers', loan.customerId);
            const payments = await db.getByIndex('payments', 'loanId', loanId);
            
            // Calculate total interest paid
            const totalInterestPaid = payments.reduce((sum, p) => sum + (parseFloat(p.interestAmount) || 0), 0);
            
            const companyName = await Settings.get('companyName') || 'Gold Finance';
            
            let html = `
                <div class="print-header">
                    <h2>${companyName}</h2>
                    <h3>PAYMENT SCHEDULE</h3>
                </div>
                <div class="print-row" style="margin-top: 20px;">
                    <div><strong>Customer:</strong> ${customer.fullName}</div>
                    <div><strong>Loan No:</strong> ${loan.loanNumber}</div>
                </div>
                <div class="print-row">
                    <div><strong>Loan Amount:</strong> ${Utils.formatCurrency(loan.principal)}</div>
                    <div><strong>Loan Date:</strong> ${Utils.formatDate(loan.loanDate)}</div>
                </div>
                <div class="print-row">
                    <div><strong>Interest Rate:</strong> ${loan.interestRate}% ${loan.interestType === 'monthly' ? '(PER MONTH)' : loan.interestType === 'weekly' ? '(PER WEEK)' : loan.interestType === 'daily' ? '(PER DAY)' : loan.interestType === 'yearly' ? '(PER YEAR)' : ''}</div>
                    <div><strong>Due Date (DD/MM/YYYY):</strong> ${Utils.formatDate(loan.dueDate)}</div>
                </div>
                
                <table class="print-table" style="margin-top: 20px;">
                    <thead>
                        <tr>
                            <th>Month / Installment</th>
                            <th>Due Date (DD/MM/YYYY)</th>
                            <th>Interest Due</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            let currentInterestPaid = totalInterestPaid;
            let startDate = new Date(loan.loanDate);
            let endDate = new Date(loan.dueDate);
            
            // If loan is overdue and no due date was set properly, cap it at 12 months for safety or today
            if (!loan.dueDate) {
                endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 1);
            }
            
            let tempDate = new Date(startDate);
            let monthCount = 1;
            
            while (tempDate < endDate) {
                tempDate.setMonth(tempDate.getMonth() + 1);
                
                // Calculate interest for this 1 month
                // Assuming monthly interest rate
                let monthlyInterest = 0;
                if (loan.interestType === 'monthly') {
                    monthlyInterest = Math.round(loan.principal * (loan.interestRate / 100));
                } else if (loan.interestType === 'yearly') {
                    monthlyInterest = Math.round(loan.principal * (loan.interestRate / 100) / 12);
                } else {
                    // Fallback approximation for daily/weekly to monthly
                    monthlyInterest = Math.round(loan.principal * (loan.interestRate / 100) * 30); // if daily rate
                }
                
                let statusHtml = '';
                if (currentInterestPaid >= monthlyInterest) {
                    currentInterestPaid -= monthlyInterest;
                    statusHtml = `<span style="color: green; font-weight: bold;">PAID</span>`;
                } else {
                    // Partially paid or unpaid
                    if (currentInterestPaid > 0) {
                        statusHtml = `<span style="color: orange; font-weight: bold;">PARTIAL (₹${currentInterestPaid})</span>`;
                        currentInterestPaid = 0;
                    } else {
                        // Check if past date
                        if (new Date() > tempDate) {
                            statusHtml = `<span style="color: red; font-weight: bold;">UNPAID (OVERDUE)</span>`;
                        } else {
                            statusHtml = `<span>PENDING</span>`;
                        }
                    }
                }
                
                html += `
                    <tr>
                        <td>Month ${monthCount}</td>
                        <td>${Utils.formatDate(Utils.getISODate(tempDate))}</td>
                        <td>${Utils.formatCurrency(monthlyInterest)}</td>
                        <td>${statusHtml}</td>
                    </tr>
                `;
                monthCount++;
                
                // Safety break
                if (monthCount > 120) break; 
            }
            
            html += `
                    </tbody>
                </table>
                <div style="margin-top: 30px; text-align: center; font-size: 0.9em; color: #666;">
                    Generated on ${Utils.formatDate(new Date())}
                </div>
            `;
            
            const printContainer = document.getElementById('printContainer');
            if (printContainer) {
                printContainer.innerHTML = html;
                setTimeout(() => {
                    window.print();
                    setTimeout(() => {
                        printContainer.innerHTML = '';
                    }, 500);
                }, 100);
            }
            
        } catch (error) {
            console.error(error);
            Utils.showToast('Error', 'Failed to generate schedule', 'error');
        }
    }
};

window.Loans = Loans;
