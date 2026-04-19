# Refactor Plan - Codebase Duplication & Patterns

This document outlines the duplicated patterns identified in the codebase and proposes a plan to refactor them into centralized utilities and components.

## 1. Identified Duplications

### 1.1 String & Currency Formatting
- **Pattern**: `Math.round(number).toLocaleString('en-US')`
- **Duplicated in**:
    - `src/helpers.js` (`formatMoney`)
    - `src/utils/vmsUtils.js` (`formatMoney`)
    - `src/website/Corporate.jsx` (`formatMoney`)
    - `src/website/Dining.jsx` (`formatMoney`)
- **Action**: Centralize all money formatting into `src/utils/formatters.js`. Standardize on one implementation that handles `null`, `undefined`, and comma-stripping consistently.

### 1.2 Date Handling & Formatting
- **Pattern**: `formatDateWithDay`, `formatDateEn`, and manual `new Date().toLocaleDateString()` calls.
- **Duplicated in**:
    - `src/helpers.js`
    - `src/utils/vmsUtils.js`
    - `src/admin/DocumentRenderer.jsx`
- **Pattern**: "10 days prior" calculation (`d.setDate(d.getDate() - 10)`)
- **Duplicated in**:
    - `src/admin/AdminApp.jsx`
    - `src/admin/DashboardView.jsx`
    - `src/admin/DocumentRenderer.jsx`
- **Pattern**: Overdue check logic (`new Date(date) < new Date().setHours(0,0,0,0)`)
- **Duplicated in**:
    - `src/components/ui.jsx`
    - `src/utils/vmsUtils.js` (`getOverdueStatus`)
- **Action**: Centralize date utilities into `src/utils/dateUtils.js`.

### 1.3 Billing & Calculation Logic
- **Pattern**: `generateBillingSummary` (Total calculation, service charge, CC surcharge).
- **Duplicated in**:
    - `src/billing.js`
    - `src/utils/vmsUtils.js`
- **Action**: Merge into a single `src/logic/billing.js` or `src/utils/billingUtils.js`. This is a critical duplication as any change to the business logic (e.g., service charge percentage) must currently be made in two places.

### 1.4 Validation & Normalization Logic
- **Pattern**: Phone number normalization (`replace(/[^0-9]/g, '')` and `852` prefixing).
- **Duplicated in**:
    - `src/admin/AdminApp.jsx`
    - Potentially others where SMS/WhatsApp is sent.
- **Pattern**: Required field validation before actions (`if (!field) return addToast(...)`).
- **Pattern**: Firebase Storage file name extraction (`getFileNameFromUrl`).
- **Duplicated in**:
    - `src/components/ui.jsx`
    - `src/admin/SettingsView.jsx` (implicitly)
- **Action**: Create a validation and normalization utility in `src/utils/logicUtils.js`.

### 1.5 UI Patterns & Toast Rendering
- **Pattern**: `toasts.map(...)` rendered manually in `AdminApp.jsx`.
- **Pattern**: `addToast` calls for generic success/error messages in `try-catch` blocks.
- **Action**: 
    - Move Toast rendering into `src/context/ToastContext.jsx` or a global `ToastContainer` component.
    - Create a standardized `asyncWrapper` that handles common errors and displays toasts automatically.

### 1.6 AI Prompt Engineering
- **Pattern**: Hardcoded system prompts and JSON parsing logic for AI responses.
- **Duplicated in**:
    - `src/components/AiAssistant.jsx`
    - `src/admin/EventFormModal.jsx`
    - `src/components/DataAssistant.jsx`
- **Action**: Centralize AI prompt templates and parsing logic (including markdown code block stripping) into `src/utils/aiUtils.js`.

---

## 2. Proposed Refactoring Steps

### Phase 1: Core Utilities (Highest Impact)
1. **Create `src/utils/formatters.js`**:
    - Move `formatMoney`, `safeFloat`, and standard string formatters here.
2. **Create `src/utils/dateUtils.js`**:
    - Move `formatDateWithDay`, `formatDateEn`.
    - Add helper `getDaysPrior(date, days)`.
3. **Consolidate Billing**:
    - Standardize on `src/billing.js` and remove duplicated logic from `vmsUtils.js`.

### Phase 2: Logic & Validation
1. **Create `src/utils/validation.js`**:
    - Add `normalizePhone(phone)`.
    - Add `validateEventData(data)` for common checks.
2. **AI Logic**:
    - Move prompt templates to a config file or `aiUtils.js`.

### Phase 3: UI & Contexts
1. **Toast Refactor**:
    - Update `ToastProvider` to handle its own rendering.
2. **Standardize Error Handling**:
    - Create a `useErrorHandler` hook or a utility to wrap async calls and provide consistent toast feedback.

---

## 3. Benefits
- **Maintainability**: Changes to billing logic or formatting only need to be made in one place.
- **Consistency**: All parts of the app (Admin, Website, Portal) will display dates and currency identically.
- **Reduced Bundle Size**: Eliminating duplicate code.
- **Reliability**: Centralized validation reduces the chance of missing checks in new features.
