# PRO 4A KIPO/WIPO Claims Monitoring System — Phase 2.0

## Important
This package upgrades the existing working Phase 1 system. It preserves the current Google Sheet records.

## Phase 2 features
- Official uploaded PRO 4A logo
- Professional PRO 4A login and AdminLTE-inspired dashboard
- Light and dark mode
- Responsive mobile layout
- Interactive charts
- Improved registry with search, filters, pagination, View Details, Edit, and Admin-only Delete
- Claim workflow tracker
- Documentary requirements checklist
- Badge number, office, province, and case details
- CSV reports and printable registry
- Admin user approval, disable/enable, unit reassignment, and password reset
- Activity History
- Unit User restriction: view/add/edit own unit only; cannot delete

## Safe installation sequence

### A. Back up
1. Download your current GitHub repository as ZIP.
2. Do not delete the Google Sheet.
3. Do not run `importSeedData()` again.

### B. Upgrade Apps Script
1. Open the existing Apps Script project.
2. Copy the existing `Code.gs` into Notepad as backup.
3. Replace the contents of `Code.gs` with `apps-script/Code_Phase2.gs`.
4. Save.
5. Select and run `upgradePhase2()` once.
6. Confirm: `Phase 2 upgrade completed. Existing records were preserved.`
7. Deploy → Manage deployments → Edit.
8. Choose **New version**, Execute as **Me**, access **Anyone**.
9. Deploy. The `/exec` URL normally remains the same.

### C. Configure frontend
1. Open `config.js`.
2. Paste the same existing full Apps Script `/exec` URL.
3. Do not use asterisks or the Apps Script editor URL.

### D. Upload to GitHub
Upload/replace:
- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `.nojekyll`
- `assets/images/pro4a-logo.png`

Commit changes, wait for GitHub Pages, then press Ctrl+F5.

## First tests
1. Admin login.
2. Verify dashboard and 65 existing records.
3. Open a record and update workflow/checklist.
4. Register a Unit User and approve it.
5. Verify Unit User cannot see other units or Delete.
6. Verify updates appear in Records and ActivityHistory sheets.
