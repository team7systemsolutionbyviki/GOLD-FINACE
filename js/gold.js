/**
 * Gold Inventory Module
 */

const Gold = {
    render: async function() {
        const container = document.getElementById('view-gold-inventory');
        if (!container) return;

        container.innerHTML = `
            <div class="page-header">
                <h2>Item Inventory</h2>
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
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <select class="form-control" style="width: auto;" id="goldFilterStatus" onchange="Gold.filterTable()">
                            <option value="ALL">All Status</option>
                            <option value="PLEDGED" selected>Pledged Only</option>
                            <option value="RELEASED">Released Only</option>
                        </select>
                        <button class="btn btn-outline" onclick="Gold.printInventory()" title="Print Inventory">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        </button>
                        <button class="btn btn-outline" style="color:#25D366; border-color:#25D366;" onclick="Gold.printInventory(true)" title="Send WhatsApp">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </button>
                    </div>
                </div>
                <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
                    <table class="table" id="goldTable" style="min-width: 2000px; font-size: 0.85em;">
                        <thead style="position: sticky; top: 0; background: var(--bg-color); z-index: 10;">
                            <tr>
                                <th>Item ID</th>
                                <th>Loan No</th>
                                <th>Customer</th>
                                <th>Photo</th>
                                <th>Material</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Gross Wt (g)</th>
                                <th>Stone Wt (g)</th>
                                <th>Net Wt (g)</th>
                                <th>Carat</th>
                                <th>Purity/Grade</th>
                                <th>Rate (₹)</th>
                                <th>Value (₹)</th>
                                <th>LTV %</th>
                                <th>Eligible Loan (₹)</th>
                                <th>Storage Location</th>
                                <th>Pledge Date</th>
                                <th>Release Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="goldTableBody">
                            <tr><td colspan="20" class="text-center">Loading...</td></tr>
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
                tbody.innerHTML = `<tr><td colspan="20" class="text-center text-muted">No items in inventory</td></tr>`;
                return;
            }

            // Fetch settings for LTV
            const ltvPercentage = parseFloat(await Settings.get('ltvPercentage')) || 75;

            let pledgedWt = 0;
            let releasedWt = 0;
            let html = '';

            items.sort((a,b) => b.id - a.id);

            items.forEach(item => {
                const loan = loanMap[item.loanId];
                const custName = loan ? custMap[loan.customerId] : 'Unknown';
                const loanNo = loan ? loan.loanNumber : 'Unknown';
                const pledgeDate = loan ? Utils.formatDate(loan.loanDate) : '—';
                // Find when it was released (if payment reference exists), for now fallback to loan.releaseDate if available
                const releaseDate = item.releaseDate ? Utils.formatDate(item.releaseDate) : '—';
                
                // Keep stats just for Gold/Silver metals if needed, but for now we aggregate netWeight of CALC items
                if (item.valuationMethod === 'CALCULATED' || (!item.valuationMethod && item.netWeight)) {
                    if (item.status === 'PLEDGED') pledgedWt += (item.netWeight || 0);
                    if (item.status === 'RELEASED') releasedWt += (item.netWeight || 0);
                }

                const badge = item.status === 'PLEDGED' ? 'badge-warning' : 'badge-success';
                
                // Fallbacks for legacy records (pre-migration)
                const material = item.material || 'Gold';
                const gross = item.grossWeight !== undefined ? item.grossWeight.toFixed(2) : '—';
                const stone = item.stoneWeight !== undefined ? item.stoneWeight.toFixed(2) : '—';
                const net = item.netWeight !== undefined ? item.netWeight.toFixed(2) : '—';
                const carat = item.caratWeight !== undefined ? item.caratWeight.toFixed(2) : '—';
                
                let purityStr = item.purity || '—';
                if (material === 'Diamond') purityStr = `${item.color||''} ${item.clarity||''} ${item.cut||''}`.trim() || '—';
                if (material === 'Ruby' || material === 'Stone') purityStr = item.rubyType || item.stoneType || '—';
                if (material === 'Other') purityStr = item.otherName || '—';
                
                const rate = item.ratePerGram !== undefined ? Utils.formatCurrency(item.ratePerGram) : '—';
                
                const val = (item.valuationMethod === 'CALCULATED' ? item.calculatedValue : item.appraisedValue) || item.appraisedValue || 0; // fallback to appraisedValue from v1
                
                const itemEligibleLoan = Math.floor(val * (ltvPercentage / 100));

                let photoHtml = item.itemPhoto ? `<img src="${item.itemPhoto.data}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="App.openPhotoViewer('${item.itemPhoto.data}', '${material}', '${item.type}', '${loanNo}')">` : '<span class="text-muted">—</span>';

                html += `
                    <tr data-status="${item.status}">
                        <td>${item.id}</td>
                        <td>${loanNo}</td>
                        <td title="${custName}">${custName.length > 15 ? custName.substring(0, 15) + '...' : custName}</td>
                        <td>${photoHtml}</td>
                        <td>${material}</td>
                        <td>${item.type}</td>
                        <td title="${item.description||''}">${(item.description||'').length > 15 ? item.description.substring(0,15)+'...' : (item.description||'—')}</td>
                        <td>${item.qty}</td>
                        <td>${gross}</td>
                        <td>${stone}</td>
                        <td>${net}</td>
                        <td>${carat}</td>
                        <td>${purityStr}</td>
                        <td>${rate}</td>
                        <td>${Utils.formatCurrency(val)}</td>
                        <td>${ltvPercentage}%</td>
                        <td>${Utils.formatCurrency(itemEligibleLoan)}</td>
                        <td>${item.storageLocation || '—'}</td>
                        <td>${pledgeDate}</td>
                        <td>${releaseDate}</td>
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
    },

    printInventory: function(isWhatsApp = false) {
        const tableHtml = document.querySelector('.table-responsive').innerHTML;
        const statusFilter = document.getElementById('goldFilterStatus').options[document.getElementById('goldFilterStatus').selectedIndex].text;
        const dateStr = Utils.formatDate(new Date().toISOString());
        
        const printContent = `
            <div class="print-header">
                <h1>Item Inventory Report</h1>
                <p>Status: ${statusFilter} | Date: ${dateStr}</p>
            </div>
            ${tableHtml}
            <div class="print-signatures" style="margin-top: 40px;">
                <div class="sig-box">Generated By</div>
                <div class="sig-box">Manager Signature</div>
            </div>
        `;
        
        const printContainer = document.getElementById('printContainer');
        if (printContainer) {
            printContainer.innerHTML = printContent;
            
            // Adjust table for print styles
            const table = printContainer.querySelector('table');
            if (table) {
                table.className = 'print-table';
                table.removeAttribute('id'); // Remove id to avoid conflicts
            }
            
            setTimeout(() => {
                if (isWhatsApp) {
                    Utils.shareToWhatsApp('printContainer');
                    printContainer.innerHTML = '';
                } else {
                    window.print();
                    setTimeout(() => {
                        printContainer.innerHTML = '';
                    }, 500);
                }
            }, 100);
        }
    }
};

window.Gold = Gold;
