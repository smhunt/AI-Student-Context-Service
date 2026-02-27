export interface ChunkResult {
  text: string;
  tokenCount: number;
}

/**
 * Splits text into chunks of approximately `chunkSize` tokens with `overlap` token overlap.
 * Uses ~4 chars/token approximation and splits on word boundaries.
 */
export function splitIntoChunks(
  text: string,
  chunkSize = 500,
  overlap = 50
): ChunkResult[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const trimmed = text.trim();
  const estimatedTokens = Math.ceil(trimmed.length / 4);

  // If the whole text fits in one chunk, return it as-is
  if (estimatedTokens <= chunkSize) {
    return [{ text: trimmed, tokenCount: estimatedTokens }];
  }

  const chunkChars = chunkSize * 4;
  const overlapChars = overlap * 4;
  const chunks: ChunkResult[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + chunkChars, trimmed.length);

    // If we're not at the end, try to break on a word boundary
    if (end < trimmed.length) {
      // Look backwards from end for a space/newline
      const searchStart = Math.max(end - 200, start + 1);
      const lastSpace = trimmed.lastIndexOf(' ', end);
      const lastNewline = trimmed.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastSpace, lastNewline);

      if (breakPoint > searchStart) {
        end = breakPoint + 1; // include the space/newline at the break
      }
    }

    const chunkText = trimmed.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        tokenCount: Math.ceil(chunkText.length / 4),
      });
    }

    // Move start forward by chunk size minus overlap
    start = end - overlapChars;
    if (start <= (chunks.length > 0 ? end - chunkChars : 0)) {
      // Safety: always move forward
      start = end;
    }
  }

  return chunks;
}
