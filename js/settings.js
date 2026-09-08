/**
 * Settings Module
 */

const Settings = {
    render: async function() {
        const container = document.getElementById('view-settings');
        if (!container) return;

        const currentUser = Auth.getCurrentUser();
        // Security check - SUPER_ADMIN and ADMIN can view this page
        if (!currentUser || !['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role)) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body text-center" style="padding: 50px;">
                        <h2 class="text-danger">Access Denied</h2>
                        <p class="text-muted">Only the Super Administrator can access Settings.</p>
                    </div>
                </div>
            `;
            return;
        }

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
                            <label>Silver Rate per Gram</label>
                            <input type="number" step="0.01" id="set_silverRate" class="form-control" value="${config.silverRate || ''}">
                        </div>
                        <div class="form-group">
                            <label>Platinum Rate per Gram</label>
                            <input type="number" step="0.01" id="set_platinumRate" class="form-control" value="${config.platinumRate || ''}">
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
            
            <div class="card mb-4">
                <div class="card-header">
                    <h3>Material Configurations</h3>
                </div>
                <div class="card-body" id="materialConfigContainer">
                    <p class="text-muted">Loading configurations...</p>
                </div>
            </div>
            
            ${currentUser.role === 'SUPER_ADMIN' ? `
            <div class="card mb-4 border-danger" style="border-color: var(--danger-color);">
                <div class="card-header flex-between">
                    <h3 class="text-danger">Danger Zone</h3>
                    <span class="badge badge-danger">ONLY SUPER ADMIN CAN SEE THIS</span>
                </div>
                <div class="card-body">
                    <p class="text-muted mb-4">Demo data generation for testing purposes. Do not use in production.</p>
                    <button class="btn btn-warning" onclick="Settings.generateDemoData()">Generate Demo Data</button>
                </div>
            </div>
            ` : ''}
        `;
        
        await Settings.renderMaterialConfigs();
    },

    saveSettings: async function() {
        const keys = [
            'companyName', 'companyAddress', 'companyPhone', 'companyEmail', 'companyGST',
            'currencySymbol', 'goldRate24K', 'goldRate22K', 'goldRate21K', 'goldRate20K', 'goldRate18K', 'silverRate', 'platinumRate', 'interestRate', 'interestRateWeekly', 
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
                    material: 'Gold',
                    type: 'Chain',
                    grossWeight: 15.5,
                    stoneWeight: 0.5,
                    netWeight: 15.0,
                    purity: '22K',
                    purityFactor: 0.916,
                    ratePerGram: 5000,
                    valuationMethod: 'CALCULATED',
                    calculatedValue: 75000,
                    status: 'PLEDGED'
                };
                
                await db.add('goldItems', goldItem);
                
                Utils.showToast('Success', 'Demo data created', 'success');
            } catch (err) {
                console.error(err);
                Utils.showToast('Error', 'Failed to create demo data', 'error');
            }
        });
    },

    // Material Configuration logic
    defaultConfigs: {
        'goldPurities': [
            { code: '24K', percentage: 99.9, label: '24K (99.9%)', active: true },
            { code: '22K', percentage: 91.6, label: '22K (91.6%)', active: true },
            { code: '21K', percentage: 87.5, label: '21K (87.5%)', active: true },
            { code: '20K', percentage: 83.3, label: '20K (83.3%)', active: true },
            { code: '18K', percentage: 75.0, label: '18K (75.0%)', active: true },
            { code: '14K', percentage: 58.5, label: '14K (58.5%)', active: true }
        ],
        'silverPurities': [
            { code: '999', percentage: 99.9, label: '999 (99.9%)', active: true },
            { code: '925', percentage: 92.5, label: '925 (92.5%)', active: true },
            { code: '800', percentage: 80.0, label: '800 (80.0%)', active: true }
        ],
        'platinumPurities': [
            { code: '999', percentage: 99.9, label: '999 (99.9%)', active: true },
            { code: '950', percentage: 95.0, label: '950 (95.0%)', active: true },
            { code: '900', percentage: 90.0, label: '900 (90.0%)', active: true }
        ],
        'diamondGrades': [
            { code: 'Natural', label: 'Natural', active: true },
            { code: 'Lab-Grown', label: 'Lab-Grown', active: true },
            { code: 'Other', label: 'Other', active: true }
        ],
        'diamondColors': [
            { code: 'D', label: 'D', active: true }, { code: 'E', label: 'E', active: true },
            { code: 'F', label: 'F', active: true }, { code: 'G', label: 'G', active: true },
            { code: 'H', label: 'H', active: true }, { code: 'I', label: 'I', active: true },
            { code: 'J', label: 'J', active: true }, { code: 'Fancy', label: 'Fancy', active: true },
            { code: 'Other', label: 'Other', active: true }
        ],
        'diamondClarities': [
            { code: 'FL', label: 'FL', active: true }, { code: 'IF', label: 'IF', active: true },
            { code: 'VVS1', label: 'VVS1', active: true }, { code: 'VVS2', label: 'VVS2', active: true },
            { code: 'VS1', label: 'VS1', active: true }, { code: 'VS2', label: 'VS2', active: true },
            { code: 'SI1', label: 'SI1', active: true }, { code: 'SI2', label: 'SI2', active: true },
            { code: 'I1', label: 'I1', active: true }, { code: 'I2', label: 'I2', active: true },
            { code: 'I3', label: 'I3', active: true }, { code: 'Other', label: 'Other', active: true }
        ],
        'diamondCuts': [
            { code: 'Excellent', label: 'Excellent', active: true }, { code: 'Very Good', label: 'Very Good', active: true },
            { code: 'Good', label: 'Good', active: true }, { code: 'Fair', label: 'Fair', active: true },
            { code: 'Poor', label: 'Poor', active: true }, { code: 'Not Applicable', label: 'Not Applicable', active: true }
        ],
        'diamondShapes': [
            { code: 'Round', label: 'Round', active: true }, { code: 'Princess', label: 'Princess', active: true },
            { code: 'Cushion', label: 'Cushion', active: true }, { code: 'Oval', label: 'Oval', active: true },
            { code: 'Emerald', label: 'Emerald', active: true }, { code: 'Pear', label: 'Pear', active: true },
            { code: 'Marquise', label: 'Marquise', active: true }, { code: 'Radiant', label: 'Radiant', active: true },
            { code: 'Asscher', label: 'Asscher', active: true }, { code: 'Heart', label: 'Heart', active: true },
            { code: 'Other', label: 'Other', active: true }
        ],
        'rubyTypes': [
            { code: 'Natural', label: 'Natural', active: true }, { code: 'Synthetic', label: 'Synthetic', active: true },
            { code: 'Lab-Grown', label: 'Lab-Grown', active: true }, { code: 'Other', label: 'Other', active: true }
        ],
        'rubyTreatments': [
            { code: 'Untreated', label: 'Untreated', active: true }, { code: 'Heated', label: 'Heated', active: true },
            { code: 'Filled', label: 'Filled', active: true }, { code: 'Unknown', label: 'Unknown', active: true },
            { code: 'Other', label: 'Other', active: true }
        ],
        'stoneTypes': [
            { code: 'Emerald', label: 'Emerald', active: true }, { code: 'Sapphire', label: 'Sapphire', active: true },
            { code: 'Amethyst', label: 'Amethyst', active: true }, { code: 'Topaz', label: 'Topaz', active: true },
            { code: 'Garnet', label: 'Garnet', active: true }, { code: 'Pearl', label: 'Pearl', active: true },
            { code: 'Other', label: 'Other', active: true }
        ]
    },

    getMaterialConfig: async function(type) {
        let config = await db.get('materialConfigs', type);
        if (!config) {
            config = { type: type, values: this.defaultConfigs[type] || [] };
            await db.put('materialConfigs', config);
        }
        return config.values;
    },

    renderMaterialConfigs: async function() {
        const container = document.getElementById('materialConfigContainer');
        if (!container) return;
        
        let html = '';
        const configsToRender = [
            { type: 'goldPurities', title: 'Gold Purities', hasPercentage: true },
            { type: 'silverPurities', title: 'Silver Purities', hasPercentage: true },
            { type: 'platinumPurities', title: 'Platinum Purities', hasPercentage: true },
            { type: 'diamondGrades', title: 'Diamond Grades', hasPercentage: false },
            { type: 'diamondColors', title: 'Diamond Colors', hasPercentage: false },
            { type: 'diamondClarities', title: 'Diamond Clarities', hasPercentage: false },
            { type: 'diamondCuts', title: 'Diamond Cuts', hasPercentage: false },
            { type: 'diamondShapes', title: 'Diamond Shapes', hasPercentage: false },
            { type: 'rubyTypes', title: 'Ruby Types', hasPercentage: false },
            { type: 'rubyTreatments', title: 'Ruby Treatments', hasPercentage: false },
            { type: 'stoneTypes', title: 'Stone Types', hasPercentage: false }
        ];

        for (const conf of configsToRender) {
            const values = await this.getMaterialConfig(conf.type);
            html += this.buildConfigTable(conf.type, conf.title, values, conf.hasPercentage);
        }
        
        container.innerHTML = html;
    },

    buildConfigTable: function(type, title, values, hasPercentage) {
        let rowsHtml = '';
        values.forEach((v, index) => {
            rowsHtml += `
                <tr data-index="${index}">
                    <td><input type="text" class="form-control form-control-sm config-code" value="${v.code}"></td>
                    ${hasPercentage ? `<td><input type="number" step="0.01" class="form-control form-control-sm config-perc" value="${v.percentage}"></td>` : ''}
                    <td><input type="text" class="form-control form-control-sm config-label" value="${v.label}"></td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="config-active" ${v.active ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td><button class="btn btn-sm btn-outline text-danger" onclick="this.closest('tr').remove()" title="Remove (if never used)">&times;</button></td>
                </tr>
            `;
        });
        
        return `
            <div class="config-section mb-4" id="config_section_${type}">
                <h4>${title}</h4>
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Code/Value</th>
                            ${hasPercentage ? '<th>Percentage (%)</th>' : ''}
                            <th>Label/Display</th>
                            <th>Active</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="tbody_${type}">
                        ${rowsHtml}
                    </tbody>
                </table>
                <button class="btn btn-sm btn-secondary mt-2" onclick="Settings.addConfigRow('${type}', ${hasPercentage})">+ Add Row</button>
            </div>
        `;
    },

    addConfigRow: function(type, hasPercentage) {
        const tbody = document.getElementById(`tbody_${type}`);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm config-code" value=""></td>
            ${hasPercentage ? `<td><input type="number" step="0.01" class="form-control form-control-sm config-perc" value=""></td>` : ''}
            <td><input type="text" class="form-control form-control-sm config-label" value=""></td>
            <td>
                <label class="switch">
                    <input type="checkbox" class="config-active" checked>
                    <span class="slider"></span>
                </label>
            </td>
            <td><button class="btn btn-sm btn-outline text-danger" onclick="this.closest('tr').remove()">&times;</button></td>
        `;
        tbody.appendChild(tr);
    },

    saveMaterialConfigs: async function() {
        const sections = document.querySelectorAll('.config-section');
        for (const section of sections) {
            const type = section.id.replace('config_section_', '');
            const hasPercentage = section.querySelector('thead').innerHTML.includes('Percentage');
            const rows = section.querySelectorAll('tbody tr');
            
            const values = [];
            rows.forEach(row => {
                const code = row.querySelector('.config-code').value.trim();
                const label = row.querySelector('.config-label').value.trim();
                const active = row.querySelector('.config-active').checked;
                if (!code) return; // Skip empty
                
                const item = { code, label, active };
                if (hasPercentage) {
                    item.percentage = parseFloat(row.querySelector('.config-perc').value) || 0;
                }
                values.push(item);
            });
            
            await db.put('materialConfigs', { type, values });
        }
    }
};

// Override saveSettings to include saveMaterialConfigs
const originalSaveSettings = Settings.saveSettings;
Settings.saveSettings = async function() {
    await originalSaveSettings.call(Settings);
    try {
        await Settings.saveMaterialConfigs();
        console.log('Material configs saved');
    } catch(err) {
        console.error('Failed to save material configs', err);
    }
};

window.Settings = Settings;
