CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    board_id UUID NOT NULL REFERENCES boards(id),
    mode TEXT NOT NULL,
    target_student_id UUID REFERENCES users(id),
    target_course_id UUID REFERENCES courses(id),
    llm_provider TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    message_count INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    chunks_used UUID[] DEFAULT '{}',
    token_count_input INT,
    token_count_output INT,
    latency_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON chat_messages(session_id);
