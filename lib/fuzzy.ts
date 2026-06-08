const WORD_BOUNDARY = /[\s\-_./:]/;

/**
 * Lightweight subsequence fuzzy scorer. Higher is better; -1 means no match.
 * Rewards contiguous runs, start-of-string and word-boundary hits.
 *
 * NOTE: Both `query` and `target` MUST be pre-lowercased for performance.
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 0;
  if (!target) return -1;

  let qi = 0;
  let score = 0;
  let streak = 0;
  let prevMatchIdx = -1;

  const qlen = query.length;
  const tlen = target.length;

  for (let ti = 0; ti < tlen && qi < qlen; ti++) {
    if (target[ti] === query[qi]) {
      let bonus = 1;
      if (ti === 0) {
        bonus += 4;
      } else if (WORD_BOUNDARY.test(target[ti - 1])) {
        bonus += 3;
      }

      if (prevMatchIdx === ti - 1) {
        streak += 1;
        bonus += streak;
      } else {
        streak = 0;
      }

      score += bonus;
      prevMatchIdx = ti;
      qi += 1;
    }
  }

  if (qi < qlen) return -1;
  // Prefer shorter targets when scores are otherwise close.
  return score - tlen * 0.01;
}
