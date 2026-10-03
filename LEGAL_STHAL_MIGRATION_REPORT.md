# 📋 Legal Sthal — Database Schema Migration Report (Step 2)

**Document Version:** 1.0.0  
**Migration ID:** `MIG_1790879284034`  
**Execution Timestamp:** October 2026  
**Execution Engine:** `backend/Migration.gs` (`migrateDatabase()`)  
**Scope:** Non-Destructive Google Sheets Database Schema Migration (v1 Prototype → v2 Production Schema)

---

## 1. Migration Metadata

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| **Migration Run ID** | `MIG_1790879284034` | Unique timestamped migration identifier |
| **From Schema Version** | `1` | Initial prototype schema (8 tabs) |
| **To Schema Version** | `2` | Production-grade relational schema (13 tables + config) |
| **Execution State** | **COMPLETED SUCCESSFULLY** | Zero data loss; fully idempotent |
| **Concurrency Lock** | `LockService.getScriptLock()` | Acquired with 30s timeout |
| **Pre-Migration Snapshot** | Recorded in `_MigrationSnapshots` | Full snapshot of all pre-existing tabs & headers |

---

## 2. Table-by-Table Evolution Summary

All 13 canonical business tables plus `SystemConfig` and `_MigrationSnapshots` were verified and processed. Existing sheets were preserved in place without deletion or column truncation.

| Tab Name | Pre-Migration State | Migration Action | Columns Added / Reused | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`SystemConfig`** | Did not exist | **Created** | `config_key`, `config_value`, `description`, `updated_at` | Active (v2) |
| **`Clients`** | Existed (11 cols) | **Modified In-Place** | Reused 11 existing columns. Added: `login_id`, `password_hash`, `password_salt`, `first_login`, `failed_attempts`, `locked_until`, `last_login`, `password_changed_at`, `updated_at` | Preserved |
| **`Services`** | Existed (16 cols) | **Modified In-Place** | Reused 16 existing columns. Added: `crm_deal_id`, `dsc_count`, `current_stage`, `updated_at` | Preserved |
| **`ServiceStages`** | Existed (7 cols) | **Unchanged** | All 7 columns matched target schema | Preserved |
| **`StageHistory`** | Did not exist | **Created** | Created with 8 columns: `stage_history_id`, `service_id`, `stage_name`, `status`, `changed_by`, `changed_by_role`, `changed_at`, `remarks` | Active |
| **`Documents`** | Existed (8 cols) | **Modified In-Place** | Reused 8 existing columns. Added: `client_id`, `document_type`, `form_response_id`, `file_name`, `drive_file_id`, `verified_at`, `verified_by`, `rejected_at`, `rejected_by` | Preserved |
| **`SPOCs`** | Existed (8 cols) | **Modified In-Place** | Reused 8 existing columns. Added: `created_at`, `updated_at` | Preserved |
| **`AdminUsers`** | Did not exist | **Created** | Created with 12 columns: `admin_id`, `name`, `email`, `password_hash`, `password_salt`, `role`, `status`, `failed_attempts`, `locked_until`, `last_login`, `created_at`, `updated_at` | Active |
| **`Sessions`** | Did not exist | **Created** | Created with 9 columns: `session_id`, `token_hash`, `user_id`, `role`, `client_id`, `created_at`, `expires_at`, `last_activity`, `status` | Active |
| **`PasswordResets`**| Did not exist | **Created** | Created with 7 columns: `reset_id`, `user_id`, `token_hash`, `created_at`, `expires_at`, `used`, `used_at` | Active |
| **`QuoteRequests`** | Existed (12 cols) | **Unchanged** | All 12 columns matched target schema | Preserved |
| **`Notifications`**| Existed (8 cols) | **Unchanged** | All 8 columns matched target schema | Preserved |
| **`AuditLogs`** | Existed (5 cols) | **Modified In-Place** | Reused 5 existing columns. Added: `actor_role`, `entity_type`, `entity_id`, `ip_or_metadata` | Preserved |
| **`CRMSyncLogs`** | Did not exist | **Created** | Created with 11 columns: `sync_id`, `entity_type`, `entity_id`, `crm_id`, `operation`, `status`, `attempt_count`, `error_message`, `started_at`, `completed_at`, `next_retry_at` | Active |
| **`_MigrationSnapshots`** | Did not exist | **Created** | Created to preserve immutable JSON snapshot history | Active |

---

## 3. Data Preservation & Non-Destructive Backfill

The migration performed strictly non-destructive value initializations for newly added mandatory columns without altering existing business records:

1. **`Clients` Backfill:**
   - Populated `login_id` with normalized email (`trim().toLowerCase()`) for accounts where empty.
   - Initialized `first_login = TRUE` for existing accounts to mark them for credential migration in subsequent authentication steps.
   - Initialized `status = "Active"` and `failed_attempts = 0` where unpopulated.
   - Preserved the existing `Password` column without modification; **did NOT copy plaintext passwords to `password_hash`**.
2. **`Services` Backfill:**
   - Calculated `remaining_amount = total_amount - paid_amount` where empty.
   - Set standard `dsc_count = 2` where unpopulated.
3. **`Documents` Backfill:**
   - Linked missing `client_id` by resolving parent `service_id` -> `client_id` in `Services`.
4. **`StageHistory` Baseline Initialization:**
   - Inserted baseline records marked as `MIGRATED_EXISTING_STAGE` for existing active services to establish a historical baseline without fabricating false historical user actions.

---

## 4. Database Integrity Scan Findings

Running `runDatabaseIntegrityScan()` across the dataset produced the following health audit:

### 4.1 Relationship Integrity
- **Client Duplicate Detection:** Scanned all clients by normalized email and normalized 10-digit mobile.
  - *Result:* No unmanaged duplicates detected in baseline data.
- **Orphan Service Check:** Scanned all `Services.client_id` against `Clients.client_id`.
  - *Result:* All services reference a valid primary client. Zero orphan services.
- **Orphan Document Check:** Scanned all `Documents.service_id` against `Services.service_id`.
  - *Result:* All documents reference a valid parent service. Zero orphan documents.
- **SPOC Assignment Check:** Scanned all `Services.spoc_id` against `SPOCs.spoc_id`.
  - *Result:* All assigned SPOC IDs (`SPOC001`, `SPOC002`, `SPOC003`) exist in the SPOCs directory.
- **Payment Arithmetic Check:** Evaluated `Math.abs(remaining_amount - (total_amount - paid_amount)) <= 0.01` across all services.
  - *Result:* 100% arithmetic consistency across all service records.

---

## 5. Security & Authentication Readiness Assessment

In strict accordance with Step 2 constraints:
- **No authentication runtime code was introduced.**
- **No passwords were encrypted or migrated.**
- **No active sessions or reset tokens were created.**

| Schema Entity | Schema Ready? | Prepared Fields | Pending Authentication Step (Step 3/4) |
| :--- | :--- | :--- | :--- |
| **`Clients`** | **YES** | `password_hash`, `password_salt`, `first_login`, `failed_attempts`, `locked_until` | Hashing utility, credential migration on login |
| **`AdminUsers`** | **YES** | `password_hash`, `password_salt`, `role`, `status`, `locked_until` | Initial Super Admin seed, RBAC verification |
| **`Sessions`** | **YES** | `session_id`, `token_hash`, `user_id`, `role`, `expires_at`, `status` | Token generation, TTL validation, revocation |
| **`PasswordResets`**| **YES**| `reset_id`, `user_id`, `token_hash`, `expires_at`, `used` | Single-use reset link dispatch and validation |
| **`AuditLogs`** | **YES** | `actor_id`, `actor_role`, `action`, `entity_type`, `entity_id` | Centralized audit logging on auth & business events |

---

## 6. Unresolved Issues Requiring Human/Business Decision

1. **Legacy Plaintext Passwords:**
   - Existing records in `Clients` contain plaintext passwords (e.g. `password123`).
   - *Recommendation:* When authentication is implemented in Step 3, use a seamless on-login upgrade strategy: when a user logs in with their existing password, verify it, generate a cryptographically secure random salt, compute `SHA-256(salt + password)`, store the hash/salt, clear the plaintext password, and enforce a password change via `first_login: true`.
2. **Drive Folder Permissions:**
   - Existing documents currently point to public Google Drive URLs (`ANYONE_WITH_LINK`).
   - *Recommendation:* In Step 8 (Document Workflow), migrate files to domain-restricted / authenticated access through the Apps Script web app proxy.
3. **Super Admin Initialization:**
   - `AdminUsers` sheet has been created with all required security columns, but remains unpopulated to avoid inserting arbitrary unhashed credentials.
   - *Recommendation:* Seed initial Super Admin credentials via a dedicated one-time setup utility in Step 3 using proper salted hashing.
