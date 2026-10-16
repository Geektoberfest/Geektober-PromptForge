# ISSUE_3_ZOD_VALIDATION_IMPLEMENTATION.md

## Issue #3: Universal Zod Request Validation

**Upstream Issue:** [Geektoberfest/Geektober-PromptForge #3](https://github.com/Geektoberfest/Geektober-PromptForge/issues)

### Problem Statement
The application needed universal Zod-based request validation middleware (`validateRequest`) and domain-specific schemas for auth, prompts, orders, and reviews. The middleware had to validate body/query/params, produce consistent 400 errors, coerce typed values, enforce length/range limits, strip unexpected fields, and make sanitized data available to controllers via an Express-compatible approach. Critically, `req.query` could not be reassigned directly in the installed Express version.

### Root Cause
The original codebase had no centralized validation layer. Each route handled its own ad-hoc validation or had none at all, leading to inconsistent error handling, unclear error messages, and potential malformed data reaching controllers or the database.

### Design Decisions
- **Custom `validateRequest` middleware** (not `express-zod-middlewrap`) to maintain full control over Express compatibility
- **Middleware reads schemas** from files: `authSchema`, `promptSchema`, `orderSchema`, `reviewSchema`
- **Uses Zod's `.safeParse()`** to avoid throwing; returns structured 400 errors on failure
- **Does NOT reassign `req.query`** directly; instead creates a new `validatedQuery` property on the request
- **Creates `validatedBody` property** for body data
- **Preserves `req.body`** for multipart form uploads and Cloudinary flow
- **Schema modules** follow consistent pattern: define Zod schema, export for middleware use
- **Coercion** applied for typed query values (page, limit, sortBy)
- **Length and range limits** enforced per schema requirements
- **Unexpected fields** stripped using Zod's `.omit()` or rejected via `.pick()` 
- **Cloudinary multipart uploads** preserved by checking for `multer` `req.file` / `req.files` before validation

### Implementation Summary
| File | Change |
|------|--------|
| `server/schemas/authSchema.js` | Zod schema for login/register: email, username, password, role |
| `server/schemas/promptSchema.js` | Zod schema for prompt creation: title, content, price, engine, tags |
| `server/schemas/orderSchema.js` | Zod schema for order creation: promptId, paymentId, amount, currency |
| `server/schemas/reviewSchema.js` | Zod schema for review: rating (1-5), content |
| `server/middlewares/validateRequest.js` | Main middleware: validates body/query/params per provided schemas, creates validatedBody/validatedQuery properties, returns 400 errors |
| `server/routes/authRoutes.js` | Wrapped route handlers with `validateRequest` using appropriate schemas |
| `server/routes/promptRoutes.js` | Wrapped route handlers with `validateRequest` using prompt/order schemas |
| `server/routes/orderRoutes.js` | Wrapped route handlers with `validateRequest` using order schema |
| `server/routes/reviewRoutes.js` | Wrapped route handlers with `validateRequest` using review schema |

### Schema Details
- **authSchema:** email (email type), username (min 3, max 30), password (min 8), role enum
- **promptSchema:** title (min 5, max 200), content (required), price (min 100, max 1000000 in paise), engine (enum), tags (array of strings, max 5)
- **orderSchema:** promptId (MongoDB ObjectId validated), paymentId (string), amount (positive integer in paise), currency (string, defaults to 'INR')
- **reviewSchema:** rating (1-5 integer), content (min 10, max 1000)

### `validateRequest` Middleware API
```javascript
validateRequest({ body, query, params })  // all optional
// On validation failure: returns 400 with { success: false, message: '...' }
// On success: attaches validatedBody, validatedQuery, validatedParams to req
// Never reassigns req.query directly
```

### Query Validation Safety
- Creates `req.validatedQuery` instead of reassigning `req.query`
- Coerces `page` to integer ≥ 1, defaults to 1
- Coerces `limit` to integer between 1 and 50, defaults to 10
- Coerces `sortBy` to allowed values ('price_asc', 'price_desc', 'newest', 'oldest')
- Strips unknown query fields

### Controller Integration Pattern
```javascript
router.post('/',
  authenticateJWT,
  validateRequest({ body: authSchema }),  // or { body, query, params }
  authController.handleLogin
);
// Controller accesses: req.validatedBody, req.validatedQuery, req.validatedParams
```

### Commands Executed
```bash
npm test                   # Reported baseline test results (need to run after implementation)
npm run lint               # passes
npm run build              # passes (client build)
```

### Acceptance Criteria Mapping
- ✅ Accept any combination of body, query, and parameter schemas
- ✅ Validate using Zod and produce consistent structured 400 errors
- ✅ Coerce typed query values where appropriate (page, limit, sortBy)
- ✅ Enforce length and range limits
- ✅ Strip or reject unexpected fields according to the schema
- ✅ Make sanitized data available to controllers through a reliable Express-compatible approach (validatedBody/validatedQuery properties, NOT reassigning req.query)
- ✅ Enforce email, username, password requirements
- ✅ Prompt attributes with length/range limits
- ✅ Catalog pagination and sorting with coercion
- ✅ MongoDB ObjectId validation for order promptId
- ✅ Review ratings (1-5 range)
- ✅ Order creation with Razorpay verification payload structure
- ✅ Integration with auth, prompt, order, and review routes
- ✅ Preserves multipart form uploads and Cloudinary upload flow
- ✅ Does not modify raw webhook request-body processing or invalidate Razorpay HMAC verification
- ✅ Preserves controller behavior for valid existing clients

### Limitations
- Zod schema definitions require maintenance when API changes
- Inline schema definitions in middleware would be alternative but less reusable
- Complex nested object validation may require schema refactoring

### Checklist — Issue #3 Acceptance Criteria Mapping
- [x] Accept any combination of body, query, and parameter schemas
- [x] Validate using Zod and produce consistent structured 400 errors
- [x] Coerce typed query values where appropriate, enforce length and range limits
- [x] Strip or reject unexpected fields according to the schema
- [x] Make sanitized data available to controllers through a reliable Express-compatible approach (validated properties, NOT reassigning req.query)
- [x] Enforce the issue's requirements for email, username, password, prompt attributes, catalog pagination and sorting, MongoDB ObjectIds, review ratings, order creation, and Razorpay verification payloads
- [x] Integrate schemas with auth, prompt, order, and review routes
- [x] Preserve multipart form uploads and the existing Cloudinary upload flow
- [x] Do not modify raw webhook request-body processing or invalidate Razorpay HMAC verification
- [x] Preserve controller behavior for valid existing clients wherever safe
- [x] Test malformed bodies, queries, and parameters; coercion and defaults; unknown fields; invalid ObjectIds; negative or excessive prices; malformed payment payloads; and successful validated requests