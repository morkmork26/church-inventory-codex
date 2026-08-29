# JILGM Church Inventory & Supply Management System
# Test Plan — Production Grade

**Document Version:** 1.0
**Application:** JILGM Church Inventory & Supply Management System
**Stack:** Next.js 14 · Supabase (PostgreSQL + Storage + RLS) · Vercel
**Test Type:** Manual Functional / Integration
**Prepared For:** DV Engineer

---

## Table of Contents

1. [Scope & Assumptions](#scope--assumptions)
2. [Test Environment Setup](#test-environment-setup)
3. [Roles & Test Accounts](#roles--test-accounts)
4. [Feature 1 — Authentication & Authorization](#feature-1--authentication--authorization)
5. [Feature 2 — User Management (Admin Only)](#feature-2--user-management-admin-only)
6. [Feature 3 — Inventory Management](#feature-3--inventory-management)
7. [Feature 4 — Stock Ledger](#feature-4--stock-ledger)
8. [Feature 5 — Item Requests](#feature-5--item-requests)
9. [Feature 6 — Repair Reporting](#feature-6--repair-reporting)
10. [Feature 7 — Notifications (In-App)](#feature-7--notifications-in-app)
11. [Feature 8 — Storage Location Suggestions](#feature-8--storage-location-suggestions)
12. [Feature 9 — Dashboard](#feature-9--dashboard)
13. [Feature 10 — Settings (Admin)](#feature-10--settings-admin)
14. [Feature 11 — Mobile & Responsive](#feature-11--mobile--responsive)
15. [Feature 12 — Security & Row-Level Security (RLS)](#feature-12--security--row-level-security-rls)
16. [Feature 13 — Keep-Alive Cron](#feature-13--keep-alive-cron)
17. [Feature 14 — Edge Cases](#feature-14--edge-cases)
18. [Test Execution Tracking](#test-execution-tracking)

---

## Scope & Assumptions

- All tests are manual unless otherwise noted.
- Tests assume a fully deployed instance (local dev or staging on Vercel) with a seeded Supabase database.
- Row-Level Security (RLS) policies are enabled on all relevant tables.
- The 17 ministries are pre-seeded. One ministry is named **"Admin"** — members of this ministry receive the admin role.
- Email/SMTP is configured for notification tests; if not, in-app notification tests still apply.
- "Stock" refers to `qty` field on quantity-type items.
- "Individual-type" items track serial numbers, not bulk quantity.
- Browser tested: Chrome (latest) unless specified. Mobile tests use Chrome DevTools device emulation at minimum; physical device preferred.

---

## Test Environment Setup

1. Deploy app to local (`npm run dev`) or staging URL.
2. Ensure Supabase project is connected and migrations applied.
3. Seed database with:
   - 17 ministries including "Admin", "Engineering", and at least 3 others.
   - At least 5 inventory categories.
   - At least 3 approved storage locations.
   - At least 2 pre-approved admin accounts (one in "Admin" ministry).
   - At least 2 pre-approved member accounts (different ministries).
   - At least 5 inventory items (mix of quantity-type and individual-type, various statuses).
4. Confirm Supabase Storage bucket for item images exists and is accessible.
5. Confirm `/api/cron/keep-alive` route is deployed.

---

## Roles & Test Accounts

| Alias | Role | Ministry | Status | Purpose |
|---|---|---|---|---|
| ADMIN1 | Admin | Admin | Approved | Primary admin tester |
| ADMIN2 | Admin | Admin | Approved | Secondary admin (cross-checks) |
| MEMBER1 | Member | Worship | Approved | Primary member tester |
| MEMBER2 | Member | Media | Approved | Cross-ministry member tester |
| MEMBER3 | Member | Engineering | Approved | Repair assignment tester |
| PENDING1 | Member | Youth | Pending | Account approval flow |
| NEW1 | (none yet) | — | — | Fresh registration tester |

Maintain a local note of credentials for each alias before starting.

---

## Feature 1 — Authentication & Authorization

### 1.1 Registration

---

**TC-AUTH-001**
**Description:** Successful new account registration with all valid fields.
**Steps:**
1. Navigate to `/register` (or registration link from `/login`).
2. Enter full name: `Test NewUser`.
3. Enter email: `newuser_tc001@test.com`.
4. Enter password: `SecurePass123!`.
5. Confirm password: `SecurePass123!`.
6. Select ministry from dropdown: `Worship`.
7. Click **Register** / **Submit**.

**Expected Result:**
- No form errors displayed.
- User is redirected to a "pending approval" holding page (e.g., `/pending`) or a success message is shown stating the account is awaiting admin approval.
- A new row exists in the `users` (or `profiles`) table in Supabase with `status = 'pending'` and `ministry = 'Worship'`.
- The user cannot navigate to any authenticated page (e.g., `/dashboard` redirects back to `/login` or `/pending`).

---

**TC-AUTH-002**
**Description:** Registration form shows all 17 ministries in the dropdown.
**Steps:**
1. Navigate to `/register`.
2. Click the ministry dropdown.
3. Count and record all visible options.

**Expected Result:**
- Exactly 17 ministry options are listed.
- No duplicates exist.
- "Admin" ministry is present in the list (user can self-select it; approval gates privilege, not registration).

---

**TC-AUTH-003**
**Description:** Registration blocked when passwords do not match.
**Steps:**
1. Navigate to `/register`.
2. Fill name, email, select ministry.
3. Enter password: `SecurePass123!`.
4. Enter confirm password: `DifferentPass456!`.
5. Click **Submit**.

**Expected Result:**
- Form submission is blocked (no network request to Supabase auth).
- Inline validation error appears near the confirm password field: message must communicate passwords do not match.
- User remains on `/register`.

---

**TC-AUTH-004**
**Description:** Registration blocked with invalid email format.
**Steps:**
1. Navigate to `/register`.
2. Enter email: `not-an-email`.
3. Fill remaining fields with valid data.
4. Click **Submit**.

**Expected Result:**
- Form submission is blocked.
- Inline validation error near email field indicating invalid email format.
- No Supabase auth call is made.

---

**TC-AUTH-005**
**Description:** Registration blocked when required fields are empty.
**Steps:**
1. Navigate to `/register`.
2. Leave all fields blank.
3. Click **Submit**.

**Expected Result:**
- Form submission is blocked.
- Validation errors appear on all required fields (name, email, password, confirm password, ministry).
- No Supabase auth call is made.

---

**TC-AUTH-006**
**Description:** Registration blocked when email already exists in the system.
**Steps:**
1. Use an email already registered (e.g., MEMBER1's email).
2. Navigate to `/register`.
3. Fill all fields using the duplicate email.
4. Click **Submit**.

**Expected Result:**
- An error message is shown (e.g., "An account with this email already exists" or Supabase returns a conflict error surfaced to the UI).
- No duplicate row is created in the database.
- User remains on `/register`.

---

### 1.2 Account Pending State

---

**TC-AUTH-007**
**Description:** Newly registered user cannot access protected pages while pending.
**Steps:**
1. Register a new account (TC-AUTH-001 result) — do not approve it.
2. In a fresh browser session, log in with the new account's credentials.
3. Attempt to navigate to `/dashboard`, `/inventory`, `/requests`.

**Expected Result:**
- Each protected URL redirects to `/pending` (or `/login` with a "pending approval" message).
- No inventory, request, or dashboard data is visible.

---

**TC-AUTH-008**
**Description:** Pending user sees informative message on the holding page.
**Steps:**
1. Log in as PENDING1 (pending account).
2. Observe the page rendered after login.

**Expected Result:**
- A clear message is displayed indicating the account is awaiting admin approval (e.g., "Your account is pending approval. Please wait for an administrator to review your registration.").
- A logout button is accessible.
- No navigation links to protected features are visible.

---

### 1.3 Login

---

**TC-AUTH-009**
**Description:** Successful login with valid approved credentials.
**Steps:**
1. Navigate to `/login`.
2. Enter MEMBER1's email and password.
3. Click **Login**.

**Expected Result:**
- User is redirected to `/dashboard` (or the app's home page for members).
- The navigation shows MEMBER1's name or avatar.
- No error messages are shown.

---

**TC-AUTH-010**
**Description:** Login blocked with incorrect password.
**Steps:**
1. Navigate to `/login`.
2. Enter MEMBER1's email and an incorrect password: `WrongPassword!`.
3. Click **Login**.

**Expected Result:**
- Login fails.
- An error message is displayed (e.g., "Invalid email or password").
- User remains on `/login`.
- No session cookie is set.

---

**TC-AUTH-011**
**Description:** Login blocked for pending (unapproved) account.
**Steps:**
1. Navigate to `/login`.
2. Enter PENDING1's email and correct password.
3. Click **Login**.

**Expected Result:**
- The user is either:
  (a) Blocked at login with a message: "Your account is pending admin approval", OR
  (b) Logged in but immediately redirected to `/pending` with no access to protected routes.
- In either case, PENDING1 cannot reach `/dashboard` or any inventory page.

---

**TC-AUTH-012**
**Description:** Login with non-existent email.
**Steps:**
1. Navigate to `/login`.
2. Enter `doesnotexist@test.com` and any password.
3. Click **Login**.

**Expected Result:**
- Login fails.
- Error message displayed (e.g., "Invalid email or password" — do NOT reveal whether the email exists for security).
- User remains on `/login`.

---

### 1.4 Logout

---

**TC-AUTH-013**
**Description:** Logout clears session and redirects to login.
**Steps:**
1. Log in as MEMBER1.
2. Locate and click the **Logout** button (nav bar or user menu).
3. Observe redirect.
4. Attempt to navigate directly to `/dashboard`.

**Expected Result:**
- User is redirected to `/login` after clicking logout.
- Navigating to `/dashboard` after logout also redirects to `/login`.
- No authenticated data is visible after logout.
- Supabase session token is cleared (check Application > Cookies in DevTools — no `sb-*` session cookie present).

---

### 1.5 Session Persistence

---

**TC-AUTH-014**
**Description:** Session persists after page refresh.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to `/inventory`.
3. Press F5 (hard refresh).
4. Observe page state.

**Expected Result:**
- Page reloads and MEMBER1 remains logged in.
- `/inventory` content is visible without being redirected to `/login`.
- MEMBER1's name/avatar is still shown in the nav.

---

**TC-AUTH-015**
**Description:** Session persists after closing and reopening the browser tab (if "remember me" or default persistent sessions are used).
**Steps:**
1. Log in as MEMBER1.
2. Close the browser tab (do not click logout).
3. Open a new tab and navigate to the app URL.

**Expected Result:**
- MEMBER1 is still logged in (session cookie is persistent, not session-only).
- User lands on the dashboard/home, not `/login`.

> Note: If the app intentionally uses session-only cookies, update this expectation to reflect redirect to `/login`. Document the design decision.

---

### 1.6 Role Detection

---

**TC-AUTH-016**
**Description:** Admin ministry member sees admin UI elements.
**Steps:**
1. Log in as ADMIN1 (ministry: "Admin").
2. Observe navigation and dashboard.

**Expected Result:**
- Admin-specific navigation items are visible (e.g., "User Management", "Pending Requests", "Settings", "All Repairs").
- Admin dashboard widgets are rendered (pending requests count, open repairs count, etc.).
- No "You do not have permission" banner is shown.

---

**TC-AUTH-017**
**Description:** Non-Admin ministry member does NOT see admin UI elements.
**Steps:**
1. Log in as MEMBER1 (ministry: "Worship").
2. Observe navigation and dashboard.

**Expected Result:**
- Admin-only nav links (User Management, Settings) are NOT visible.
- Member dashboard is shown (shortcuts: Request, Report, Browse Inventory).
- Attempting to navigate directly to `/admin/users` (or equivalent admin route) results in a 403 page or redirect to `/dashboard`.

---

### 1.7 Middleware Redirects

---

**TC-AUTH-018**
**Description:** Unauthenticated user accessing a protected route is redirected to /login.
**Steps:**
1. Ensure no active session (log out or use incognito).
2. Navigate directly to `/dashboard`.
3. Navigate directly to `/inventory`.
4. Navigate directly to `/requests`.

**Expected Result:**
- Each attempt results in an immediate redirect to `/login`.
- No protected page content flashes before redirect.
- The original URL is optionally preserved as a `?redirect=` query param for post-login navigation.

---

**TC-AUTH-019**
**Description:** Authenticated user accessing /login is redirected away.
**Steps:**
1. Log in as MEMBER1.
2. Navigate directly to `/login`.

**Expected Result:**
- User is redirected to `/dashboard` (or the member home page).
- The `/login` form is NOT shown to an already-authenticated user.

---

---

## Feature 2 — User Management (Admin Only)

### 2.1 View Pending Accounts

---

**TC-USR-001**
**Description:** Admin sees all pending accounts in user management.
**Steps:**
1. Ensure at least 2 pending accounts exist (e.g., PENDING1 and a freshly registered NEW1 from TC-AUTH-001).
2. Log in as ADMIN1.
3. Navigate to User Management (e.g., `/admin/users` or "Users" in sidebar).
4. Apply or look for a "Pending" filter/tab.

**Expected Result:**
- All pending accounts are listed with: full name, email, ministry selected at registration, registration date.
- Count of pending accounts matches what is in the database.
- No approved or rejected accounts appear in the "Pending" filtered view.

---

**TC-USR-002**
**Description:** Non-admin cannot access User Management page.
**Steps:**
1. Log in as MEMBER1.
2. Navigate directly to `/admin/users`.

**Expected Result:**
- Page returns a 403 / "Access Denied" response, OR redirects to `/dashboard` with an error toast/message.
- No user list data is rendered.

---

### 2.2 Approve Account

---

**TC-USR-003**
**Description:** Admin approves a pending account (one-tap).
**Steps:**
1. Log in as ADMIN1.
2. Navigate to User Management > Pending tab.
3. Locate PENDING1.
4. Click the **Approve** button next to PENDING1.
5. Confirm if a confirmation dialog appears.

**Expected Result:**
- PENDING1 disappears from the "Pending" list immediately (or after list refresh).
- In the database, PENDING1's `status` changes from `'pending'` to `'approved'`.
- PENDING1 can now log in and access `/dashboard` (verify by logging in as PENDING1 in a separate session).
- An in-app notification may be created for PENDING1 (verified in Feature 7 tests).

---

### 2.3 Reject / Deactivate Account

---

**TC-USR-004**
**Description:** Admin rejects a pending account.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to User Management > Pending tab.
3. Locate a pending account (create a new one if needed).
4. Click the **Reject** button.
5. Confirm if a dialog appears.

**Expected Result:**
- The account's `status` is set to `'rejected'` (or `'deactivated'`) in the database.
- The account no longer appears in the Pending list.
- The rejected user cannot log in (or is redirected to a "your account was not approved" page if they attempt to log in).

---

**TC-USR-005**
**Description:** Admin deactivates an already-approved member account.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to User Management > All Users.
3. Locate MEMBER2 (approved).
4. Click **Deactivate** (or equivalent).

**Expected Result:**
- MEMBER2's `status` changes to `'deactivated'` in the database.
- If MEMBER2 is currently logged in, their next page navigation or API request returns a 401/403 or redirects to a "deactivated account" page.
- MEMBER2 cannot log in again until re-activated.

---

### 2.4 Reassign Ministry

---

**TC-USR-006**
**Description:** Admin reassigns a user to a different ministry.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to User Management > All Users.
3. Locate MEMBER1 (currently in "Worship" ministry).
4. Click **Edit** or the ministry field.
5. Change ministry to "Media".
6. Save the change.

**Expected Result:**
- MEMBER1's ministry is updated to "Media" in the database.
- If MEMBER1 is currently logged in and refreshes the page, their displayed ministry updates to "Media".
- MEMBER1's inventory items, requests, and repairs still display correctly (no orphaned references).

---

**TC-USR-007**
**Description:** Admin reassigns a user to the "Admin" ministry, granting admin access.
**Steps:**
1. Log in as ADMIN1.
2. Locate MEMBER2 in User Management.
3. Change MEMBER2's ministry to "Admin".
4. Save.
5. Log in as MEMBER2 in a separate session.

**Expected Result:**
- MEMBER2 now sees the admin navigation and dashboard.
- MEMBER2 can access `/admin/users` without being redirected.

---

### 2.5 View All Users

---

**TC-USR-008**
**Description:** Admin sees a complete list of all users regardless of status.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to User Management > All Users (no filter).

**Expected Result:**
- All users are listed (approved, pending, rejected/deactivated).
- Each row shows: full name, email, ministry, status, registration date.
- Total count matches the database row count in the `profiles` (or `users`) table.

---

---

## Feature 3 — Inventory Management

### 3.1 View All Items

---

**TC-INV-001**
**Description:** Authenticated member sees all inventory items regardless of ministry.
**Steps:**
1. Log in as MEMBER1 (Worship ministry).
2. Navigate to `/inventory`.

**Expected Result:**
- Items belonging to all ministries (Worship, Media, Engineering, Youth, etc.) are visible in the list.
- Each item card/row shows: item name, category, ministry, location, quantity/serial, status.
- No "access denied" or filtered view limiting to MEMBER1's ministry only.

---

**TC-INV-002**
**Description:** Unauthenticated user cannot view inventory.
**Steps:**
1. Log out.
2. Navigate to `/inventory`.

**Expected Result:**
- Redirect to `/login`. No inventory data is rendered.

---

### 3.2 Filter and Search

---

**TC-INV-003**
**Description:** Filter inventory by ministry.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to `/inventory`.
3. Select "Media" from the ministry filter dropdown.

**Expected Result:**
- Only items with `ministry = 'Media'` are displayed.
- Items from other ministries are hidden.
- Item count updates to reflect the filtered result.

---

**TC-INV-004**
**Description:** Filter inventory by category.
**Steps:**
1. Navigate to `/inventory`.
2. Select a specific category (e.g., "Electronics") from the category filter.

**Expected Result:**
- Only items with `category = 'Electronics'` are shown.
- Items from other categories are not displayed.

---

**TC-INV-005**
**Description:** Filter inventory by status.
**Steps:**
1. Navigate to `/inventory`.
2. Select "Damaged" from the status filter.

**Expected Result:**
- Only items with `status = 'damaged'` are displayed.
- Items with status "Available", "Under Repair", etc., are hidden.

---

**TC-INV-006**
**Description:** Search inventory by item name (partial match).
**Steps:**
1. Navigate to `/inventory`.
2. In the search bar, type `micro` (partial word matching items like "Microphone", "Microphone Stand").

**Expected Result:**
- Only items whose names contain "micro" (case-insensitive) are shown.
- Results update as the user types (live search) or after pressing Enter.
- Items with non-matching names are hidden.

---

**TC-INV-007**
**Description:** Combined filter and search returns intersection of results.
**Steps:**
1. Navigate to `/inventory`.
2. Select ministry "Media".
3. Type `cable` in the search bar.

**Expected Result:**
- Only items that are BOTH in the "Media" ministry AND have "cable" in the name are displayed.
- Items matching only one condition are excluded.

---

**TC-INV-008**
**Description:** Clearing filters restores full inventory list.
**Steps:**
1. Apply a ministry filter to narrow results.
2. Click **Clear Filters** (or reset button).

**Expected Result:**
- All inventory items are shown again.
- Filter dropdowns reset to "All" / blank state.

---

### 3.3 Add Item — Quantity Type

---

**TC-INV-009**
**Description:** Admin adds a new quantity-type inventory item with all fields and image.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Add Item (e.g., `/inventory/add` or a "+ Add Item" button).
3. Enter name: `Folding Chair`.
4. Enter description: `Plastic folding chair for events.`
5. Select category: `Furniture`.
6. Select ministry: `Worship`.
7. Select location: (pick an existing approved location).
8. Select type: `Quantity`.
9. Enter quantity: `50`.
10. Upload an image file: a valid JPG under 5 MB.
11. Click **Save** / **Submit**.

**Expected Result:**
- Item is created successfully. User is redirected to the item detail page or the inventory list.
- The item appears in `/inventory` with all entered fields displayed correctly.
- Image is visible on the item card/detail page, served from Supabase Storage URL.
- A Stock Ledger entry is created with `qty_change = +50`, `action_type = 'stock_in'` (or `'initial'`), and the performing user's ID.
- Database row has `item_type = 'quantity'`, `qty = 50`.

---

**TC-INV-010**
**Description:** Admin adds a new individual-type item (with serial number).
**Steps:**
1. Navigate to Add Item.
2. Enter name: `Dell Laptop`.
3. Select type: `Individual`.
4. Enter serial number: `SN-DELL-2024-001`.
5. Fill remaining required fields (category, ministry, location).
6. Click **Submit**.

**Expected Result:**
- Item is created with `item_type = 'individual'` and `serial_number = 'SN-DELL-2024-001'` in the database.
- The `qty` field is absent or null (not applicable for individual items).
- The item detail page shows the serial number field, not a quantity field.
- No quantity-based stock ledger entry is required for the initial creation (or a single entry with qty_change = 1 is acceptable; document the behavior).

---

**TC-INV-011**
**Description:** Member can quick-add an item to their own ministry.
**Steps:**
1. Log in as MEMBER1 (Worship ministry).
2. Locate the "Quick Add" or "Add Item" shortcut on the dashboard or inventory page.
3. Fill in item fields (name, category, location, quantity).
4. Note: ministry dropdown should default to or be locked to "Worship".
5. Submit.

**Expected Result:**
- Item is created with `ministry = 'Worship'` (MEMBER1's ministry).
- The item appears in `/inventory`.
- MEMBER1 is not presented with a dropdown to select another ministry (field is pre-filled and ideally read-only).

---

**TC-INV-012**
**Description:** Add item form validation — required fields empty.
**Steps:**
1. Navigate to Add Item (as ADMIN1).
2. Leave all fields blank.
3. Click **Submit**.

**Expected Result:**
- Form submission is blocked.
- Validation errors appear on all required fields (at minimum: name, category, ministry, type).
- No database record is created.

---

### 3.4 Edit Item (Admin Only)

---

**TC-INV-013**
**Description:** Admin successfully edits an existing item's metadata.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to an existing item's detail page.
3. Click **Edit**.
4. Change the description to `Updated description text.`
5. Change location to a different existing location.
6. Click **Save**.

**Expected Result:**
- Item detail page reflects the updated description and location.
- Changes are persisted in the database (`updated_at` timestamp is updated).
- No stock ledger entry is created for a metadata-only edit (quantity unchanged).

---

**TC-INV-014**
**Description:** Non-admin member cannot see or access the Edit button on an item.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to any item detail page.

**Expected Result:**
- No "Edit" button is rendered on the page for MEMBER1.
- Directly navigating to `/inventory/[id]/edit` returns a 403 or redirects to the item detail page with an error.

---

### 3.5 Image Upload

---

**TC-INV-015**
**Description:** Image upload succeeds with a valid image file.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Add Item or Edit Item.
3. Upload a valid PNG file (under 5 MB).
4. Submit the form.

**Expected Result:**
- Image is stored in Supabase Storage.
- The item's `image_url` field in the database contains a valid Supabase Storage public URL.
- The image renders correctly on the item detail page.

---

**TC-INV-016**
**Description:** Upload of a non-image file is rejected.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Add Item.
3. Attempt to upload a `.pdf` or `.exe` file in the image upload field.

**Expected Result:**
- Upload is rejected either at the file picker level (accept attribute restricts file types) or upon submission (server returns an error).
- An error message is displayed: e.g., "Only image files are allowed (JPG, PNG, GIF, WebP)."
- No `.pdf` or `.exe` file is stored in Supabase Storage.

---

### 3.6 Item Detail Page

---

**TC-INV-017**
**Description:** Item detail page shows all metadata fields.
**Steps:**
1. Navigate to an item's detail page (click item from inventory list).

**Expected Result:**
- The following fields are visible: name, description, category, ministry, location, status, item type (quantity/individual), quantity OR serial number (whichever applies), image (if uploaded), created date, last updated date.
- Stock history timeline / ledger entries are displayed in chronological order (see Feature 4).

---

### 3.7 Stock History Timeline

---

**TC-INV-018**
**Description:** Item detail page shows stock history timeline.
**Steps:**
1. Perform at least 2 stock movements on a quantity-type item (e.g., a Stock In of 10, then a Stock Out of 3).
2. Navigate to that item's detail page.
3. Locate the stock history / ledger section.

**Expected Result:**
- Each ledger entry is displayed in reverse-chronological order (newest first) or chronological order (consistent with design).
- Each entry shows: date/time, action type (Stock In / Stock Out / Adjustment / Transfer), qty_change (+10, -3), running balance after the action, and the name of the user who performed the action.

---

---

## Feature 4 — Stock Ledger

### 4.1 Stock In

---

**TC-LED-001**
**Description:** Stock In action creates a positive ledger entry.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to an existing quantity-type item with qty = 20.
3. Perform a Stock In of 15 units.
4. Check the item's stock history.

**Expected Result:**
- A new ledger entry exists with: `action_type = 'stock_in'`, `qty_change = +15`, `performed_by = ADMIN1's user ID`.
- The item's `qty` in the main inventory table updates to 35.
- Running balance on the ledger entry shows 35.

---

### 4.2 Stock Out

---

**TC-LED-002**
**Description:** Stock Out action creates a negative ledger entry.
**Steps:**
1. Navigate to the same item (qty = 35 after TC-LED-001).
2. Perform a Stock Out of 10 units.

**Expected Result:**
- A new ledger entry with `action_type = 'stock_out'`, `qty_change = -10`.
- Item `qty` updates to 25.
- Running balance = 25.

---

### 4.3 Adjustment

---

**TC-LED-003**
**Description:** Adjustment creates a signed ledger entry (positive or negative).
**Steps:**
1. Navigate to a quantity-type item with qty = 25.
2. Perform an Adjustment of -5 (correction for lost items).

**Expected Result:**
- Ledger entry with `action_type = 'adjustment'`, `qty_change = -5`.
- Item `qty` updates to 20.

---

### 4.4 Transfer

---

**TC-LED-004**
**Description:** Transfer between ministries creates two ledger entries.
**Steps:**
1. Navigate to a quantity-type item owned by "Worship" ministry, qty = 20.
2. Initiate a Transfer of 5 units to "Media" ministry.
3. Confirm the transfer.

**Expected Result:**
- Two ledger entries are created:
  - Entry 1: `action_type = 'transfer_out'`, `qty_change = -5`, associated with source item (Worship).
  - Entry 2: Either a new item record or an existing item in "Media" ministry gets `action_type = 'transfer_in'`, `qty_change = +5`.
- Source item qty decreases to 15.
- Destination ministry's item qty increases by 5 (or a new item with qty=5 is created in Media).
- Both entries reference `performed_by = ADMIN1` (or whoever initiated).

---

### 4.5 Running Balance Integrity

---

**TC-LED-005**
**Description:** Running balance equals the sum of all ledger entries for an item.
**Steps:**
1. Pick an item with at least 5 ledger entries.
2. Sum all `qty_change` values across every ledger row for that item in the database.
3. Compare to the item's current `qty` in the inventory table.

**Expected Result:**
- `SUM(ledger.qty_change WHERE item_id = X) == inventory.qty WHERE id = X`
- No discrepancy. If there is one, the test fails.

---

### 4.6 Ledger Immutability

---

**TC-LED-006**
**Description:** Ledger entries cannot be edited or deleted via the UI.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to any item's stock history.
3. Attempt to find an Edit or Delete button on any ledger entry.

**Expected Result:**
- No edit or delete controls exist on ledger entries in the UI.
- Directly calling `DELETE /rest/v1/stock_ledger?id=eq.<id>` via Supabase REST API (with ADMIN1's JWT) returns a 403 or the RLS policy blocks the deletion (0 rows affected).

---

### 4.7 Performed-By Attribution

---

**TC-LED-007**
**Description:** Each ledger entry records the performing user.
**Steps:**
1. Log in as MEMBER1.
2. Perform a Stock In action (if members are allowed) or log in as ADMIN1 and perform one.
3. Check the ledger entry in the DB or on the item detail page.

**Expected Result:**
- The ledger entry's `performed_by` field contains the correct user ID.
- The item detail page renders the user's name (not just the UUID) next to the ledger entry.

---

---

## Feature 5 — Item Requests

### 5.1 Request Existing Item

---

**TC-REQ-001**
**Description:** Member submits a request for an existing catalog item.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to Requests > New Request (or a "Request Item" button).
3. Search/select an existing item: `Folding Chair`.
4. Current stock for the item should be visible (e.g., "50 available").
5. Enter quantity: `5`.
6. Enter reason: `Needed for Sunday service setup.`
7. Enter needed_by date: a date 2 weeks from today.
8. Submit.

**Expected Result:**
- Request is created with `item_id` populated, `custom_item_name = null`, `quantity = 5`, `reason = 'Needed for Sunday service setup.'`, `needed_by = [date]`, `status = 'pending'`, `requested_by = MEMBER1's ID`.
- MEMBER1 is redirected to their requests list or a success confirmation.
- The request appears in ADMIN1's pending requests dashboard.

---

### 5.2 Free-Text Request

---

**TC-REQ-002**
**Description:** Member submits a request for a non-catalog item using free text.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to New Request.
3. Choose "Request Item Not in Catalog" or leave the item search blank.
4. Enter custom item name: `Portable Bluetooth Speaker`.
5. Enter quantity: `2`.
6. Enter reason: `For small group outdoor activity.`
7. Enter needed_by date.
8. Submit.

**Expected Result:**
- Request is created with `item_id = null`, `custom_item_name = 'Portable Bluetooth Speaker'`, `quantity = 2`, `status = 'pending'`.
- Request appears in admin dashboard with the custom item name displayed.

---

### 5.3 Request Window Enforcement

---

**TC-REQ-003**
**Description:** Request is blocked outside the allowed alternating-week window.
**Steps:**
1. Confirm the current date falls in a "blocked" week (odd/even week number based on app's schedule rule).
2. Log in as MEMBER1.
3. Navigate to New Request.

**Expected Result:**
- The New Request form is NOT accessible.
- A banner or page message is shown: e.g., "Request submission is only allowed on designated weeks. The next request window opens on [date]."
- The next allowed date is calculated and displayed accurately.
- The submit button is either hidden or disabled.

---

**TC-REQ-004**
**Description:** Request is allowed during an open window.
**Steps:**
1. Confirm the current date falls in an "open" request week.
2. Log in as MEMBER1.
3. Navigate to New Request.

**Expected Result:**
- The request form is fully accessible with no blocking banner.
- Member can submit the request normally.

---

**TC-REQ-005**
**Description:** In-app banner shows next request window when in a blocked week.
**Steps:**
1. During a blocked week, log in as MEMBER1.
2. Navigate to `/dashboard` or `/requests`.

**Expected Result:**
- A visible banner/alert is displayed on the page stating the next open request date.
- The calculated next open date is correct (based on the alternating-week algorithm).
- The banner is non-blocking (does not prevent browsing inventory or other features).

---

### 5.4 Admin Views Requests

---

**TC-REQ-006**
**Description:** Admin sees all pending requests in the dashboard.
**Steps:**
1. Ensure at least 3 pending requests from different members exist.
2. Log in as ADMIN1.
3. Navigate to the admin dashboard or Requests section.

**Expected Result:**
- All pending requests are listed regardless of requester's ministry.
- Each request row shows: requester name, item name (or custom item name), quantity, reason, needed_by date, submission date, status.

---

### 5.5 Admin Approve Request

---

**TC-REQ-007**
**Description:** Admin fully approves a request (approved_quantity = requested_quantity).
**Steps:**
1. Log in as ADMIN1.
2. Locate MEMBER1's pending request for 5 Folding Chairs (from TC-REQ-001).
3. Click **Approve**.
4. Set approved_quantity to `5`.
5. Confirm.

**Expected Result:**
- Request `status` changes to `'approved'`, `approved_quantity = 5`.
- A Stock Out ledger entry is created: `action_type = 'stock_out'`, `qty_change = -5` for the Folding Chair item.
- Folding Chair's `qty` decreases by 5 in the inventory table.
- MEMBER1 receives an in-app notification: "Your request for Folding Chair (x5) has been approved."

---

### 5.6 Admin Partial Approval

---

**TC-REQ-008**
**Description:** Admin partially approves a request (approved_quantity < requested).
**Steps:**
1. Log in as ADMIN1.
2. Locate a pending request for 10 units of an item.
3. Click **Approve** and set approved_quantity to `4`.
4. Confirm.

**Expected Result:**
- Request `status = 'approved'`, `approved_quantity = 4`.
- Stock Out ledger entry created for -4 (not -10).
- Item qty decreases by 4.
- MEMBER1's notification states: "Your request for [item] was partially approved. You requested 10; 4 were approved."

---

### 5.7 Admin Reject Request

---

**TC-REQ-009**
**Description:** Admin rejects a request with a reason note.
**Steps:**
1. Log in as ADMIN1.
2. Locate a pending request.
3. Click **Reject**.
4. Enter admin_notes: `Item currently reserved for Sunday service.`
5. Confirm rejection.

**Expected Result:**
- Request `status = 'rejected'`, `admin_notes = 'Item currently reserved for Sunday service.'`.
- No stock ledger entry is created.
- Item qty is unchanged.
- Requester receives a notification: "Your request for [item] was rejected. Note: Item currently reserved for Sunday service."

---

### 5.8 Convert Free-Text Request to Inventory Item

---

**TC-REQ-010**
**Description:** Admin converts a free-text request into a new inventory item.
**Steps:**
1. Log in as ADMIN1.
2. Locate a pending free-text request (custom_item_name = `Portable Bluetooth Speaker`).
3. Click **Convert to Inventory Item** (or equivalent action).
4. Fill in item details (category, location, qty).
5. Confirm.

**Expected Result:**
- A new inventory item is created with `name = 'Portable Bluetooth Speaker'`.
- The request's `item_id` is updated to reference the new inventory item.
- Request `status` may change to `'approved'` or remain pending for a separate approval step (document which behavior applies).
- The new item appears in `/inventory`.

---

### 5.9 Request Visibility

---

**TC-REQ-011**
**Description:** Member can only see their own requests.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to My Requests.

**Expected Result:**
- Only requests where `requested_by = MEMBER1's ID` are shown.
- Requests submitted by MEMBER2 are NOT visible.

---

**TC-REQ-012**
**Description:** Admin can see all requests from all members.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Requests (admin view).

**Expected Result:**
- Requests from all members are listed.
- Column for "Requested By" shows each member's name.

---

---

## Feature 6 — Repair Reporting

### 6.1 Report a Broken Item

---

**TC-REP-001**
**Description:** Member reports an item as broken.
**Steps:**
1. Log in as MEMBER1 (Worship ministry).
2. Navigate to an item belonging to a DIFFERENT ministry (e.g., a Media camera).
3. Click **Report as Broken** or navigate to Repairs > New Report.
4. Select the item.
5. Enter description: `LCD screen cracked after dropping.`
6. Click **Submit**.

**Expected Result:**
- Repair report is created with `item_id = [camera's id]`, `description = 'LCD screen cracked after dropping.'`, `status = 'reported'`, `reported_by = MEMBER1's ID`, `assigned_to_ministry = 'Engineering'` (default).
- The item's `status` in the inventory table changes to `'damaged'`.
- Repair report appears in admin's repair queue.

---

**TC-REP-002**
**Description:** Repair report rejected if description is empty.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to New Repair Report.
3. Select an item.
4. Leave description blank.
5. Click **Submit**.

**Expected Result:**
- Form submission blocked.
- Validation error on description field: "Description is required."
- No repair report created.

---

### 6.2 Repair Assignment

---

**TC-REP-003**
**Description:** Default assignment is Engineering ministry.
**Steps:**
1. Submit a repair report (TC-REP-001 result).
2. Check the repair record in the database or UI.

**Expected Result:**
- `assigned_to_ministry = 'Engineering'` by default.
- The engineering ministry's repair queue shows this report.

---

**TC-REP-004**
**Description:** Admin reassigns repair to a different ministry.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Repairs.
3. Locate the repair from TC-REP-001.
4. Change `assigned_to_ministry` to `Media`.
5. Save.

**Expected Result:**
- Repair record updates `assigned_to_ministry = 'Media'`.
- The repair no longer appears in Engineering's queue; it appears in Media's queue.
- Reporter (MEMBER1) does NOT need to take any action.

---

### 6.3 Status Flow

---

**TC-REP-005**
**Description:** Admin advances repair status through all stages.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to the repair report from TC-REP-001 (status: `Reported`).
3. Change status to `Acknowledged`. Save.
4. Change status to `In Progress`. Save.
5. Change status to `Completed`. Add resolution notes: `Screen replaced with spare unit.` Save.

**Expected Result:**
- After step 3: `status = 'acknowledged'`. MEMBER1 receives a notification.
- After step 4: `status = 'in_progress'`. MEMBER1 receives a notification.
- After step 5: `status = 'completed'`, `resolution_notes = 'Screen replaced with spare unit.'`. Item's inventory `status` changes back to `'available'` (or equivalent). MEMBER1 receives a notification.

---

**TC-REP-006**
**Description:** Repair status set to "Cannot Repair" with notes.
**Steps:**
1. Start from an `in_progress` repair.
2. Change status to `Cannot Repair`.
3. Enter resolution notes: `Part unavailable. Item to be disposed.`
4. Save.

**Expected Result:**
- `status = 'cannot_repair'`, `resolution_notes` saved.
- Item `status` in inventory changes to `'decommissioned'` or remains `'damaged'` (document actual behavior).
- Reporter receives notification of the outcome.

---

### 6.4 Repair Transparency

---

**TC-REP-007**
**Description:** All members can view all repair reports.
**Steps:**
1. Log in as MEMBER2 (Media ministry).
2. Navigate to Repairs.

**Expected Result:**
- Repair reports from all ministries are visible (not just Media's).
- Each report shows: item name, reported by, description, assigned ministry, current status, last updated date.

---

### 6.5 Repair Notification to Reporter

---

**TC-REP-008**
**Description:** Reporter receives notification on each status change.

*Covered in detail in Feature 7. Cross-reference: TC-NOTIF-003.*

---

---

## Feature 7 — Notifications (In-App)

### 7.1 Notification Creation

---

**TC-NOTIF-001**
**Description:** Notification created when a request is approved.
**Steps:**
1. Admin approves MEMBER1's request (TC-REQ-007).
2. Log in (or switch to) MEMBER1.

**Expected Result:**
- A notification exists for MEMBER1 with message referencing the approved request.
- Notification `is_read = false`.
- Notification type = `'request_approved'` (or equivalent).

---

**TC-NOTIF-002**
**Description:** Notification created when a request is rejected.
**Steps:**
1. Admin rejects MEMBER1's request (TC-REQ-009).
2. Check MEMBER1's notifications.

**Expected Result:**
- Notification created for MEMBER1 referencing the rejection and the admin_notes content.
- `is_read = false`.

---

**TC-NOTIF-003**
**Description:** Notification created on each repair status change.
**Steps:**
1. MEMBER1 reported a repair (TC-REP-001).
2. Admin changes status to `Acknowledged`.
3. Log in as MEMBER1.

**Expected Result:**
- MEMBER1 has a new notification: e.g., "Your repair report for [item] is now Acknowledged."
- Repeat for each subsequent status change (In Progress, Completed, Cannot Repair) — a notification is generated for each.

---

### 7.2 Badge Count

---

**TC-NOTIF-004**
**Description:** Unread notification count badge appears in navigation.
**Steps:**
1. Ensure MEMBER1 has 3 unread notifications.
2. Log in as MEMBER1.
3. Observe the navigation bar (bell icon or notifications link).

**Expected Result:**
- A numeric badge (e.g., "3") is displayed on the notification icon.
- The badge count exactly matches the number of unread notifications in the database for MEMBER1.

---

**TC-NOTIF-005**
**Description:** Badge count decrements when notifications are read.
**Steps:**
1. MEMBER1 has 3 unread notifications and badge shows "3".
2. Click on one notification to read it.
3. Observe badge count.

**Expected Result:**
- Badge count decreases to "2".
- The clicked notification's `is_read` field changes to `true` in the database.

---

**TC-NOTIF-006**
**Description:** Badge disappears when all notifications are read.
**Steps:**
1. MEMBER1 has 1 unread notification.
2. Click the notification to mark it read.

**Expected Result:**
- Badge count disappears entirely (no "0" badge shown — the badge is hidden when count is zero).

---

### 7.3 Mark All as Read

---

**TC-NOTIF-007**
**Description:** "Mark All as Read" button marks all unread notifications as read.
**Steps:**
1. MEMBER1 has 5 unread notifications.
2. Click **Mark All as Read**.

**Expected Result:**
- All 5 notifications have `is_read = true` in the database.
- Badge count disappears from the nav.
- Each notification in the list shows a "read" visual state (e.g., no bold, lighter background).

---

### 7.4 Notification Isolation

---

**TC-NOTIF-008**
**Description:** Members can only see their own notifications.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to Notifications.

**Expected Result:**
- Only notifications where `user_id = MEMBER1's ID` are shown.
- Notifications intended for MEMBER2 or ADMIN1 are NOT visible.
- Direct Supabase REST call `GET /rest/v1/notifications?user_id=eq.<MEMBER2_ID>` with MEMBER1's JWT returns 0 rows (RLS blocks it).

---

---

## Feature 8 — Storage Location Suggestions

### 8.1 Suggest New Location

---

**TC-LOC-001**
**Description:** Member suggests a new storage location while adding an item.
**Steps:**
1. Log in as MEMBER1.
2. Navigate to Add Item (quick add for their ministry).
3. In the location field, find the option to suggest a new location.
4. Enter suggested location: `Stage Left Storage Cabinet`.
5. Submit the suggestion (may be a separate action or bundled with the item submission).

**Expected Result:**
- A location suggestion record is created in the database with `name = 'Stage Left Storage Cabinet'`, `suggested_by = MEMBER1's ID`, `status = 'pending'`.
- The suggestion does NOT immediately appear in the location dropdown for other users.
- Admin's Settings or Location Suggestions page shows the new suggestion.

---

### 8.2 Admin Approves Location

---

**TC-LOC-002**
**Description:** Admin approves a pending location suggestion.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Settings > Location Suggestions.
3. Locate `Stage Left Storage Cabinet` suggestion.
4. Click **Approve**.

**Expected Result:**
- Location record `status` changes to `'approved'`.
- `Stage Left Storage Cabinet` now appears in the location dropdown for all users when adding/editing items.

---

**TC-LOC-003**
**Description:** Admin rejects a pending location suggestion.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Settings > Location Suggestions.
3. Locate a pending suggestion.
4. Click **Reject**.

**Expected Result:**
- Suggestion `status = 'rejected'`.
- The location does NOT appear in any dropdown.
- The suggesting member may optionally receive a notification (document if implemented).

---

---

## Feature 9 — Dashboard

### 9.1 Admin Dashboard

---

**TC-DASH-001**
**Description:** Admin dashboard shows correct pending requests count.
**Steps:**
1. Note the exact number of pending requests in the database.
2. Log in as ADMIN1.
3. View the admin dashboard's "Pending Requests" widget.

**Expected Result:**
- The widget displays the exact count matching the database.
- Clicking the widget navigates to the full requests list filtered to "Pending".

---

**TC-DASH-002**
**Description:** Admin dashboard shows correct open repairs count.
**Steps:**
1. Note the number of repair reports with `status NOT IN ('completed', 'cannot_repair')`.
2. Log in as ADMIN1.
3. View the "Open Repairs" widget.

**Expected Result:**
- Widget displays the exact count of open (non-closed) repair reports.

---

**TC-DASH-003**
**Description:** Admin dashboard shows low stock alerts.
**Steps:**
1. Set a quantity-type item's qty to a low value (e.g., below a defined threshold, say 5).
2. Log in as ADMIN1.
3. View the "Low Stock" widget or section.

**Expected Result:**
- The low-stock item appears in the alert list with its current quantity.
- Items above the threshold are NOT shown in the low stock list.

---

**TC-DASH-004**
**Description:** Admin dashboard shows recent activity feed.
**Steps:**
1. Perform several actions (stock in, approve request, submit repair) within the last 24 hours.
2. Log in as ADMIN1.
3. View the recent activity feed.

**Expected Result:**
- Each recent action is listed with: action description, item name, user who performed it, timestamp.
- Actions appear in reverse-chronological order (most recent first).

---

### 9.2 Member Dashboard

---

**TC-DASH-005**
**Description:** Member dashboard shows shortcut buttons.
**Steps:**
1. Log in as MEMBER1.
2. View the dashboard.

**Expected Result:**
- Shortcut buttons/cards are visible for: "Request Item", "Report Broken Item", "My Activity" (or similar labels).
- Clicking each shortcut navigates to the correct page.
- No admin-specific widgets are shown.

---

---

## Feature 10 — Settings (Admin)

### 10.1 Manage Ministries

---

**TC-SET-001**
**Description:** Admin adds a new ministry.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Settings > Ministries.
3. Enter new ministry name: `Outreach`.
4. Click **Add** / **Save**.

**Expected Result:**
- "Outreach" appears in the ministries list in Settings.
- "Outreach" is now available in the ministry dropdown when registering, adding items, or assigning users.
- Total ministry count increases by 1.

---

### 10.2 Manage Categories

---

**TC-SET-002**
**Description:** Admin adds a new inventory category.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Settings > Categories.
3. Enter new category: `Musical Instruments`.
4. Click **Add**.

**Expected Result:**
- "Musical Instruments" appears in the categories list in Settings.
- "Musical Instruments" is available in the category dropdown on Add Item / Edit Item forms.

---

### 10.3 Location Suggestions

---

**TC-SET-003**
**Description:** Admin views pending location suggestions in Settings.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Settings > Location Suggestions.

**Expected Result:**
- All pending suggestions are listed with: suggested location name, suggested by (user name), date suggested.
- Approved and rejected suggestions are either hidden or shown in separate sections.

*(Approve/reject flows covered in TC-LOC-002 and TC-LOC-003.)*

---

---

## Feature 11 — Mobile & Responsive

*For all tests in this feature, use Chrome DevTools > Device Toolbar set to iPhone 12 (390x844) unless otherwise noted. Alternatively, test on a physical Android/iOS device.*

### 11.1 Bottom Navigation

---

**TC-MOB-001**
**Description:** Bottom navigation bar renders on mobile viewport.
**Steps:**
1. Open the app in Chrome DevTools with iPhone 12 emulation.
2. Log in as MEMBER1.
3. Navigate to various pages (Dashboard, Inventory, Requests, Notifications).

**Expected Result:**
- A fixed bottom navigation bar is visible at the bottom of the screen.
- Navigation items include icons + labels for key sections.
- Tapping each nav item navigates to the correct page.
- The active/current page is visually highlighted in the bottom nav.

---

**TC-MOB-002**
**Description:** Top/sidebar navigation is hidden on mobile in favor of bottom nav.
**Steps:**
1. With mobile emulation active, observe the layout.

**Expected Result:**
- Desktop sidebar or top navigation is either hidden or replaced by the bottom nav on small viewports.
- No overlapping navigation elements.

---

### 11.2 Card Layouts

---

**TC-MOB-003**
**Description:** Inventory list uses card layout (not table) on mobile.
**Steps:**
1. Open `/inventory` on mobile emulation.

**Expected Result:**
- Items are displayed as cards (one per row, full width, or 2-column grid).
- No horizontal scrolling table is rendered.
- Each card shows key info (name, ministry, qty/serial, status) without truncation overflow.

---

### 11.3 Touch Targets

---

**TC-MOB-004**
**Description:** Interactive buttons meet 44x44 px minimum touch target size.
**Steps:**
1. On mobile emulation, navigate to the Inventory list, Request form, and Repair form.
2. Inspect buttons (Approve, Submit, Add Item, etc.) using DevTools > Inspect > computed styles.

**Expected Result:**
- All tappable buttons have height >= 44px and width >= 44px (or a touch area of at least 44x44 via padding).
- Buttons do not require precise tapping to activate.

---

### 11.4 Forms on Mobile

---

**TC-MOB-005**
**Description:** Request submission form is fully usable on a phone keyboard.
**Steps:**
1. Open New Request form on mobile emulation.
2. Tap each input field and type using the software keyboard (or DevTools emulation).
3. Fill in all fields and submit.

**Expected Result:**
- Input fields do not overlap the keyboard.
- The page scrolls to keep the active field visible when the keyboard appears.
- Dropdowns and date pickers are mobile-friendly (use native `<select>` or a scrollable picker, not mouse-hover menus).
- Form submits successfully from mobile layout.

---

---

## Feature 12 — Security & Row-Level Security (RLS)

### 12.1 Admin Endpoint Protection

---

**TC-SEC-001**
**Description:** Member cannot access admin-only API routes.
**Steps:**
1. Log in as MEMBER1 and capture the session JWT from Application > Cookies in DevTools.
2. Using curl or Postman, call an admin-only endpoint (e.g., `POST /api/admin/approve-user`) with MEMBER1's JWT.

**Expected Result:**
- Server returns HTTP 403 Forbidden.
- No data modification occurs.
- Response body contains an error message (e.g., `{"error": "Forbidden"}`).

---

**TC-SEC-002**
**Description:** Member cannot call approve-request endpoint for another user's request.
**Steps:**
1. Log in as MEMBER1.
2. Identify a pending request owned by MEMBER2.
3. Using DevTools or Postman, call `POST /api/requests/[id]/approve` with MEMBER1's JWT.

**Expected Result:**
- Server returns HTTP 403.
- Request status remains `'pending'`.

---

### 12.2 Inventory Modification Protection

---

**TC-SEC-003**
**Description:** Member cannot edit inventory items via direct API call.
**Steps:**
1. Use MEMBER1's JWT.
2. Call Supabase REST API: `PATCH /rest/v1/inventory?id=eq.<item_id>` with body `{"name": "Hacked Name"}`.

**Expected Result:**
- Supabase RLS rejects the update: 0 rows affected and/or HTTP 403.
- Item name in the database is unchanged.

---

**TC-SEC-004**
**Description:** Member cannot delete inventory items via direct API call.
**Steps:**
1. Use MEMBER1's JWT.
2. Call `DELETE /rest/v1/inventory?id=eq.<item_id>`.

**Expected Result:**
- 0 rows deleted. RLS blocks the operation.
- HTTP 403 or 200 with 0 affected rows.

---

### 12.3 Request Self-Approval Prevention

---

**TC-SEC-005**
**Description:** Member cannot approve their own request.
**Steps:**
1. Log in as MEMBER1.
2. Locate MEMBER1's own pending request.
3. Attempt to call the approval endpoint with MEMBER1's JWT.

**Expected Result:**
- Server returns 403.
- Request status unchanged.
- No stock ledger entry is created.

---

### 12.4 Unauthenticated Access

---

**TC-SEC-006**
**Description:** Unauthenticated request to Supabase REST API returns no data.
**Steps:**
1. Without any JWT (anonymous), call `GET /rest/v1/inventory`.
2. Without any JWT, call `GET /rest/v1/stock_ledger`.
3. Without any JWT, call `GET /rest/v1/requests`.

**Expected Result:**
- All requests return an empty array `[]` or HTTP 401/403 due to RLS denying anonymous reads.
- No inventory, ledger, or request data is exposed without authentication.

---

---

## Feature 13 — Keep-Alive Cron

---

**TC-CRON-001**
**Description:** /api/cron/keep-alive returns { ok: true } and pings the database.
**Steps:**
1. Send a GET request to `/api/cron/keep-alive` (can use curl, Postman, or browser).
   ```
   curl -X GET https://<app-url>/api/cron/keep-alive
   ```
2. Check the response body.
3. Verify in Supabase logs that a DB query was executed at the time of the request.

**Expected Result:**
- HTTP 200 response.
- Body: `{"ok": true}` (exact JSON).
- Supabase query logs show a simple query (e.g., `SELECT 1` or equivalent ping) executed within 1 second of the cron call.

---

**TC-CRON-002**
**Description:** Keep-alive endpoint is publicly accessible without authentication.
**Steps:**
1. Without any session or JWT, call `GET /api/cron/keep-alive`.

**Expected Result:**
- HTTP 200 and `{"ok": true}` returned.
- Endpoint does not require an authenticated session (it is intended to be called by a Vercel cron scheduler).

---

---

## Feature 14 — Edge Cases

### 14.1 Request Quantity Exceeds Stock

---

**TC-EDGE-001**
**Description:** Member requests a quantity greater than available stock.
**Steps:**
1. Identify a quantity-type item with qty = 5.
2. Log in as MEMBER1.
3. Submit a request for that item with quantity = 100.

**Expected Result:**
- Either:
  (a) Form validation blocks submission with message: "Only 5 units available. You cannot request more than the available stock.", OR
  (b) Request is submitted successfully (system allows over-requests and admin decides), with the current available stock shown prominently so the requester is informed.
- Document which behavior is implemented. If (b), the admin approve flow must enforce that approved_quantity cannot exceed current stock.

---

### 14.2 Repair Already-Damaged Item

---

**TC-EDGE-002**
**Description:** Reporting an item that already has status 'under_repair' or 'damaged'.
**Steps:**
1. Find an item with `status = 'damaged'` or `status = 'under_repair'`.
2. Log in as MEMBER1.
3. Attempt to submit a new repair report for that item.

**Expected Result:**
- Either:
  (a) A warning is shown: "This item is already marked as damaged/under repair. An existing repair report may be open." User can still proceed (duplicate reports allowed for separate incidents), OR
  (b) Submission is blocked with a link to the existing open repair report.
- Document which behavior applies. In either case, no uncaught runtime error occurs.

---

### 14.3 Duplicate Email Registration

*(Covered in TC-AUTH-006.)*

---

### 14.4 Non-Image File Upload

*(Covered in TC-INV-016.)*

---

### 14.5 Empty Form Submissions

---

**TC-EDGE-003**
**Description:** Empty submission on all critical forms.

| Form | Test Action | Expected |
|---|---|---|
| Login | Click Login with empty fields | Validation errors on email and password fields; no API call |
| Register | Click Register with all fields empty | All required fields show validation errors |
| Add Item | Click Save with all fields empty | Required fields flagged; no DB insert |
| New Request | Click Submit with no item and no quantity | Required fields flagged |
| New Repair | Click Submit with no item and no description | Required fields flagged |
| Stock In/Out | Enter quantity 0 or blank | Error: quantity must be a positive integer |

For each row: submit the empty/invalid form and confirm no database record is created and at least one validation error message is rendered inline.

---

### 14.6 Very Long Text Inputs

---

**TC-EDGE-004**
**Description:** Very long text does not break the UI or database.
**Steps:**
1. Log in as ADMIN1.
2. Navigate to Add Item.
3. In the description field, paste 5,000 characters of text (e.g., repeat "Lorem ipsum " 400 times).
4. Submit.

**Expected Result:**
- Either:
  (a) Form validation limits input to a defined max character count (e.g., 500 or 1000 chars) and shows an error: "Description cannot exceed 500 characters.", OR
  (b) Long text is accepted, stored in DB (column must be TEXT type, not VARCHAR with a short limit), and displayed in the UI without layout breakage (text wraps, no horizontal overflow).
- No database insertion error (e.g., string too long for column) crashes the form.
- Item detail page renders the long description without breaking the card/page layout.

---

**TC-EDGE-005**
**Description:** Very long item name does not break inventory list card layout.
**Steps:**
1. Create an item with name: `This Is A Very Long Item Name That Tests Layout Overflow Handling For Inventory Cards`.
2. Navigate to `/inventory`.

**Expected Result:**
- The item card shows the name with text truncation (ellipsis) or wrapping — it does NOT overflow outside the card boundary.
- No horizontal scroll is introduced on the inventory list page.

---

---

## Test Execution Tracking

Use the table below to track pass/fail status during test runs. Copy and fill in during execution.

| Test ID | Description | Tester | Date | Result | Notes |
|---|---|---|---|---|---|
| TC-AUTH-001 | Successful registration | | | Pass / Fail | |
| TC-AUTH-002 | 17 ministries in dropdown | | | Pass / Fail | |
| TC-AUTH-003 | Password mismatch blocked | | | Pass / Fail | |
| TC-AUTH-004 | Invalid email blocked | | | Pass / Fail | |
| TC-AUTH-005 | Empty registration blocked | | | Pass / Fail | |
| TC-AUTH-006 | Duplicate email blocked | | | Pass / Fail | |
| TC-AUTH-007 | Pending user blocked from protected pages | | | Pass / Fail | |
| TC-AUTH-008 | Pending page shows informative message | | | Pass / Fail | |
| TC-AUTH-009 | Successful login | | | Pass / Fail | |
| TC-AUTH-010 | Wrong password blocked | | | Pass / Fail | |
| TC-AUTH-011 | Pending account login blocked | | | Pass / Fail | |
| TC-AUTH-012 | Non-existent email blocked | | | Pass / Fail | |
| TC-AUTH-013 | Logout clears session | | | Pass / Fail | |
| TC-AUTH-014 | Session persists after refresh | | | Pass / Fail | |
| TC-AUTH-015 | Session persists after tab close | | | Pass / Fail | |
| TC-AUTH-016 | Admin UI shown for Admin ministry | | | Pass / Fail | |
| TC-AUTH-017 | Admin UI hidden for non-Admin member | | | Pass / Fail | |
| TC-AUTH-018 | Unauth redirect to /login | | | Pass / Fail | |
| TC-AUTH-019 | Authed redirect away from /login | | | Pass / Fail | |
| TC-USR-001 | Admin sees pending accounts | | | Pass / Fail | |
| TC-USR-002 | Non-admin blocked from user management | | | Pass / Fail | |
| TC-USR-003 | Admin approves account | | | Pass / Fail | |
| TC-USR-004 | Admin rejects account | | | Pass / Fail | |
| TC-USR-005 | Admin deactivates approved account | | | Pass / Fail | |
| TC-USR-006 | Admin reassigns ministry | | | Pass / Fail | |
| TC-USR-007 | Reassign to Admin grants admin role | | | Pass / Fail | |
| TC-USR-008 | Admin sees all users | | | Pass / Fail | |
| TC-INV-001 | Member sees all items cross-ministry | | | Pass / Fail | |
| TC-INV-002 | Unauth blocked from inventory | | | Pass / Fail | |
| TC-INV-003 | Filter by ministry | | | Pass / Fail | |
| TC-INV-004 | Filter by category | | | Pass / Fail | |
| TC-INV-005 | Filter by status | | | Pass / Fail | |
| TC-INV-006 | Search by name partial match | | | Pass / Fail | |
| TC-INV-007 | Combined filter + search | | | Pass / Fail | |
| TC-INV-008 | Clear filters restores list | | | Pass / Fail | |
| TC-INV-009 | Admin adds quantity-type item with image | | | Pass / Fail | |
| TC-INV-010 | Admin adds individual-type item | | | Pass / Fail | |
| TC-INV-011 | Member quick-add to own ministry | | | Pass / Fail | |
| TC-INV-012 | Add item empty form validation | | | Pass / Fail | |
| TC-INV-013 | Admin edits item metadata | | | Pass / Fail | |
| TC-INV-014 | Member cannot edit items | | | Pass / Fail | |
| TC-INV-015 | Valid image upload | | | Pass / Fail | |
| TC-INV-016 | Non-image upload rejected | | | Pass / Fail | |
| TC-INV-017 | Item detail shows all metadata | | | Pass / Fail | |
| TC-INV-018 | Item detail shows stock history | | | Pass / Fail | |
| TC-LED-001 | Stock In creates positive ledger entry | | | Pass / Fail | |
| TC-LED-002 | Stock Out creates negative ledger entry | | | Pass / Fail | |
| TC-LED-003 | Adjustment creates signed ledger entry | | | Pass / Fail | |
| TC-LED-004 | Transfer creates two ledger entries | | | Pass / Fail | |
| TC-LED-005 | Running balance integrity | | | Pass / Fail | |
| TC-LED-006 | Ledger is immutable | | | Pass / Fail | |
| TC-LED-007 | Ledger records performing user | | | Pass / Fail | |
| TC-REQ-001 | Member requests existing item | | | Pass / Fail | |
| TC-REQ-002 | Member submits free-text request | | | Pass / Fail | |
| TC-REQ-003 | Request blocked outside window | | | Pass / Fail | |
| TC-REQ-004 | Request allowed in open window | | | Pass / Fail | |
| TC-REQ-005 | Banner shows next window date | | | Pass / Fail | |
| TC-REQ-006 | Admin sees all pending requests | | | Pass / Fail | |
| TC-REQ-007 | Admin fully approves request | | | Pass / Fail | |
| TC-REQ-008 | Admin partially approves request | | | Pass / Fail | |
| TC-REQ-009 | Admin rejects request with notes | | | Pass / Fail | |
| TC-REQ-010 | Admin converts free-text to inventory item | | | Pass / Fail | |
| TC-REQ-011 | Member sees only own requests | | | Pass / Fail | |
| TC-REQ-012 | Admin sees all requests | | | Pass / Fail | |
| TC-REP-001 | Member reports item broken | | | Pass / Fail | |
| TC-REP-002 | Empty description blocked | | | Pass / Fail | |
| TC-REP-003 | Default assignment to Engineering | | | Pass / Fail | |
| TC-REP-004 | Admin reassigns repair ministry | | | Pass / Fail | |
| TC-REP-005 | Admin advances repair through all statuses | | | Pass / Fail | |
| TC-REP-006 | Cannot Repair status with notes | | | Pass / Fail | |
| TC-REP-007 | All members see all repairs | | | Pass / Fail | |
| TC-NOTIF-001 | Notification on request approved | | | Pass / Fail | |
| TC-NOTIF-002 | Notification on request rejected | | | Pass / Fail | |
| TC-NOTIF-003 | Notification on repair status change | | | Pass / Fail | |
| TC-NOTIF-004 | Badge count shows unread | | | Pass / Fail | |
| TC-NOTIF-005 | Badge decrements on read | | | Pass / Fail | |
| TC-NOTIF-006 | Badge hides at zero | | | Pass / Fail | |
| TC-NOTIF-007 | Mark all as read | | | Pass / Fail | |
| TC-NOTIF-008 | Member sees only own notifications | | | Pass / Fail | |
| TC-LOC-001 | Member suggests new location | | | Pass / Fail | |
| TC-LOC-002 | Admin approves location | | | Pass / Fail | |
| TC-LOC-003 | Admin rejects location | | | Pass / Fail | |
| TC-DASH-001 | Admin pending requests count | | | Pass / Fail | |
| TC-DASH-002 | Admin open repairs count | | | Pass / Fail | |
| TC-DASH-003 | Admin low stock alerts | | | Pass / Fail | |
| TC-DASH-004 | Admin recent activity feed | | | Pass / Fail | |
| TC-DASH-005 | Member shortcut buttons | | | Pass / Fail | |
| TC-SET-001 | Admin adds ministry | | | Pass / Fail | |
| TC-SET-002 | Admin adds category | | | Pass / Fail | |
| TC-SET-003 | Admin views location suggestions | | | Pass / Fail | |
| TC-MOB-001 | Bottom nav on mobile | | | Pass / Fail | |
| TC-MOB-002 | Desktop nav hidden on mobile | | | Pass / Fail | |
| TC-MOB-003 | Card layout on mobile | | | Pass / Fail | |
| TC-MOB-004 | Touch targets 44px minimum | | | Pass / Fail | |
| TC-MOB-005 | Forms usable on phone keyboard | | | Pass / Fail | |
| TC-SEC-001 | Member blocked from admin API routes | | | Pass / Fail | |
| TC-SEC-002 | Member cannot approve others' requests | | | Pass / Fail | |
| TC-SEC-003 | RLS blocks member inventory edit | | | Pass / Fail | |
| TC-SEC-004 | RLS blocks member inventory delete | | | Pass / Fail | |
| TC-SEC-005 | Member cannot self-approve request | | | Pass / Fail | |
| TC-SEC-006 | Unauth Supabase query returns no data | | | Pass / Fail | |
| TC-CRON-001 | Keep-alive returns ok:true and pings DB | | | Pass / Fail | |
| TC-CRON-002 | Keep-alive accessible without auth | | | Pass / Fail | |
| TC-EDGE-001 | Request qty exceeds stock | | | Pass / Fail | |
| TC-EDGE-002 | Report already-damaged item | | | Pass / Fail | |
| TC-EDGE-003 | Empty form submissions (all forms) | | | Pass / Fail | |
| TC-EDGE-004 | Very long description input | | | Pass / Fail | |
| TC-EDGE-005 | Very long item name layout | | | Pass / Fail | |

---

*End of Test Plan — JILGM Church Inventory & Supply Management System v1.0*
