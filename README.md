# Gold Finance Billing Software

A complete, production-quality, 100% offline Gold Finance and Loan Management web application built with HTML5, CSS3, Vanilla JavaScript, and IndexedDB.

## Features

- **100% Offline Capability**: Runs entirely in the browser using Service Workers and IndexedDB. No PHP, MySQL, Firebase, or external API required.
- **Customer Management**: Add, edit, and track customers with KYC details.
- **Gold Loan Processing**: Dynamic loan creation, gold valuation based on purity (18K to 24K), automatic LTV calculations.
- **Payment & Settlement**: Track partial payments, automatically calculate accrued simple interest, and handle final loan closure.
- **Reporting & Exports**: Generate collection, loan, and inventory reports. Export data to CSV.
- **Professional Receipts**: Print-ready receipts for disbursements, payments, and closures.
- **Backup & Restore**: Export all IndexedDB data to a secure local JSON file and restore it on any device.

## How to Run

1. **Local Server (Recommended)**:
   Since the app uses Service Workers (for offline PWA capabilities) and ES modules, it is best served over a local HTTP server.
   - If you have Python installed: run `python -m http.server 8000` in this directory and visit `http://localhost:8000`.
   - Alternatively, you can use the VS Code "Live Server" extension.

2. **Direct File Execution**:
   You can just double-click `index.html` to open it in Chrome, Edge, or Firefox. *Note: Service Worker installation (for PWA) might fail over `file://` protocol, but IndexedDB will still work perfectly.*

## First Login (Authentication)

Because this is a local offline application, there is no remote server to store passwords securely.

- **Default Username**: `admin`
- **Default Password**: `admin123`

When the app first loads and initializes the database, it creates this default admin account.

## Database & Data Storage (IndexedDB)

All data is stored in your browser's **IndexedDB** (`GoldFinanceDB`).
- **Persistence**: Data stays on your computer even if you close the browser or go offline.
- **Warning**: If you clear your browser's "Site Data" or "Cache", you WILL lose your database. **Always take frequent backups!**

## Configuration Settings

Go to the **Settings** module in the sidebar to configure:
- Company Name, Address, Phone, and GST Number (appears on printed receipts).
- Current Gold Rates (22K, 24K) per gram.
- Maximum Loan-to-Value (LTV) percentage.
- Default Interest Rate.
- Receipt, Loan, and Customer ID prefixes.

## How to Backup and Restore

**To Backup**:
1. Go to **Backup & Restore** in the sidebar.
2. Click **Download JSON Backup**.
3. A JSON file containing all your customers, loans, and payments will be downloaded to your computer (e.g., to your Downloads folder). Store this file safely (e.g., on a USB drive or Cloud Storage).

**To Restore**:
1. Go to **Backup & Restore**.
2. Click **Select Backup File** and choose a previously downloaded JSON file.
3. Review the summary of the data.
4. Click **Confirm Restore**. *Warning: This replaces all current data in the application.*

## How to Print Receipts

1. When you create a loan, process a payment, or close a loan, you can print a receipt.
2. Go to the **Receipts** module.
3. Select the receipt type (Payment, Disbursement, Closure).
4. Enter the Receipt Number or Loan Number.
5. Click **Generate & Print**. Your browser's print dialog will open automatically, formatted perfectly for A4 or thermal printing.

## Generating Demo Data

If you want to test the application quickly:
1. Go to **Settings**.
2. Scroll down to the **Danger Zone**.
3. Click **Generate Demo Data**. This will create dummy customers, loans, and pledged gold items.
4. *Do not use this button if you have real production data.* To wipe the demo data later, go to **Backup & Restore -> Clear Database**.
