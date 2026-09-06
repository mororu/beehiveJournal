<script lang="ts">
	import {
		BODY_ZONES,
		BODY_ZONE_TEXT_LABELS,
		BODY_MAP_VIEWBOX,
	} from '$lib/client/utils/bodyZones.js';

	let { value = $bindable('') }: { value: string } = $props();

	function select(label: string) {
		value = value === label ? '' : label;
	}
</script>

<div class="body-map">
	<p class="hint">Tippen Sie auf die gestochene Körperstelle</p>

	<svg
		viewBox={BODY_MAP_VIEWBOX}
		class="svg"
		role="group"
		aria-label="Körperkarte — Stichlocation wählen"
	>
		{#each BODY_ZONES as zone (zone.id)}
			{@const selected = value === zone.label}
			{#if zone.shape === 'circle'}
				<circle
					cx={zone.cx}
					cy={zone.cy}
					r={zone.r}
					class="zone"
					class:zone--selected={selected}
					role="button"
					tabindex="0"
					aria-label={zone.label}
					aria-pressed={selected}
					onclick={() => select(zone.label)}
					onkeydown={(e) => e.key === 'Enter' && select(zone.label)}
				></circle>
			{:else}
				<rect
					x={zone.x}
					y={zone.y}
					width={zone.width}
					height={zone.height}
					rx={zone.rx}
					class="zone"
					class:zone--selected={selected}
					role="button"
					tabindex="0"
					aria-label={zone.label}
					aria-pressed={selected}
					onclick={() => select(zone.label)}
					onkeydown={(e) => e.key === 'Enter' && select(zone.label)}
				></rect>
			{/if}
		{/each}

		<!-- Text labels inside zones (non-interactive) -->
		{#each BODY_ZONE_TEXT_LABELS as lbl (lbl.id)}
			{@const selected = value === BODY_ZONES.find((z) => z.id === lbl.id)?.label}
			<text
				x={lbl.x}
				y={lbl.y}
				class="zone-label"
				class:zone-label--selected={selected}
				text-anchor="middle"
				dominant-baseline="middle"
				transform={lbl.rotate ? `rotate(${lbl.rotate}, ${lbl.x}, ${lbl.y})` : undefined}
				pointer-events="none">{lbl.text}</text
			>
		{/each}
	</svg>

	<div class="status">
		{#if value}
			<span class="selected-label">📍 <strong>{value}</strong></span>
			<button class="clear-btn" type="button" onclick={() => (value = '')}>Löschen</button>
		{:else}
			<span class="placeholder">Kein Bereich ausgewählt</span>
		{/if}
	</div>
</div>

<style>
	.body-map {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.hint {
		font-size: 0.8rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0;
		text-align: center;
	}

	.svg {
		width: 100%;
		max-width: 200px;
		height: auto;
	}

	.zone {
		fill: #f3f4f6;
		stroke: #d1d5db;
		stroke-width: 1.5;
		cursor: pointer;
		transition:
			fill 0.12s ease,
			stroke 0.12s ease;
	}

	.zone:hover {
		fill: #fef3c7;
		stroke: #f59e0b;
	}

	.zone:focus {
		outline: none;
		stroke: #f59e0b;
		stroke-width: 2.5;
	}

	.zone--selected {
		fill: #f59e0b;
		stroke: #d97706;
		stroke-width: 2;
	}

	.zone--selected:hover {
		fill: #fbbf24;
	}

	.zone-label {
		font-size: 7px;
		font-family: inherit;
		fill: #6b7280;
		user-select: none;
	}

	.zone-label--selected {
		fill: #ffffff;
		font-weight: 600;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 1.5rem;
	}

	.selected-label {
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
	}

	.placeholder {
		font-size: 0.8rem;
		color: var(--color-text-muted, #6b7280);
		font-style: italic;
	}

	.clear-btn {
		font-size: 0.75rem;
		color: var(--color-text-muted, #6b7280);
		background: none;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: 4px;
		padding: 0.1rem 0.5rem;
		cursor: pointer;
		font-family: inherit;
	}

	.clear-btn:hover {
		background: var(--color-hover, #f3f4f6);
	}
</style>
