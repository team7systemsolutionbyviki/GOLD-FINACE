/**
 * Utility functions for Gold Finance Billing Software
 */

const Utils = {
    // Format currency to Indian Rupee (₹)
    formatCurrency: function(amount) {
        if (amount === null || amount === undefined) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    },

    // Format date to DD-MM-YYYY
    formatDate: function(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    },
    
    // Get YYYY-MM-DD for input type="date"
    getISODate: function(date = new Date()) {
        return date.toISOString().split('T')[0];
    },

    // Calculate days between two dates
    getDaysBetween: function(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Normalize to midnight to avoid daylight saving time issues
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays;
    },

    // Calculate interest (Simple Interest)
    // interest = P * R * T / 100
    // If rate is per month, time should be in months
    calculateInterest: function(principal, rate, startDate, endDate, calcType = 'monthly') {
        const days = this.getDaysBetween(startDate, endDate);
        let interest = 0;
        
        if (calcType === 'monthly') {
            const dailyRate = (rate / 100) / 30;
            interest = principal * dailyRate * days;
        } else if (calcType === 'weekly') {
            const dailyRate = (rate / 100) / 7;
            interest = principal * dailyRate * days;
        } else if (calcType === 'daily') {
            const dailyRate = (rate / 100);
            interest = principal * dailyRate * days;
        } else if (calcType === 'yearly') {
            const dailyRate = (rate / 100) / 365;
            interest = principal * dailyRate * days;
        }
        
        return Math.round(interest);
    },

    // Show Toast Notification
    showToast: function(title, message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconHtml = '';
        if (type === 'success') {
            iconHtml = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        } else if (type === 'error') {
            iconHtml = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        } else {
            iconHtml = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `
            ${iconHtml}
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;

        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300); // Wait for transition
        }, 3000);
    },

    // Show confirmation dialog (Modal)
    confirmDialog: function(title, message, onConfirm) {
        const modalId = 'confirmModal_' + Date.now();
        const html = `
            <div class="modal-overlay active" id="${modalId}">
                <div class="modal modal-sm">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button type="button" class="modal-close" onclick="document.getElementById('${modalId}').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
                        <button type="button" class="btn btn-danger" id="${modalId}_confirm">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        document.getElementById(`${modalId}_confirm`).addEventListener('click', () => {
            onConfirm();
            document.getElementById(modalId).remove();
        });
    },

    // Simple UUID generator for IDs if needed (fallback)
    generateId: function() {
        return Math.random().toString(36).substring(2, 9);
    },
    
    printSection: function(elementId) {
        const source = document.getElementById(elementId);
        const printContainer = document.getElementById('printContainer');
        if (source && printContainer) {
            // Copy HTML to print container
            printContainer.innerHTML = source.innerHTML;
            
            // Wait for render
            setTimeout(() => {
                window.print();
                // Clear container after print dialog closes
                setTimeout(() => {
                    printContainer.innerHTML = '';
                }, 500);
            }, 100);
        }
    },

    shareToWhatsApp: function(elementId, phoneNumber = '') {
        const source = document.getElementById(elementId);
        if (!source) return;

        let text = '';
        
        // Try to get headers
        const headers = source.querySelectorAll('h2, h3, .page-header h2, .receipt-header h2');
        headers.forEach(h => { text += `*${h.innerText.trim()}*\n`; });
        
        text += '\n';

        // Get key-value pairs (like receipt details)
        const details = source.querySelectorAll('.receipt-details p, .form-group label, .form-group .readonly-value');
        let currentLabel = '';
        details.forEach(p => { 
            const t = p.innerText.trim();
            if (t) {
                if (p.tagName.toLowerCase() === 'label') {
                    currentLabel = t;
                } else if (p.classList.contains('readonly-value') && currentLabel) {
                    text += `${currentLabel}: ${t}\n`;
                    currentLabel = '';
                } else {
                    text += `${t}\n`; 
                }
            }
        });

        // Get table data
        const tables = source.querySelectorAll('table');
        tables.forEach(table => {
            text += '\n';
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('th, td');
                let rowText = [];
                cells.forEach(cell => {
                    const cText = cell.innerText.trim().replace(/\s+/g, ' ');
                    if (cText) rowText.push(cText);
                });
                if (rowText.length > 0) {
                    text += rowText.join(' | ') + '\n';
                }
            });
        });
        
        // Fallback if no tables or specific details found
        if (tables.length === 0 && details.length === 0) {
            text += source.innerText.substring(0, 1000);
        }

        const encodedText = encodeURIComponent(text.trim());
        let url = '';
        if (phoneNumber) {
            // strip non-numeric from phone
            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
            // check if length is 10, add 91 (India) as default, otherwise keep as is
            const finalPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
            url = `https://wa.me/${finalPhone}?text=${encodedText}`;
        } else {
            url = `https://wa.me/?text=${encodedText}`;
        }
        
        window.open(url, '_blank');
    }
};
