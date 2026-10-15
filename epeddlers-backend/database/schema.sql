-- ============================================================================
-- ePeddlers - La Carlota City Peddler Business Permit Application
-- MySQL / MariaDB Schema
-- ----------------------------------------------------------------------------
-- Engine: InnoDB (FK + transaction support)
-- Charset: utf8mb4
-- Timestamps: stored in UTC (application presents in Asia/Manila)
-- Money: DECIMAL(12,2)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- RBAC: roles, permissions, pivot tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code          VARCHAR(50)  NOT NULL,         -- e.g. admin, treasury, inspection_officer, sanitary_officer
    name          VARCHAR(100) NOT NULL,
    category      ENUM('admin','administrative','treasury') NOT NULL,
    description   VARCHAR(255) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS permissions (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code          VARCHAR(100) NOT NULL,         -- e.g. users.create, applications.approve
    description   VARCHAR(255) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Users and role assignment
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    employee_no    VARCHAR(50)  NULL,
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL,
    username       VARCHAR(100) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    phone          VARCHAR(30)  NULL,
    status         ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    must_change_pw TINYINT(1)   NOT NULL DEFAULT 1,
    last_login_at  DATETIME NULL,
    created_by     INT UNSIGNED NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_username (username),
    KEY idx_users_status (status),
    CONSTRAINT fk_users_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id       INT UNSIGNED NOT NULL,
    role_id       INT UNSIGNED NOT NULL,
    assigned_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Server-side opaque bearer tokens (works for web + Expo mobile without CSRF cookie complexity)
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       INT UNSIGNED NOT NULL,
    token_hash    CHAR(64)     NOT NULL,         -- sha256 of the raw token
    device_label  VARCHAR(100) NULL,
    expires_at    DATETIME     NULL,
    last_used_at  DATETIME     NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pat_hash (token_hash),
    KEY idx_pat_user (user_id),
    CONSTRAINT fk_pat_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Peddlers (central registry) + future mapping fields (STANDBY, nullable)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS peddlers (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    peddler_code    VARCHAR(30)  NOT NULL,       -- stable public-safe reference
    full_name       VARCHAR(150) NOT NULL,
    contact_number  VARCHAR(30)  NULL,
    email           VARCHAR(150) NULL,
    address         VARCHAR(255) NULL,
    id_type         VARCHAR(60)  NULL,
    id_number       VARCHAR(80)  NULL,
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    -- Mapping placeholders (STANDBY - do not require values)
    vending_zone_id INT UNSIGNED NULL,
    latitude        DECIMAL(10,7) NULL,
    longitude       DECIMAL(10,7) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_peddlers_code (peddler_code),
    KEY idx_peddlers_name (full_name),
    KEY idx_peddlers_contact (contact_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mapping zones (STANDBY scaffold, unused by initial release)
CREATE TABLE IF NOT EXISTS vending_zones (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name          VARCHAR(120) NOT NULL,
    description   VARCHAR(255) NULL,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    geojson       LONGTEXT NULL,                 -- reserved for future map geometry
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Fee configuration (configurable, versioned by effective date)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fee_categories (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code          VARCHAR(50)  NOT NULL,         -- permit_fee, arkabala_daily, penalty_late, etc.
    name          VARCHAR(120) NOT NULL,
    kind          ENUM('permit','vending','arkabala','penalty') NOT NULL,
    description   VARCHAR(255) NULL,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_fee_cat_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fee_schedules (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    fee_category_id  INT UNSIGNED NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    effective_from   DATE NOT NULL,
    effective_to     DATE NULL,
    created_by       INT UNSIGNED NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_fs_cat (fee_category_id),
    KEY idx_fs_eff (effective_from, effective_to),
    CONSTRAINT fk_fs_cat FOREIGN KEY (fee_category_id) REFERENCES fee_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_fs_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Applications + documents + status history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_code     VARCHAR(30)  NOT NULL,  -- non-sequential public Application ID
    track_pin            VARCHAR(10)  NOT NULL,  -- verification factor for public tracking
    type                 ENUM('new','renewal') NOT NULL DEFAULT 'new',
    peddler_id           INT UNSIGNED NULL,      -- linked on renewal / after approval
    previous_permit_id   INT UNSIGNED NULL,
    status               VARCHAR(40)  NOT NULL DEFAULT 'submitted',
    -- Applicant snapshot (configurable fields captured at submission time)
    applicant_name       VARCHAR(150) NOT NULL,
    contact_number       VARCHAR(30)  NULL,
    email                VARCHAR(150) NULL,
    address              VARCHAR(255) NULL,
    id_type              VARCHAR(60)  NULL,
    id_number            VARCHAR(80)  NULL,
    -- Business / vending info
    business_name        VARCHAR(150) NULL,
    goods_type           VARCHAR(150) NULL,
    activity_description  TEXT NULL,
    preferred_location   VARCHAR(255) NULL,
    vending_zone_id      INT UNSIGNED NULL,      -- STANDBY mapping
    extra                JSON NULL,              -- additional configurable fields
    submitted_at         DATETIME NULL,
    decided_at           DATETIME NULL,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_app_code (application_code),
    KEY idx_app_status (status),
    KEY idx_app_type (type),
    KEY idx_app_peddler (peddler_id),
    KEY idx_app_name (applicant_name),
    CONSTRAINT fk_app_peddler FOREIGN KEY (peddler_id) REFERENCES peddlers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS application_documents (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id  INT UNSIGNED NOT NULL,
    doc_type        VARCHAR(80)  NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    stored_path     VARCHAR(255) NOT NULL,       -- outside public web root
    mime_type       VARCHAR(120) NOT NULL,
    size_bytes      INT UNSIGNED NOT NULL,
    uploaded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_docs_app (application_id),
    CONSTRAINT fk_docs_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS application_status_history (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id  INT UNSIGNED NOT NULL,
    from_status     VARCHAR(40) NULL,
    to_status       VARCHAR(40) NOT NULL,
    department      VARCHAR(60) NULL,
    changed_by      INT UNSIGNED NULL,           -- NULL = applicant/public/system
    remarks         VARCHAR(500) NULL,
    public_visible  TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ash_app (application_id),
    CONSTRAINT fk_ash_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_ash_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Permits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permits (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    permit_code     VARCHAR(30)  NOT NULL,
    qr_reference    CHAR(64)     NOT NULL,       -- non-guessable server-validated reference
    application_id  INT UNSIGNED NOT NULL,
    peddler_id      INT UNSIGNED NOT NULL,
    status          ENUM('issued','expired','revoked') NOT NULL DEFAULT 'issued',
    valid_from      DATE NOT NULL,
    valid_to        DATE NOT NULL,
    issued_by       INT UNSIGNED NULL,
    issued_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_reason  VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_permit_code (permit_code),
    UNIQUE KEY uq_permit_qr (qr_reference),
    KEY idx_permit_peddler (peddler_id),
    KEY idx_permit_status (status),
    CONSTRAINT fk_permit_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_permit_peddler FOREIGN KEY (peddler_id) REFERENCES peddlers(id) ON DELETE CASCADE,
    CONSTRAINT fk_permit_user FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- backfill FK from applications.previous_permit_id now that permits exists
ALTER TABLE applications
    ADD CONSTRAINT fk_app_prev_permit FOREIGN KEY (previous_permit_id) REFERENCES permits(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Inspections (general) and sanitary inspections (independent decisions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspections (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id  INT UNSIGNED NOT NULL,
    officer_id      INT UNSIGNED NULL,
    inspected_at    DATETIME NULL,
    compliance      ENUM('compliant','non_compliant') NULL,
    recommendation  ENUM('approve','reject','return') NULL,
    findings        TEXT NULL,
    remarks         TEXT NULL,
    status          ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_insp_app (application_id),
    KEY idx_insp_officer (officer_id),
    CONSTRAINT fk_insp_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_insp_officer FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sanitary_inspections (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id  INT UNSIGNED NOT NULL,
    officer_id      INT UNSIGNED NULL,
    inspected_at    DATETIME NULL,
    compliance      ENUM('compliant','non_compliant') NULL,
    decision        ENUM('approve','reject','return') NULL,
    findings        TEXT NULL,
    remarks         TEXT NULL,
    status          ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_san_app (application_id),
    KEY idx_san_officer (officer_id),
    CONSTRAINT fk_san_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_san_officer FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Attachments for inspections / sanitary (photos when enabled)
CREATE TABLE IF NOT EXISTS inspection_attachments (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    inspection_type ENUM('inspection','sanitary') NOT NULL,
    inspection_id   INT UNSIGNED NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    stored_path     VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(120) NOT NULL,
    size_bytes      INT UNSIGNED NOT NULL,
    uploaded_by     INT UNSIGNED NULL,
    uploaded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_insp_att (inspection_type, inspection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Charges, payments, verification (NOT a boolean on applications)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_charges (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id   INT UNSIGNED NOT NULL,
    fee_category_id  INT UNSIGNED NOT NULL,
    fee_schedule_id  INT UNSIGNED NULL,
    description      VARCHAR(150) NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ac_app (application_id),
    CONSTRAINT fk_ac_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_ac_cat FOREIGN KEY (fee_category_id) REFERENCES fee_categories(id),
    CONSTRAINT fk_ac_sched FOREIGN KEY (fee_schedule_id) REFERENCES fee_schedules(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_records (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    payment_ref      VARCHAR(40)  NOT NULL,
    application_id   INT UNSIGNED NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    method           VARCHAR(40)  NULL,
    paid_at          DATETIME NULL,
    status           ENUM('pending','verified','rejected','reversed') NOT NULL DEFAULT 'pending',
    recorded_by      INT UNSIGNED NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pay_ref (payment_ref),
    KEY idx_pay_app (application_id),
    KEY idx_pay_status (status),
    CONSTRAINT fk_pay_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_verifications (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    payment_id       INT UNSIGNED NOT NULL,
    result           ENUM('verified','rejected','reversed') NOT NULL,
    verified_by      INT UNSIGNED NOT NULL,
    remarks          VARCHAR(500) NULL,
    reverses_id      INT UNSIGNED NULL,          -- points to a prior verification being corrected
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_pv_pay (payment_id),
    CONSTRAINT fk_pv_pay FOREIGN KEY (payment_id) REFERENCES payment_records(id) ON DELETE CASCADE,
    CONSTRAINT fk_pv_user FOREIGN KEY (verified_by) REFERENCES users(id),
    CONSTRAINT fk_pv_rev FOREIGN KEY (reverses_id) REFERENCES payment_verifications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Arkabala / tax collection
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS collection_transactions (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    txn_ref          VARCHAR(40)  NOT NULL,
    peddler_id       INT UNSIGNED NOT NULL,
    application_id   INT UNSIGNED NULL,
    fee_category_id  INT UNSIGNED NOT NULL,
    amount           DECIMAL(12,2) NOT NULL,
    collected_by     INT UNSIGNED NOT NULL,
    collected_at     DATETIME NOT NULL,
    collection_week  DATE NOT NULL,              -- configured week anchor (e.g. Saturday date)
    status           ENUM('success','voided','reversed','pending') NOT NULL DEFAULT 'success',
    idempotency_key  VARCHAR(80) NULL,           -- prevents accidental double collection
    remarks          VARCHAR(500) NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_coll_ref (txn_ref),
    UNIQUE KEY uq_coll_idem (idempotency_key),
    KEY idx_coll_peddler (peddler_id),
    KEY idx_coll_week (collection_week),
    KEY idx_coll_status (status),
    CONSTRAINT fk_coll_peddler FOREIGN KEY (peddler_id) REFERENCES peddlers(id),
    CONSTRAINT fk_coll_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
    CONSTRAINT fk_coll_cat FOREIGN KEY (fee_category_id) REFERENCES fee_categories(id),
    CONSTRAINT fk_coll_user FOREIGN KEY (collected_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS collection_reversals (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    transaction_id   INT UNSIGNED NOT NULL,
    reason           VARCHAR(500) NOT NULL,
    reversed_by      INT UNSIGNED NOT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_rev_txn (transaction_id),
    CONSTRAINT fk_rev_txn FOREIGN KEY (transaction_id) REFERENCES collection_transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_rev_user FOREIGN KEY (reversed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Violations and sanctions (separate from payments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS violation_categories (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    code          VARCHAR(50)  NOT NULL,
    name          VARCHAR(150) NOT NULL,
    description   VARCHAR(255) NULL,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_viocat_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS violations (
    id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    peddler_id       INT UNSIGNED NULL,
    permit_id        INT UNSIGNED NULL,
    category_id      INT UNSIGNED NOT NULL,
    violation_date   DATE NOT NULL,
    description      TEXT NULL,
    recorded_by      INT UNSIGNED NOT NULL,
    penalty_amount   DECIMAL(12,2) NULL,         -- only when authorized/applicable
    resolution_status ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
    payment_status   ENUM('not_applicable','unpaid','paid') NOT NULL DEFAULT 'not_applicable',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_vio_peddler (peddler_id),
    KEY idx_vio_cat (category_id),
    CONSTRAINT fk_vio_peddler FOREIGN KEY (peddler_id) REFERENCES peddlers(id) ON DELETE SET NULL,
    CONSTRAINT fk_vio_permit FOREIGN KEY (permit_id) REFERENCES permits(id) ON DELETE SET NULL,
    CONSTRAINT fk_vio_cat FOREIGN KEY (category_id) REFERENCES violation_categories(id),
    CONSTRAINT fk_vio_user FOREIGN KEY (recorded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sanctions (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    violation_id  INT UNSIGNED NOT NULL,
    sanction_type VARCHAR(100) NOT NULL,
    description   VARCHAR(255) NULL,
    applied_by    INT UNSIGNED NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_sanc_vio (violation_id),
    CONSTRAINT fk_sanc_vio FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE,
    CONSTRAINT fk_sanc_user FOREIGN KEY (applied_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS violation_history (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    violation_id  INT UNSIGNED NOT NULL,
    action        VARCHAR(60) NOT NULL,
    detail        VARCHAR(500) NULL,
    actor_id      INT UNSIGNED NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_viohist_vio (violation_id),
    CONSTRAINT fk_viohist_vio FOREIGN KEY (violation_id) REFERENCES violations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Activity logs, notifications, system settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_id      INT UNSIGNED NULL,
    action        VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(60)  NULL,
    entity_id     VARCHAR(60)  NULL,
    before_json   JSON NULL,
    after_json    JSON NULL,
    ip_address    VARCHAR(45) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_log_actor (actor_id),
    KEY idx_log_entity (entity_type, entity_id),
    KEY idx_log_action (action),
    CONSTRAINT fk_log_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       INT UNSIGNED NOT NULL,
    type          VARCHAR(60) NOT NULL,
    title         VARCHAR(150) NOT NULL,
    body          VARCHAR(500) NULL,
    application_id INT UNSIGNED NULL,
    link          VARCHAR(255) NULL,
    is_read       TINYINT(1) NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notif_user (user_id, is_read),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS system_settings (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
    setting_key   VARCHAR(100) NOT NULL,
    setting_value TEXT NULL,
    value_type    ENUM('string','int','bool','json') NOT NULL DEFAULT 'string',
    description   VARCHAR(255) NULL,
    updated_by    INT UNSIGNED NULL,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
