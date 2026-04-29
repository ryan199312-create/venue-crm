# Venue CRM Project Overview

This project is a CRM and Document Management system for a venue (King Lung Heen). It handles event bookings, contract generation, floorplans, and billing.

## Core Technologies
- **Frontend:** React, Tailwind CSS, Lucide React (icons)
- **Backend:** Firebase (Firestore, Functions, Hosting)
- **State Management:** React Context (Auth, Toast)
- **Styling:** Tailwind CSS with custom configurations

## Architectural Patterns
- **Feature-based structure:** Modules like `billing`, `documents`, `events`, and `settings` are located in `src/features/`.
- **Surgical Component Design:** Large components have been refactored into smaller, specialized sub-renderers.
- **Service Layer:** Business logic and calculations are abstracted into services (e.g., `billingService.js`).

## Key Modules

### Document System (`src/features/documents`)
The document system generates various printouts.
- `DocumentRouter.jsx`: (formerly `DocumentRenderer.jsx`) The high-level router for all document types. It delegates rendering to specialized components.
- `DocumentListView.jsx`: (formerly `DocsView.jsx`) Displays the list of available documents.
- `renderers/`: Contains specialized rendering components for different document types:
    - `EventOrderRenderer.jsx`: Handles Manager, Finance, and Banquet copies.
    - `BriefingRenderer.jsx`: Handles briefing documents.
    - `ContractRenderer.jsx`: Handles English and Chinese contracts.
    - `FinancialRenderers.jsx`: Handles Quotations, Invoices, and Receipts.
    - `FloorplanRenderer.jsx`: Handles floorplan visualization and appendix.
    - `OtherRenderers.jsx`: Handles Addendums, Internal Notes, and Menu Confirmations.
- `DocumentShared.jsx`: (formerly `BaseRenderers.jsx`) Contains shared UI components and utility functions used by all renderers.
    - `ItemTable`: Unified table component supporting integrated right-aligned financial summaries and payment status tracking.
    - `ClientInfoGrid`: Optimized, vertically compact grid for Bill To and Event Details with inline labels.

### Event Management (`src/features/events`)
Handles event details, forms, and lists. Includes the `FoodAndBeverageTab.jsx` (formerly `FnBTab.jsx`).

### Billing Service (`src/services/billingService.js`)
(formerly `vmsUtils.js`) The source of truth for all financial calculations in the system, including `generateBillingSummary`.

### Admin Section (`src/admin`)
- `AdminLayout.jsx`: (formerly `AdminApp.jsx`) The main wrapper for the admin portal.
- `AdminLogin.jsx`: (formerly `LoginView.jsx`) The login screen.
- `AdminDashboard.jsx`: (formerly `DashboardView.jsx`) The overview dashboard.

## Grand Scheme (Cleaning & Progress)
The primary goal is to maintain a lean, modular codebase by extracting logic into specialized services and components.

### Refactoring Completed:
- [x] Renamed files to more appropriate and descriptive names.
- [x] Refactored `DocumentRenderer.jsx` into `DocumentRouter.jsx`, moving all rendering logic to sub-renderers.
- [x] Synchronized `EventOrderRenderer.jsx` with the most robust internal logic.
- [x] Updated all imports and component references across the project.
- [x] Centralized shared document UI and utilities into `DocumentShared.jsx`.
- [x] Implemented Role-Based Access Control (RBAC) across the system, including custom roles and granular permissions.
- [x] Added User Management and Role Permissions tabs in Settings.
- [x] Integrated permissions into Event Form Tabs, Document Access, Financial Actions, and Data Access Restrictions.
- [x] Refactored Sales Representative field into a multi-select checkbox list linked to actual system users.
- [x] Unified document financial presentation with right-aligned totals in `ItemTable`.
- [x] Implemented "RECEIVED" payment badges for Invoices and Receipts.
- [x] Enhanced Addendum clarity with detailed breakdowns of original vs. new costs.

## Implementation Details

### Document Standards
- **Financial Alignment**: All totals must be right-aligned directly under the "Amount" column of the items table.
- **Visual Consistency**: High-contrast, bold labels with inline layouts for compact blocks. Use `break-all` for long dynamic text (like emails).
- **Styling**: Prefer clean, modern aesthetics (`slate-50` backgrounds, `slate-900` text) over heavy backgrounds for print reliability.

### Permissions & Security
- **AuthContext:** The source of truth for permissions via the `hasPermission` helper. 
- **Firestore Paths:** 
    - App Settings: `artifacts/${appId}/private/data/settings/config`
    - User Profiles: `artifacts/${appId}/private/data/users/${uid}`
    - Events: `artifacts/${appId}/private/data/events/${eventId}`
- **Ownership Logic:** Management rights are determined by `isAdmin || !hasPermission('manage_own_only') || isOwner`. 
    - `isOwner` checks if the user's `displayName` is included in the comma-separated `salesRep` string or matches `clientEmail`.
- **Cloud Functions:** Secure operations like `inviteUser`, `updateUserRoleSecure`, and `updateUserProfileSecure` should be preferred for Auth/Claims updates.

### User & Role Management
- **Users:** Display names and roles can be updated by Admins in `UsersTab.jsx`.
- **Roles:** The Role Permissions Matrix allows toggling granular access. Newly created roles default to empty permissions, which fall back to `DEFAULT_ROLE_PERMISSIONS` if uninitialized.
- **Sales Representatives:** Instead of free-text, the `salesRep` field in `BasicDetailsTab.jsx` is populated from the `users` collection. It stores selections as a comma-separated string (e.g., "Ryan, John").

## Next Steps
- Add new features to the system (as requested by the user).
- Continue to identify and remove any remaining redundant logic.
- Ensure full type safety or consistent validation across the document data pipeline.

## Log for Future Self (Continuity)
In case of a session reset or "hanging":
- **Current State:** The major refactoring and file renaming task is COMPLETE.
- **Verification:** All document types (EO, Briefing, Quotation, Contract, Invoice, Receipt, Menu Confirm, Addendum, Internal Notes, Floorplan) are now handled by their respective files in `src/features/documents/components/renderers/`.
- **Source of Truth:** `billingService.js` is the place for all money/math logic. `DocumentShared.jsx` is the place for all shared print UI.
- **Workflow:** When the user asks for a new feature, first check which feature module it belongs to in `src/features/`.
- **Note:** `DocumentRouter.jsx` is now very thin. If a new document type is added, add it to the `switch` statement there.
