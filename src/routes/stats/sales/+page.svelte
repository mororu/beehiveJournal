<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatChf, formatChfPerKg, formatKg } from '$lib/client/utils/number.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// Filters are URL-driven so a reload preserves the selection. All three params are
	// always emitted, so a patched URL fully describes the view.
	// keepFocus/noScroll: the <select> keeps focus and the page does not jump to the
	// top, so keyboard users can keep arrowing through the options.
	function applyFilter(patch: { year?: string; lot?: string; gifts?: string }) {
		const year = patch.year ?? (data.selectedYear === null ? 'all' : String(data.selectedYear));
		const lot = patch.lot ?? (data.selectedLot === null ? 'all' : String(data.selectedLot));
		const gifts = patch.gifts ?? data.selectedGifts;
		goto(`/stats/sales?year=${year}&lot=${lot}&gifts=${gifts}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true,
		});
	}

	// A valid ?year= with no sales is not an error, but it has no option of its own —
	// without adding it the <select> would match nothing and render blank.
	const yearOptions = $derived(
		data.selectedYear !== null && !data.years.includes(data.selectedYear)
			? [data.selectedYear, ...data.years].sort((a, b) => b - a)
			: data.years
	);

	// honey_harvests has no unique index on `lot` and the label is recomputed as
	// `L` + ddmmyyyy, so two harvests on the same day share a label. Disambiguate
	// those — and only those — first by harvest amount, then by id if the amounts
	// also match, so no two options can ever render identically.
	//
	// Built from data.lots (every sold lot, unfiltered) and keyed by harvestId, so the
	// dropdown and the "Nach Los" table always show a lot under the same name.
	const lotLabels = $derived.by(() => {
		const byLabel = new Map<string, number>();
		for (const lot of data.lots) byLabel.set(lot.lot, (byLabel.get(lot.lot) ?? 0) + 1);

		const byAmount = new Map<string, number>();
		for (const lot of data.lots) {
			const k = `${lot.lot}|${lot.amountKg}`;
			byAmount.set(k, (byAmount.get(k) ?? 0) + 1);
		}

		const labels = new Map<number, { base: string; suffix: string | null }>();
		for (const lot of data.lots) {
			let suffix: string | null = null;
			if ((byLabel.get(lot.lot) ?? 0) > 1) {
				suffix = `${formatKg(lot.amountKg)} kg`;
				if ((byAmount.get(`${lot.lot}|${lot.amountKg}`) ?? 0) > 1)
					suffix = `${suffix} (#${lot.harvestId})`;
			}
			labels.set(lot.harvestId, { base: lot.lot, suffix });
		}
		return labels;
	});

	/** Lot name split into label + disambiguator, falling back to the raw label. */
	function lotParts(harvestId: number, fallback: string): { base: string; suffix: string | null } {
		return lotLabels.get(harvestId) ?? { base: fallback, suffix: null };
	}

	/** One-line form for the <select>, which cannot render a second line. */
	function lotOptionLabel(harvestId: number, fallback: string): string {
		const { base, suffix } = lotParts(harvestId, fallback);
		return suffix === null ? base : `${base} — ${suffix}`;
	}
</script>

<svelte:head>
	<title>Statistik: Honigverkauf — beehiveJournal</title>
</svelte:head>

<div class="page">
	<a href="/stats" class="back-link">← Statistik</a>

	<div class="page-header">
		<h1>Honigverkauf</h1>
	</div>

	{#if data.stats.totalSalesAllTime === 0}
		<div class="empty-state">
			<p>Noch keine Verkäufe erfasst.</p>
			<a href="/sells/new" class="empty-link">Ersten Verkauf erfassen</a>
		</div>
	{:else}
		<!-- Filters -->
		<div class="filter-bar">
			<div class="filter-row">
				<label class="filter-label" for="yearFilter">Zeitraum</label>
				<select
					class="filter-select"
					id="yearFilter"
					value={data.selectedYear === null ? 'all' : String(data.selectedYear)}
					onchange={(e) => applyFilter({ year: (e.target as HTMLSelectElement).value })}
				>
					<option value="all">Alle</option>
					{#each yearOptions as year (year)}
						<option value={String(year)}>{year}</option>
					{/each}
				</select>
			</div>

			<div class="filter-row">
				<label class="filter-label" for="lotFilter">Los</label>
				<select
					class="filter-select"
					id="lotFilter"
					value={data.selectedLot === null ? 'all' : String(data.selectedLot)}
					onchange={(e) => applyFilter({ lot: (e.target as HTMLSelectElement).value })}
				>
					<option value="all">Alle</option>
					{#each data.lots as lot (lot.harvestId)}
						<option value={String(lot.harvestId)}>{lotOptionLabel(lot.harvestId, lot.lot)}</option>
					{/each}
				</select>
			</div>

			<div class="filter-row">
				<label class="filter-label" for="giftFilter">Geschenke</label>
				<select
					class="filter-select"
					id="giftFilter"
					value={data.selectedGifts}
					onchange={(e) => applyFilter({ gifts: (e.target as HTMLSelectElement).value })}
				>
					<option value="all">Alle</option>
					<option value="exclude">Ohne Geschenke</option>
					<option value="only">Nur Geschenke</option>
				</select>
			</div>
		</div>

		<!-- KPI tiles -->
		<ul class="kpis">
			<li class="kpi">
				<span class="kpi__label">Verkauft</span>
				<span class="kpi__value"
					>{formatKg(data.stats.paidKg)}<span class="kpi__unit">kg</span></span
				>
				<span class="kpi__sub">{data.stats.paidContainers} Gebinde</span>
			</li>
			<li class="kpi">
				<span class="kpi__label">Verschenkt</span>
				<span class="kpi__value"
					>{formatKg(data.stats.giftKg)}<span class="kpi__unit">kg</span></span
				>
				<span class="kpi__sub">{data.stats.giftContainers} Gebinde</span>
			</li>
			<li class="kpi">
				<span class="kpi__label">Erlös</span>
				<span class="kpi__value"
					>{formatChf(data.stats.revenueChf)}<span class="kpi__unit">CHF</span></span
				>
				<span class="kpi__sub">{data.stats.saleCount} Verkäufe</span>
			</li>
			<li class="kpi">
				<span class="kpi__label">Ø CHF/kg</span>
				<span class="kpi__value">{formatChfPerKg(data.stats.avgChfPerKg)}</span>
			</li>
		</ul>

		<section class="card">
			<h2>Verkauf pro Monat</h2>
			<!-- {#key} is load-bearing: the chart has no update path, so without it the
			     component instance survives and keeps rendering the old bars. Keyed on the
			     buckets ARRAY, not on the filter values: load() returns a fresh array on
			     every run, so this remounts after a filter change AND after any other
			     re-load (invalidateAll() from an offline sync), which a filter-value key
			     would miss. -->
			{#key data.stats.perMonth}
				{#await import('$lib/components/HoneySalesPerMonthChart.svelte')}
					<!-- Reserves the chart's box so the card does not collapse for a frame
					     on every filter change -->
					<div class="chart-loading" aria-hidden="true"></div>
				{:then { default: HoneySalesPerMonthChart }}
					<HoneySalesPerMonthChart
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
			<h2>Nach Los</h2>
			{#if data.stats.byLot.length === 0}
				<p class="table-empty">Keine Verkäufe in diesem Zeitraum.</p>
			{:else}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th scope="col">Los</th>
								<th scope="col" class="num">kg</th>
								<th scope="col" class="num">Geschenk</th>
								<th scope="col" class="num">CHF</th>
								<th scope="col" class="num">Ø CHF/kg</th>
							</tr>
						</thead>
						<tbody>
							{#each data.stats.byLot as row (row.harvestId)}
								<tr>
									<td>
										{lotParts(row.harvestId, row.lot).base}
										{#if lotParts(row.harvestId, row.lot).suffix}
											<span class="lot-sub">{lotParts(row.harvestId, row.lot).suffix}</span>
										{/if}
									</td>
									<td class="num">{formatKg(row.kg)}</td>
									<td class="num">{formatKg(row.giftKg)}</td>
									<td class="num">{formatChf(row.chf)}</td>
									<td class="num">{formatChfPerKg(row.avgChfPerKg)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<section class="card">
			<h2>Nach Behältergröße</h2>
			{#if data.stats.byContainer.length === 0}
				<p class="table-empty">Keine Verkäufe in diesem Zeitraum.</p>
			{:else}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th scope="col">Größe</th>
								<th scope="col" class="num">Gebinde</th>
								<th scope="col" class="num">kg</th>
								<th scope="col" class="num">Geschenk</th>
								<th scope="col" class="num">CHF</th>
							</tr>
						</thead>
						<tbody>
							{#each data.stats.byContainer as row (row.containerSizeId)}
								<tr>
									<td>{row.containerName}</td>
									<td class="num">{row.containers}</td>
									<td class="num">{formatKg(row.kg)}</td>
									<td class="num">{formatKg(row.giftKg)}</td>
									<td class="num">{formatChf(row.chf)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		<section class="card">
			<h2>Top-Kunden</h2>
			{#if data.stats.byCustomer.length === 0}
				<p class="table-empty">Keine Verkäufe in diesem Zeitraum.</p>
			{:else}
				<div class="table-wrap">
					<table>
						<thead>
							<tr>
								<th scope="col">Kunde</th>
								<th scope="col" class="num">kg</th>
								<th scope="col" class="num">Geschenk</th>
								<th scope="col" class="num">CHF</th>
							</tr>
						</thead>
						<tbody>
							{#each data.stats.byCustomer as row (row.customerName)}
								<tr>
									<td>{row.customerName}</td>
									<td class="num">{formatKg(row.kg)}</td>
									<td class="num">{formatKg(row.giftKg)}</td>
									<td class="num">{formatChf(row.chf)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	/* ── Page ── */
	.page {
		max-width: 600px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-size: 0.85rem;
		color: var(--color-text-muted, #6b7280);
		text-decoration: none;
		margin-bottom: 0.5rem;
	}

	.back-link:hover {
		color: var(--color-text, #1a1a1a);
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

	/* ── Filters ── */
	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	/* Three selects do not fit side by side at 375px — stack them into label + select rows */
	@media (max-width: 640px) {
		.filter-bar {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.filter-row {
			justify-content: space-between;
		}
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
		min-width: 0;
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
		overflow-wrap: anywhere;
	}

	.kpi__unit {
		margin-left: 0.2rem;
		font-size: 0.9rem;
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

	.chart-loading {
		width: 100%;
		aspect-ratio: 2.2;
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

	/* ── Tables ── */
	/* Own scroll container so a 4-column table never makes the page body scroll sideways */
	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	th,
	td {
		padding: 0.5rem 0.4rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border, #e5e7eb);
		white-space: nowrap;
	}

	th {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted, #6b7280);
	}

	td {
		color: var(--color-text, #1a1a1a);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	/* Unit lives in the header, never repeated per row */
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* Second line keeps the Los column narrow enough that the table's other
	   columns stay visible without scrolling at 375px */
	.lot-sub {
		display: block;
		font-size: 0.75rem;
		color: var(--color-text-muted, #6b7280);
	}

	.table-empty {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
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
