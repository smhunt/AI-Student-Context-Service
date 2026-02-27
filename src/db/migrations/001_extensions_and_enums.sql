-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM (
    'student',
    'teacher',
    'educational_assistant',
    'guidance_counsellor',
    'vice_principal',
    'principal',
    'board_admin',
    'parent',
    'supply_teacher'
);

CREATE TYPE document_source AS ENUM (
    'google_classroom_assignment',
    'google_classroom_submission',
    'google_classroom_grade',
    'google_classroom_comment',
    'sis_report_card',
    'sis_transcript',
    'sis_attendance',
    'sis_iep',
    'assessment_eqao',
    'assessment_board',
    'library_record',
    'teacher_note',
    'guidance_note'
);

CREATE TYPE sensitivity_level AS ENUM (
    'standard',
    'sensitive',
    'restricted'
);

CREATE TYPE consent_status AS ENUM (
    'pending',
    'granted',
    'denied',
    'revoked'
);
