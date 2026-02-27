CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES users(id),
    board_id UUID NOT NULL REFERENCES boards(id),
    consent_type TEXT NOT NULL,
    status consent_status NOT NULL DEFAULT 'pending',
    data_sources TEXT[] NOT NULL DEFAULT '{}',
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_student ON consent_records(student_id);
CREATE INDEX idx_consent_status ON consent_records(student_id, consent_type, status);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id),
    actor_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_student_id UUID REFERENCES users(id),
    details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    session_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_target ON audit_log(target_student_id);
CREATE INDEX idx_audit_time ON audit_log(created_at);
