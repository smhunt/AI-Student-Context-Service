import { query } from '../index.js';
import type { Board } from '../../types/index.js';

export async function findBoardBySlug(slug: string): Promise<Board | null> {
  const result = await query<Board>('SELECT * FROM boards WHERE slug = $1', [slug]);
  return result.rows[0] ?? null;
}
