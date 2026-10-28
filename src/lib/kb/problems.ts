// What a merged ticket really holds: one row per problem, not per subject line.
// causes.ts places a report by tenant and channel, and the desk counts it there. The desk's own reading
// (desk-notes.json) adds the reports that describe a one-day move, which no day/month swap can produce:
// they get a row of their own and stay counted where they are filed, as the desk counts them.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day' | 'unplaced';

export function problemsOf(r: Report, t: Tenant | undefined, oneDay: readonly string[]): Problem[] {
  return [causeOf(r, t) ?? 'unplaced', ...(oneDay.includes(r.id) ? (['one-day'] as const) : [])];
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: string[];
  // How many of these reports the desk also read as a one-day move.
  oneDay: number;
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

const tally = (xs: string[]) => xs.reduce<Record<string, number>>((n, x) => ({ ...n, [x]: (n[x] ?? 0) + 1 }), {});

export function groupByProblem(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDay: readonly string[],
): { exported: number; merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const byProblem = new Map<Problem, Report[]>();
  for (const r of merged) {
    for (const p of problemsOf(r, tenantOf(r), oneDay)) byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  const groups = [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: tally(rs.map((r) => r.meta.intakeTag)),
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        oneDay: problem === 'one-day' ? 0 : rs.filter((r) => oneDay.includes(r.id)).length,
        channels: tally(rs.map((r) => r.channel)),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { exported: reports.filter((r) => r.mergedInto === ticket).length, merged, groups };
}
