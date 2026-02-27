CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    board_id UUID NOT NULL REFERENCES boards(id),
    source document_source NOT NULL,
    source_id TEXT,
    title TEXT,
    content TEXT NOT NULL,
    content_date DATE,
    academic_year TEXT,
    course_id UUID REFERENCES courses(id),
    sensitivity sensitivity_level NOT NULL DEFAULT 'standard',
    metadata JSONB NOT NULL DEFAULT '{}',
    hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_student ON documents(student_id);
CREATE INDEX idx_documents_source ON documents(source);
CREATE INDEX idx_documents_student_year ON documents(student_id, academic_year);
CREATE INDEX idx_documents_hash ON documents(hash);

CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id),
    board_id UUID NOT NULL REFERENCES boards(id),
    content TEXT NOT NULL,
    chunk_index INT NOT NULL,
    token_count INT NOT NULL,
    sensitivity sensitivity_level NOT NULL DEFAULT 'standard',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chunks_student ON chunks(student_id);
CREATE INDEX idx_chunks_document ON chunks(document_id);

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id),
    board_id UUID NOT NULL REFERENCES boards(id),
    embedding vector(1536) NOT NULL,
    model TEXT NOT NULL,
    sensitivity sensitivity_level NOT NULL DEFAULT 'standard',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embeddings_vector ON embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_student ON embeddings(student_id);
CREATE INDEX idx_embeddings_board ON embeddings(board_id);
