<script lang="ts">
	import { goto } from '$app/navigation';
	import { MONTH_NAMES_SHORT_DE } from '$lib/client/utils/date.js';
	import StingBodyHeatmap from '$lib/components/StingBodyHeatmap.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// Year filter — drive via URL so page reload preserves the selection.
	// keepFocus/noScroll: the <select> keeps focus and the page does not jump to
	// the top, so keyboard users can keep arrowing through the options.
	function applyYear(value: string) {
		goto(`/stats?year=${value}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	/** "YYYY-MM" → "Mär" or "Mär 26". */
	function monthLabel(key: string, withYear: boolean): string {
		const name = MONTH_NAMES_SHORT_DE[Number(key.slice(5, 7)) - 1];
		return withYear ? `${name} ${key.slice(2, 4)}` : name;
	}

	/**
	 * The span the average is computed over, so the number is never ambiguous:
	 * "Mär" (one month), "Mär–Aug" (same year), "Mär 25–Aug 26" (across years).
	 */
	const spanLabel = $derived.by(() => {
		const { spanFrom, spanTo } = data.stats;
		if (spanFrom === null || spanTo === null) return '—';
		if (spanFrom === spanTo) return monthLabel(spanFrom, false);
		const crossesYears = spanFrom.slice(0, 4) !== spanTo.slice(0, 4);
		return `${monthLabel(spanFrom, crossesYears)}–${monthLabel(spanTo, crossesYears)}`;
	});

	// A valid ?year= with no stings is not an error (AC9), but it has no option of its
	// own — without adding it the <select> would match nothing and render blank.
	const yearOptions = $derived(
		data.selectedYear !== null && !data.years.includes(data.selectedYear)
			? [data.selectedYear, ...data.years].sort((a, b) => b - a)
			: data.years
	);

	const avgLabel = $derived(
		data.stats.avgPerMonth.toLocaleString('de-DE', {
			minimumFractionDigits: 1,
			maximumFractionDigits: 1,
		})
	);
</script>

<svelte:head>
	<title>Statistik — beehiveJournal</title>
</svelte:head>

<div class="page">
	<div class="page-header">
		<h1>Statistik</h1>
	</div>

	{#if data.stats.totalAllTime === 0}
		<div class="empty-state">
			<p>Noch keine Stichvorfälle erfasst.</p>
			<a href="/stings/new" class="empty-link">Ersten Stich erfassen</a>
		</div>
	{:else}
		<!-- Year filter -->
		<div class="filter-bar">
			<label class="filter-label" for="yearFilter">Zeitraum</label>
			<select
				class="filter-select"
				id="yearFilter"
				value={data.selectedYear === null ? 'all' : String(data.selectedYear)}
				onchange={(e) => applyYear((e.target as HTMLSelectElement).value)}
			>
				<option value="all">Alle</option>
				{#each yearOptions as year (year)}
					<option value={String(year)}>{year}</option>
				{/each}
			</select>
		</div>

		<!-- KPI tiles -->
		<ul class="kpis">
			<li class="kpi">
				<span class="kpi__label">Gesamt</span>
				<span class="kpi__value">{data.stats.totalAllTime}</span>
			</li>
			<li class="kpi">
				<span class="kpi__label">{data.selectedYear ?? 'Alle'}</span>
				<span class="kpi__value">{data.stats.totalInPeriod}</span>
			</li>
			<li class="kpi">
				<span class="kpi__label">Top-Körperstelle</span>
				<span class="kpi__value kpi__value--text">{data.stats.topLocation?.label ?? '—'}</span>
				{#if data.stats.topLocation}
					<span class="kpi__sub">({data.stats.topLocation.count})</span>
				{/if}
			</li>
			<li class="kpi">
				<span class="kpi__label">Ø Stiche/Monat</span>
				<span class="kpi__value">{avgLabel}</span>
				<span class="kpi__sub">{spanLabel}</span>
			</li>
		</ul>

		<section class="card">
			<h2>Stiche pro Monat</h2>
			<!-- {#key} is load-bearing: the chart has no update path, so without it the
			     component instance survives the year switch and keeps the old bars. -->
			{#key data.selectedYear}
				{#await import('$lib/components/StingsPerMonthChart.svelte') then { default: StingsPerMonthChart }}
					<StingsPerMonthChart
						buckets={data.stats.perMonth}
						mode={data.selectedYear === null ? 'all' : 'year'}
					/>
				{:catch}
					<div class="chart-placeholder">
						<p>Diagramm konnte nicht geladen werden.</p>
					</div>
				{/await}
			{/key}
		</section>

		<section class="card">
			<h2>Nach Körperstelle</h2>
			<StingBodyHeatmap byLocation={data.stats.byLocation} />
		</section>
	{/if}
</div>

<style>
	/* ── Page ── */
	.page {
		max-width: 600px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
	}

	/* ── Filter ── */
	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.filter-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		white-space: nowrap;
	}

	.filter-select {
		min-height: 44px;
		padding: 0 0.75rem;
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		font-family: inherit;
		flex: 1;
		max-width: 240px;
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
	}

	/* ── KPI tiles ── */
	.kpis {
		list-style: none;
		margin: 0 0 1.25rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	@media (min-width: 641px) {
		.kpis {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.kpi {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.875rem 1rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
	}

	.kpi__label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
	}

	.kpi__value {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-text, #1a1a1a);
	}

	.kpi__value--text {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.kpi__sub {
		font-size: 0.75rem;
		color: var(--color-text-muted, #6b7280);
	}

	/* ── Sections ── */
	.card {
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 0.875rem;
	}

	.chart-placeholder {
		padding: 2rem 1rem;
		text-align: center;
		border: 1.5px dashed var(--color-border, #e5e7eb);
		border-radius: 10px;
		color: var(--color-text-muted, #6b7280);
		font-size: 0.875rem;
	}

	.chart-placeholder p {
		margin: 0;
	}

	/* ── Empty state ── */
	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
		border: 1.5px dashed var(--color-border, #e5e7eb);
		border-radius: 10px;
		color: var(--color-text-muted, #6b7280);
		font-size: 0.9rem;
	}

	.empty-state p {
		margin: 0;
	}

	.empty-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		margin-top: 0.5rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-accent-hover, #d97706);
	}
</style>
