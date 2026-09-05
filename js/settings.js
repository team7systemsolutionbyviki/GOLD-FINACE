/**
 * Settings Module
 */

const Settings = {
    render: async function() {
        const container = document.getElementById('view-settings');
        if (!container) return;

        // Fetch current settings
        const settings = await db.getAll('settings');
        const config = {};
        settings.forEach(s => config[s.key] = s.value);

        container.innerHTML = `
            <div class="page-header">
                <h2>System Settings</h2>
                <button class="btn btn-primary" onclick="Settings.saveSettings()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save Settings</button>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h3>Company Information</h3>
                </div>
                <div class="card-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Company Name</label>
                            <input type="text" id="set_companyName" class="form-control" value="${config.companyName || ''}">
                        </div>
                        <div class="form-group">
                            <label>Company Address</label>
                            <input type="text" id="set_companyAddress" class="form-control" value="${config.companyAddress || ''}">
                        </div>
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="text" id="set_companyPhone" class="form-control" value="${config.companyPhone || ''}">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="set_companyEmail" class="form-control" value="${config.companyEmail || ''}">
                        </div>
                        <div class="form-group">
                            <label>GST Number</label>
                            <input type="text" id="set_companyGST" class="form-control" value="${config.companyGST || ''}">
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>Financial Rules</h3>
                </div>
                <div class="card-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Currency Symbol</label>
                            <input type="text" id="set_currencySymbol" class="form-control" value="${config.currencySymbol || '₹'}">
                        </div>
                        <div class="form-group">
                            <label>Gold Rate (24K) per Gram</label>
                            <input type="number" step="0.01" id="set_goldRate24K" class="form-control" value="${config.goldRate24K || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gold Rate (22K) per Gram</label>
                            <input type="number" step="0.01" id="set_goldRate22K" class="form-control" value="${config.goldRate22K || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gold Rate (21K) per Gram</label>
                            <input type="number" step="0.01" id="set_goldRate21K" class="form-control" value="${config.goldRate21K || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gold Rate (20K) per Gram</label>
                            <input type="number" step="0.01" id="set_goldRate20K" class="form-control" value="${config.goldRate20K || ''}">
                        </div>
                        <div class="form-group">
                            <label>Gold Rate (18K) per Gram</label>
                            <input type="number" step="0.01" id="set_goldRate18K" class="form-control" value="${config.goldRate18K || ''}">
                        </div>
                        <div class="form-group">
                            <label>Default Interest Rate (% per month)</label>
                            <input type="number" step="0.01" id="set_interestRate" class="form-control" value="${config.interestRate || ''}">
                        </div>
                        <div class="form-group">
                            <label>Default Interest Rate (% per week)</label>
                            <input type="number" step="0.01" id="set_interestRateWeekly" class="form-control" value="${config.interestRateWeekly || ''}">
                        </div>
                        <div class="form-group">
                            <label>Default Interest Rate (% per day)</label>
                            <input type="number" step="0.01" id="set_interestRateDaily" class="form-control" value="${config.interestRateDaily || ''}">
                        </div>
                        <div class="form-group">
                            <label>Default Interest Rate (% per year)</label>
                            <input type="number" step="0.01" id="set_interestRateYearly" class="form-control" value="${config.interestRateYearly || ''}">
                        </div>
                        <div class="form-group">
                            <label>Max LTV (Loan to Value %)</label>
                            <input type="number" step="0.01" id="set_ltvPercentage" class="form-control" value="${config.ltvPercentage || '75'}">
                        </div>
                        <div class="form-group">
                            <label>Processing Fee (%)</label>
                            <input type="number" step="0.01" id="set_processingFee" class="form-control" value="${config.processingFee || '1'}">
                        </div>
                        <div class="form-group">
                            <label>Late Penalty Amount (₹ per overdue loan)</label>
                            <input type="number" step="0.01" id="set_latePenalty" class="form-control" value="${config.latePenalty || '0'}">
                        </div>
                    </div>
                </div>
            </div>

            <div class="card mb-4">
                <div class="card-header">
                    <h3>ID Prefixes</h3>
                </div>
                <div class="card-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Customer Prefix</label>
                            <input type="text" id="set_customerPrefix" class="form-control" value="${config.customerPrefix || 'GF-CUST-'}">
                        </div>
                        <div class="form-group">
                            <label>Loan Prefix</label>
                            <input type="text" id="set_loanPrefix" class="form-control" value="${config.loanPrefix || 'GF-LOAN-'}">
                        </div>
                        <div class="form-group">
                            <label>Receipt Prefix</label>
                            <input type="text" id="set_receiptPrefix" class="form-control" value="${config.receiptPrefix || 'GF-REC-'}">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card mb-4 border-danger" style="border-color: var(--danger-color);">
                <div class="card-header">
                    <h3 class="text-danger">Danger Zone</h3>
                </div>
                <div class="card-body">
                    <p class="text-muted mb-4">Demo data generation for testing purposes. Do not use in production.</p>
                    <button class="btn btn-warning" onclick="Settings.generateDemoData()">Generate Demo Data</button>
                </div>
            </div>
        `;
    },

    saveSettings: async function() {
        const keys = [
            'companyName', 'companyAddress', 'companyPhone', 'companyEmail', 'companyGST',
            'currencySymbol', 'goldRate24K', 'goldRate22K', 'goldRate21K', 'goldRate20K', 'goldRate18K', 'interestRate', 'interestRateWeekly', 
            'interestRateDaily', 'interestRateYearly', 'ltvPercentage', 'processingFee', 'latePenalty',
            'customerPrefix', 'loanPrefix', 'receiptPrefix'
        ];

        try {
            for (const key of keys) {
                const el = document.getElementById(`set_${key}`);
                if (el) {
                    await db.put('settings', { key: key, value: el.value, updatedAt: new Date().toISOString() });
                }
            }
            
            // Update UI dynamically where needed
            document.getElementById('companyNameSidebar').textContent = document.getElementById('set_companyName').value;
            
            await db.logAudit('UPDATE', 'Settings', 'SYSTEM', 'Updated system settings');
            Utils.showToast('Success', 'Settings saved successfully', 'success');
        } catch (error) {
            console.error(error);
            Utils.showToast('Error', 'Failed to save settings', 'error');
        }
    },
    
    // Quick helper to fetch a specific setting
    get: async function(key) {
        const setting = await db.get('settings', key);
        return setting ? setting.value : null;
    },
    
    // Generate some demo data for testing
    generateDemoData: async function() {
        Utils.confirmDialog('Generate Demo Data', 'This will add dummy customers and loans. Proceed?', async () => {
            try {
                // Add a dummy customer
                const custPrefix = await this.get('customerPrefix') || 'CUST-';
                const custIdStr = custPrefix + 'DEMO-' + Math.floor(Math.random() * 1000);
                
                const customer = {
                    customerCode: custIdStr,
                    fullName: 'Demo Customer ' + Math.floor(Math.random() * 100),
                    mobile: '9876543' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
                    address: '123 Demo Street, Tech City',
                    createdAt: new Date().toISOString()
                };
                
                const custId = await db.add('customers', customer);
                
                // Add dummy loan
                const loanPrefix = await this.get('loanPrefix') || 'LOAN-';
                const loanIdStr = loanPrefix + 'DEMO-' + Math.floor(Math.random() * 1000);
                
                const loan = {
                    loanNumber: loanIdStr,
                    customerId: custId,
                    loanDate: Utils.getISODate(),
                    dueDate: Utils.getISODate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)), // 6 months
                    principal: 50000,
                    interestRate: 2,
                    status: 'ACTIVE'
                };
                
                const lId = await db.add('loans', loan);
                
                // Add gold item
                const goldItem = {
                    loanId: lId,
                    type: 'Chain',
                    grossWeight: 15.5,
                    netWeight: 15.0,
                    purity: '22K',
                    status: 'PLEDGED'
                };
                
                await db.add('goldItems', goldItem);
                
                Utils.showToast('Success', 'Demo data created', 'success');
            } catch (err) {
                console.error(err);
                Utils.showToast('Error', 'Failed to create demo data', 'error');
            }
        });
    }
};

window.Settings = Settings;
