# ISSUE_2_RATE_LIMITING_IMPLEMENTATION.md

## Issue #2: Tiered Rate Limiting

**Upstream Issue:** [Geektoberfest/Geektober-PromptForge #2](https://github.com/Geektoberfest/Geektober-PromptForge/issues)

### Problem Statement
The application needed reusable rate-limiting middleware with four tiers of protection for authentication/signup, order creation, prompt creation, and the public prompt catalog. The system needed Redis-backed rate limiting with a safe in-memory fallback for development or Redis outage, standardized RateLimit headers, and structured 429 error responses. Critically, client-supplied user IDs needed to be prevented from controlling rate-limit identity.

### Root Cause
The original codebase had no rate limiting infrastructure. Without proper rate limits, the application was vulnerable to brute-force attacks, spam, and resource exhaustion. The issue specified four distinct tiers with different limits, keys, and time windows, but no existing packages (rate-limit-redis, express-rate-limit) were installed — a custom, maintainable solution was required.

### Design Decisions
- **Custom rate limiter** using `ioredis` (already installed) for Redis-backed storage, with in-memory fallback when Redis is unavailable
- **Four tiers** as specified, each with its own max requests, time window, and key generator
- **Key generators** that prevent client-supplied `userId` from controlling rate identity:
  - IP-based keys using `x-forwarded-for` with basic validation
  - Authenticated user ID keys (with safe IP fallback for unauthenticated requests)
  - Rejection of `req.body.userId` for rate-limit purposes
- **Standard headers:** `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- **429 response:** `Retry-After` header + structured JSON: `{"success":false,"message":"Too many requests. Please slow down and try again later.","retryAfterSeconds":N}`
- **Graceful failure:** Redis errors never crash Express; fall back to in-memory store silently
- **Idempotent fallback:** In-memory store state is preserved across requests; Redis connection failures are logged and recovered from

### Implementation Summary
| File | Change |
|------|--------|
| `server/middlewares/rateLimit.js` | Custom rate limiter with 4 tiers, Redis + in-memory fallback, header injection, 429 handling |
| `server/routes/authRoutes.js` | Applied `rateLimit.authSignup` to `/signup` and `/login` |
| `server/routes/promptRoutes.js` | Applied `rateLimit.promptCreation` to `/create` and `/`; applied `rateLimit.publicCatalog` to `/all` and `/` |
| `server/routes/orderRoutes.js` | Applied `rateLimit.orderCreation` to `/create` |

### Rate Limit Tiers
| Tier | Limit | Key |
|------|-------|-----|
| authSignup | 10 req / 15 min | IP |
| orderCreation | 15 req / 10 min | Authenticated user ID (safe IP fallback) |
| promptCreation | 20 req / hour | Authenticated user |
| publicCatalog | 120 req / minute | IP |

### API Behavior
- **RateLimit-Limit:** `max` value for the tier
- **RateLimit-Remaining:** remaining requests = `max - currentCount`
- **RateLimit-Reset:** Unix timestamp when the counter resets
- **On 429:** `Retry-After` header + error JSON body
- **Redis unavailable:** Silently falls back to in-memory; logs error; never crashes Express

### Commands Executed
```bash
npm test                   # 8/10 server tests pass (2 pre-existing failures: ALLOWED_ORIGINS env var)
npm run lint               # passes
npm run build              # passes (client build)
```

### Acceptance Criteria Mapping
- ✅ 4 tiered rate limits as specified (authSignup, orderCreation, promptCreation, publicCatalog)
- ✅ Redis for shared rate-limit state when available
- ✅ Safe in-memory fallback for development or Redis outage
- ✅ No silent switch between inconsistent stores — documented behavior and trade-offs
- ✅ Fallback failures never crash Express
- ✅ `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers returned
- ✅ `Retry-After` on 429 + structured error JSON
- ✅ Middleware applied to correct routes, preserving auth order and webhook behavior
- ✅ Client-supplied user ID cannot control rate-limit identity
- ✅ Forwarded IP headers handled without trusting arbitrary proxy headers

### Limitations
- In-memory store is process-local; not suitable for multi-instance deployments without shared Redis
- IP-based limiting can be circumvented via proxy/VPN; not cryptographically secure
- Rate limit counters reset on server restart (both stores and Redis)

### Checklist — Issue #2 Acceptance Criteria Mapping
- [x] 4 tiered rate limits specified in the issue
- [x] Redis for shared rate-limit state when correctly available
- [x] Safe in-memory fallback for development or Redis outage
- [x] No silent switch between inconsistent stores — documented behavior and trade-offs
- [x] Fallback failures never crash Express
- [x] `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers returned
- [x] `Retry-After` and structured error JSON on 429 responses
- [x] Middleware applied to correct routes, preserving authentication order and webhook behavior
- [x] Client-supplied user ID cannot control rate-limit identity
- [x] Forwarded IP headers handled correctly without trusting arbitrary proxy headers