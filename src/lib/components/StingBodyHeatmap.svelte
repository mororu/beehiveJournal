<script lang="ts">
	import {
		BODY_ZONES,
		BODY_ZONE_TEXT_LABELS,
		BODY_MAP_VIEWBOX,
		splitCountsByZone,
	} from '$lib/client/utils/bodyZones.js';
	// import type is mandatory: a value import of $lib/server/* hard-fails on the client
	import type { StingLocationCount } from '$lib/server/db/queries/stings.js';

	interface Props {
		byLocation: StingLocationCount[];
	}

	let { byLocation }: Props = $props();

	// perZone is keyed by zone id, so the text labels (also keyed by id) can look counts up
	const split = $derived(splitCountsByZone(byLocation));
	const perZone = $derived(split.perZone);
	const unmatched = $derived(split.unmatched);

	const ZERO_FILL = '#f3f4f6';
	/** Amber ramp, lightest → darkest. Sliced from the end when fewer steps survive. */
	const RAMP = ['#fef3c7', '#fcd34d', '#f59e0b', '#d97706'];
	/** Fills dark enough that a text label on top must switch to white. */
	const DARK_FILLS = ['#f59e0b', '#d97706'];

	const max = $derived(perZone.size === 0 ? 0 : Math.max(...perZone.values()));

	// With a half-season of data max is often 1 or 2, which would collapse a fixed
	// quartile scale into one indistinguishable shade. Upper bounds are therefore
	// derived from the data, deduplicated and kept strictly increasing.
	const steps = $derived.by(() => {
		if (max === 0) return [];
		const bounds = [Math.ceil(max * 0.25), Math.ceil(max * 0.5), Math.ceil(max * 0.75), max].filter(
			(n) => n >= 1
		);
		const upper = [...new Set(bounds)].sort((a, b) => a - b);
		const colors = RAMP.slice(RAMP.length - upper.length);
		return upper.map((bound, i) => ({
			min: i === 0 ? 1 : upper[i - 1] + 1,
			max: bound,
			color: colors[i],
		}));
	});

	// Chips cover matched zones only — unmatched labels are listed under "Sonstige",
	// so including them here would count them twice against the period total.
	const zoneChips = $derived(
		BODY_ZONES.map((z) => ({ label: z.label, count: perZone.get(z.id) ?? 0 }))
			.filter((c) => c.count > 0)
			.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
	);

	function fillFor(count: number): string {
		if (count <= 0) return ZERO_FILL;
		return steps.find((s) => count <= s.max)?.color ?? ZERO_FILL;
	}

	/** "1 Stich" / "n Stiche" — same pluralisation as the chart tooltip. */
	function plural(n: number): string {
		return n === 1 ? '1 Stich' : `${n} Stiche`;
	}

	function rangeLabel(step: { min: number; max: number }): string {
		return step.min === step.max ? String(step.max) : `${step.min}–${step.max}`;
	}
</script>

{#if byLocation.length === 0}
	<div class="chart-placeholder">
		<p>Keine Stiche in diesem Zeitraum.</p>
	</div>
{:else}
	<div class="heatmap">
		<svg
			viewBox={BODY_MAP_VIEWBOX}
			class="svg"
			role="img"
			aria-label="Körperkarte — Stiche nach Körperstelle"
		>
			{#each BODY_ZONES as zone (zone.id)}
				{@const count = perZone.get(zone.id) ?? 0}
				{#if zone.shape === 'circle'}
					<circle cx={zone.cx} cy={zone.cy} r={zone.r} class="zone" fill={fillFor(count)}>
						<title>{zone.label}: {plural(count)}</title>
					</circle>
				{:else}
					<rect
						x={zone.x}
						y={zone.y}
						width={zone.width}
						height={zone.height}
						rx={zone.rx}
						class="zone"
						fill={fillFor(count)}
					>
						<title>{zone.label}: {plural(count)}</title>
					</rect>
				{/if}
			{/each}

			<!-- Text labels inside zones (non-interactive) -->
			{#each BODY_ZONE_TEXT_LABELS as lbl (lbl.id)}
				{@const onDark = DARK_FILLS.includes(fillFor(perZone.get(lbl.id) ?? 0))}
				<text
					x={lbl.x}
					y={lbl.y}
					class="zone-label"
					class:zone-label--on-dark={onDark}
					text-anchor="middle"
					dominant-baseline="middle"
					transform={lbl.rotate ? `rotate(${lbl.rotate}, ${lbl.x}, ${lbl.y})` : undefined}
					pointer-events="none">{lbl.text}</text
				>
			{/each}
		</svg>

		{#if steps.length > 0}
			<ul class="legend">
				{#each steps as step (step.max)}
					<li class="legend__item">
						<span class="legend__swatch" style="background: {step.color}"></span>
						<span>{rangeLabel(step)}</span>
					</li>
				{/each}
			</ul>
		{/if}

		<!-- Text equivalent of the colour encoding — colour alone must not carry the data -->
		<ul class="chips">
			{#each zoneChips as chip (chip.label)}
				<li class="chip"><span class="chip__label">{chip.label}</span> {chip.count}</li>
			{/each}
		</ul>

		{#if unmatched.length > 0}
			<p class="other">
				Sonstige: {unmatched.map((u) => `${u.label} ${u.count}`).join(', ')}
			</p>
		{/if}
	</div>
{/if}

<style>
	.heatmap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.svg {
		width: 100%;
		max-width: 200px;
		height: auto;
	}

	.zone {
		stroke: var(--color-border, #d1d5db);
		stroke-width: 1.5;
		cursor: default;
	}

	.zone-label {
		font-size: 7px;
		font-family: inherit;
		fill: var(--color-text-muted, #6b7280);
		user-select: none;
	}

	.zone-label--on-dark {
		fill: #ffffff;
		font-weight: 600;
	}

	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: var(--color-text-muted, #6b7280);
	}

	.legend__item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.legend__swatch {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1px solid var(--color-border, #d1d5db);
	}

	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.375rem;
	}

	.chip {
		font-size: 0.75rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-hover, #f3f4f6);
		border-radius: 999px;
		padding: 0.15rem 0.6rem;
	}

	.chip__label {
		color: var(--color-text-muted, #6b7280);
	}

	.other {
		font-size: 0.75rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0;
		text-align: center;
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
