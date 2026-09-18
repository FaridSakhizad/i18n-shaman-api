# API Architecture

This document describes the current alpha architecture of the i18nshaman API.

It is intentionally practical rather than aspirational: it documents the codebase as it should be understood today, and calls out the places that are expected to evolve after alpha.

## High-Level Shape

The API is a NestJS application with server-side sessions, MongoDB persistence, normalized JSON response envelopes, Problem Details errors, structured JSON logs, and a small amount of alpha-grade rate limiting.

Main entry points:

- `src/main.ts`: application bootstrap, global filters, validation, CORS, sessions, request logging, and HTTP listen.
- `src/app.module.ts`: root module composition.
- `src/app.controller.ts`: health endpoint.

Primary modules:

- `AuthModule`: registration, login, sessions, password reset, email verification, and password update flows.
- `TranslationsModule`: projects, translation tree, languages, tags, search, import, and export.
- `UserModule`: user preferences and UI language settings.
- `EmailModule`: email rendering and delivery.
- `TrackingModule`: lightweight product event ingestion.
- `DatabaseModule`: MongoDB connection and Mongoose model providers.
- `ValidationModule`: legacy email/password validation helpers used by auth flows.

Shared infrastructure:

- `common/http-response.ts`: success response envelope helper.
- `common/api-response.interface.ts`: success and error transport types.
- `common/problem-details-exception.filter.ts`: centralized error normalization.
- `common/logger.ts`: Pino logger, child logger context, and operation logging helpers.
- `common/request-logging.middleware.ts`: per-request logging and request context.
- `common/rate-limit.guard.ts`: simple in-memory alpha rate limiter.
- `config/env.ts`: API configuration loaded from environment variables.

## Request Lifecycle

Normal HTTP requests follow this path:

1. Express receives the request.
2. CORS and cookie parsing run.
3. Session data is loaded from MongoDB through `connect-mongo`.
4. `requestLoggingMiddleware` creates request logging context and emits request lifecycle logs.
5. Guards run:
   - `AuthGuard` checks authenticated session state.
   - `VerifiedEmailGuard` blocks product usage until email is verified.
   - `RateLimitGuard` limits selected high-risk or high-cost endpoints.
6. `ValidationPipe` strips unknown DTO fields and performs runtime DTO validation.
7. Controller methods translate HTTP transport into service calls.
8. Services execute business logic and database operations.
9. Successful JSON responses are wrapped with `createApiResponse`.
10. Errors are normalized by `ProblemDetailsExceptionFilter`.

Export endpoints are the main exception: they return file responses directly instead of the standard JSON envelope.

## Module Responsibilities

### AuthModule

Files live in `src/auth`.

Responsibilities:

- register users;
- login/logout users;
- verify existing sessions;
- send and validate email verification tokens;
- send and validate password reset tokens;
- update known-user passwords;
- enforce session ownership around sensitive token flows.

Important pieces:

- `auth.controller.ts`: HTTP endpoints for auth and account credential flows.
- `auth.service.ts`: user account mutations, credential checks, email verification orchestration.
- `token.service.ts`: token creation and validation.
- `auth.guard.ts`: session authentication boundary.
- `verified-email.guard.ts`: product-access boundary for unverified users.
- `current-user-id.decorator.ts`: extracts the authenticated user id from the server-side session.

Design rules:

- The frontend must not send `userId` for owned resources.
- Authenticated ownership comes from the server-side session.
- Password reset and email verification use dedicated token records.
- Resetting a password does not verify email by itself.
- Unverified users may log in, but product routes are blocked by `VerifiedEmailGuard`.

### TranslationsModule

Files live in `src/translations`.

This is the largest domain module. For alpha it remains one bounded context because almost every product operation happens inside a project.

Controllers:

- `translations.controller.ts`: project, language, entity, tag, import, and export endpoints.
- `search.controller.ts`: search endpoint.

Services:

- `project-access.service.ts`: central active-project and ownership checks.
- `project.service.ts`: create, update, list, and soft-delete projects.
- `project-read.service.ts`: read model for loading a project with tree, values, filters, sorting, and pagination.
- `entity.service.ts`: create, update, move, duplicate, and delete key tree entities.
- `entity-query.service.ts`: focused entity read operations.
- `key-value.service.ts`: shared value aggregation and value lookup helpers.
- `language.service.ts`: project language lifecycle.
- `tag.service.ts`: project tag lifecycle and tag assignment.
- `search.service.ts`: search across keys and values.
- `import.service.ts`: import project data from currently supported formats.
- `export.service.ts`: export project data to currently supported formats.
- `key-tree.service.ts`: tree and export-shape builders.

Design rules:

- `Key` is the canonical source of the translation tree.
- `Project.keys` is legacy data and must not be used as a source of truth.
- Any operation that touches keys or values must first verify active project ownership.
- Normal project reads exclude soft-deleted projects.
- Project deletion is soft delete; keys and values are retained for future restore or hard-delete lifecycle.
- Removed language values are preserved as dormant data and filtered out of normal reads/search/export.

### UserModule

Files live in `src/user`.

Responsibilities:

- update user interface language;
- update and normalize user preferences;
- keep corrupted stored preferences from leaking back to the frontend.

Important pieces:

- `preferences.ts`: server-side preference normalization.
- `user.service.ts`: user profile/preferences mutations.
- `user.controller.ts`: user endpoints.

Design rules:

- The API should return valid preference data even if stored data is partially corrupted.
- Frontend API clients should not have to repair malformed backend preference payloads.

### EmailModule

Files live in `src/email` and `src/emailTemplates`.

Responsibilities:

- render MJML email templates;
- send transactional email;
- log email send lifecycle without logging secrets or user content.

Important pieces:

- `template.service.ts`: MJML/template rendering.
- `mail.service.ts`: email delivery and operation logging.

Design rules:

- Do not log email tokens, reset links, verification links, or full user email addresses.
- Recipient logging should stay coarse, such as recipient domain.
- Email content is not user-authored product content and is controlled by the application.

### TrackingModule

Files live in `src/tracking`.

Responsibilities:

- receive lightweight product events from the frontend;
- validate event names;
- sanitize event properties;
- log or forward tracking events according to config.

Design rules:

- Tracking is product analytics, not operational logging.
- Do not log arbitrary user JSON payloads.
- Keep event names explicit in `tracking.events.ts`.

### DatabaseModule

Files live in `src/database`.

Responsibilities:

- create the MongoDB connection;
- expose Mongoose model providers;
- define which schemas are registered in the API container.

Current models:

- Project
- Key
- KeyValue
- RawLanguage
- User
- Session
- Token

The data model is documented in `DATA_MODEL.md`.

## Cross-Cutting Boundaries

### Authentication

Authentication is session-based.

The session cookie is HTTP-only. In production it is `secure` and uses `sameSite=none` to support the production frontend/API domain split.

Controllers should not trust user ids from request body or query parameters. Use `@CurrentUserId()` after `AuthGuard`.

### Email Verification

The API allows login before email verification, but product routes require verified email.

Use `VerifiedEmailGuard` on routes that should be unavailable to unverified users.

### Project Ownership

Project ownership checks should be centralized through `ProjectAccessService`.

Any service that accesses `Project`, `Key`, or `KeyValue` for project-owned data should either:

- call `projectAccessService.assertActiveProject(userId, projectId)`, or
- use a helper that is documented to do so internally.

### Response Contract

Successful JSON responses use the envelope documented in `API_CONTRACT.md`.

Errors use Problem Details through `ProblemDetailsExceptionFilter`.

File downloads, especially export endpoints, are allowed to return raw file responses.

### Runtime Validation

`ValidationPipe` is enabled globally with:

- `whitelist: true`
- `transform: true`
- implicit conversion enabled

DTOs should describe transport shape with `class-validator` decorators. Business validation still belongs in services.

### Rate Limiting

The current rate limiter is intentionally simple and in-memory.

It is suitable for the alpha deployment with one API instance. If the API is horizontally scaled, rate limit state must move to shared storage such as Redis or a managed equivalent.

Current usage focuses on:

- auth attempts;
- email verification and password reset flows;
- tracking ingestion;
- import/export operations.

### Logging

The API logs JSON to stdout through Pino.

Request logs include:

- request start;
- request completion;
- request failure;
- request id;
- duration;
- method and URL.

Operation logs are used for heavier or more important flows, such as:

- import;
- export;
- search;
- project load;
- email send.

Logging rules:

- Do not log secrets.
- Do not log tokens.
- Do not log password values.
- Do not log full user-authored JSON content.
- Prefer ids, counts, booleans, durations, and coarse context.

## Dependency Direction

Current expected direction:

- Controllers depend on services and transport DTOs.
- Services depend on model providers, domain interfaces, and other focused services.
- Shared infrastructure in `common` should not depend on feature modules.
- Feature modules may depend on `common`, `config`, and `database`.
- `ProjectAccessService` is the project ownership boundary for the translations domain.

Avoid:

- calling controllers from services;
- reading `process.env` outside `config/env.ts`;
- reintroducing `userId` into frontend-provided project DTOs;
- using embedded `Project.keys`;
- returning raw service data outside the response envelope for JSON endpoints.

## Current Alpha Tradeoffs

These are known and acceptable for alpha:

- `TranslationsModule` is still broad.
- `translations.controller.ts` contains several endpoint groups.
- `auth.controller.ts` contains multiple credential-related flows.
- Runtime validation is intentionally basic and not yet a complete business schema.
- Rate limiting is in-memory.
- There is no generated OpenAPI document yet.

These are not considered acceptable to reintroduce:

- one giant translations service that owns unrelated business areas;
- frontend-supplied `userId` for owned resources;
- unnormalized error responses;
- success responses outside the envelope for normal JSON endpoints;
- direct use of legacy embedded project keys.

## Likely Next Refactors

After alpha, the most natural backend refactors are:

1. Split `TranslationsController` into smaller controllers:
   - projects;
   - entities;
   - languages;
   - tags;
   - import/export.
2. Split `AuthController` by flow:
   - session;
   - registration;
   - email verification;
   - password reset;
   - password update.
3. Extract query/projection helpers from `ProjectReadService`.
4. Split import/export format logic if more formats are added.
5. Replace in-memory rate limiting if multiple API instances are introduced.
6. Add generated OpenAPI docs when the public API shape becomes more stable.

## Related Documentation

- `README.md`: API entry point and scripts.
- `API_CONTRACT.md`: frontend/backend transport contract.
- `DATA_MODEL.md`: MongoDB collections, ownership, lifecycle, and indexes.
- `../CONFIGURATION.md`: environment variables and runtime configuration.
- `../EMAIL_FLOWS.md`: email verification and password reset behavior.
- `../IMPORT_EXPORT.md`: supported alpha import/export behavior.
