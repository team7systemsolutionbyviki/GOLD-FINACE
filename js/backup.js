/**
 * Backup and Restore Module
 */

const Backup = {
    render: async function() {
        const container = document.getElementById('view-backup-restore');
        if (!container) return;

        const currentUser = Auth.getCurrentUser();
        // Security check - SUPER_ADMIN and ADMIN can view this page
        if (!currentUser || !['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role)) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body text-center" style="padding: 50px;">
                        <h2 class="text-danger">Access Denied</h2>
                        <p class="text-muted">Only the Super Administrator can access Backup & Restore.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="page-header">
                <h2>Backup & Restore</h2>
            </div>
            
            <div class="dashboard-grid mb-4">
                <!-- Auto Backup Panel -->
                <div class="card" style="grid-column: 1 / -1; border-color: var(--accent-color);">
                    <div class="card-header bg-light">
                        <h3>Automatic Local Backup</h3>
                    </div>
                    <div class="card-body flex-between" style="align-items: center; padding: 20px;">
                        <div>
                            <h4>Auto-Backup Folder</h4>
                            <p class="text-muted" id="autoBackupStatus">Not configured. Set a folder to enable automatic background backups.</p>
                        </div>
                        <div>
                            <button class="btn btn-outline mr-2" id="btnRunAutoBackup" style="display:none;" onclick="Backup.runAutoBackup(true)">Run Auto-Backup Now</button>
                            <button class="btn btn-primary" onclick="Backup.setupAutoBackupFolder()">Set Backup Folder</button>
                        </div>
                    </div>
                </div>

                <!-- Backup Panel -->
                <div class="card">
                    <div class="card-header">
                        <h3>Export Data</h3>
                    </div>
                    <div class="card-body text-center" style="padding: 40px 20px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; color: var(--success-color); margin-bottom: 20px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <h4>Download Database Backup</h4>
                        <p class="text-muted mb-4 mt-2">Export all your offline data to a secure JSON file. Store this file safely on your computer or a USB drive.</p>
                        <button class="btn btn-primary" onclick="Backup.exportData()">Download JSON Backup</button>
                    </div>
                </div>

                <!-- Restore Panel -->
                <div class="card">
                    <div class="card-header">
                        <h3>Import Data</h3>
                    </div>
                    <div class="card-body text-center" style="padding: 40px 20px;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; color: var(--warning-color); margin-bottom: 20px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        <h4>Restore from Backup</h4>
                        <p class="text-muted mb-4 mt-2">Upload a previously saved JSON backup file. <br><strong class="text-danger">Warning: This will replace current data.</strong></p>
                        <input type="file" id="backupFileInput" accept=".json" style="display: none;" onchange="Backup.handleFileSelect(event)">
                        <button class="btn btn-warning" onclick="document.getElementById('backupFileInput').click()">Select Backup File</button>
                    </div>
                </div>
            </div>

            ${currentUser.role === 'SUPER_ADMIN' ? `
            <div class="card mt-4 border-danger" style="border-color: var(--danger-color);">
                <div class="card-header flex-between">
                    <h3 class="text-danger">Danger Zone</h3>
                    <span class="badge badge-danger">ONLY SUPER ADMIN CAN SEE THIS</span>
                </div>
                <div class="card-body flex-between">
                    <div>
                        <h4>Clear All Database Data</h4>
                        <p class="text-muted">Permanently delete all local records. This cannot be undone without a backup.</p>
                    </div>
                    <button class="btn btn-danger" onclick="Backup.clearDatabase()">Clear Database</button>
                </div>
            </div>
            ` : ''}
            
            <div id="restorePreviewArea" class="mt-4" style="display: none;"></div>
        `;

        await this.checkAutoBackupStatus();
    },

    checkAutoBackupStatus: async function() {
        try {
            const handle = await Settings.get('autoBackupDirHandle');
            const statusEl = document.getElementById('autoBackupStatus');
            const btnRun = document.getElementById('btnRunAutoBackup');
            
            if (handle) {
                if (statusEl) statusEl.innerHTML = `<strong class="text-success">Configured.</strong> Backups will automatically save to your chosen folder.`;
                if (btnRun) btnRun.style.display = 'inline-block';
            } else {
                if (statusEl) statusEl.innerHTML = `Not configured. Set a folder to enable automatic background backups.`;
                if (btnRun) btnRun.style.display = 'none';
            }
        } catch (e) {
            console.error(e);
        }
    },

    setupAutoBackupFolder: async function() {
        if (!window.showDirectoryPicker) {
            Utils.showToast('Unsupported', 'Your browser does not support Auto-Backup (requires Chrome/Edge).', 'error');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            
            // Store the handle in IndexedDB
            await Settings.set('autoBackupDirHandle', dirHandle);
            
            Utils.showToast('Success', 'Auto-backup folder configured!', 'success');
            await this.checkAutoBackupStatus();
            
            // Run an initial backup to that folder
            await this.runAutoBackup(true);

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error(err);
                Utils.showToast('Error', 'Failed to set backup folder', 'error');
            }
        }
    },

    runAutoBackup: async function(showToast = false) {
        try {
            const handle = await Settings.get('autoBackupDirHandle');
            if (!handle) return; // Not configured

            // Request permission if needed (browser might prompt user upon first run per session)
            const permission = await handle.requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') {
                if (showToast) Utils.showToast('Permission Denied', 'Browser denied access to backup folder.', 'error');
                return;
            }

            if (showToast) Utils.showToast('Info', 'Running auto-backup...', 'info');

            const exportObj = {
                metadata: {
                    appName: "Gold Finance",
                    version: "1.0",
                    exportDate: new Date().toISOString()
                },
                data: {}
            };

            const stores = Array.from(db.db.objectStoreNames);
            for (const storeName of stores) {
                exportObj.data[storeName] = await db.getAll(storeName);
            }

            const dataStr = JSON.stringify(exportObj, null, 2);
            const dateStr = Utils.getISODate();
            const fileName = `autobackup_${dateStr}.json`;

            // Create or get the file
            const fileHandle = await handle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(dataStr);
            await writable.close();

            if (showToast) Utils.showToast('Success', 'Auto-backup completed successfully.', 'success');
            console.log('Auto-backup written to:', fileName);

        } catch (err) {
            console.error('AutoBackup Error:', err);
            if (showToast) Utils.showToast('Error', 'Failed to run auto-backup.', 'error');
        }
    },

    exportData: async function() {
        try {
            Utils.showToast('Info', 'Preparing backup...', 'info');
            
            const exportObj = {
                metadata: {
                    appName: "Gold Finance",
                    version: "1.0",
                    exportDate: new Date().toISOString()
                },
                data: {}
            };

            const stores = Array.from(db.db.objectStoreNames);
            for (const storeName of stores) {
                exportObj.data[storeName] = await db.getAll(storeName);
            }

            const dataStr = JSON.stringify(exportObj, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const dateStr = Utils.getISODate();
            const fileName = `gold-finance-backup-${dateStr}.json`;

            // Try to use the modern File System Access API to let user pick the exact path
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: 'JSON Backup File',
                            accept: {'application/json': ['.json']},
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(dataBlob);
                    await writable.close();
                } catch (err) {
                    // User cancelled the picker, abort silently
                    if (err.name !== 'AbortError') {
                        throw err;
                    }
                    return;
                }
            } else {
                // Fallback for older browsers (downloads to default folder)
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
            
            await db.logAudit('EXPORT', 'Backup', null, 'Downloaded database backup');
            Utils.showToast('Success', 'Backup downloaded successfully', 'success');
            
        } catch (err) {
            console.error(err);
            Utils.showToast('Error', 'Failed to generate backup', 'error');
        }
    },

    handleFileSelect: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.metadata || data.metadata.appName !== "Gold Finance" || !data.data) {
                    throw new Error("Invalid backup file format");
                }
                this.showRestorePreview(data);
            } catch (err) {
                console.error(err);
                Utils.showToast('Error', 'Invalid backup file', 'error');
            }
        };
        reader.readAsText(file);
        
        // Reset input
        event.target.value = '';
    },

    showRestorePreview: function(backupData) {
        const meta = backupData.metadata;
        const d = backupData.data;
        
        const previewArea = document.getElementById('restorePreviewArea');
        previewArea.style.display = 'block';
        
        // Store temporarily on window for the confirm step
        window.pendingRestoreData = backupData;

        previewArea.innerHTML = `
            <div class="card border-warning">
                <div class="card-header bg-warning">
                    <h3>Confirm Restore</h3>
                </div>
                <div class="card-body">
                    <p class="mb-4">You are about to restore data from a backup created on <strong>${Utils.formatDate(meta.exportDate)}</strong>.</p>
                    
                    <div class="form-grid mb-4">
                        <div class="card bg-light p-3 text-center">
                            <h4>${d.customers ? d.customers.length : 0}</h4>
                            <p class="text-muted">Customers</p>
                        </div>
                        <div class="card bg-light p-3 text-center">
                            <h4>${d.loans ? d.loans.length : 0}</h4>
                            <p class="text-muted">Loans</p>
                        </div>
                        <div class="card bg-light p-3 text-center">
                            <h4>${d.payments ? d.payments.length : 0}</h4>
                            <p class="text-muted">Payments</p>
                        </div>
                        <div class="card bg-light p-3 text-center">
                            <h4>${d.goldItems ? d.goldItems.length : 0}</h4>
                            <p class="text-muted">Gold Items</p>
                        </div>
                    </div>
                    
                    <div class="alert text-danger mb-4">
                        <strong>Warning:</strong> Restoring this backup will permanently erase and replace all current data in the application.
                    </div>
                    
                    <div class="text-right">
                        <button class="btn btn-outline mr-2" onclick="document.getElementById('restorePreviewArea').style.display='none'">Cancel</button>
                        <button class="btn btn-warning" onclick="Backup.executeRestore()">Confirm Restore</button>
                    </div>
                </div>
            </div>
        `;
    },

    executeRestore: async function() {
        const backupData = window.pendingRestoreData;
        if (!backupData) return;

        Utils.confirmDialog('Final Confirmation', 'Are you absolutely sure you want to overwrite the current database with this backup?', async () => {
            Utils.showToast('Info', 'Restoring database... Please do not close the app.', 'info');
            
            try {
                // Clear existing data
                await db.clearAllData();
                
                // Import new data
                const stores = Object.keys(backupData.data);
                for (const storeName of stores) {
                    if (db.db.objectStoreNames.contains(storeName)) {
                        const records = backupData.data[storeName];
                        for (const record of records) {
                            await db.add(storeName, record);
                        }
                    }
                }
                
                window.pendingRestoreData = null;
                document.getElementById('restorePreviewArea').style.display = 'none';
                
                await db.logAudit('RESTORE', 'Backup', null, 'Database restored from backup');
                
                Utils.showToast('Success', 'Database restored successfully. Reloading...', 'success');
                
                // Reload app to ensure clean state
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (err) {
                console.error(err);
                Utils.showToast('Error', 'Failed to restore database. Please check console.', 'error');
            }
        });
    },

    clearDatabase: function() {
        Utils.confirmDialog('Clear Database', 'This will delete ALL data. Are you sure?', () => {
            // Second confirmation
            Utils.confirmDialog('CRITICAL WARNING', 'This is your last chance to cancel. Type "yes" in your mind and click confirm to PERMANENTLY ERASE EVERYTHING.', async () => {
                try {
                    await db.clearAllData();
                    Utils.showToast('Success', 'Database cleared successfully. Reloading...', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } catch(err) {
                    console.error(err);
                    Utils.showToast('Error', 'Failed to clear database', 'error');
                }
            });
        });
    }
};

window.Backup = Backup;
