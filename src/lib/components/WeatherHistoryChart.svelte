<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Chart as ChartType } from 'chart.js';
	import type { WeatherHistoryDay } from '$lib/server/weather.js';

	interface Props {
		history: WeatherHistoryDay[];
	}

	let { history }: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let chartInstance: ChartType | null = null;

	function formatLabel(iso: string): string {
		// "YYYY-MM-DD" → "dd.MM"
		const parts = iso.split('-');
		if (parts.length !== 3) return iso;
		return `${parts[2]}.${parts[1]}`;
	}

	function readCssVar(name: string, fallback: string): string {
		const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		return v || fallback;
	}

	async function initChart() {
		if (!canvas) return;

		const {
			Chart,
			LineElement,
			BarElement,
			PointElement,
			LinearScale,
			CategoryScale,
			Tooltip,
			Filler,
			BarController,
			LineController,
		} = await import('chart.js');

		Chart.register(
			LineElement,
			BarElement,
			PointElement,
			LinearScale,
			CategoryScale,
			Tooltip,
			Filler,
			BarController,
			LineController
		);

		// Chart.js can't consume CSS variables directly — read them once at init time.
		const accent = readCssVar('--color-accent', '#f59e0b');
		const muted = readCssVar('--color-text-muted', '#9ca3af');

		const labels = history.map((h) => formatLabel(h.date));
		const tMax = history.map((h) => h.tMax);
		const tMin = history.map((h) => h.tMin);
		const precip = history.map((h) => h.precip);

		chartInstance = new Chart(canvas, {
			data: {
				labels,
				datasets: [
					{
						type: 'line',
						label: 'Max °C',
						data: tMax,
						borderColor: accent,
						backgroundColor: 'rgba(245, 158, 11, 0.15)',
						borderWidth: 2,
						pointRadius: 0,
						tension: 0.25,
						fill: '+1',
						yAxisID: 'y',
					},
					{
						type: 'line',
						label: 'Min °C',
						data: tMin,
						borderColor: muted,
						borderWidth: 2,
						pointRadius: 0,
						tension: 0.25,
						fill: false,
						yAxisID: 'y',
					},
					{
						type: 'bar',
						label: 'Regen (mm)',
						data: precip,
						backgroundColor: 'rgba(37, 99, 235, 0.55)',
						borderWidth: 0,
						yAxisID: 'precip',
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: true,
				aspectRatio: 2.2,
				interaction: { mode: 'index', intersect: false },
				scales: {
					y: {
						position: 'left',
						title: { display: true, text: '°C', font: { size: 10 } },
						ticks: { font: { size: 10 } },
						grid: { color: 'rgba(0,0,0,0.06)' },
					},
					precip: {
						position: 'right',
						min: 0,
						title: { display: true, text: 'mm', font: { size: 10 } },
						ticks: { font: { size: 10 } },
						grid: { display: false },
					},
					x: {
						ticks: { font: { size: 10 }, maxRotation: 45, maxTicksLimit: 10 },
						grid: { display: false },
					},
				},
				plugins: {
					legend: {
						display: true,
						labels: { font: { size: 11 }, boxWidth: 12 },
					},
					tooltip: {
						callbacks: {
							title: (items: { dataIndex: number }[]) => {
								const idx = items[0]?.dataIndex ?? 0;
								return history[idx]?.date ?? '';
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
</script>

<div class="chart-wrap">
	{#if history.length < 2}
		<div class="chart-placeholder">
			<p>Wetterverlauf nicht verfügbar.</p>
		</div>
	{:else}
		<canvas bind:this={canvas} aria-label="Wetterverlauf der letzten 30 Tage"></canvas>
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
		padding: 1.5rem 1rem;
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
