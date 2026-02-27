import { pool, transaction } from './index.js';
import { hashPassword } from '../utils/crypto.js';

const DEV_PASSWORD = 'devpassword123';

async function seed(): Promise<void> {
  const passwordHash = await hashPassword(DEV_PASSWORD);

  await transaction(async (client) => {
    // Board
    const boardResult = await client.query(
      `INSERT INTO boards (name, slug, province)
       VALUES ('Thames Valley District School Board', 'tvdsb', 'ON')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const boardId = boardResult.rows[0].id;
    console.log(`Board: tvdsb (${boardId})`);

    // Schools
    const medwayResult = await client.query(
      `INSERT INTO schools (board_id, name, school_code, grades)
       VALUES ($1, 'Medway High School', 'MHS', '{9,10,11,12}')
       ON CONFLICT (board_id, school_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [boardId]
    );
    const medwayId = medwayResult.rows[0].id;

    const ceciResult = await client.query(
      `INSERT INTO schools (board_id, name, school_code, grades)
       VALUES ($1, 'Central Elgin Collegiate Institute', 'CECI', '{9,10,11,12}')
       ON CONFLICT (board_id, school_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [boardId]
    );
    const ceciId = ceciResult.rows[0].id;
    console.log(`Schools: Medway (${medwayId}), CECI (${ceciId})`);

    // Helper to upsert a user
    async function upsertUser(data: {
      email: string;
      name_first: string;
      name_last: string;
      role: string;
      external_id: string;
      metadata?: Record<string, unknown>;
    }): Promise<string> {
      const result = await client.query(
        `INSERT INTO users (board_id, email, password_hash, name_first, name_last, role, external_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (board_id, external_id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           name_first = EXCLUDED.name_first,
           name_last = EXCLUDED.name_last,
           role = EXCLUDED.role,
           metadata = EXCLUDED.metadata
         RETURNING id`,
        [boardId, data.email, passwordHash, data.name_first, data.name_last, data.role, data.external_id, JSON.stringify(data.metadata ?? {})]
      );
      return result.rows[0].id;
    }

    // Users
    const alexId = await upsertUser({
      email: 'alex.johnson@tvdsb.on.ca',
      name_first: 'Alex',
      name_last: 'Johnson',
      role: 'student',
      external_id: 'STU-2024-001',
      metadata: { grade: 10, homeroom: '10A' },
    });

    const sarahId = await upsertUser({
      email: 'sarah.chen@tvdsb.on.ca',
      name_first: 'Sarah',
      name_last: 'Chen',
      role: 'teacher',
      external_id: 'STAFF-001',
      metadata: { department: 'Mathematics' },
    });

    const davidId = await upsertUser({
      email: 'david.williams@tvdsb.on.ca',
      name_first: 'David',
      name_last: 'Williams',
      role: 'guidance_counsellor',
      external_id: 'STAFF-002',
      metadata: { department: 'Guidance' },
    });

    const lisaId = await upsertUser({
      email: 'lisa.park@tvdsb.on.ca',
      name_first: 'Lisa',
      name_last: 'Park',
      role: 'principal',
      external_id: 'STAFF-003',
    });

    const jamesId = await upsertUser({
      email: 'james.wilson@tvdsb.on.ca',
      name_first: 'James',
      name_last: 'Wilson',
      role: 'board_admin',
      external_id: 'ADMIN-001',
    });

    const mariaId = await upsertUser({
      email: 'maria.johnson@tvdsb.on.ca',
      name_first: 'Maria',
      name_last: 'Johnson',
      role: 'parent',
      external_id: 'PAR-001',
    });

    console.log(`Users: 6 created/updated`);
    console.log(`  Student: Alex Johnson (${alexId})`);
    console.log(`  Teacher: Sarah Chen (${sarahId})`);
    console.log(`  Guidance: David Williams (${davidId})`);
    console.log(`  Principal: Lisa Park (${lisaId})`);
    console.log(`  Board Admin: James Wilson (${jamesId})`);
    console.log(`  Parent: Maria Johnson (${mariaId})`);

    // Student enrollment
    await client.query(
      `INSERT INTO student_enrollments (student_id, school_id, grade, academic_year, status, start_date)
       VALUES ($1, $2, 10, '2025-2026', 'active', '2025-09-02')
       ON CONFLICT DO NOTHING`,
      [alexId, medwayId]
    );

    // Staff assignments
    for (const [staffId, dept, scope] of [
      [sarahId, 'Mathematics', 'teacher'],
      [davidId, 'Guidance', 'guidance'],
      [lisaId, null, 'admin'],
    ] as const) {
      await client.query(
        `INSERT INTO staff_assignments (staff_id, school_id, academic_year, department, role_scope)
         SELECT $1, $2, '2025-2026', $3, $4
         WHERE NOT EXISTS (
           SELECT 1 FROM staff_assignments WHERE staff_id = $1 AND school_id = $2 AND academic_year = '2025-2026'
         )`,
        [staffId, medwayId, dept, scope]
      );
    }

    // Course
    const courseResult = await client.query(
      `INSERT INTO courses (school_id, name, course_code, grade, subject, academic_year, semester, source)
       VALUES ($1, 'MPM2D - Principles of Mathematics', 'MPM2D', 10, 'Mathematics', '2025-2026', 'S2', 'manual')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [medwayId]
    );

    if (courseResult.rows.length > 0) {
      const courseId = courseResult.rows[0].id;

      // Course memberships
      await client.query(
        `INSERT INTO course_memberships (course_id, user_id, role)
         VALUES ($1, $2, 'student')
         ON CONFLICT (course_id, user_id) DO NOTHING`,
        [courseId, alexId]
      );
      await client.query(
        `INSERT INTO course_memberships (course_id, user_id, role)
         VALUES ($1, $2, 'teacher')
         ON CONFLICT (course_id, user_id) DO NOTHING`,
        [courseId, sarahId]
      );
      console.log(`Course: MPM2D (${courseId}) with Alex as student, Sarah as teacher`);
    }

    // Consent record for Alex (granted by Maria)
    await client.query(
      `INSERT INTO consent_records (student_id, parent_id, board_id, consent_type, status, data_sources, granted_at)
       SELECT $1, $2, $3, 'ai_context', 'granted',
              ARRAY['google_classroom_assignment','google_classroom_submission','google_classroom_grade','sis_report_card'],
              NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM consent_records WHERE student_id = $1 AND consent_type = 'ai_context'
       )`,
      [alexId, mariaId, boardId]
    );

    console.log(`Consent: ai_context granted for Alex by Maria`);
  });

  console.log('\nSeed completed successfully.');
  await pool.end();
}

seed();
