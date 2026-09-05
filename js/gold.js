/**
 * Gold Inventory Module
 */

const Gold = {
    render: async function() {
        const container = document.getElementById('view-gold-inventory');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h2>Gold Inventory</h2>
            </div>
            
            <div class="dashboard-stats mb-4">
                <div class="stat-card">
                    <div class="stat-icon icon-gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
                    <div class="stat-details">
                        <div class="stat-title">Total Pledged Weight</div>
                        <div class="stat-value" id="gold_statPledged">0.00 g</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon icon-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
                    <div class="stat-details">
                        <div class="stat-title">Released Weight</div>
                        <div class="stat-value" id="gold_statReleased">0.00 g</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header flex-between">
                    <div class="search-bar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" id="goldSearch" placeholder="Search item, loan no..." onkeyup="Gold.filterTable()">
                    </div>
                    <select class="form-control" style="width: auto;" id="goldFilterStatus" onchange="Gold.filterTable()">
                        <option value="ALL">All Status</option>
                        <option value="PLEDGED" selected>Pledged Only</option>
                        <option value="RELEASED">Released Only</option>
                    </select>
                </div>
                <div class="table-responsive">
                    <table class="table" id="goldTable">
                        <thead>
                            <tr>
                                <th>Item details</th>
                                <th>Qty</th>
                                <th>Net Wt (g)</th>
                                <th>Purity</th>
                                <th>Loan No</th>
                                <th>Customer</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="goldTableBody">
                            <tr><td colspan="7" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.loadInventory();
    },

    loadInventory: async function() {
        try {
            const items = await db.getAll('goldItems');
            const loans = await db.getAll('loans');
            const customers = await db.getAll('customers');
            
            // Map for quick lookup
            const loanMap = {};
            loans.forEach(l => loanMap[l.id] = l);
            const custMap = {};
            customers.forEach(c => custMap[c.id] = c.fullName);

            const tbody = document.getElementById('goldTableBody');
            
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No gold items in inventory</td></tr>`;
                return;
            }

            let pledgedWt = 0;
            let releasedWt = 0;
            let html = '';

            items.sort((a,b) => b.id - a.id);

            items.forEach(item => {
                const loan = loanMap[item.loanId];
                const custName = loan ? custMap[loan.customerId] : 'Unknown';
                const loanNo = loan ? loan.loanNumber : 'Unknown';
                
                if (item.status === 'PLEDGED') pledgedWt += item.netWeight;
                if (item.status === 'RELEASED') releasedWt += item.netWeight;

                const badge = item.status === 'PLEDGED' ? 'badge-warning' : 'badge-success';

                html += `
                    <tr data-status="${item.status}">
                        <td><strong>${item.type}</strong><br><small class="text-muted">${item.description || ''}</small></td>
                        <td>${item.qty}</td>
                        <td>${item.netWeight.toFixed(2)}</td>
                        <td>${item.purity}</td>
                        <td>${loanNo}</td>
                        <td>${custName}</td>
                        <td><span class="badge ${badge}">${item.status}</span></td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
            
            document.getElementById('gold_statPledged').textContent = pledgedWt.toFixed(2) + ' g';
            document.getElementById('gold_statReleased').textContent = releasedWt.toFixed(2) + ' g';

            this.filterTable(); // Apply initial filter (PLEDGED)

        } catch (err) {
            console.error(err);
            document.getElementById('goldTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading inventory</td></tr>`;
        }
    },

    filterTable: function() {
        const textFilter = document.getElementById('goldSearch').value.toLowerCase();
        const statusFilter = document.getElementById('goldFilterStatus').value;
        const tbody = document.getElementById('goldTableBody');
        const trs = tbody.getElementsByTagName('tr');

        for (let i = 0; i < trs.length; i++) {
            if (trs[i].children.length === 1) continue; // Skip "No items" row
            
            const text = trs[i].textContent || trs[i].innerText;
            const status = trs[i].getAttribute('data-status');
            
            const textMatch = text.toLowerCase().indexOf(textFilter) > -1;
            const statusMatch = (statusFilter === 'ALL' || status === statusFilter);

            if (textMatch && statusMatch) {
                trs[i].style.display = "";
            } else {
                trs[i].style.display = "none";
            }
        }
    }
};

window.Gold = Gold;
