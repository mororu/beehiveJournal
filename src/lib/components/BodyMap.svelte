<script lang="ts">
	let { value = $bindable('') }: { value: string } = $props();

	const zones = [
		{ id: 'head', label: 'Head', shape: 'circle' as const, cx: 100, cy: 40, r: 28 },
		{ id: 'neck', label: 'Neck', shape: 'rect' as const, x: 88, y: 68, width: 24, height: 15, rx: 5 },
		{ id: 'chest', label: 'Chest', shape: 'rect' as const, x: 60, y: 83, width: 80, height: 68, rx: 6 },
		{ id: 'abdomen', label: 'Abdomen', shape: 'rect' as const, x: 62, y: 151, width: 76, height: 62, rx: 6 },
		{ id: 'left-arm', label: 'Left Arm', shape: 'rect' as const, x: 32, y: 83, width: 28, height: 82, rx: 10 },
		{ id: 'right-arm', label: 'Right Arm', shape: 'rect' as const, x: 140, y: 83, width: 28, height: 82, rx: 10 },
		{ id: 'left-forearm', label: 'Left Forearm', shape: 'rect' as const, x: 26, y: 167, width: 26, height: 60, rx: 8 },
		{ id: 'right-forearm', label: 'Right Forearm', shape: 'rect' as const, x: 148, y: 167, width: 26, height: 60, rx: 8 },
		{ id: 'left-hand', label: 'Left Hand', shape: 'rect' as const, x: 20, y: 229, width: 30, height: 26, rx: 7 },
		{ id: 'right-hand', label: 'Right Hand', shape: 'rect' as const, x: 150, y: 229, width: 30, height: 26, rx: 7 },
		{ id: 'left-thigh', label: 'Left Thigh', shape: 'rect' as const, x: 62, y: 213, width: 30, height: 78, rx: 8 },
		{ id: 'right-thigh', label: 'Right Thigh', shape: 'rect' as const, x: 108, y: 213, width: 30, height: 78, rx: 8 },
		{ id: 'left-shin', label: 'Left Shin', shape: 'rect' as const, x: 62, y: 293, width: 29, height: 68, rx: 8 },
		{ id: 'right-shin', label: 'Right Shin', shape: 'rect' as const, x: 109, y: 293, width: 29, height: 68, rx: 8 },
		{ id: 'left-foot', label: 'Left Foot', shape: 'rect' as const, x: 52, y: 363, width: 38, height: 20, rx: 6 },
		{ id: 'right-foot', label: 'Right Foot', shape: 'rect' as const, x: 110, y: 363, width: 38, height: 20, rx: 6 },
	];

	// Text labels shown inside large-enough zones
	const labels: { id: string; x: number; y: number; text: string; rotate?: number }[] = [
		{ id: 'head', x: 100, y: 44, text: 'Head' },
		{ id: 'chest', x: 100, y: 121, text: 'Chest' },
		{ id: 'abdomen', x: 100, y: 186, text: 'Abdomen' },
		{ id: 'left-arm', x: 46, y: 127, text: 'L. Arm', rotate: -90 },
		{ id: 'right-arm', x: 154, y: 127, text: 'R. Arm', rotate: -90 },
		{ id: 'left-thigh', x: 77, y: 256, text: 'Thigh', rotate: -90 },
		{ id: 'right-thigh', x: 123, y: 256, text: 'Thigh', rotate: -90 },
		{ id: 'left-shin', x: 76, y: 330, text: 'Shin', rotate: -90 },
		{ id: 'right-shin', x: 123, y: 330, text: 'Shin', rotate: -90 },
	];

	function select(label: string) {
		value = value === label ? '' : label;
	}
</script>

<div class="body-map">
	<p class="hint">Tap the area where you were stung</p>

	<svg viewBox="0 0 200 390" class="svg" role="group" aria-label="Body map — select sting location">
		{#each zones as zone (zone.id)}
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
		{#each labels as lbl (lbl.id)}
			{@const selected = value === zones.find((z) => z.id === lbl.id)?.label}
			<text
				x={lbl.x}
				y={lbl.y}
				class="zone-label"
				class:zone-label--selected={selected}
				text-anchor="middle"
				dominant-baseline="middle"
				transform={lbl.rotate ? `rotate(${lbl.rotate}, ${lbl.x}, ${lbl.y})` : undefined}
				pointer-events="none"
			>{lbl.text}</text>
		{/each}
	</svg>

	<div class="status">
		{#if value}
			<span class="selected-label">📍 <strong>{value}</strong></span>
			<button class="clear-btn" type="button" onclick={() => (value = '')}>Clear</button>
		{:else}
			<span class="placeholder">No area selected</span>
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
