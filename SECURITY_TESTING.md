# Security Testing Checklist

This project has some auth-related tests, but only limited dedicated security testing today. This checklist separates what is already covered from the security checks we should treat as first-class evidence.

## Current evidence in the repo

- `backend/src/test/kotlin/flightbooking/service/AuthServiceTest.kt`
  - Valid bearer token parsing
  - Malformed bearer header rejection
- `backend/src/test/kotlin/flightbooking/service/AdminServiceTest.kt`
  - Admin login success and failure
  - Invalid admin token rejection
- `backend/src/test/kotlin/flightbooking/RoutingIntegrationTest.kt`
  - Missing auth header rejection on admin routes
  - Request validation for empty or malformed inputs

These are useful, but they do not yet amount to a full security test suite.

## Dedicated security tests to maintain

### Authentication

- [x] Reject malformed bearer tokens
- [x] Reject invalid admin tokens
- [ ] Reject forged customer tokens for protected customer routes
- [ ] Verify password hashes are never returned in API responses
- [ ] Verify login responses do not leak whether the email or password was wrong

### Authorization

- [x] Reject customer tokens on admin endpoints
- [x] Reject missing auth headers on admin endpoints
- [ ] Prevent one customer from reading another customer's bookings
- [ ] Prevent one customer from cancelling another customer's booking
- [ ] Prevent one customer from checking in another customer's booking

### Input validation and abuse cases

- [x] Reject empty request bodies on auth and booking routes
- [ ] Reject malformed emails during registration
- [ ] Reject weak passwords beyond minimum length checks
- [ ] Reject overlong or unexpected input fields cleanly
- [ ] Verify repeated failed logins are rate limited or throttled

### Injection and unsafe content

- [ ] Exercise login, lookup, and booking endpoints with SQL injection style payloads such as `' OR '1'='1`
- [ ] Exercise complaint and profile-like text fields with script-like payloads such as `<script>alert(1)</script>`
- [ ] Verify user-provided text is rendered safely in the frontend

### Configuration and pipeline checks

- [ ] Add dependency scanning in CI such as `npm audit`, Dependabot, or OWASP Dependency-Check
- [ ] Add static analysis in CI such as CodeQL or Semgrep
- [ ] Add tests that confirm CORS only allows approved origins
- [ ] Verify production error responses do not expose stack traces or secrets

## Suggested first implementation order

1. Authorization tests for booking ownership.
2. Customer-token rejection on every admin route.
3. Injection-style request coverage for login and booking lookup.
4. CI dependency and static security scanning.
