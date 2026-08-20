/**
 * Optimal assignment (Hungarian / Jonker-Volgenant, O(n^2 m)).
 *
 * Flags & Sports needs the best possible score for a run so the result can read
 * "125 of a possible 218". With a 9-sport palette and 5 rounds, brute force over
 * 9P5 = 15,120 permutations was fine. With all 54 sports and 10 rounds it is
 * 54P10 ~= 3.6e17 — so this is not an optimisation, it is the only way.
 *
 * Solves the rectangular MAXIMISATION problem: assign each of n rows exactly one
 * of m columns (n <= m, no column reused) maximising the total.
 */
export function maxAssignment(profit) {
  const n = profit.length
  if (!n) return { total: 0, assignment: [] }
  const m = profit[0].length
  if (m < n) throw new Error('maxAssignment needs at least as many columns as rows')

  // maximise by minimising the negated matrix
  const cost = profit.map((row) => row.map((v) => -v))
  const INF = Infinity
  const u = new Array(n + 1).fill(0)
  const v = new Array(m + 1).fill(0)
  const p = new Array(m + 1).fill(0)   // p[j] = row assigned to column j (1-based)
  const way = new Array(m + 1).fill(0)

  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array(m + 1).fill(INF)
    const used = new Array(m + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = INF
      let j1 = 0
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0 }
        if (minv[j] < delta) { delta = minv[j]; j1 = j }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta }
        else minv[j] -= delta
      }
      j0 = j1
    } while (p[j0] !== 0)
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1 } while (j0)
  }

  const assignment = new Array(n).fill(-1)
  for (let j = 1; j <= m; j++) if (p[j]) assignment[p[j] - 1] = j - 1
  const total = assignment.reduce((s, j, i) => s + (j >= 0 ? profit[i][j] : 0), 0)
  return { total, assignment }
}
