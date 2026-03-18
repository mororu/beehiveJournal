<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Chart as ChartType } from 'chart.js';
	import type { Inspection } from '$lib/server/db/schema.js';

	interface Props {
		inspections: Inspection[];
		hiveId: number;
		/** Called when user taps/clicks a data point; receives the inspection ID */
		onPointClick?: (inspectionId: number) => void;
	}

	let { inspections, hiveId, onPointClick }: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	// Chart.js instance — type-only import; runtime loaded via dynamic import in initChart()
	let chartInstance: ChartType | null = null;
	// Inspection IDs in chart order (oldest→newest), kept in sync with chart data
	let chartIds: number[] = [];

	// Build chart data — inspections arrive newest-first; chart should read oldest-first
	function buildChartData(data: Inspection[]) {
		const sorted = [...data].reverse(); // oldest → newest
		return {
			labels: sorted.map((i) => {
				const d = new Date(i.inspectedAt * 1000);
				return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
			}),
			scores: sorted.map((i) => i.healthScore),
			ids: sorted.map((i) => i.id),
			colors: sorted.map((i) =>
				i.healthScore <= 2 ? '#dc2626' : i.healthScore === 3 ? '#d97706' : '#16a34a'
			),
		};
	}

	async function initChart() {
		if (!canvas) return;

		// Code-split: Chart.js is NOT in the main bundle — loaded only here
		const { Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } =
			await import('chart.js');

		Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

		const { labels, scores, ids, colors } = buildChartData(inspections);
		chartIds = ids; // seed initial IDs for click handler

		chartInstance = new Chart(canvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						data: scores,
						borderColor: '#f59e0b',
						borderWidth: 2,
						pointBackgroundColor: colors,
						pointBorderColor: colors,
						pointRadius: 6,
						pointHoverRadius: 8,
						tension: 0.3,
						fill: false,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				aspectRatio: 2.2,
				interaction: {
					mode: 'nearest',
					intersect: true,
				},
				onClick: (_event, elements) => {
					if (elements.length > 0) {
						const idx = elements[0].index;
						// Use chartIds (kept up to date by $effect) rather than closed-over ids
						const inspId = chartIds[idx];
						if (onPointClick) {
							onPointClick(inspId);
						} else {
							// Default: navigate to inspection detail
							window.location.href = `/hives/${hiveId}/inspections/${inspId}`;
						}
					}
				},
				scales: {
					y: {
						min: 1,
						max: 5,
						ticks: {
							stepSize: 1,
							callback: (v: unknown) => {
								const n = Number(v);
								return n === 1
									? '1 Critical'
									: n === 2
										? '2 Poor'
										: n === 3
											? '3 Fair'
											: n === 4
												? '4 Good'
												: '5 Excellent';
							},
							font: { size: 11 },
						},
						grid: {
							color: 'rgba(0,0,0,0.06)',
						},
					},
					x: {
						ticks: {
							maxRotation: 45,
							font: { size: 11 },
							maxTicksLimit: 10,
						},
						grid: { display: false },
					},
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx: { raw: unknown }) => {
								const score = Number(ctx.raw);
								const word =
									score === 1
										? 'Critical'
										: score === 2
											? 'Poor'
											: score === 3
												? 'Fair'
												: score === 4
													? 'Good'
													: 'Excellent';
								return `Health: ${score} — ${word}`;
							},
						},
					},
				},
			},
		});
	}

	function destroyChart() {
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

	// Re-build chart when inspections prop changes (filter applied)
	$effect(() => {
		if (!chartInstance || !canvas) return;
		const { labels, scores, ids, colors } = buildChartData(inspections);
		chartIds = ids;
		chartInstance.data.labels = labels;
		// Cast to unknown first to set point-specific color properties that Chart.js types
		// as narrowed dataset unions — these properties are valid at runtime for line charts
		const ds = chartInstance.data.datasets[0] as unknown as Record<string, unknown>;
		ds.data = scores;
		ds.pointBackgroundColor = colors;
		ds.pointBorderColor = colors;
		chartInstance.update('active');
	});
</script>

<div class="chart-wrap">
	{#if inspections.length < 2}
		<div class="chart-placeholder">
			<p>Add at least 2 inspections to see the health timeline.</p>
		</div>
	{:else}
		<canvas bind:this={canvas} aria-label="Health score timeline chart"></canvas>
	{/if}
</div>

<style>
	.chart-wrap {
		width: 100%;
		position: relative;
	}

	canvas {
		width: 100% !important;
		cursor: pointer;
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
