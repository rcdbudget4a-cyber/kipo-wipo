# PRO 4A KIPO/WIPO Monitoring System — Phase 1 (Single Apps Script File)

## Easier installation
This package uses only one Google Apps Script file:

`apps-script/Code.gs`

It already contains:
- the complete backend/API
- `setupSystem()`
- `importSeedData()`
- all 65 CY 2025–2026 seed records

## Install in Google Sheets
1. Create or open the Google Sheet that will serve as the database.
2. Go to **Extensions → Apps Script**.
3. Open the existing `Code.gs` file.
4. Delete all existing content.
5. Open `apps-script/Code.gs` from this package with Notepad.
6. Copy everything and paste it into Google Apps Script `Code.gs`.
7. Press **Ctrl + S** and wait a few seconds.
8. Refresh the Apps Script page if the function list does not update.
9. From the function dropdown, select `setupSystem` and click **Run**.
10. Approve Google permissions when prompted.
11. After completion, select `importSeedData` and click **Run** once.

## Expected Google Sheet tabs
- Users
- Records
- ActivityHistory
- Sessions

The `Records` tab should contain 65 imported records after `importSeedData()` completes.

## Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Select **Web app**.
3. Execute as: **Me**.
4. Select the access level approved by your office.
5. Click **Deploy** and copy the Web App URL.
6. Open `config.js` and replace the placeholder API URL with the Web App URL.
7. Upload `index.html`, `style.css`, `app.js`, `config.js`, and `.nojekyll` to the GitHub repository root.

## Default administrator
- Username: `admin`
- Password: `Admin@PRO4A2026`

Change the password immediately after first login.

## Important
Run `importSeedData()` only once. It will stop if the Records sheet already contains data to prevent duplicate imports.
