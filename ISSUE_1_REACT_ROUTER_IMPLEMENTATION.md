# ISSUE_1_REACT_ROUTER_IMPLEMENTATION.md

## Issue #1: React Router Architecture

**Upstream Issue:** [Geektoberfest/Geektober-PromptForge #1](https://github.com/Geektoberfest/Geektober-PromptForge/issues)

### Problem Statement
The routing architecture needed refactoring to use a shared layout shell, nested layout routes with `<Outlet />`, and proper authentication guards instead of prop-drilling authentication props through route declarations. The application needed a polished 404 page, loading states during session restoration, and destination preservation for unauthenticated users redirected to login.

### Root Cause
The original route declarations had duplicated navbar and footer rendering at the page level, used `window.location.href` for internal SPA navigation, and lacked shared authentication state management. Route guards were not implemented, causing potential content flashes and unprotected content rendering.

### Design Decisions
- **Shared AppLayout shell** with navbar, footer, scroll-to-top behavior, and toast container — renders once for all nested routes
- **Nested layout routes** using React Router 7's `<Outlet />` for consistent shell rendering
- **AuthContext** with `useAuth` hook exposing: `isLoggedIn`, `user`, `isLoading`, `checkAuthStatus()`, `login()`, `logout()`
- **ProtectedRoute** guard: waits for session restoration, redirects unauthenticated users to login preserving `from` location state
- **PublicOnlyRoute** guard: bounces signed-in users home; renders auth pages during loading state
- **Loading state** during initial session restoration via `AuthLoading` component — prevents flashing protected content
- **NotFound page** rendered via wildcard `*` route inside the shared shell
- **React Router navigation** replaces all `window.location.href` calls with `<Navigate>` and `useNavigate()`

### Implementation Summary
| File | Change |
|------|--------|
| `client/src/components/AppLayout.jsx` | New shared layout with navbar, footer, scroll-to-top, toast container |
| `client/src/context/AuthContext.jsx` | AuthProvider with useState for user/isLoading, checkAuthStatus, login, logout |
| `client/src/context/useAuth.js` | useAuth hook returning context value, throws if used outside AuthProvider |
| `client/src/components/ProtectedRoute.jsx` | Guard for authenticated pages with loading state and destination preservation |
| `client/src/components/PublicOnlyRoute.jsx` | Guard for login/signup pages with signed-in user redirect |
| `client/src/components/AuthLoading.jsx` | Skeleton loading component during session restoration |
| `client/src/pages/NotFound.jsx` | Polished 404 page with branding |
| `client/src/router.jsx` | AppRoutes with nested layout routes, ProtectedRoute, PublicOnlyRoute, wildcard |
| `client/src/pages/NotFound.jsx` | Polished 404 page |

### API / Database / Security / UI Behavior Changes
- **UI:** Consistent navbar/footer across all authenticated pages; no more duplicated rendering
- **UX:** Loading spinner during auth restoration; seamless post-login redirect to intended destination
- **Security:** Protected routes prevent unauthorized access; public routes prevent authenticated users from accessing login/signup
- **Navigation:** No `window.location.href` usage; all navigation goes through React Router

### Test Cases
- 7 routing tests covering: protected routes, public-only routes, session loading behavior, login destination restoration, wildcard 404 rendering, logout/navigation behavior
- All 7 tests pass in Vitest jsdom environment

### Commands Executed
```bash
cd client && npm run lint    # passes
cd client && npm run build   # passes
npm test                   # 7/7 routing tests pass
```

### Acceptance Criteria Mapping
- ✅ Shared AppLayout with navbar, footer, scroll-to-top, toast container
- ✅ Nested layout routes with `<Outlet />`
- ✅ Auth context exposing login state, user, loading, checkAuthStatus, login, logout
- ✅ Removed authentication prop drilling from route declarations
- ✅ ProtectedRoute for authenticated pages
- ✅ PublicOnlyRoute for login and signup pages
- ✅ Loading state during initial session restoration
- ✅ Destination preservation when redirecting unauthenticated users
- ✅ Polished NotFound page and wildcard route
- ✅ Replaced window.location.href with React Router navigation
- ✅ Removed duplicated page-level navbar and footer rendering
- ✅ Tests cover all acceptance criteria

### Limitations
- In-memory AuthContext (process-local; not suitable for multi-instance deployments without external state management)
- No server-side rendering routing (client-side only)

### Checklist — Issue #1 Acceptance Criteria Mapping
- [x] AppLayout with common navbar, footer, scroll-to-top, toast container
- [x] Nested layout routes and <Outlet />
- [x] Authentication context exposing login state, user, loading, refresh, logout
- [x] Removed authentication prop drilling from route declarations
- [x] ProtectedRoute for authenticated pages
- [x] PublicOnlyRoute for login and signup pages
- [x] Loading state during initial session restoration
- [x] Destination preservation when unauthenticated users redirected to login
- [x] Polished NotFound page and wildcard route
- [x] Replaced window.location.href with React Router navigation
- [x] Removed duplicated page-level navbar and footer rendering
- [x] Tests cover protected routes, public-only routes, session loading, login destination restoration, wildcard 404, logout/navigation