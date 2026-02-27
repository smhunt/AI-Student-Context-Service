import { query } from '../index.js';
import type { User } from '../../types/index.js';

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function createUser(user: {
  board_id: string;
  email: string;
  password_hash?: string;
  name_first: string;
  name_last: string;
  role: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (board_id, email, password_hash, name_first, name_last, role, external_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      user.board_id,
      user.email,
      user.password_hash ?? null,
      user.name_first,
      user.name_last,
      user.role,
      user.external_id ?? null,
      JSON.stringify(user.metadata ?? {}),
    ]
  );
  return result.rows[0];
}
