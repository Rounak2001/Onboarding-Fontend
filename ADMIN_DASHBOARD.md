# Admin Dashboard — Architecture, Status & Approach

> Generated: 2026-04-10 | Project: TaxPlanAdvisor Onboarding Frontend

---

## What Is This?

The Admin Dashboard (`src/pages/admin/AdminDashboard.jsx`) is the internal management console for the TaxPlanAdvisor platform. It is a **fully standalone admin panel** — completely isolated from the user-facing onboarding flow. It has its own auth, theme system, routing, and components. No shared context with the applicant side.

---

## File Map

```
src/
├── App.jsx                                  # Route definitions — wires admin URLs
├── pages/admin/
│   ├── AdminDashboard.jsx    (62 KB)        # Main consultant list + filters + stats
│   ├── AdminLogin.jsx         (7.6 KB)      # Login form — username/password
│   ├── ConsultantDetail.jsx  (164 KB)       # Full detail view per consultant
│   ├── EmailDashboard.jsx     (53 KB)       # Email notification monitor
│   ├── AdminBrandLogo.jsx     (0.8 KB)      # Logo component (light/dark variant)
│   ├── AdminThemeToggle.jsx   (2.1 KB)      # Dark / Light toggle button
│   └── adminTheme.js          (3.9 KB)      # Theme hook + full CSS variable maps
└── utils/
    ├── adminPath.js            (0.7 KB)     # URL builder — reads VITE_ADMIN_PATH
    ├── adminSession.js         (1.3 KB)     # localStorage helpers: token/role/username
    ├── apiBase.js              (0.3 KB)     # API URL builder — reads VITE_API_BASE_URL
    └── http.js                 (0.4 KB)     # readResponsePayload() — JSON/text parser
```

---

## Routing (App.jsx)

Admin routes are registered as **standalone routes** — not wrapped in `ProtectedRoute` or `AuthProvider`. They manage their own auth via `localStorage`.

| URL | Component |
|---|---|
| `/{ADMIN_PREFIX}` | `AdminLogin` |
| `/{ADMIN_PREFIX}/dashboard` | `AdminDashboard` |
| `/{ADMIN_PREFIX}/emails` | `EmailDashboard` |
| `/{ADMIN_PREFIX}/consultant/:id` | `ConsultantDetail` |

- `ADMIN_PREFIX` is read from `VITE_ADMIN_PATH` env var (defaults to `admin`)
- If a custom prefix is set, `/admin`, `/admin/dashboard`, `/admin/consultant/:id` all redirect to `/` — this **obscures the panel URL** from public discovery

---

## Auth Flow

```
AdminLogin
  → POST /admin-panel/login/  { username, password }
  → persistAdminSession({ token, role, username })  → localStorage
  → navigate to adminUrl('dashboard')

AdminDashboard
  → reads token via localStorage.getItem('admin_token')
  → no token + not DEV → navigate to adminUrl()  (back to login)
  → all API calls: Authorization: Bearer <token>
  → 401 / 403 response → resetSession() → back to login

ConsultantDetail
  → uses getAdminToken() / getAdminRole() from adminSession.js
  → role === 'super_admin' required for destructive actions
```

**Note:** `AdminDashboard.jsx` reads `localStorage` directly instead of using `getAdminToken()` from `adminSession.js`. `ConsultantDetail.jsx` correctly uses the utility helpers.

---

## AdminDashboard.jsx — Full Feature Breakdown

### Summary Cards

5 clickable cards at the top. Clicking a card sets `cardFilter` and sends `?card_filter=` to the API.

| Card | Value Derived From | Filter Key |
|---|---|---|
| Total | `stats.total` | `total` |
| Consultants | `status_counts['Credentials Sent']` | `consultants` |
| In Progress | `total − spam − consultants − disqualified` | `in_progress` |
| Spam Leads | `status_counts['New Join']` | `spam_leads` |
| Disqualified | `status_counts['Disqualified']` | `disqualified` |

Active card gets a `translateY(-1px)` lift + accent border color.

---

### Filters

| Filter | Mechanism | API Param |
|---|---|---|
| Search | Debounced 350ms, `useRef` to avoid stale closure | `?search=` |
| Status | Multi-select dropdown with checkboxes | `?status=` (multiple) |
| Assessment sub-status | Appears only when "Assessment Ongoing" is selected | `?assessment_substatus=` |
| Joined date range | `<select>` dropdown | `?joined_range=` |
| Card filter | Summary card click | `?card_filter=` |
| Clear | Resets all state at once | — |

Active status filters are shown as removable chips below the filter bar.

---

### Table (Desktop ≥ 769px)

Sortable columns — clicking a header toggles `asc` / `desc`. Active sort shown with green arrow indicator.

| Column | Sort Key | Notes |
|---|---|---|
| Name | `name` | Links to ConsultantDetail in new tab |
| Details | — | Email + phone |
| Status | `status` | Color-coded badge + optional substatus badge |
| Score | `score` | MCQ `/50` and Video score |
| Joining | `created_at` | Date only |
| Latest Changes | `updated_at` | Full datetime |
| Attempts | `assessment_count` | Number of assessment attempts |

Sorting is done **client-side** on the current page via `useMemo`.

---

### Card Layout (Mobile ≤ 768px)

Each consultant rendered as an `<article>` card with: name, email, phone, status badge, substatus badge, MCQ score, video score, joined date, updated datetime, attempt count.

Narrow mobile (≤ 430px): summary cards switch from 5-column to 2-column grid.

---

### Header Actions

| Button | What It Does |
|---|---|
| Theme Toggle | Switches dark/light, persists to localStorage |
| Showing X total | Live count badge (read-only) |
| Export Excel | `GET /admin-panel/consultants/export/` → downloads `.xlsx` |
| Refresh | Re-fetches current page with current filters |
| Email Monitor | Navigate to `adminUrl('emails')` |
| Send Due Emails | `POST /admin-panel/notifications/dispatch-due/` |
| Logout | Clears `admin_token`, redirects to login |

---

### Pagination

Server-side. `PAGE_SIZE = 50`.

Controls: `<< First` / `< Prev` / page number buttons (up to 5 visible) / `Next >` / `Last >>`.

On mobile, page number buttons are hidden — only First/Prev/Next/Last shown.

---

## ConsultantDetail.jsx — Sections

Opened in a new tab when a row is clicked. Collapsible sections:

| Section | What's Inside |
|---|---|
| Profile | Full name, email, phone, city, DOB, PAN, onboarding status |
| Identity | Gov ID document image viewer |
| Face Verification | Face photo + verification status |
| Assessment | All sessions — MCQ score, video score, violations, proctoring snapshots, restore actions |
| Documents | Uploaded degree/experience documents |
| Feedback | Applicant feedback entries |
| Call Tracking | Log a call entry (caller, status, comments, follow-up date) + call log history |

**Role-gated actions** (requires `admin_role === 'super_admin'`):
- Generate & email credentials
- Delete consultant
- Restore violated assessment session
- Restore video assessment stage

---

## EmailDashboard.jsx — Sections

Two tabs:

| Tab | Content |
|---|---|
| Notifications | Scheduled email notifications — filter by status, search, sort |
| Logs | Sent email logs — filter by type, status, date range, search |

Summary cards at top: total sent, delivered, failed, pending.

---

## Theme System (adminTheme.js)

- `useAdminTheme()` hook — returns `{ isLight, themeVars, toggleTheme }`
- Theme persisted in `localStorage` as `tp_admin_theme` (`dark` | `light`)
- Full CSS variable map injected as inline `style` on the root `<div>` of every admin page
- Variables cover: page backgrounds, surfaces, borders, text colors, shadows, row alternates, tab states

---

## Status Color Map (AdminDashboard)

| Status | Color |
|---|---|
| New Join | Gray |
| Profile Details | Purple |
| Gov ID | Yellow |
| Face Verification | Teal |
| Degree Upload | Sky blue |
| Assessment Ongoing | Blue |
| MCQ | Indigo |
| Completed | Green |
| Credentials Sent | Emerald |
| Credentials Failed | Orange |
| Retry | Amber |
| Disqualified | Red |

`normalizeAdminStatus()` maps `'completed'` and `'credentials not sent'` → `'Credentials Failed'` before rendering.

---

## API Endpoints Used

| Method | Endpoint | Used In |
|---|---|---|
| `POST` | `/admin-panel/login/` | AdminLogin |
| `GET` | `/admin-panel/consultants/` | AdminDashboard |
| `GET` | `/admin-panel/consultants/export/` | AdminDashboard |
| `POST` | `/admin-panel/notifications/dispatch-due/` | AdminDashboard |
| `GET` | `/admin-panel/consultants/:id/` | ConsultantDetail |
| `POST` | `/admin-panel/consultants/:id/call-tracking/` | ConsultantDetail |
| `POST` | `/admin-panel/consultants/:id/generate-credentials/` | ConsultantDetail |
| `DELETE` | `/admin-panel/consultants/:id/delete/` | ConsultantDetail |
| `POST` | `/admin-panel/consultants/:id/restore-assessment/` | ConsultantDetail |
| `POST` | `/admin-panel/consultants/:id/restore-video-assessment/` | ConsultantDetail |
| `GET` | `/admin-panel/email-dashboard/` | EmailDashboard |
| `GET` | `/admin-panel/email-dashboard/notifications/` | EmailDashboard |
| `GET` | `/admin-panel/email-dashboard/logs/` | EmailDashboard |

---

## Utility Helpers

### adminPath.js
- `ADMIN_PREFIX` — from `VITE_ADMIN_PATH`, sanitized to `[A-Za-z0-9_-]+`, defaults to `admin`
- `adminUrl(suffix)` — builds full admin path e.g. `adminUrl('dashboard')` → `/admin/dashboard`
- `IS_DEFAULT_ADMIN_PATH` — `true` if prefix is `admin`

### adminSession.js
- `persistAdminSession({ token, role, username })` — saves all three to localStorage
- `clearAdminSession()` — removes all three
- `getAdminToken()` / `getAdminRole()` / `getAdminUsername()` — safe getters

### apiBase.js
- `apiUrl(path)` — prepends `VITE_API_BASE_URL` (defaults to `/api`)

### http.js
- `readResponsePayload(response)` — returns parsed JSON or `{ raw, error }` for non-JSON responses

---

## Known Issues / Gaps

| Issue | File | Detail |
|---|---|---|
| Direct localStorage access | `AdminDashboard.jsx` | Uses `localStorage.getItem('admin_token')` directly instead of `getAdminToken()` |
| No role-based UI on dashboard | `AdminDashboard.jsx` | Any valid token gets full access; role check only exists in `ConsultantDetail.jsx` |
| Status normalization accuracy | `AdminDashboard.jsx` | `'completed'` → `'Credentials Failed'` — confirm this mapping is still correct with backend |
| `ConsultantDetail.jsx` size | `ConsultantDetail.jsx` | 164KB single file — candidate for splitting into sub-components |

---

## What's Complete

- [x] Admin login with token + role + username persistence
- [x] Dashboard with summary cards, multi-filter, debounced search, sort, pagination
- [x] Responsive layout — desktop table + mobile card grid
- [x] Excel export with server-side filename from `content-disposition`
- [x] Due email dispatch trigger
- [x] Consultant detail page — profile, identity, face, assessment, documents, feedback, call tracking
- [x] Role-gated destructive actions (super_admin only)
- [x] Email dashboard — notifications + send logs with filters
- [x] Dark / light theme with localStorage persistence
- [x] Configurable admin URL prefix via `VITE_ADMIN_PATH`
- [x] Admin path obfuscation — custom prefix hides `/admin/*` from public

---

## Planned / TODO

- [ ] **Client Admin Dashboard** (`ClientDashboard.jsx`) — same pattern as `AdminDashboard` but for managing clients (name, email, phone, plan, status, assigned consultant, city)
- [ ] **Client Detail page** (`ClientDetail.jsx`) — same pattern as `ConsultantDetail` for client records
- [ ] Fix `AdminDashboard.jsx` to use `getAdminToken()` instead of direct `localStorage` access
- [ ] Add role-based UI restrictions to `AdminDashboard.jsx` (currently only in `ConsultantDetail`)
- [ ] Split `ConsultantDetail.jsx` into smaller sub-components (Profile, Assessment, CallTracking, etc.)
