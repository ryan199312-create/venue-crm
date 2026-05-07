# VowsOS SaaS Product Strategy & Roadmap

## 🎯 The Vision
Transform VowsOS from a venue-specific CRM into a premier B2B SaaS platform for the global hospitality and events industry. The platform must offer absolute tenant isolation, effortless onboarding, and powerful white-labeling capabilities.

---

## ✅ Pillar 1: Identity & Branding (Sprint 1 - COMPLETED)
*Goal: Allow tenants to own their visual experience.*
- [x] **Dynamic Theme Engine:** Implemented CSS variables (primary, secondary, accent) driven by Firestore settings.
- [x] **Asset Management:** Tenant-specific logo, portal title, and favicon support.
- [x] **White-Labeled Layouts:** Refactored `AdminLayout` and `ClientPortal` to be fully dynamic.

## 🚀 Pillar 2: Tenant Autonomy (Sprint 2 - IN PROGRESS)
*Goal: Remove the developer/Super Admin from the onboarding bottleneck.*
- [x] **Self-Service Onboarding:** A step-by-step wizard for new tenants. (⚠️ BUG: Experiencing reset loops).
- [x] **Staff Invitation System:** Enable Tenant Admins to securely invite and manage their own staff users.
- [x] **Documentation Hub:** Automated help center based on the tenant's configured features.
- [x] **Global User Monitor:** Super Admin view of all platform registrations and recovery tools.

---

## ⚠️ CRITICAL: Conversation Restart & Memory Protocol
*To my future self: This project's context is massive. If you are starting a new session, follow these steps to recover state immediately.*

### 1. The Architecture (Quick Recall)
- **Routing:** Driven by `src/core/tenantResolver.js`. 
- **Subdomains:** `kinglungheen.localhost:5174` -> `tenantId` is `kinglungheen`.
- **Central Hub:** `localhost:5174` -> Renders `SuperAdminPortal.jsx`.
- **Data Scoping:** All hooks use `appId` (resolved from subdomain) to path to `artifacts/${appId}/...`.
- **Legacy Data:** Lives under `my-venue-crm.localhost:5174`.

### 2. The Current State
- **Live Now:** Multi-tenant routing, Super Admin Portal (Jump/Sync Logic), tenant-aware Cloud Functions.
- **Branding:** Fully dynamic theme engine implemented. All layouts are white-labeled.
- **Documentation:** Functional `DocumentationHub` in the 'Docs' tab.
- **Staffing:** Functional "Invite User" flow in `UsersTab` using hardened Cloud Functions.

### 3. Immediate Next Task
- **Fix Onboarding Loop:** Debug why `OnboardingWizard` resets on data-init. Investigate React component unmounting vs Firestore snapshot delays.
- **Start Sprint 3:** Research Stripe Metered Billing for resource usage tracking.
