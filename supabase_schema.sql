-- ==============================================================================
-- LEGAL STHAL MASTER PRODUCTION DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- Version: 3.0.1 (Self-Contained Supabase SQL Migration)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop Existing Tables and Sequences (Idempotent Clean Setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS crm_sync_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS quote_requests CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS stage_history CASCADE;
DROP TABLE IF EXISTS service_stages CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS spocs CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

DROP SEQUENCE IF EXISTS admin_seq CASCADE;
DROP SEQUENCE IF EXISTS client_seq CASCADE;
DROP SEQUENCE IF EXISTS service_seq CASCADE;
DROP SEQUENCE IF EXISTS doc_seq CASCADE;
DROP SEQUENCE IF EXISTS notif_seq CASCADE;
DROP SEQUENCE IF EXISTS quote_seq CASCADE;
DROP SEQUENCE IF EXISTS sync_seq CASCADE;

-- 3. Create ID Generation Sequences
CREATE SEQUENCE admin_seq START WITH 2;
CREATE SEQUENCE client_seq START WITH 4;
CREATE SEQUENCE service_seq START WITH 5;
CREATE SEQUENCE doc_seq START WITH 5;
CREATE SEQUENCE notif_seq START WITH 4;
CREATE SEQUENCE quote_seq START WITH 1;
CREATE SEQUENCE sync_seq START WITH 1;

-- ==============================================================================
-- TABLE 1: admin_users (Staff, Managers & Super Admins)
-- ==============================================================================
CREATE TABLE admin_users (
    admin_id VARCHAR(50) PRIMARY KEY DEFAULT ('ADM' || LPAD(nextval('admin_seq')::TEXT, 3, '0')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    role VARCHAR(50) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'OPERATIONS_MANAGER', 'SPOC_EXECUTIVE')),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED')),
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 2: spocs (Single Point of Contact Directory)
-- ==============================================================================
CREATE TABLE spocs (
    spoc_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    assigned_clients INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 3: clients (Customer Accounts & Authentication)
-- ==============================================================================
CREATE TABLE clients (
    client_id VARCHAR(50) PRIMARY KEY DEFAULT ('CL' || LPAD(nextval('client_seq')::TEXT, 3, '0')),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    login_id VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    first_login BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Locked', 'Suspended')),
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    state VARCHAR(100),
    address TEXT,
    gstin VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 4: services (Service Engagements Purchased by Clients)
-- ==============================================================================
CREATE TABLE services (
    service_id VARCHAR(50) PRIMARY KEY DEFAULT ('SRV' || LPAD(nextval('service_seq')::TEXT, 3, '0')),
    client_id VARCHAR(50) NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
    service_code VARCHAR(100) UNIQUE NOT NULL,
    crm_deal_id VARCHAR(100),
    service_name VARCHAR(255) NOT NULL,
    company_type VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    dsc_count INTEGER NOT NULL DEFAULT 2,
    name_run BOOLEAN NOT NULL DEFAULT false,
    current_stage VARCHAR(255) NOT NULL DEFAULT 'Application Intake',
    current_stage_index INTEGER NOT NULL DEFAULT 0,
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    status VARCHAR(50) NOT NULL DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Under Review', 'Completed', 'On Hold')),
    spoc_id VARCHAR(50) REFERENCES spocs(spoc_id) ON DELETE SET NULL,
    certificate_url TEXT,
    completed_on TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 5: service_stages (Sequential Milestones for Each Service)
-- ==============================================================================
CREATE TABLE service_stages (
    stage_id VARCHAR(100) PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    stage_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (stage_status IN ('Completed', 'Current', 'Pending')),
    completed_on VARCHAR(100),
    description TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 6: stage_history (Audit Trail for Workflow Stage Transitions)
-- ==============================================================================
CREATE TABLE stage_history (
    stage_history_id VARCHAR(100) PRIMARY KEY,
    service_id VARCHAR(50) NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100) NOT NULL,
    changed_by_role VARCHAR(50) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remarks TEXT
);

-- ==============================================================================
-- TABLE 7: documents (Document Submissions & Verification Pipeline)
-- ==============================================================================
CREATE TABLE documents (
    document_id VARCHAR(50) PRIMARY KEY DEFAULT ('DOC' || LPAD(nextval('doc_seq')::TEXT, 3, '0')),
    service_id VARCHAR(50) NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    client_id VARCHAR(50) NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL DEFAULT 'PROOF',
    form_response_id VARCHAR(100),
    file_name VARCHAR(255),
    file_url TEXT,
    drive_file_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'Verified', 'Rejected')),
    rejection_reason TEXT,
    required BOOLEAN NOT NULL DEFAULT TRUE,
    submitted_on TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(100),
    rejected_at TIMESTAMPTZ,
    rejected_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 8: sessions (Active Bearer Tokens & Device State)
-- ==============================================================================
CREATE TABLE sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    user_id VARCHAR(50) NOT NULL,
    role VARCHAR(50) NOT NULL,
    client_id VARCHAR(50),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 9: password_resets (Single-Use Password Recovery Tokens)
-- ==============================================================================
CREATE TABLE password_resets (
    reset_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 10: quote_requests (Client Service Inquiries & Proposals)
-- ==============================================================================
CREATE TABLE quote_requests (
    request_id VARCHAR(50) PRIMARY KEY DEFAULT ('QR' || LPAD(nextval('quote_seq')::TEXT, 3, '0')),
    client_id VARCHAR(50) REFERENCES clients(client_id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    company_type VARCHAR(100),
    state VARCHAR(100),
    mobile VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Quote Sent', 'Accepted', 'Declined')),
    quote_amount VARCHAR(100),
    remarks TEXT,
    requested_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 11: notifications (Activity Feed & Multi-Channel Alerts)
-- ==============================================================================
CREATE TABLE notifications (
    notification_id VARCHAR(50) PRIMARY KEY DEFAULT ('NTF' || LPAD(nextval('notif_seq')::TEXT, 3, '0')),
    client_id VARCHAR(50) REFERENCES clients(client_id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL DEFAULT 'Operations Team',
    event_type VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'Portal' CHECK (channel IN ('Portal', 'Email', 'WhatsApp', 'SMS')),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Delivered', 'Pending', 'Failed')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 12: crm_sync_logs (Zoho CRM Integration Records)
-- ==============================================================================
CREATE TABLE crm_sync_logs (
    sync_id VARCHAR(50) PRIMARY KEY DEFAULT ('SYNC' || LPAD(nextval('sync_seq')::TEXT, 3, '0')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    crm_id VARCHAR(100),
    operation VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Synced', 'Failed', 'Pending Retry')),
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_error TEXT,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABLE 13: audit_logs (Immutable Security & Operation Trail)
-- ==============================================================================
CREATE TABLE audit_logs (
    log_id VARCHAR(100) PRIMARY KEY,
    actor_id VARCHAR(50) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    ip_or_metadata TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR SUB-MILLI-SECOND LOOKUP PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_clients_mobile ON clients(mobile);
CREATE INDEX IF NOT EXISTS idx_services_client_id ON services(client_id);
CREATE INDEX IF NOT EXISTS idx_service_stages_service_id ON service_stages(service_id);
CREATE INDEX IF NOT EXISTS idx_documents_service_id ON documents(service_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(LOWER(email));

-- ==============================================================================
-- AUTOMATIC TIMESTAMPS TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_timestamp BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_services_timestamp BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_documents_timestamp BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_admin_users_timestamp BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
CREATE TRIGGER update_quote_requests_timestamp BEFORE UPDATE ON quote_requests FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Anonymous / Service Access Rules (Allows App Portal REST Operations)
DROP POLICY IF EXISTS "Allow portal access on admin_users" ON admin_users;
CREATE POLICY "Allow portal access on admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on spocs" ON spocs;
CREATE POLICY "Allow portal access on spocs" ON spocs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on clients" ON clients;
CREATE POLICY "Allow portal access on clients" ON clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on services" ON services;
CREATE POLICY "Allow portal access on services" ON services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on service_stages" ON service_stages;
CREATE POLICY "Allow portal access on service_stages" ON service_stages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on stage_history" ON stage_history;
CREATE POLICY "Allow portal access on stage_history" ON stage_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on documents" ON documents;
CREATE POLICY "Allow portal access on documents" ON documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on sessions" ON sessions;
CREATE POLICY "Allow portal access on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on password_resets" ON password_resets;
CREATE POLICY "Allow portal access on password_resets" ON password_resets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on quote_requests" ON quote_requests;
CREATE POLICY "Allow portal access on quote_requests" ON quote_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on notifications" ON notifications;
CREATE POLICY "Allow portal access on notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on crm_sync_logs" ON crm_sync_logs;
CREATE POLICY "Allow portal access on crm_sync_logs" ON crm_sync_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow portal access on audit_logs" ON audit_logs;
CREATE POLICY "Allow portal access on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- PRODUCTION SEED DATA: ADMINS, SPOCS & INITIAL CATALOG
-- ==============================================================================

-- 1. Default Super Administrator Account
INSERT INTO admin_users (admin_id, name, email, password_hash, password_salt, role, status)
VALUES (
    'ADM001',
    'Legal Sthal Operations Admin',
    'legalsthal@gmail.com',
    '811776ce35ffadba4c75ca10c3b06967116b340bf16ad961cb27f80db2792823',
    '4a821e257cf014de467c6da99a4c85eb',
    'SUPER_ADMIN',
    'ACTIVE'
) ON CONFLICT (email) DO NOTHING;

-- 2. Professional SPOC Team Directory
INSERT INTO spocs (spoc_id, name, title, mobile, email, assigned_clients, status)
VALUES 
    ('SPOC001', 'Harshit Srivastav', 'Incorporation Expert', '+91 9546273093', 'legalsthal@gmail.com', 2, 'Active'),
    ('SPOC002', 'Mary Jaiswal', 'Client Relationship Executive', '+91 77620 62093', 'legalsthal@gmail.com', 1, 'Active'),
    ('SPOC003', 'Saurabh Srivastav', 'Senior Incorporation Specialist', '+91 62042 70990', 'legalsthal@gmail.com', 1, 'Active'),
    ('SPOC004', 'Ayush Raj', 'Incorporation Specialist', '+91 91227 37416', 'legalsthal@gmail.com', 0, 'Active')
ON CONFLICT (spoc_id) DO UPDATE SET
    name = EXCLUDED.name,
    title = EXCLUDED.title,
    mobile = EXCLUDED.mobile,
    email = EXCLUDED.email;

-- 3. Sample Clients (Matching Clean Production Starting Point)
INSERT INTO clients (client_id, name, company_name, contact_name, email, mobile, login_id, password_hash, password_salt, first_login, status, state, address, gstin)
VALUES
    ('CL001', 'Apex Global Logistics Pvt Ltd', 'Apex Global Logistics Pvt Ltd', 'Rajesh Patel', 'rajesh@apexlogistics.in', '+91 98765 43210', 'rajesh@apexlogistics.in', 'c81779aa2f2323c2ea8c531d05aaec81ec8027725aa5bb81d2dfbd17db060c5a', 'f69e6b3ebfa0cda07b7ecb1bdf69e710', FALSE, 'Active', 'Gujarat', '402, Titanium City Centre, Prahladnagar, Ahmedabad', '24AAACA1234A1Z5'),
    ('CL002', 'BluePeak Technologies LLP', 'BluePeak Technologies LLP', 'Sneha Desai', 'sneha@bluepeak.tech', '+91 98111 22334', 'sneha@bluepeak.tech', 'c81779aa2f2323c2ea8c531d05aaec81ec8027725aa5bb81d2dfbd17db060c5a', 'f69e6b3ebfa0cda07b7ecb1bdf69e710', FALSE, 'Active', 'Maharashtra', '901, Supreme Business Park, Hiranandani, Powai, Mumbai', '27BBBCB5678B2Z1'),
    ('CL003', 'Zephyr Eco Foods Private Limited', 'Zephyr Eco Foods Private Limited', 'Vikram Malhotra', 'vikram@zephyrecofoods.com', '+91 97222 33445', 'vikram@zephyrecofoods.com', 'c81779aa2f2323c2ea8c531d05aaec81ec8027725aa5bb81d2dfbd17db060c5a', 'f69e6b3ebfa0cda07b7ecb1bdf69e710', FALSE, 'Active', 'Karnataka', '12, Indiranagar 100ft Road, Bengaluru', '29CCCC1234C3Z2')
ON CONFLICT (client_id) DO NOTHING;

-- 4. Sample Services Linked to Clients
INSERT INTO services (service_id, client_id, service_code, crm_deal_id, service_name, company_type, state, total_amount, paid_amount, dsc_count, name_run, current_stage, current_stage_index, progress_percentage, status, spoc_id)
VALUES
    ('SRV001', 'CL001', 'INC-2026-001', 'ZC-890124', 'Company Incorporation', 'Private Limited', 'Gujarat', 14999.00, 10000.00, 2, true, 'RUN (Name Approval)', 1, 28, 'In Progress', 'SPOC001'),
    ('SRV002', 'CL001', 'GST-2026-042', 'ZC-890199', 'GST Registration', 'Private Limited', 'Gujarat', 2499.00, 2499.00, 0, false, 'ARN Generated', 2, 75, 'In Progress', 'SPOC003'),
    ('SRV003', 'CL002', 'LLP-2026-008', 'ZC-890310', 'LLP Incorporation', 'LLP', 'Maharashtra', 9999.00, 9999.00, 2, true, 'Certificate Issued', 4, 100, 'Completed', 'SPOC001'),
    ('SRV004', 'CL003', 'TM-2026-015', 'ZC-890455', 'Trademark Registration', 'Private Limited', 'Karnataka', 6500.00, 3000.00, 0, false, 'Search & Classification', 0, 15, 'In Progress', 'SPOC002')
ON CONFLICT (service_id) DO NOTHING;

-- 5. Service Stages for SRV001 (Company Incorporation)
INSERT INTO service_stages (stage_id, service_id, stage_name, stage_status, completed_on, description, sequence_order)
VALUES
    ('STG_SRV001_1', 'SRV001', 'DSC Creation', 'Completed', '28 Sep 2026', 'Digital Signature Certificates issued for 2 directors', 1),
    ('STG_SRV001_2', 'SRV001', 'RUN (Name Approval)', 'Current', NULL, 'Name reservation form RUN filed with Ministry of Corporate Affairs', 2),
    ('STG_SRV001_3', 'SRV001', 'SPICe+ Part B Filing', 'Pending', NULL, 'Integrated company incorporation form with AGILE-PRO', 3),
    ('STG_SRV001_4', 'SRV001', 'Certificate of Incorporation', 'Pending', NULL, 'Final approval, PAN, TAN & COI issuance by Registrar of Companies', 4)
ON CONFLICT (stage_id) DO NOTHING;

-- 6. Sample Documents for SRV001
INSERT INTO documents (document_id, service_id, client_id, document_name, document_type, status, required, submitted_on, file_url)
VALUES
    ('DOC001', 'SRV001', 'CL001', 'PAN Card (All Directors)', 'IDENTITY_PROOF', 'Verified', TRUE, NOW() - INTERVAL '5 days', 'https://drive.google.com/open?id=mock_pan_file_id'),
    ('DOC002', 'SRV001', 'CL001', 'Aadhaar Card / Passport', 'IDENTITY_PROOF', 'Verified', TRUE, NOW() - INTERVAL '5 days', 'https://drive.google.com/open?id=mock_aadhaar_file_id'),
    ('DOC003', 'SRV001', 'CL001', 'Bank Statement / Utility Bill (Address Proof)', 'ADDRESS_PROOF', 'Under Review', TRUE, NOW() - INTERVAL '1 day', 'https://drive.google.com/open?id=mock_bank_file_id'),
    ('DOC004', 'SRV001', 'CL001', 'Registered Office Electricity Bill & NOC', 'REGISTERED_OFFICE', 'Pending', TRUE, NULL, NULL)
ON CONFLICT (document_id) DO NOTHING;

-- 7. Sample Initial Notifications
INSERT INTO notifications (notification_id, client_id, client_name, event_type, details, channel, status, is_read)
VALUES
    ('NTF001', 'CL001', 'Apex Global Logistics Pvt Ltd', 'Stage Updated', 'Your service INC-2026-001 has entered stage RUN (Name Approval).', 'Portal', 'Delivered', FALSE),
    ('NTF002', 'CL001', 'Apex Global Logistics Pvt Ltd', 'Document Verified', 'PAN Card (All Directors) has been verified by the Legal Sthal team.', 'Portal', 'Delivered', TRUE),
    ('NTF003', NULL, 'Operations Team', 'System Notice', 'Legal Sthal Supabase PostgreSQL database provisioned and connected.', 'Portal', 'Delivered', FALSE)
ON CONFLICT (notification_id) DO NOTHING;

-- ==============================================================================
-- SCHEMA CREATION & INITIAL SEED COMPLETE
-- ==============================================================================
