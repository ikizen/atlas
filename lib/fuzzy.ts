/**
 * Lightweight subsequence fuzzy scorer. Higher is better; -1 means no match.
 * Rewards contiguous runs, start-of-string and word-boundary hits so the most
 * relevant link bubbles to the top for the "Enter opens top result" flow.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (!t) return -1;

  let qi = 0;
  let score = 0;
  let streak = 0;
  let prevMatchIdx = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      let bonus = 1;
      if (ti === 0) bonus += 4;
      else if (/[\s\-_./:]/.test(t[ti - 1])) bonus += 3;
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

  if (qi < q.length) return -1;
  // Prefer shorter targets when scores are otherwise close.
  return score - t.length * 0.01;
}
