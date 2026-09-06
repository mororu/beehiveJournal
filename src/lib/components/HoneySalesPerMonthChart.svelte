<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Chart as ChartType } from 'chart.js';
	// import type is mandatory: verbatimModuleSyntax would emit a value import and
	// SvelteKit hard-fails any client-side import of $lib/server/*
	import type { SalesMonthBucket } from '$lib/server/db/queries/honeySales.js';
	import { MONTH_NAMES_SHORT_DE } from '$lib/client/utils/date.js';
	import { formatChf, formatKg } from '$lib/client/utils/number.js';

	interface Props {
		buckets: SalesMonthBucket[];
		/** 'year' → "Mär"; 'all' → "Mär 26" */
		mode: 'year' | 'all';
	}

	let { buckets, mode }: Props = $props();

	// A concrete year always carries 12 buckets, so length is not emptiness
	const hasData = $derived(buckets.some((b) => b.kg > 0));

	let canvas: HTMLCanvasElement | undefined = $state();
	// Chart.js instance — type-only import; runtime loaded via dynamic import in initChart()
	let chartInstance: ChartType | null = null;
	// Set by onDestroy. initChart() awaits a dynamic import, so the component can be torn
	// down mid-flight; without this the post-await new Chart() would register a dead
	// instance in Chart.js's global registry that nothing ever destroys.
	let destroyed = false;

	/** "YYYY-MM" → "Mär" (year mode) or "Mär 26" (all mode). */
	function monthLabel(key: string): string {
		const name = MONTH_NAMES_SHORT_DE[Number(key.slice(5, 7)) - 1];
		return mode === 'all' ? `${name} ${key.slice(2, 4)}` : name;
	}

	async function initChart() {
		if (!canvas) return;

		// Code-split: Chart.js is NOT in the main bundle — loaded only here
		const { Chart, BarElement, BarController, LinearScale, CategoryScale, Tooltip } =
			await import('chart.js');

		// bind:this is nulled on teardown, so re-check after the await
		if (destroyed || !canvas) return;

		// BarController is required — registering only BarElement throws
		// '"bar" is not a registered controller' in a session where no other
		// chart component has registered it.
		Chart.register(BarElement, BarController, LinearScale, CategoryScale, Tooltip);

		// Kilograms, not revenue: kg is meaningful under every filter state, whereas
		// revenue is identically zero under "Nur Geschenke" and would render a flat,
		// seemingly broken chart. The CHF figure rides in the tooltip instead.
		const chfByIndex = buckets.map((b) => b.chf);

		chartInstance = new Chart(canvas, {
			type: 'bar',
			data: {
				labels: buckets.map((b) => monthLabel(b.key)),
				datasets: [
					{
						data: buckets.map((b) => b.kg),
						backgroundColor: '#f59e0b',
						hoverBackgroundColor: '#d97706',
						borderWidth: 0,
						borderRadius: 4,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				aspectRatio: 2.2,
				scales: {
					y: {
						beginAtZero: true,
						// No precision: 0 — kilograms are fractional
						ticks: { font: { size: 10 } },
						grid: { color: 'rgba(0,0,0,0.06)' },
					},
					x: {
						ticks: { font: { size: 10 }, maxRotation: 45, maxTicksLimit: 12 },
						grid: { display: false },
					},
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx: { raw: unknown; dataIndex: number }) =>
								`${formatKg(Number(ctx.raw))} kg · ${formatChf(chfByIndex[ctx.dataIndex] ?? 0)} CHF`,
						},
					},
				},
			},
		});
	}

	function destroyChart() {
		destroyed = true;
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}
	}

	onMount(() => {
		initChart();
	});

	onDestroy(() => {
		destroyChart();
	});
</script>

<div class="chart-wrap">
	{#if !hasData}
		<div class="chart-placeholder">
			<p>Keine Verkäufe in diesem Zeitraum.</p>
		</div>
	{:else}
		<canvas bind:this={canvas} aria-label="Verkaufte Menge pro Monat"></canvas>
	{/if}
</div>

<style>
	.chart-wrap {
		width: 100%;
		position: relative;
	}

	canvas {
		width: 100% !important;
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
</style>
