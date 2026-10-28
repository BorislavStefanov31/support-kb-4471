<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { groupByProblem, type Problem } from '#lib/kb/problems';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';

  // `tickets`: where each problem is filed now, problem → link.
  let { ticket, tickets = {} }: { ticket: number; tickets?: Partial<Record<Problem, string>> } = $props();

  const NAMES: Record<Problem, string> = {
    parser: 'shared parser reads day-first dates month first',
    hint: 'booking-v3 form hints MM/DD to day-first tenants',
    'one-day': 'dates move by one day',
    unplaced: 'tenant not on file',
  };

  const view = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
  const ticketNo = (href: string) => `#${href.split('/').pop()}`;
</script>

<p class="sum">
  <strong>{view.merged.length}</strong> reports merged into #{ticket} ·
  <strong>{view.groups.length}</strong>
  {view.groups.length === 1 ? 'problem' : 'problems'}
  <span class="muted">({view.exported} rows in the export, {view.exported - view.merged.length} of them repeats)</span>
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>came in by</th><th>intake tagged</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each view.groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code><br /><span class="muted">{NAMES[g.problem]}</span></td>
        <td><strong>{g.reports.length}</strong>{#if g.oneDay}<br /><span class="muted">{g.oneDay} also one-day</span>{/if}</td>
        <td>{g.tenants.length}</td>
        <td class="muted">{list(g.channels)}</td>
        <td class="muted">{list(g.taggedAs)}</td>
        <td class="muted">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if tickets[g.problem]}<a href={tickets[g.problem]}>{ticketNo(tickets[g.problem]!)}</a>{:else}<span class="warn">none</span>{/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#each view.groups.filter((g) => g.tenants.length <= 5) as g (g.problem)}
  <p class="muted"><code>{g.problem}</code> tenants: {g.tenants.join(', ')}</p>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .muted { color: var(--muted); font-size: 0.85em; }
  .warn { color: var(--warn); font-weight: 600; }
</style>
