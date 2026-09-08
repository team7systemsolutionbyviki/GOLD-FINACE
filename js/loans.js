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
                <h2>New Loan</h2>
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
                        <h3>2. Items (Gold, Silver, Platinum, Diamond...)</h3>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="Loans.openAddGoldModal()">+ Add Item</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Weight/Carat</th>
                                    <th>Purity/Grade</th>
                                    <th>Method</th>
                                    <th>Value</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="goldItemsList">
                                <tr><td colspan="7" class="text-center text-muted">No items added yet.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="card-body bg-light mt-2" id="materialTotalsContainer" style="display:none; font-size: 0.9em;">
                        <!-- Totals will be dynamically added here -->
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
        const rates = {
            gold24K: parseFloat(await Settings.get('goldRate24K')) || 0,
            gold22K: parseFloat(await Settings.get('goldRate22K')) || 0,
            gold21K: parseFloat(await Settings.get('goldRate21K')) || 0,
            gold20K: parseFloat(await Settings.get('goldRate20K')) || 0,
            gold18K: parseFloat(await Settings.get('goldRate18K')) || 0,
            silver: parseFloat(await Settings.get('silverRate')) || 0,
            platinum: parseFloat(await Settings.get('platinumRate')) || 0
        };
        
        // Fetch configurations from IndexedDB
        let configs = {};
        const configKeys = ['goldPurities', 'silverPurities', 'platinumPurities', 'diamondGrades', 'diamondColors', 'diamondClarities', 'diamondCuts', 'diamondShapes', 'rubyTypes', 'rubyTreatments', 'stoneTypes'];
        for (const k of configKeys) {
            let conf = await db.get('materialConfigs', k);
            configs[k] = conf ? conf.values.filter(v => v.active) : [];
        }

        const buildOptions = (list) => list.map(item => `<option value="${item.code}" data-perc="${item.percentage || 0}">${item.label}</option>`).join('');

        const modalId = 'addGoldModal';
        const html = `
            <div class="modal-overlay active" id="${modalId}">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3>Add Item</h3>
                        <button type="button" class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="goldItemForm">
                            <div class="form-grid">
                                <div class="form-group" style="grid-column: span 2; display: flex; gap: 15px; align-items: flex-start;">
                                    <div style="flex: 1;">
                                        <label>Item Photo (Optional)</label>
                                        <input type="file" id="itemPhotoInput" class="form-control" accept="image/*" onchange="Loans.previewPhoto(event)">
                                        <small class="text-muted">Max 15MB. Automatically compressed to save space.</small>
                                    </div>
                                    <div id="photoPreviewContainer" style="display: none; position: relative; width: 100px; height: 100px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden;">
                                        <img id="photoPreview" style="width: 100%; height: 100%; object-fit: contain; background: #000;">
                                        <button type="button" onclick="Loans.removePhotoPreview()" style="position: absolute; top: 0; right: 0; background: var(--danger-color); color: white; border: none; padding: 2px 6px; cursor: pointer;">&times;</button>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Material *</label>
                                    <select id="itemMaterial" class="form-control" onchange="Loans.handleMaterialChange()" required>
                                        <option value="Gold">Gold</option>
                                        <option value="Silver">Silver</option>
                                        <option value="Platinum">Platinum</option>
                                        <option value="Diamond">Diamond</option>
                                        <option value="Ruby">Ruby</option>
                                        <option value="Stone">Stone / Gemstone</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Item Type *</label>
                                    <input type="text" id="itemType" class="form-control" required placeholder="e.g. Ring, Chain">
                                </div>
                                <div class="form-group">
                                    <label>Description</label>
                                    <input type="text" id="itemDesc" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label>Quantity *</label>
                                    <input type="number" id="itemQty" class="form-control" value="1" min="1" required>
                                </div>
                            </div>
                            
                            <!-- METAL FIELDS -->
                            <div id="metalFields" class="material-group mt-3" style="display: block;">
                                <h4>Metal Details</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Gross Weight (g) *</label>
                                        <input type="number" step="0.01" id="metalGross" class="form-control" onkeyup="Loans.calcNetWeight()">
                                    </div>
                                    <div class="form-group">
                                        <label>Stone/Dust Weight (g) *</label>
                                        <input type="number" step="0.01" id="metalStone" class="form-control" value="0" onkeyup="Loans.calcNetWeight()">
                                    </div>
                                    <div class="form-group">
                                        <label>Net Weight (g)</label>
                                        <input type="number" step="0.01" id="metalNet" class="form-control" readonly>
                                    </div>
                                    <div class="form-group">
                                        <label>Purity *</label>
                                        <select id="metalPurity" class="form-control" onchange="Loans.calcItemValue()">
                                            ${buildOptions(configs.goldPurities)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- GEM FIELDS -->
                            <div id="gemFields" class="material-group mt-3" style="display: none;">
                                <h4>Gemstone Details</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Carat Weight</label>
                                        <input type="number" step="0.01" id="gemCarat" class="form-control">
                                    </div>
                                    <div class="form-group" id="group_diamondGrade">
                                        <label>Diamond Grade</label>
                                        <select id="gemDiamondGrade" class="form-control"><option value="">-</option>${buildOptions(configs.diamondGrades)}</select>
                                    </div>
                                    <div class="form-group" id="group_diamondColor">
                                        <label>Color</label>
                                        <select id="gemDiamondColor" class="form-control"><option value="">-</option>${buildOptions(configs.diamondColors)}</select>
                                    </div>
                                    <div class="form-group" id="group_diamondClarity">
                                        <label>Clarity</label>
                                        <select id="gemDiamondClarity" class="form-control"><option value="">-</option>${buildOptions(configs.diamondClarities)}</select>
                                    </div>
                                    <div class="form-group" id="group_diamondCut">
                                        <label>Cut</label>
                                        <select id="gemDiamondCut" class="form-control"><option value="">-</option>${buildOptions(configs.diamondCuts)}</select>
                                    </div>
                                    <div class="form-group" id="group_diamondShape">
                                        <label>Shape</label>
                                        <select id="gemDiamondShape" class="form-control"><option value="">-</option>${buildOptions(configs.diamondShapes)}</select>
                                    </div>
                                    
                                    <div class="form-group" id="group_rubyType" style="display:none;">
                                        <label>Ruby Type</label>
                                        <select id="gemRubyType" class="form-control"><option value="">-</option>${buildOptions(configs.rubyTypes)}</select>
                                    </div>
                                    <div class="form-group" id="group_rubyTreatment" style="display:none;">
                                        <label>Treatment</label>
                                        <select id="gemRubyTreatment" class="form-control"><option value="">-</option>${buildOptions(configs.rubyTreatments)}</select>
                                    </div>
                                    
                                    <div class="form-group" id="group_stoneType" style="display:none;">
                                        <label>Stone Type</label>
                                        <select id="gemStoneType" class="form-control"><option value="">-</option>${buildOptions(configs.stoneTypes)}</select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Certification Number</label>
                                        <input type="text" id="gemCertNo" class="form-control">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- OTHER FIELDS -->
                            <div id="otherFields" class="material-group mt-3" style="display: none;">
                                <h4>Other Details</h4>
                                <div class="form-grid">
                                    <div class="form-group">
                                        <label>Weight</label>
                                        <input type="number" step="0.01" id="otherWeight" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Unit (e.g. g, kg)</label>
                                        <input type="text" id="otherUnit" class="form-control">
                                    </div>
                                    <div class="form-group">
                                        <label>Material Name</label>
                                        <input type="text" id="otherName" class="form-control">
                                    </div>
                                </div>
                            </div>

                            <hr style="margin: 15px 0;">
                            
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Valuation Method</label>
                                    <input type="text" id="itemValuationMethod" class="form-control" readonly value="CALCULATED">
                                </div>
                                <div class="form-group">
                                    <label>Rate / Gram (If Calculated)</label>
                                    <input type="number" id="itemRate" class="form-control" readonly>
                                </div>
                                <div class="form-group" style="grid-column: span 2;">
                                    <label>Final Item Value (₹) *</label>
                                    <input type="number" id="itemValue" class="form-control" style="font-weight:bold; font-size:1.2em;" required>
                                </div>
                            </div>
                            
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
        
        // Store configs on window for dropdown toggling
        window._currentConfigs = configs;
        window._currentRates = rates;
        
        // Reset photo
        this.currentPhotoData = null;
        
        this.handleMaterialChange();
    },

    previewPhoto: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (file.size > 15 * 1024 * 1024) {
            Utils.showToast('Error', 'Photo is too large. Maximum allowed size is 15 MB.', 'error');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const previewContainer = document.getElementById('photoPreviewContainer');
            const previewImg = document.getElementById('photoPreview');
            previewImg.src = e.target.result;
            previewContainer.style.display = 'block';
            this.currentPhotoFile = file;
        };
        reader.readAsDataURL(file);
    },

    removePhotoPreview: function() {
        document.getElementById('itemPhotoInput').value = '';
        document.getElementById('photoPreviewContainer').style.display = 'none';
        document.getElementById('photoPreview').src = '';
        this.currentPhotoFile = null;
    },

    handleMaterialChange: function() {
        const material = document.getElementById('itemMaterial').value;
        const metalFields = document.getElementById('metalFields');
        const gemFields = document.getElementById('gemFields');
        const otherFields = document.getElementById('otherFields');
        const valMethod = document.getElementById('itemValuationMethod');
        const valInput = document.getElementById('itemValue');
        
        // Reset requirements
        document.getElementById('metalGross').required = false;
        document.getElementById('metalStone').required = false;
        document.getElementById('gemCarat').required = false;

        const buildOptions = (list) => list.map(item => `<option value="${item.code}" data-perc="${item.percentage || 0}">${item.label}</option>`).join('');

        if (['Gold', 'Silver', 'Platinum'].includes(material)) {
            metalFields.style.display = 'block';
            gemFields.style.display = 'none';
            otherFields.style.display = 'none';
            valMethod.value = 'CALCULATED';
            valInput.readOnly = true;
            document.getElementById('metalGross').required = true;
            document.getElementById('metalStone').required = true;
            
            const pSelect = document.getElementById('metalPurity');
            if (material === 'Gold') pSelect.innerHTML = buildOptions(window._currentConfigs.goldPurities);
            if (material === 'Silver') pSelect.innerHTML = buildOptions(window._currentConfigs.silverPurities);
            if (material === 'Platinum') pSelect.innerHTML = buildOptions(window._currentConfigs.platinumPurities);
            
            this.calcItemValue();
            
        } else if (['Diamond', 'Ruby', 'Stone'].includes(material)) {
            metalFields.style.display = 'none';
            gemFields.style.display = 'block';
            otherFields.style.display = 'none';
            valMethod.value = 'APPRAISED';
            valInput.readOnly = false;
            document.getElementById('itemRate').value = '';
            document.getElementById('gemCarat').required = true;
            
            // Toggle specific gem fields
            document.getElementById('group_diamondGrade').style.display = material === 'Diamond' ? 'block' : 'none';
            document.getElementById('group_diamondColor').style.display = material === 'Diamond' ? 'block' : 'none';
            document.getElementById('group_diamondClarity').style.display = material === 'Diamond' ? 'block' : 'none';
            document.getElementById('group_diamondCut').style.display = material === 'Diamond' ? 'block' : 'none';
            document.getElementById('group_diamondShape').style.display = material === 'Diamond' ? 'block' : 'none';
            
            document.getElementById('group_rubyType').style.display = material === 'Ruby' ? 'block' : 'none';
            document.getElementById('group_rubyTreatment').style.display = ['Ruby', 'Stone'].includes(material) ? 'block' : 'none';
            
            document.getElementById('group_stoneType').style.display = material === 'Stone' ? 'block' : 'none';
            
        } else {
            // Other
            metalFields.style.display = 'none';
            gemFields.style.display = 'none';
            otherFields.style.display = 'block';
            valMethod.value = 'APPRAISED';
            valInput.readOnly = false;
            document.getElementById('itemRate').value = '';
        }
    },

    calcNetWeight: function() {
        const gross = parseFloat(document.getElementById('metalGross').value) || 0;
        const stone = parseFloat(document.getElementById('metalStone').value) || 0;
        const net = Math.max(0, gross - stone);
        document.getElementById('metalNet').value = net.toFixed(2);
        this.calcItemValue();
    },

    calcItemValue: function() {
        const material = document.getElementById('itemMaterial').value;
        const net = parseFloat(document.getElementById('metalNet').value) || 0;
        const pSelect = document.getElementById('metalPurity');
        
        if (['Diamond', 'Ruby', 'Stone', 'Other'].includes(material)) {
            return; // Manual entry
        }

        let rateToUse = 0;
        let purityFactor = 1;

        if (pSelect && pSelect.selectedIndex >= 0) {
            const perc = parseFloat(pSelect.options[pSelect.selectedIndex].getAttribute('data-perc')) || 0;
            purityFactor = perc / 100;
        }

        if (material === 'Gold') {
            const code = pSelect.value;
            const r = window._currentRates;
            // Use explicit rate if available, else derive from 22K (91.6)
            if (code === '24K') rateToUse = r.gold24K || (r.gold22K * (99.9/91.6));
            else if (code === '22K') rateToUse = r.gold22K;
            else if (code === '21K') rateToUse = r.gold21K || (r.gold22K * (87.5/91.6));
            else if (code === '20K') rateToUse = r.gold20K || (r.gold22K * (83.3/91.6));
            else if (code === '18K') rateToUse = r.gold18K || (r.gold22K * (75.0/91.6));
            else rateToUse = r.gold22K * (purityFactor / 0.916); // Custom gold purity fallback
            
        } else if (material === 'Silver') {
            rateToUse = window._currentRates.silver;
        } else if (material === 'Platinum') {
            rateToUse = window._currentRates.platinum;
        }

        document.getElementById('itemRate').value = rateToUse.toFixed(2);
        const value = Math.round(net * rateToUse * purityFactor);
        document.getElementById('itemValue').value = value;
    },

    addGoldItemToList: async function() {
        const form = document.getElementById('goldItemForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const btn = document.querySelector('#addGoldModal .btn-primary');
        let originalBtnText = 'Add Item';
        if (btn) {
            originalBtnText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Processing...';
        }

        try {
            const material = document.getElementById('itemMaterial').value;
            const type = document.getElementById('itemType').value;
            const desc = document.getElementById('itemDesc').value;
            const qty = parseInt(document.getElementById('itemQty').value) || 1;
            const valMethod = document.getElementById('itemValuationMethod').value;
            const finalValue = parseFloat(document.getElementById('itemValue').value) || 0;

            let itemPhotoData = null;
            if (this.currentPhotoFile) {
                try {
                    itemPhotoData = await Utils.compressImage(this.currentPhotoFile, 800, 800, 0.75);
                } catch (e) {
                    console.error("Photo compression failed", e);
                    Utils.showToast('Warning', 'Unable to process the image. The item will be saved without a photo.', 'warning');
                }
            }

            let item = {
                id: 'temp_' + Date.now(),
                material,
                type,
                description: desc,
                qty,
                valuationMethod: valMethod,
                itemPhoto: itemPhotoData,
                status: 'PLEDGED'
            };

        if (valMethod === 'CALCULATED') {
            const pSelect = document.getElementById('metalPurity');
            item.grossWeight = parseFloat(document.getElementById('metalGross').value) || 0;
            item.stoneWeight = parseFloat(document.getElementById('metalStone').value) || 0;
            item.netWeight = parseFloat(document.getElementById('metalNet').value) || 0;
            item.purity = pSelect ? pSelect.value : '';
            item.purityFactor = (pSelect && pSelect.selectedIndex >= 0) ? (parseFloat(pSelect.options[pSelect.selectedIndex].getAttribute('data-perc')) || 0) / 100 : 1;
            item.ratePerGram = parseFloat(document.getElementById('itemRate').value) || 0;
            item.calculatedValue = finalValue;
        } else {
            item.appraisedValue = finalValue;
            
            if (material === 'Other') {
                item.otherName = document.getElementById('otherName').value;
                item.weight = parseFloat(document.getElementById('otherWeight').value) || 0;
                item.weightUnit = document.getElementById('otherUnit').value;
            } else {
                item.caratWeight = parseFloat(document.getElementById('gemCarat').value) || 0;
                item.certificationNumber = document.getElementById('gemCertNo').value;
                
                if (material === 'Diamond') {
                    item.grade = document.getElementById('gemDiamondGrade').value;
                    item.color = document.getElementById('gemDiamondColor').value;
                    item.clarity = document.getElementById('gemDiamondClarity').value;
                    item.cut = document.getElementById('gemDiamondCut').value;
                    item.shape = document.getElementById('gemDiamondShape').value;
                } else if (material === 'Ruby') {
                    item.rubyType = document.getElementById('gemRubyType').value;
                    item.treatment = document.getElementById('gemRubyTreatment').value;
                } else if (material === 'Stone') {
                    item.stoneType = document.getElementById('gemStoneType').value;
                    item.treatment = document.getElementById('gemRubyTreatment').value;
                }
            }
        }

        this.tempGoldItems.push(item);
        
        // Reset photo state
        this.currentPhotoFile = null;
        
        document.getElementById('addGoldModal').remove();
        this.renderGoldItemsTable();
        
        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to add item', 'error');
        } finally {
            const btn = document.querySelector('#addGoldModal .btn-primary');
            if (btn) {
                btn.disabled = false;
                btn.textContent = originalBtnText;
            }
        }
    },

    removeGoldItem: function(id) {
        this.tempGoldItems = this.tempGoldItems.filter(i => i.id !== id);
        this.renderGoldItemsTable();
    },

    renderGoldItemsTable: async function() {
        const tbody = document.getElementById('goldItemsList');
        const totalsContainer = document.getElementById('materialTotalsContainer');
        
        if (this.tempGoldItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No items added yet.</td></tr>`;
            totalsContainer.style.display = 'none';
            this.updateEligibleLoan(0);
            return;
        }

        // Add Photo column header if not present
        const thead = tbody.previousElementSibling;
        if (thead && thead.querySelector('tr') && !thead.innerHTML.includes('Photo')) {
            const tr = thead.querySelector('tr');
            const th = document.createElement('th');
            th.textContent = 'Photo';
            tr.insertBefore(th, tr.children[1]); // insert after Item
        }

        let html = '';
        let grandTotalValue = 0;
        let materialTotals = { 'Gold': 0, 'Silver': 0, 'Platinum': 0, 'Diamond': 0, 'Ruby': 0, 'Stone': 0, 'Other': 0 };

        this.tempGoldItems.forEach(item => {
            const val = item.valuationMethod === 'CALCULATED' ? item.calculatedValue : item.appraisedValue;
            grandTotalValue += val;
            if (materialTotals[item.material] !== undefined) {
                materialTotals[item.material] += val;
            } else {
                materialTotals['Other'] += val;
            }

            let weightStr = '-';
            if (item.valuationMethod === 'CALCULATED') {
                weightStr = `N: ${item.netWeight.toFixed(2)}g`;
            } else if (item.caratWeight) {
                weightStr = `${item.caratWeight.toFixed(2)} ct`;
            } else if (item.weight) {
                weightStr = `${item.weight} ${item.weightUnit}`;
            }

            let purityStr = item.purity || '-';
            if (item.material === 'Diamond') purityStr = `${item.color||''} ${item.clarity||''} ${item.cut||''}`;
            if (item.material === 'Ruby' || item.material === 'Stone') purityStr = item.rubyType || item.stoneType || '-';
            if (item.material === 'Other') purityStr = item.otherName || '-';
            
            let photoHtml = item.itemPhoto ? `<img src="${item.itemPhoto.data}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="App.openPhotoViewer('${item.itemPhoto.data}', '${item.material}', '${item.type}')">` : '<span class="text-muted">—</span>';

            html += `
                <tr>
                    <td><strong>${item.material}</strong> - ${item.type} <br><small>${item.description||''}</small></td>
                    <td>${photoHtml}</td>
                    <td>${item.qty}</td>
                    <td>${weightStr}</td>
                    <td><small>${purityStr}</small></td>
                    <td><span class="badge ${item.valuationMethod === 'CALCULATED' ? 'badge-primary' : 'badge-warning'}">${item.valuationMethod}</span></td>
                    <td>${Utils.formatCurrency(val)}</td>
                    <td>
                        <button type="button" class="btn btn-icon btn-outline" style="color: var(--danger-color); padding: 4px 8px;" onclick="Loans.removeGoldItem('${item.id}')">
                            <svg style="width:16px; height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        
        // Render Totals
        let totalsHtml = `<div style="display:flex; flex-wrap:wrap; gap: 15px;">`;
        for (const [mat, val] of Object.entries(materialTotals)) {
            if (val > 0) {
                totalsHtml += `<div><strong>${mat}:</strong> ${Utils.formatCurrency(val)}</div>`;
            }
        }
        totalsHtml += `<div style="width:100%; font-size:1.1em; margin-top:10px; padding-top:10px; border-top:1px solid #ddd;"><strong>Total Pledged Value:</strong> <span class="text-success">${Utils.formatCurrency(grandTotalValue)}</span></div>`;
        totalsHtml += `</div>`;
        
        totalsContainer.innerHTML = totalsHtml;
        totalsContainer.style.display = 'block';
        
        this.updateEligibleLoan(grandTotalValue);
    },

    updateEligibleLoan: async function(grandTotalValue) {
        const ltv = (await Settings.get('ltvPercentage')) || 75;
        const eligible = Math.floor(grandTotalValue * (ltv / 100));
        
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
            
            // Generate Disbursement Receipt
            setTimeout(() => {
                App.navigate('receipts');
                setTimeout(() => {
                    const typeSelect = document.getElementById('rcpt_type');
                    const searchInput = document.getElementById('rcpt_search');
                    if (typeSelect && searchInput) {
                        typeSelect.value = 'disbursement';
                        searchInput.value = loanData.loanNumber;
                        if (window.Receipts) Receipts.generateReceipt();
                    }
                }, 400); // Wait for view to render
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
        
        const currentUser = Auth.getCurrentUser();
        const isSuperAdmin = currentUser && currentUser.role === 'SUPER_ADMIN';

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
                                ${isSuperAdmin ? '<th>Proc. Fee</th>' : ''}
                                <th>Balance Due</th>
                                <th>Total Paid</th>
                                <th>Fine Paid</th>
                                <th>Late Pay Note</th>
                                <th>Adjustment Amt</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="activeLoansTableBody">
                            <tr><td colspan="${isSuperAdmin ? 13 : 12}" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadActiveLoans();
    },

    loadActiveLoans: async function() {
        try {
            const currentUser = Auth.getCurrentUser();
            const isSuperAdmin = currentUser && currentUser.role === 'SUPER_ADMIN';
            
            const allLoans = await db.getAll('loans');
            // Show Active and Overdue
            const activeLoans = allLoans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');
            
            const tbody = document.getElementById('activeLoansTableBody');
            
            if (activeLoans.length === 0) {
                const colSpan = isSuperAdmin ? 13 : 12;
                tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted">No active loans found.</td></tr>`;
                return;
            }

            activeLoans.sort((a,b) => b.id - a.id);
            
            // Get customers for mapping
            const customers = await db.getAll('customers');
            const custMap = {};
            customers.forEach(c => custMap[c.id] = c.fullName);

            const penaltySetting = parseFloat(await Settings.get('latePenalty')) || 0;
            const targetDateStr = Utils.getISODate();

            let html = '';
            for (const loan of activeLoans) {
                const isOverdue = loan.status === 'OVERDUE';
                
                // Fetch payments for this loan to aggregate new fields
                const payments = await db.getByIndex('payments', 'loanId', loan.id);
                
                let totalDuePaid = 0;
                let totalPrincipalPaid = 0;
                let totalFinePaid = 0;
                let totalAdjustment = 0;
                let adjustmentCount = 0;
                let lastLateNote = '-';
                
                // Sort payments by date to get the latest note
                payments.sort((a,b) => new Date(a.paymentDate) - new Date(b.paymentDate));
                
                payments.forEach(p => {
                    totalDuePaid += (parseFloat(p.interestAmount) || 0);
                    totalPrincipalPaid += (parseFloat(p.principalAmount) || 0);
                    totalFinePaid += (parseFloat(p.fineAmount) || 0);
                    const adj = (parseFloat(p.adjustmentAmount) || 0);
                    if (adj > 0) {
                        totalAdjustment += adj;
                        adjustmentCount++;
                    }
                    if (p.lateNote && p.lateNote.trim() !== '') {
                        lastLateNote = p.lateNote;
                    }
                });
                
                const adjustmentText = adjustmentCount > 0 ? `${Utils.formatCurrency(totalAdjustment)} (${adjustmentCount}x)` : '-';

                // Calculate Balance Due
                let currentPrincipal = loan.principal - totalPrincipalPaid;
                const accruedTotal = Utils.calculateInterest(loan.principal, loan.interestRate, loan.loanDate, targetDateStr, loan.interestType || 'monthly');
                let penaltyAmount = 0;
                if (loan.dueDate && targetDateStr > loan.dueDate && currentPrincipal > 0) {
                    penaltyAmount = penaltySetting;
                }
                let currentAccrued = Math.max(0, accruedTotal - totalDuePaid) + penaltyAmount;
                
                // Apply adjustment
                let remainingAdjustment = totalAdjustment;
                if (remainingAdjustment > 0) {
                    if (currentAccrued >= remainingAdjustment) {
                        currentAccrued -= remainingAdjustment;
                    } else {
                        remainingAdjustment -= currentAccrued;
                        currentAccrued = 0;
                        currentPrincipal = Math.max(0, currentPrincipal - remainingAdjustment);
                    }
                }
                
                const balanceDue = currentPrincipal + currentAccrued;

                html += `
                    <tr>
                        <td><strong>${loan.loanNumber}</strong></td>
                        <td>${custMap[loan.customerId] || 'Unknown'}</td>
                        <td>${Utils.formatDate(loan.loanDate)}</td>
                        <td>${Utils.formatCurrency(loan.principal)}</td>
                        <td>${loan.interestRate}%</td>
                        ${isSuperAdmin ? `<td>${Utils.formatCurrency(loan.processingFeeAmount || 0)}</td>` : ''}
                        <td class="text-danger" style="font-weight:bold;">${Utils.formatCurrency(balanceDue)}</td>
                        <td class="text-success">${Utils.formatCurrency(totalDuePaid + totalPrincipalPaid + totalFinePaid)}</td>
                        <td class="text-danger">${Utils.formatCurrency(totalFinePaid)}</td>
                        <td><small>${lastLateNote}</small></td>
                        <td>${adjustmentText}</td>
                        <td><span class="badge ${isOverdue ? 'badge-danger' : 'badge-success'}">${loan.status}</span></td>
                        <td>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-sm btn-outline" onclick="App.navigate('payments'); setTimeout(()=>document.getElementById('paymentSearch').value='${loan.loanNumber}', 100);">Pay</button>
                                <button class="btn btn-sm btn-secondary" onclick="Loans.printSchedule(${loan.id})" title="Print Due Schedule">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                </button>
                                <button class="btn btn-sm" style="background:#25D366; color:white; border:none;" onclick="Loans.printSchedule(${loan.id}, true)" title="Send WhatsApp">
                                    WA
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            tbody.innerHTML = html;

        } catch (error) {
            console.error(error);
            const isSuperAdmin = Auth.getCurrentUser()?.role === 'SUPER_ADMIN';
            document.getElementById('activeLoansTableBody').innerHTML = `<tr><td colspan="${isSuperAdmin ? 13 : 12}" class="text-center text-danger">Error loading loans</td></tr>`;
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
    
    printSchedule: async function(loanId, isWhatsApp = false) {
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
                    if (isWhatsApp) {
                        Utils.shareToWhatsApp('printContainer', customer ? customer.mobile : '');
                        printContainer.innerHTML = '';
                    } else {
                        window.print();
                        setTimeout(() => {
                            printContainer.innerHTML = '';
                        }, 500);
                    }
                }, 100);
            }
            
        } catch (error) {
            console.error(error);
            Utils.showToast('Error', 'Failed to generate schedule', 'error');
        }
    }
};

window.Loans = Loans;
