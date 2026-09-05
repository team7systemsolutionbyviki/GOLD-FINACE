/**
 * IndexedDB wrapper for Gold Finance Billing Software
 */

const DB_NAME = 'GoldFinanceDB';
const DB_VERSION = 1;

class Database {
    constructor() {
        this.db = null;
        this.initPromise = this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error("Database error:", event.target.error);
                reject("Failed to open database.");
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Users
                if (!db.objectStoreNames.contains('users')) {
                    const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    usersStore.createIndex('username', 'username', { unique: true });
                }

                // Settings
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Customers
                if (!db.objectStoreNames.contains('customers')) {
                    const customersStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                    customersStore.createIndex('customerCode', 'customerCode', { unique: true });
                    customersStore.createIndex('mobile', 'mobile', { unique: false });
                    customersStore.createIndex('fullName', 'fullName', { unique: false });
                }

                // Loans
                if (!db.objectStoreNames.contains('loans')) {
                    const loansStore = db.createObjectStore('loans', { keyPath: 'id', autoIncrement: true });
                    loansStore.createIndex('loanNumber', 'loanNumber', { unique: true });
                    loansStore.createIndex('customerId', 'customerId', { unique: false });
                    loansStore.createIndex('status', 'status', { unique: false });
                }

                // Gold Items
                if (!db.objectStoreNames.contains('goldItems')) {
                    const goldStore = db.createObjectStore('goldItems', { keyPath: 'id', autoIncrement: true });
                    goldStore.createIndex('loanId', 'loanId', { unique: false });
                    goldStore.createIndex('status', 'status', { unique: false });
                }

                // Payments & Receipts
                if (!db.objectStoreNames.contains('payments')) {
                    const paymentsStore = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
                    paymentsStore.createIndex('receiptNumber', 'receiptNumber', { unique: true });
                    paymentsStore.createIndex('loanId', 'loanId', { unique: false });
                    paymentsStore.createIndex('paymentDate', 'paymentDate', { unique: false });
                }

                // Expenses
                if (!db.objectStoreNames.contains('expenses')) {
                    const expensesStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                    expensesStore.createIndex('date', 'date', { unique: false });
                    expensesStore.createIndex('category', 'category', { unique: false });
                }

                // Audit Logs
                if (!db.objectStoreNames.contains('auditLogs')) {
                    const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                    auditStore.createIndex('module', 'module', { unique: false });
                }
            };
        });
    }

    async getTransaction(storeNames, mode) {
        await this.initPromise;
        return this.db.transaction(storeNames, mode);
    }

    // Generic CRUD operations
    async add(storeName, data) {
        const tx = await this.getTransaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        const tx = await this.getTransaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        const tx = await this.getTransaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const tx = await this.getTransaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        const tx = await this.getTransaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        const tx = await this.getTransaction([storeName], 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // specific transactional helpers
    async clearAllData() {
        await this.initPromise;
        const stores = Array.from(this.db.objectStoreNames);
        const tx = this.db.transaction(stores, 'readwrite');
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
            
            stores.forEach(storeName => {
                tx.objectStore(storeName).clear();
            });
        });
    }

    async saveLoanWithGoldItems(loanData, goldItemsData, customerDataToUpdate = null) {
        const tx = await this.getTransaction(['loans', 'goldItems', 'customers'], 'readwrite');
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve(loanId);
            tx.onerror = () => reject(tx.error);
            
            const loansStore = tx.objectStore('loans');
            const goldStore = tx.objectStore('goldItems');
            
            let loanId = null;
            
            const loanRequest = loansStore.add(loanData);
            loanRequest.onsuccess = (e) => {
                loanId = e.target.result;
                // Add loanId to gold items and save them
                goldItemsData.forEach(item => {
                    item.loanId = loanId;
                    goldStore.add(item);
                });
                
                if (customerDataToUpdate) {
                    const custStore = tx.objectStore('customers');
                    custStore.put(customerDataToUpdate);
                }
            };
        });
    }

    async logAudit(action, module, recordId, description) {
        const user = sessionStorage.getItem('gf_user') ? JSON.parse(sessionStorage.getItem('gf_user')).username : 'System';
        return this.add('auditLogs', {
            timestamp: new Date().toISOString(),
            action,
            module,
            recordId,
            user,
            description
        });
    }
}

// Global DB instance
const db = new Database();
