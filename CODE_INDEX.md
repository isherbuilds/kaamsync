# Code Index

*Last updated: 2026-01-13*
*Run `/update-code-index` to regenerate*

## Quick Reference

| Category | Count | Primary Location |
|----------|-------|------------------|
| Utilities | 7 functions | app/lib/utils.ts |
| Date/Time | 4 functions | app/lib/utils.ts |
| Validation | 12 schemas | app/lib/validations/*.ts |
| Billing | 18 functions | app/lib/billing.ts, app/lib/server/billing.server.ts |
| Storage | 9 functions | app/lib/server/storage.server.ts |
| Permissions | 10+ functions | app/lib/permissions.ts |
| Error Handling | 2 functions | app/lib/error-utils.ts |
| Logging | 1 class | app/lib/logger.ts |
| Hooks | 10 hooks | app/hooks/*.ts |

---

## Core Utilities

| Function | Location | Does What | Params |
|----------|----------|-----------|--------|
| `cn()` | [utils.ts](app/lib/utils.ts#L8) | Merges Tailwind classes with clsx | `(...inputs: ClassValue[])` |
| `sanitizeSlug()` | [utils.ts](app/lib/utils.ts#L18) | Converts string to URL-safe slug | `(value: string)` |
| `getInitials()` | [utils.ts](app/lib/utils.ts#L30) | Extracts initials from name ("John Doe" → "JD") | `(name: string)` |
| `MAX_SLUG_LENGTH` | [utils.ts](app/lib/utils.ts#L16) | Maximum slug length constant | 30 |

---

## Date/Time Operations

| Function | Location | Does What | Params |
|----------|----------|-----------|--------|
| `formatCompactRelativeDate()` | [utils.ts](app/lib/utils.ts#L84) | Formats due dates: Today, Tomorrow, Overdue, Xhrs, Xdays | `(date: Date \| number \| string, nowDate?: Date)` |
| `formatTimelineDate()` | [utils.ts](app/lib/utils.ts#L118) | Formats for activity: Just Now, Xm ago, Yesterday at X | `(timestamp: number)` |
| `formatDate()` | [utils.ts](app/lib/utils.ts#L169) | Formats absolute date: MM/DD/YYYY | `(ms: number)` |

### Internal Date Helpers (not exported)
- `isToday()` - Check if date is today
- `isTomorrow()` - Check if date is tomorrow
- `isYesterday()` - Check if date is yesterday
- `isThisYear()` - Check if date is in current year

---

## Validation Schemas (Zod)

### Shared Schemas
| Schema | Location | Does What |
|--------|----------|-----------|
| `baseEntitySchema` | [shared.ts](app/lib/validations/shared.ts#L12) | Name (required) + description (optional) |
| `baseSlugSchema` | [shared.ts](app/lib/validations/shared.ts#L17) | URL slug validation |
| `emailSchema` | [shared.ts](app/lib/validations/shared.ts#L42) | Email validation + lowercase transform |
| `passwordSchema` | [shared.ts](app/lib/validations/shared.ts#L47) | 8-128 char password |
| `prioritySchema` | [shared.ts](app/lib/validations/shared.ts#L34) | 0-4 priority level |
| `statusSchema` | [shared.ts](app/lib/validations/shared.ts#L35) | Non-empty status string |
| `dateSchema` | [shared.ts](app/lib/validations/shared.ts#L56) | Coerced Date |
| `colorSchema` | [shared.ts](app/lib/validations/shared.ts#L63) | Hex color (#RRGGBB) |
| `urlSchema` | [shared.ts](app/lib/validations/shared.ts#L67) | URL validation |

### Auth Schemas
| Schema | Location | Does What |
|--------|----------|-----------|
| `signInSchema` | [auth.ts](app/lib/validations/auth.ts#L47) | Email/password or OAuth sign-in |
| `signUpSchema` | [auth.ts](app/lib/validations/auth.ts#L58) | Registration with email, password, name |
| `forgetPasswordSchema` | [auth.ts](app/lib/validations/auth.ts#L71) | Email for password reset |
| `resetPasswordSchema` | [auth.ts](app/lib/validations/auth.ts#L75) | Token + new password + confirm |
| `changePasswordSchema` | [auth.ts](app/lib/validations/auth.ts#L83) | Current + new + confirm password |

---

## Billing

### Client-Side (app/lib/billing.ts)
| Export | Location | Does What |
|--------|----------|-----------|
| `dodoPayments` | [billing.ts](app/lib/billing.ts#L13) | DodoPayments client instance (server-only) |
| `billingConfig` | [billing.ts](app/lib/billing.ts#L26) | Webhook secret, enabled flag, success URL |
| `planLimits` | [billing.ts](app/lib/billing.ts#L43) | Limits per plan: starter, growth, pro, enterprise |
| `usagePricing` | [billing.ts](app/lib/billing.ts#L82) | Overage rates (cents): memberSeat, teamCreated, storageGb |
| `products` | [billing.ts](app/lib/billing.ts#L91) | Product configs with features & pricing |
| `getCheckoutSlug()` | [billing.ts](app/lib/billing.ts#L172) | Get product slug for checkout | `(plan: ProductKey, interval: BillingInterval)` |
| `getPrice()` | [billing.ts](app/lib/billing.ts#L181) | Get price for plan/interval | `(plan: ProductKey, interval: BillingInterval)` |
| `getMonthlyEquivalent()` | [billing.ts](app/lib/billing.ts#L189) | Convert yearly to monthly equivalent | `(yearlyPrice: number)` |
| `getYearlySavings()` | [billing.ts](app/lib/billing.ts#L192) | Calculate yearly savings % | `(monthlyPrice: number, yearlyPrice: number)` |
| `canCheckout()` | [billing.ts](app/lib/billing.ts#L202) | Check if plan allows checkout | `(plan: ProductKey)` |
| `getPlanByProductId()` | [billing.ts](app/lib/billing.ts#L205) | Map Dodo product ID → plan key | `(productId: string)` |
| `getMemberPrice()` | [billing.ts](app/lib/billing.ts#L226) | Get per-member price for plan | `(plan: ProductKey)` |

### Server-Side (app/lib/server/billing.server.ts)
| Function | Location | Does What |
|----------|----------|-----------|
| `getOrganizationUsage()` | [billing.server.ts](app/lib/server/billing.server.ts#L74) | Get org's member/team/matter counts (cached 5min) |
| `invalidateUsageCache()` | [billing.server.ts](app/lib/server/billing.server.ts#L83) | Clear usage cache for org |
| `getOrganizationSubscription()` | [billing.server.ts](app/lib/server/billing.server.ts#L99) | Get org's active subscription |
| `getOrganizationCustomer()` | [billing.server.ts](app/lib/server/billing.server.ts#L106) | Get org's Dodo customer record |
| `getOrganizationPayments()` | [billing.server.ts](app/lib/server/billing.server.ts#L113) | Get org's payment history |
| `linkCustomerToOrganization()` | [billing.server.ts](app/lib/server/billing.server.ts#L121) | Link Dodo customer to org |
| `upsertCustomer()` | [billing.server.ts](app/lib/server/billing.server.ts#L150) | Create/update customer record |
| `upsertSubscription()` | [billing.server.ts](app/lib/server/billing.server.ts#L211) | Create/update subscription |
| `recordPayment()` | [billing.server.ts](app/lib/server/billing.server.ts#L265) | Record payment in DB |
| `getOrganizationPlanKey()` | [billing.server.ts](app/lib/server/billing.server.ts#L340) | Get org's current plan (starter if none) |
| `checkPlanLimits()` | [billing.server.ts](app/lib/server/billing.server.ts#L350) | Check if org is within plan limits |
| `canAddMember()` | [billing.server.ts](app/lib/server/billing.server.ts#L389) | Check if org can add another member |
| `canCreateTeam()` | [billing.server.ts](app/lib/server/billing.server.ts#L422) | Check if org can create another team |
| `canCreateMatter()` | [billing.server.ts](app/lib/server/billing.server.ts#L449) | Check if org can create another matter |
| `getBillingStatus()` | [billing.server.ts](app/lib/server/billing.server.ts#L498) | Get comprehensive billing status for org |
| `handleBillingWebhook()` | [billing.server.ts](app/lib/server/billing.server.ts#L556) | Process Dodo webhook events |

---

## Storage (app/lib/server/storage.server.ts)

| Function | Location | Does What | Returns |
|----------|----------|-----------|---------|
| `isStorageConfigured` | [storage.server.ts](app/lib/server/storage.server.ts#L47) | Check if S3 is configured | `boolean` |
| `getOrganizationStorageUsage()` | [storage.server.ts](app/lib/server/storage.server.ts#L93) | Get org's storage bytes/GB/file count | `Promise<StorageUsage>` |
| `getOrganizationStorageLimits()` | [storage.server.ts](app/lib/server/storage.server.ts#L117) | Get org's storage limits based on plan | `Promise<StorageLimits>` |
| `canUploadFile()` | [storage.server.ts](app/lib/server/storage.server.ts#L137) | Check if upload is allowed (size/count/storage) | `Promise<UploadPermission>` |
| `validateFileType()` | [storage.server.ts](app/lib/server/storage.server.ts#L206) | Validate MIME type is allowed | `{ valid: boolean; error?: string }` |
| `validateFileBasic()` | [storage.server.ts](app/lib/server/storage.server.ts#L222) | Quick validation (type + absolute size) | `{ valid: boolean; error?: string }` |
| `createPresignedUpload()` | [storage.server.ts](app/lib/server/storage.server.ts#L246) | Generate S3 presigned URL for upload | `Promise<PresignedUploadResult>` |
| `saveAttachment()` | [storage.server.ts](app/lib/server/storage.server.ts#L389) | Save attachment record after upload | `Promise<{ id: string }>` |
| `deleteAttachment()` | [storage.server.ts](app/lib/server/storage.server.ts#L427) | Delete attachment with auth check | `Promise<void>` |
| `reportStorageUsage()` | [storage.server.ts](app/lib/server/storage.server.ts#L459) | Report usage to billing system | `Promise<void>` |

### Storage Types
- `StorageUsage` - { totalBytes, totalGb, fileCount }
- `StorageLimits` - { storageGb, maxFileSizeMb, maxFiles, plan }
- `UploadPermission` - { allowed, reason?, currentUsageGb, limitGb, remainingGb, ... }
- `PresignedUploadResult` - { uploadUrl, fileKey, publicUrl }

### Attachment Constants (shared/attachment-constants.ts)
| Export | Does What |
|--------|-----------|
| `ALLOWED_ATTACHMENT_TYPES` | Array of allowed MIME types |
| `ALLOWED_ATTACHMENT_TYPES_SET` | Set for O(1) lookup |
| `ABSOLUTE_MAX_FILE_SIZE` | 100MB absolute limit |
| `isAllowedAttachmentType()` | Check if MIME type is allowed |

---

## Permissions

### Client-Side (app/lib/permissions.ts)
| Function | Location | Does What |
|----------|----------|-----------|
| `getRolePermissions()` | [permissions.ts](app/lib/permissions.ts#L42) | Get permission flags for role |
| `computeTeamPermissions()` | [permissions.ts](app/lib/permissions.ts#L82) | Compute full TeamPermissions object |
| `canCreateTasks()` | permissions.ts | Check if role can create tasks |
| `canCreateRequests()` | permissions.ts | Check if role can create requests |
| `canApproveRequests()` | permissions.ts | Check if role can approve requests |
| `canManageMembers()` | permissions.ts | Check if role can manage team members |
| `canManageTeam()` | permissions.ts | Check if role can manage team settings |
| `canEditMatter()` | permissions.ts | Check if user can edit a matter (author/assignee/manager) |
| `canDeleteMatter()` | permissions.ts | Check if user can delete a matter |
| `canModifyAttachment()` | permissions.ts | Check if user can modify/delete attachment (uploader/author/assignee/manager) |

### Server-Side / Zero Mutators (zero/permission-helpers.ts)
| Function | Location | Does What |
|----------|----------|-----------|
| `assertLoggedIn()` | permission-helpers.ts | Assert user has active org |
| `getTeamMembership()` | permission-helpers.ts | Get team membership for user |
| `assertTeamMember()` | permission-helpers.ts | Assert user is team member |
| `assertTeamManager()` | permission-helpers.ts | Assert user is team manager |
| `canModifyMatter()` | permission-helpers.ts | Check if user can modify matter (author/assignee/manager) |
| `canModifyDeletedMatter()` | permission-helpers.ts | Same check for deleted matters (restore) |
| `assertCanModifyMatter()` | permission-helpers.ts | Assert version that throws |
| `createPermissionHelpers()` | permission-helpers.ts | Factory for tx/ctx-bound helpers |

### Permission Types
- `TeamRole` - "manager" | "member" | "viewer"
- `TeamRolePermissions` - Boolean flags for each permission
- `TeamPermissions` - Full context with teamId, role, and flags

### Error Messages
`PERMISSION_ERRORS` constant (in permissions.ts, re-exported from permission-helpers.ts):
- `NOT_LOGGED_IN`, `NOT_TEAM_MEMBER`, `MANAGER_REQUIRED`, `CANNOT_MODIFY_MATTER`, etc.

---

## Error Handling (app/lib/error-utils.ts)

| Function | Location | Does What | Returns |
|----------|----------|-----------|---------|
| `normalizeError()` | [error-utils.ts](app/lib/error-utils.ts#L15) | Convert any error to Error instance | `Error` |
| `getErrorMessage()` | [error-utils.ts](app/lib/error-utils.ts#L33) | Extract message from any error type | `string` |

---

## Logging (app/lib/logger.ts)

| Method | Does What |
|--------|-----------|
| `logger.log()` | General logging (dev only) |
| `logger.warn()` | Warnings (always in prod) |
| `logger.error()` | Errors (always in prod) |
| `logger.info()` | Info logging (dev only) |
| `logger.debug()` | Debug logging (dev only) |
| `logger.safeError()` | Safe error logging with context |
| `logger.time() / timeEnd()` | Performance timing |
| `logger.group() / groupEnd()` | Grouped logging |

---

## React Hooks (app/hooks/)

| Hook | Location | Does What |
|------|----------|-----------|
| `usePermissions()` | [use-permissions.ts](app/hooks/use-permissions.ts) | Team permissions for current user |
| `useAttachments()` | [use-attachments.ts](app/hooks/use-attachments.ts) | Attachment upload/delete handling |
| `useGroupedTasks()` | [use-grouped-tasks.ts](app/hooks/use-grouped-tasks.ts) | Tasks grouped by status/priority |
| `useIsPending()` | [use-is-pending.ts](app/hooks/use-is-pending.ts) | Track form submission state |
| `useLoaderData()` | [use-loader-data.ts](app/hooks/use-loader-data.ts) | Type-safe loader data access |
| `useMobile()` | [use-mobile.ts](app/hooks/use-mobile.ts) | Detect mobile viewport |
| `useNonce()` | [use-nonce.ts](app/hooks/use-nonce.ts) | CSP nonce from context |
| `usePerformanceMonitor()` | [use-performance-monitor.ts](app/hooks/use-performance-monitor.ts) | Component render performance |
| `usePushNotifications()` | [use-push-notifications.ts](app/hooks/use-push-notifications.ts) | Web push notification handling |
| `useShortId()` | [use-short-id.ts](app/hooks/use-short-id.ts) | Short ID generation/lookup |

---

## Layout Constants (app/lib/layout-constants.ts)

| Constant | Value | Purpose |
|----------|-------|---------|
| `PANEL_MOBILE_SIZE` | "40%" | Mobile panel width |
| `PANEL_XL_SIZE` | "25%" | XL screen panel width |
| `PANEL_DEFAULT_SIZE` | "35%" | Default panel width |
| `PANEL_MIN_SIZE` | "25%" | Minimum panel width |
| `PANEL_MAX_SIZE` | "50%" | Maximum panel width |

| Function | Does What |
|----------|-----------|
| `getListPanelSize()` | Get responsive list panel size |
| `getDetailPanelSize()` | Get responsive detail panel size |

---

## App Configuration (app/lib/app-config.ts)

| Export | Does What |
|--------|-----------|
| `AppInfo` | App name, description, URL constants |
| `SOCIAL_PROVIDER_CONFIGS` | OAuth provider configurations |

---

## Server Modules

### Organization (app/lib/server/organization.server.ts)
- Organization CRUD operations
- Member management

### Customer (app/lib/server/customer.server.ts)
- Customer record management

### Auth Helper (app/lib/server/auth-helper.ts)
- Server-side auth utilities

### Prepared Queries (app/lib/server/prepared-queries.server.ts)
- Pre-compiled database queries for performance

### Billing Tracking (app/lib/server/billing-tracking.server.ts)
| Function | Does What |
|----------|-----------|
| `trackMembershipChange()` | Report member changes to billing |
| `trackStorageChange()` | Report storage changes to billing |

---

## Database Schema

### Key Tables (app/db/schema/)
- `usersTable` - User accounts
- `organizationsTable` - Organizations
- `membersTable` - Org memberships
- `teamsTable` - Teams within orgs
- `teamMembershipsTable` - Team memberships
- `mattersTable` - Tasks/matters
- `attachmentsTable` - File attachments
- `customersTable` - Billing customers
- `subscriptionsTable` - Subscriptions
- `paymentsTable` - Payment records
- `webhookEventsTable` - Webhook deduplication

### Helpers (app/db/helpers.ts)
- `teamRole` - Role constants: manager, member, viewer

---

## Shared Constants (shared/)

| File | Contains |
|------|----------|
| `attachment-constants.ts` | File upload types/limits |
| `env.ts` | Environment variable access |
| `exec.ts` | Command execution utilities |
| `must.ts` | Assertion helpers |

---

## Check Before Writing

### Need to format a date?
→ Use `formatDate()`, `formatCompactRelativeDate()`, or `formatTimelineDate()` from utils.ts

### Need validation?
→ Check `app/lib/validations/*.ts` for existing Zod schemas

### Need to check permissions?
→ Use `usePermissions()` hook or functions from `permissions.ts`

### Need error handling?
→ Use `normalizeError()` or `getErrorMessage()` from error-utils.ts

### Need logging?
→ Use `logger` from logger.ts (not console.log)

### Need storage operations?
→ Use functions from storage.server.ts

### Need billing checks?
→ Use `canAddMember()`, `canCreateTeam()`, etc. from billing.server.ts

### Need to work with slugs?
→ Use `sanitizeSlug()` with `MAX_SLUG_LENGTH` from utils.ts
