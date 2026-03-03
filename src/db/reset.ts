import { pool } from './index.js';

async function reset(): Promise<void> {
  console.log('Dropping all tables...');

  await pool.query(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  // Drop custom types
  const types = ['user_role', 'document_source', 'sensitivity_level', 'consent_status', 'billing_plan'];
  for (const t of types) {
    await pool.query(`DROP TYPE IF EXISTS ${t} CASCADE`);
  }

  console.log('All tables and types dropped.');
  console.log('Run `npm run db:migrate` to recreate.');
  await pool.end();
}

reset();
