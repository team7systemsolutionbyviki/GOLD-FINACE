/**
 * Customer Management Module
 */

const Customers = {
    render: async function() {
        const container = document.getElementById('view-customers');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h2>Customer Management</h2>
                <button class="btn btn-primary" onclick="Customers.openCustomerModal()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add New Customer</button>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="customerSearch" placeholder="Search by name, ID or mobile..." onkeyup="Customers.filterTable()">
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table" id="customersTable">
                        <thead>
                            <tr>
                                <th>Customer ID</th>
                                <th>Full Name</th>
                                <th>Mobile</th>
                                <th>City</th>
                                <th>ID Proof</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customersTableBody">
                            <tr><td colspan="6" class="text-center">Loading customers...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadCustomers();
    },

    loadCustomers: async function() {
        try {
            const customers = await db.getAll('customers');
            const tbody = document.getElementById('customersTableBody');
            
            if (customers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No customers found. Click 'Add New Customer' to begin.</td></tr>`;
                return;
            }

            // Sort newest first
            customers.sort((a, b) => b.id - a.id);

            let html = '';
            customers.forEach(c => {
                html += `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <img src="${c.customerPhoto || 'assets/default-avatar.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: #eee;">
                                <strong>${c.customerCode}</strong>
                            </div>
                        </td>
                        <td>${c.fullName}</td>
                        <td>${c.mobile}</td>
                        <td>${c.city || '-'}</td>
                        <td>${c.idProofType || '-'}</td>
                        <td class="action-btns">
                            <button class="btn btn-icon btn-outline" title="View/Edit" onclick="Customers.editCustomer(${c.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                            <button class="btn btn-icon btn-outline text-success" title="Financials & Dues" onclick="Customers.openFinancialsModal(${c.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </button>
                            <button class="btn btn-icon btn-outline text-danger" title="Delete" onclick="Customers.deleteCustomer(${c.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        } catch (err) {
            console.error(err);
            document.getElementById('customersTableBody').innerHTML = `<tr><td colspan="6" class="text-danger text-center">Error loading customers</td></tr>`;
        }
    },

    filterTable: function() {
        const input = document.getElementById('customerSearch');
        const filter = input.value.toLowerCase();
        const tbody = document.getElementById('customersTableBody');
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

    openCustomerModal: async function(customerId = null) {
        let customer = null;
        let isEdit = false;
        
        if (customerId) {
            customer = await db.get('customers', customerId);
            isEdit = true;
        } else {
            // Generate New Code
            const prefix = (await Settings.get('customerPrefix')) || 'GF-CUST-';
            const count = (await db.getAll('customers')).length + 1;
            customer = { customerCode: prefix + String(count).padStart(6, '0') };
        }

        const modalId = 'customerModal';
        const html = `
            <div class="modal-overlay active" id="${modalId}">
                <div class="modal modal-lg">
                    <div class="modal-header">
                        <h3>${isEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
                        <button type="button" class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="customerForm">
                            <input type="hidden" id="custId" value="${isEdit ? customer.id : ''}">
                            
                            <h4 class="mb-2">Personal Information</h4>
                            <div class="form-grid mb-4">
                                <div class="form-group" style="grid-column: 1 / -1; display: flex; gap: 20px; align-items: center;">
                                    <div>
                                        <img id="custPhotoPreview" src="${customer.customerPhoto || 'assets/default-avatar.png'}" alt="Photo" style="width: 100px; height: 100px; object-fit: cover; border-radius: 50%; border: 2px solid var(--border-color); background: #eee; display: block; margin-bottom: 10px;">
                                        <input type="file" id="custPhotoInput" accept="image/*" style="display: none;" onchange="Customers.handleFileUpload(event, 'custPhotoPreview')">
                                        <button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('custPhotoInput').click()">Upload Photo</button>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Customer ID (Auto)</label>
                                    <input type="text" id="custCode" class="form-control" value="${customer.customerCode || ''}" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Full Name *</label>
                                    <input type="text" id="custName" class="form-control" value="${customer.fullName || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Father/Husband Name</label>
                                    <input type="text" id="custGuardian" class="form-control" value="${customer.guardianName || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Date of Birth</label>
                                    <input type="date" id="custDob" class="form-control" value="${customer.dob || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Gender</label>
                                    <select id="custGender" class="form-control">
                                        <option value="Male" ${customer.gender === 'Male' ? 'selected' : ''}>Male</option>
                                        <option value="Female" ${customer.gender === 'Female' ? 'selected' : ''}>Female</option>
                                        <option value="Other" ${customer.gender === 'Other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                            </div>

                            <h4 class="mb-2">Contact Details</h4>
                            <div class="form-grid mb-4">
                                <div class="form-group">
                                    <label>Mobile Number *</label>
                                    <input type="tel" id="custMobile" class="form-control" value="${customer.mobile || ''}" required pattern="[0-9]{10}">
                                </div>
                                <div class="form-group">
                                    <label>Alternate Mobile</label>
                                    <input type="tel" id="custAltMobile" class="form-control" value="${customer.altMobile || ''}">
                                </div>
                                <div class="form-group" style="grid-column: 1 / -1;">
                                    <label>Address</label>
                                    <textarea id="custAddress" class="form-control" rows="2">${customer.address || ''}</textarea>
                                </div>
                                <div class="form-group">
                                    <label>City</label>
                                    <input type="text" id="custCity" class="form-control" value="${customer.city || ''}">
                                </div>
                                <div class="form-group">
                                    <label>State</label>
                                    <input type="text" id="custState" class="form-control" value="${customer.state || ''}">
                                </div>
                                <div class="form-group">
                                    <label>PIN Code</label>
                                    <input type="text" id="custPin" class="form-control" value="${customer.pinCode || ''}">
                                </div>
                            </div>

                            <h4 class="mb-2">KYC Details</h4>
                            <div class="form-grid mb-4">
                                <div class="form-group">
                                    <label>ID Proof Type</label>
                                    <select id="custIdType" class="form-control">
                                        <option value="Aadhaar" ${customer.idProofType === 'Aadhaar' ? 'selected' : ''}>Aadhaar Card</option>
                                        <option value="PAN" ${customer.idProofType === 'PAN' ? 'selected' : ''}>PAN Card</option>
                                        <option value="Voter ID" ${customer.idProofType === 'Voter ID' ? 'selected' : ''}>Voter ID</option>
                                        <option value="Driving License" ${customer.idProofType === 'Driving License' ? 'selected' : ''}>Driving License</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>ID Proof Number</label>
                                    <input type="text" id="custIdNumber" class="form-control" value="${customer.idProofNumber || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Upload ID Document</label>
                                    <input type="file" id="custIdDocInput" accept="image/*" class="form-control" style="margin-bottom: 10px;" onchange="Customers.handleFileUpload(event, 'custIdDocPreview')">
                                    <img id="custIdDocPreview" src="${customer.idDocumentPhoto || ''}" style="max-width: 200px; max-height: 150px; border-radius: var(--radius-sm); display: ${customer.idDocumentPhoto ? 'block' : 'none'}; border: 1px solid var(--border-color);">
                                </div>
                                <div class="form-group">
                                    <label>Upload Secondary ID (Optional)</label>
                                    <input type="file" id="custSecIdDocInput" accept="image/*" class="form-control" style="margin-bottom: 10px;" onchange="Customers.handleFileUpload(event, 'custSecIdDocPreview')">
                                    <img id="custSecIdDocPreview" src="${customer.idSecondaryDocumentPhoto || ''}" style="max-width: 200px; max-height: 150px; border-radius: var(--radius-sm); display: ${customer.idSecondaryDocumentPhoto ? 'block' : 'none'}; border: 1px solid var(--border-color);">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="Customers.saveCustomer()">${isEdit ? 'Update Customer' : 'Save Customer'}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    editCustomer: function(id) {
        this.openCustomerModal(id);
    },

    handleFileUpload: function(event, targetImgId) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(targetImgId);
            img.src = e.target.result;
            img.style.display = 'block';
        };
        reader.readAsDataURL(file);
    },

    saveCustomer: async function() {
        const form = document.getElementById('customerForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = document.getElementById('custId').value;
        const customerData = {
            customerCode: document.getElementById('custCode').value,
            fullName: document.getElementById('custName').value,
            guardianName: document.getElementById('custGuardian').value,
            dob: document.getElementById('custDob').value,
            gender: document.getElementById('custGender').value,
            mobile: document.getElementById('custMobile').value,
            altMobile: document.getElementById('custAltMobile').value,
            address: document.getElementById('custAddress').value,
            city: document.getElementById('custCity').value,
            state: document.getElementById('custState').value,
            pinCode: document.getElementById('custPin').value,
            idProofType: document.getElementById('custIdType').value,
            idProofNumber: document.getElementById('custIdNumber').value,
            updatedAt: new Date().toISOString()
        };

        // Extract base64 photos if they exist and are not default
        const photoSrc = document.getElementById('custPhotoPreview').getAttribute('src');
        if (photoSrc && photoSrc.startsWith('data:image')) {
            customerData.customerPhoto = photoSrc;
        }

        const idDocSrc = document.getElementById('custIdDocPreview').getAttribute('src');
        if (idDocSrc && idDocSrc.startsWith('data:image')) {
            customerData.idDocumentPhoto = idDocSrc;
        }

        const secIdDocSrc = document.getElementById('custSecIdDocPreview').getAttribute('src');
        if (secIdDocSrc && secIdDocSrc.startsWith('data:image')) {
            customerData.idSecondaryDocumentPhoto = secIdDocSrc;
        }

        try {
            if (id) {
                // Update
                customerData.id = parseInt(id);
                // Preserve createdAt
                const existing = await db.get('customers', parseInt(id));
                customerData.createdAt = existing.createdAt;
                await db.put('customers', customerData);
                await db.logAudit('UPDATE', 'Customers', id, 'Updated customer ' + customerData.customerCode);
                Utils.showToast('Success', 'Customer updated successfully', 'success');
            } else {
                // Add
                customerData.createdAt = new Date().toISOString();
                const newId = await db.add('customers', customerData);
                await db.logAudit('CREATE', 'Customers', newId, 'Created customer ' + customerData.customerCode);
                Utils.showToast('Success', 'Customer added successfully', 'success');
            }
            
            document.getElementById('customerModal').remove();
            this.loadCustomers();
            
        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to save customer', 'error');
        }
    },

    openFinancialsModal: async function(customerId) {
        try {
            const customer = await db.get('customers', customerId);
            const allLoans = await db.getByIndex('loans', 'customerId', customerId);
            const activeLoans = allLoans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE');
            
            let totalPrincipalOutstanding = 0;
            let totalInterestOutstanding = 0;
            let loanRows = '';
            let loanOptions = '';

            const today = Utils.getISODate();

            for (const loan of activeLoans) {
                const payments = await db.getByIndex('payments', 'loanId', loan.id);
                
                // Calculate Paid Amounts
                const principalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.principalAmount) || 0), 0);
                const interestPaid = payments.reduce((sum, p) => sum + (parseFloat(p.interestAmount) || 0), 0);
                
                // Calculate Outstanding
                const outPrincipal = Math.max(0, loan.principal - principalPaid);
                const accruedInterest = Utils.calculateInterest(loan.principal, loan.interestRate, loan.loanDate, today, loan.interestType || 'monthly');
                const outInterest = Math.max(0, accruedInterest - interestPaid);
                
                totalPrincipalOutstanding += outPrincipal;
                totalInterestOutstanding += outInterest;
                
                loanRows += `
                    <tr>
                        <td>${loan.loanNumber}</td>
                        <td>${Utils.formatCurrency(outPrincipal)}</td>
                        <td>${Utils.formatCurrency(outInterest)}</td>
                        <td><strong>${Utils.formatCurrency(outPrincipal + outInterest)}</strong></td>
                    </tr>
                `;
                
                loanOptions += `<option value="${loan.id}">${loan.loanNumber} (Due: ${Utils.formatCurrency(outPrincipal + outInterest)})</option>`;
            }

            if (activeLoans.length === 0) {
                loanRows = `<tr><td colspan="4" class="text-center text-muted">No active or overdue loans.</td></tr>`;
                loanOptions = `<option value="">No active loans</option>`;
            }

            const modalId = 'financialsModal';
            const html = `
                <div class="modal-overlay active" id="${modalId}">
                    <div class="modal modal-lg">
                        <div class="modal-header">
                            <h3>Financial Overview: ${customer.fullName}</h3>
                            <button type="button" class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            
                            <!-- Summary Cards -->
                            <div class="dashboard-stats" style="margin-bottom: 20px;">
                                <div class="stat-card" style="padding: 15px;">
                                    <div class="stat-details">
                                        <div class="stat-title">Total Standing Balance</div>
                                        <div class="stat-value text-danger">${Utils.formatCurrency(totalPrincipalOutstanding + totalInterestOutstanding)}</div>
                                    </div>
                                </div>
                                <div class="stat-card" style="padding: 15px;">
                                    <div class="stat-details">
                                        <div class="stat-title">Principal Due</div>
                                        <div class="stat-value" style="font-size: 18px;">${Utils.formatCurrency(totalPrincipalOutstanding)}</div>
                                    </div>
                                </div>
                                <div class="stat-card" style="padding: 15px;">
                                    <div class="stat-details">
                                        <div class="stat-title">Interest Due</div>
                                        <div class="stat-value" style="font-size: 18px;">${Utils.formatCurrency(totalInterestOutstanding)}</div>
                                    </div>
                                </div>
                            </div>

                            <h4 class="mb-2">Active Due Records</h4>
                            <div class="table-responsive mb-4" style="border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                                <table class="table">
                                    <thead style="background: var(--bg-color);">
                                        <tr>
                                            <th>Loan Number</th>
                                            <th>Outstanding Principal</th>
                                            <th>Outstanding Interest</th>
                                            <th>Total Due</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${loanRows}
                                    </tbody>
                                </table>
                            </div>

                            <h4 class="mb-2">Make Manual Adjustment</h4>
                            <div class="card" style="padding: 15px; border: 1px solid var(--border-color); background: var(--bg-color);">
                                <form id="adjustmentForm" onsubmit="event.preventDefault(); Customers.saveManualAdjustment(${customerId}, '${modalId}');">
                                    <div class="form-grid">
                                        <div class="form-group">
                                            <label>Select Loan *</label>
                                            <select id="adj_loanId" class="form-control" required ${activeLoans.length === 0 ? 'disabled' : ''}>
                                                ${loanOptions}
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label>Adjustment Type *</label>
                                            <select id="adj_type" class="form-control" required>
                                                <option value="discount">Discount / Waive Interest</option>
                                                <option value="penalty">Add Penalty / Extra Charge</option>
                                            </select>
                                        </div>
                                        <div class="form-group">
                                            <label>Amount (₹) *</label>
                                            <input type="number" id="adj_amount" class="form-control" required min="1">
                                        </div>
                                        <div class="form-group">
                                            <label>Remarks</label>
                                            <input type="text" id="adj_remarks" class="form-control" placeholder="Reason for adjustment">
                                        </div>
                                    </div>
                                    <div class="text-right mt-3">
                                        <button type="submit" class="btn btn-primary" ${activeLoans.length === 0 ? 'disabled' : ''}>Apply Adjustment</button>
                                    </div>
                                </form>
                            </div>

                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to load financial records', 'error');
        }
    },

    saveManualAdjustment: async function(customerId, modalId) {
        const loanId = document.getElementById('adj_loanId').value;
        const type = document.getElementById('adj_type').value;
        const amount = parseFloat(document.getElementById('adj_amount').value) || 0;
        const remarks = document.getElementById('adj_remarks').value || 'Manual Adjustment';
        
        if (!loanId || amount <= 0) return;
        
        const timestamp = Date.now();
        const paymentData = {
            receiptNumber: 'ADJ-' + timestamp,
            loanId: parseInt(loanId),
            customerId: customerId,
            paymentDate: Utils.getISODate(),
            principalAmount: 0,
            interestAmount: 0,
            discountAmount: 0,
            totalAmount: 0,
            paymentMode: 'CASH', // Internal adjustment
            referenceNumber: 'ADJUSTMENT',
            remarks: remarks,
            createdAt: new Date().toISOString()
        };

        if (type === 'discount') {
            // A discount reduces the outstanding balance.
            // By logging it as "interestPaid" (interestAmount), it reduces the effective interest due.
            // Alternatively, it can be tracked in discountAmount, but logging it directly in interestAmount is cleanest for existing calculations.
            paymentData.interestAmount = amount;
            paymentData.discountAmount = amount; 
        } else if (type === 'penalty') {
            // A penalty increases the outstanding balance.
            // We log it as a negative paid amount, so Math.max(0, total - paid) will increase.
            paymentData.interestAmount = -amount;
        }

        try {
            await db.add('payments', paymentData);
            await db.logAudit('CREATE', 'Adjustment', paymentData.receiptNumber, `Manual ${type} of ${amount} for loan ${loanId}`);
            
            Utils.showToast('Success', 'Adjustment applied successfully!', 'success');
            
            // Refresh modal by closing and reopening
            document.getElementById(modalId).remove();
            this.openFinancialsModal(customerId);
            
        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to apply adjustment', 'error');
        }
    },

    deleteCustomer: function(id) {
        // Only allow if no active loans
        Utils.confirmDialog('Delete Customer', 'Are you sure you want to delete this customer? This action cannot be undone.', async () => {
            try {
                // Check for loans first
                const loans = await db.getByIndex('loans', 'customerId', id);
                if (loans.length > 0) {
                    Utils.showToast('Error', 'Cannot delete customer with existing loans.', 'error');
                    return;
                }
                
                await db.delete('customers', id);
                await db.logAudit('DELETE', 'Customers', id, 'Deleted customer');
                Utils.showToast('Success', 'Customer deleted successfully', 'success');
                this.loadCustomers();
            } catch (err) {
                console.error(err);
                Utils.showToast('Error', 'Failed to delete customer', 'error');
            }
        });
    }
};

window.Customers = Customers;
