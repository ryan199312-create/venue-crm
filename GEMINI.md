# Venue CRM Project Overview

This project is a CRM and Document Management system for a venue group. It handles event bookings, contract generation, floorplans, and billing across multiple outlets.

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

### Refactoring Completed:
- [x] Renamed and moved files from legacy `src/admin/` to `src/features/`.
- [x] Refactored `DocumentRenderer.jsx` into `DocumentRouter.jsx`.
- [x] Implemented Role-Based Access Control (RBAC) with custom roles.
- [x] Implemented Multi-Outlet scalability with scoped settings and data isolation.
- [x] Unified document financial presentation with right-aligned totals in `ItemTable`.
- [x] Removed redundant/legacy files from `src/admin/` to ensure a clean codebase.
- [x] Standardized prop naming (`appSettings`) across event form tabs.

## Next Steps
- Implement advanced reporting and analytics for HQ view.
- Enhance the Client Portal with more interactive features (e.g., seat planning).
- Ensure full type safety or consistent validation across the document data pipeline.

## SaaS Commercialization Roadmap
To transition this platform into a sellable B2B SaaS product, the following areas must be addressed:
- **Tenant Management:** Replace the static `appId` with a dynamic tenant resolver (via subdomains or login ID) to support independent customer organizations.
- **Advanced Branding (White-Labeling):** Fully externalize all UI assets (logos, colors, legal clauses) into the `venueProfile` settings. Use CSS variables for primary/secondary colors to allow one-click UI theming.
- **Self-Service Onboarding:** Build a setup wizard for new tenants to upload floorplans, define zones, and configure initial menus without developer intervention.
- **Subscription & Feature Gating:** Implement a Super Admin portal to manage tenant subscriptions and toggle features (e.g., AI Assistant, SMS integration) based on payment tiers.
- **Integration Layer:** Develop standard exports for common accounting (Xero) and marketing (Mailchimp) platforms to increase system stickiness.

## Log for Future Self (Continuity)
- **Current State:** The multi-outlet architecture is fully implemented and verified.
- **Source of Truth:** `helpers.js` -> `getScopedSettings` for configuration; `AuthContext.jsx` -> `selectedVenueId` for state.
- **Workflow:** When adding new features, always ensure they respect the `venueId` scoping and permission checks.
- **Legacy Note:** Legacy events without `venueId` are auto-resolved by matching `venueLocation` against outlet names in the `openEditModal` function.
