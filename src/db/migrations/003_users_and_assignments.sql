CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id),
    external_id TEXT,
    email TEXT,
    password_hash TEXT,
    name_first TEXT NOT NULL,
    name_last TEXT NOT NULL,
    role user_role NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(board_id, external_id)
);

CREATE INDEX idx_users_board_role ON users(board_id, role);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    school_id UUID NOT NULL REFERENCES schools(id),
    grade INT NOT NULL,
    academic_year TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_school_year ON student_enrollments(school_id, academic_year);

CREATE TABLE staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES users(id),
    school_id UUID NOT NULL REFERENCES schools(id),
    academic_year TEXT NOT NULL,
    department TEXT,
    role_scope TEXT NOT NULL DEFAULT 'teacher',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id),
    external_id TEXT,
    name TEXT NOT NULL,
    course_code TEXT,
    grade INT,
    subject TEXT,
    academic_year TEXT NOT NULL,
    semester TEXT,
    source TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE course_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_id, user_id)
);

CREATE INDEX idx_course_members_user ON course_memberships(user_id);
CREATE INDEX idx_course_members_course ON course_memberships(course_id);
