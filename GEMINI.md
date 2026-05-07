# VowsOS SaaS: Master Context & Recovery

> **⚠️ STATE RECOVERY PROTOCOL:** Memory in long sessions is limited. If you are starting a new session or feel context is missing, immediately read **`VOWSOS_ROADMAP.md`**. It contains the current architectural state, subdomain routing logic, and the roadmap for upcoming sprints.

## Project Overview
This project is a CRM and Document Management system transitioned into a full SaaS platform named **VowsOS**. It handles event bookings, contract generation, floorplans, and billing across multiple tenants using subdomain isolation.

## Core Technologies
- **Frontend:** React, Tailwind CSS, Lucide React (icons)
- **Backend:** Firebase (Firestore, Functions, Hosting)
- **State Management:** React Context (Auth, Toast)
- **Styling:** Tailwind CSS with custom configurations

## Architectural Patterns
- **Feature-based structure:** Modules like `billing`, `documents`, `events`, and `settings` are located in `src/features/`.
- **Multi-Outlet Scalability:** The system supports multiple venues (outlets). Settings and data are scoped based on the selected venue.
- **Service Layer:** Business logic and calculations are abstracted into services (e.g., `billingService.js`).
- **Scoped Settings Resolver:** `getScopedSettings` in `helpers.js` merges global defaults with venue-specific overrides (logos, addresses, etc.).

## Key Modules

### Document System (`src/features/documents`)
The document system generates various printouts.
- `DocumentRouter.jsx`: The high-level router that delegates rendering to specialized sub-renderers.
- `renderers/`: Contains specialized rendering components (EO, Contract, Financials, etc.).
- `DocumentShared.jsx`: Contains shared UI components like `ItemTable` and `ClientInfoGrid`.

### Event Management (`src/features/events`)
Handles event details, forms, and lists. Uses `useEventForm` hook for core logic.
- `EventFormModal.jsx`: The primary interface for creating/editing events.
- `EventsListView.jsx`: Optimized list view with filtering by status, venue, and ownership.

### Billing Service (`src/services/billingService.js`)
The source of truth for all financial calculations, including `generateBillingSummary`.

## Multi-Outlet Architecture

### Scoped Settings
The system uses a hierarchical settings model. Global settings in `artifacts/${appId}/private/data/settings/config` provide defaults, while venue-specific overrides are stored under the `venues` key.
- **Helper:** `getScopedSettings(settings, venueId)` is used to resolve the active configuration.
- **Application:** Used in `EventFormModal`, `DocumentRouter`, and `ClientPortal` to ensure correct branding and rules are applied per venue.

### Data Isolation
- **Venue Filtering:** Most views (Dashboard, Event List) filter data based on `selectedVenueId` from `AuthContext`.
- **HQ View:** Users with `manage_all_outlets` permission can select "All Venues" (HQ View) to see aggregated data and performance metrics.
- **Auto-Defaulting:** New events are automatically assigned to the currently selected venue. Users without HQ access are automatically directed to their assigned venue upon login.

## Implementation Details

### Permissions & Security
- **AuthContext:** The source of truth for permissions via the `hasPermission` helper. 
- **Ownership Logic:** Management rights are determined by `isAdmin || !hasPermission('manage_own_only') || isOwner`. 
    - `isOwner` checks if the user's `displayName` is in `salesRep` or matches `clientEmail`.
- **Venue Access:** `userProfile.accessibleVenues` restricts which outlets a user can see in the switcher.

### SaaS & Multi-Tenant Architecture (VowsOS)

The system has transitioned into a full SaaS platform named **VowsOS**. It supports independent tenant organizations through subdomain isolation and a centralized management console.

### Multi-Tenancy Implementation
- **Tenant Resolver (`src/core/tenantResolver.js`):** Dynamically extracts the `tenantId` from the URL subdomain (e.g., `kinglungheen.localhost` -> `kinglungheen`).
- **Dynamic Scoping:** The `appId` in `AuthContext` is resolved via the subdomain. All Firestore paths and Cloud Function calls are scoped using this dynamic ID: `artifacts/${appId}/...`.
- **Subdomain Routing:** `App.jsx` conditionally renders the UI based on the domain:
    - **Root Domain (`localhost` / `vowsos.com`):** Renders the **Super Admin Portal**.
    - **Subdomain (`tenant.vowsos.com`):** Renders the Tenant Admin Dashboard and Client Portal.

### Super Admin Portal (`src/super-admin`)
A central console for platform-level management, restricted to the `super_admin` role.
- **Tenant Management:** Create and initialize new tenant environments.
- **System Bootstrapping:** Includes an emergency "Claim Super Admin" function for first-time setup on new environments.
- **Global Overview:** Monitor active tenants and platform health.

### Cloud Functions Refactoring
All backend logic in `functions/index.js` has been refactored to be tenant-aware. Every `onCall` function now extracts `appId` from the request payload to ensure strict data isolation between tenants.

## Refactoring Completed:
- [x] Renamed and moved files from legacy `src/admin/` to `src/features/`.
- [x] Implemented VowsOS Multi-Tenant SaaS architecture with subdomain routing.
- [x] Refactored all Cloud Functions for dynamic `appId` scoping.
- [x] Built the Super Admin Portal with tenant onboarding workflow.
- [x] Implemented `super_admin` role across RBAC and UI.
- [x] Removed legacy client-facing website files (`src/website/`).
- [x] **Sprint 1: Identity & Branding (VowsOS):** Implemented dynamic CSS variable theme engine, tenant-specific logo/favicon/title support, and fully white-labeled layouts for Admin and Client Portal.
- [x] **Sprint 2: Tenant Autonomy (Part 1):** 
    - [x] **Onboarding Wizard:** Multi-step setup for new tenants (Identity -> Colors -> Presence).
    - [x] **Staff Invitation:** Secure, tenant-scoped user creation and role assignment via Cloud Functions.
    - [x] **Super Admin Stability:** Resolved auth race conditions and added global user monitoring.
    - [x] **First-Time Flow Fix:** Added registration toggle to Login and fixed headless detection for zero-user tenants.
    - [x] **Data Sync Tool:** Built a cross-tenant sync tool in the Super Admin panel to push legacy data (my-venue-crm) to branded tenants.
    - [x] **Documentation Hub:** Automated help center for self-service support.

## Log for Future Self (Continuity)
- **Current State:** The platform is multi-tenant and white-labeled. 
- **Production Setup:** `kinglungheen` is the official branded tenant. `my-venue-crm` is the legacy production source.
- **Sync Workflow:** Use the **Sync Tool** in `localhost:5173/super-admin` to update `kinglungheen` from `my-venue-crm`.
- **Known Blocker:** The **Onboarding Wizard** currently experiences a reset loop on new tenants (like `weddingcorp`). Despite moving to a single-return tree and decoupling loading states, background data updates (profile/settings) can still trigger unmounting.
- **Architectural Note:** `AdminLayout.jsx` uses an early-return isolation pattern. `AuthContext.jsx` is the primary driver for `appSettings`.



## Security & Scoping Rules
- **Firestore:** Rules and Functions MUST validate `appId` in the path. NEVER use global collections without a tenant prefix.
- **Cloud Functions:** All functions (invite, PDF, SleekFlow) now support an optional `appId` parameter to ensure correct data targeting.

- **Security:** Firestore rules and Cloud Functions strictly validate `appId` and user roles (`admin` vs `super_admin`).
- **Bootstrap Note:** Use the root domain (`localhost:5174/super-admin`) to gain initial platform access via the "Bootstrap" button.
