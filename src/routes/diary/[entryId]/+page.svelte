<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { formatDate } from '$lib/client/utils/date.js';
	import type { WeatherHistoryDay } from '$lib/server/weather.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);

	function isValidHistoryDay(x: unknown): x is WeatherHistoryDay {
		if (!x || typeof x !== 'object') return false;
		const h = x as Record<string, unknown>;
		return (
			typeof h.date === 'string' &&
			(h.tMin === null || typeof h.tMin === 'number') &&
			(h.tMax === null || typeof h.tMax === 'number') &&
			(h.precip === null || typeof h.precip === 'number') &&
			(h.code === null || typeof h.code === 'number')
		);
	}

	const history = $derived.by<WeatherHistoryDay[] | null>(() => {
		if (!data.entry.weatherHistory) return null;
		try {
			const parsed = JSON.parse(data.entry.weatherHistory);
			if (!Array.isArray(parsed)) return null;
			const clean = parsed.filter(isValidHistoryDay);
			return clean.length > 0 ? clean : null;
		} catch {
			return null;
		}
	});

	const hasWeather = $derived(!data.entry.weatherUnavailable && data.entry.weatherTemp !== null);
</script>

<svelte:head>
	<title>{data.entry.title} — Tagebuch</title>
</svelte:head>

<dialog open={deleteDialogOpen || undefined} class="dialog" aria-labelledby="delete-entry-title">
	<h2 id="delete-entry-title" class="dialog__title">Diesen Eintrag löschen?</h2>
	<p class="dialog__body">Dies kann nicht rückgängig gemacht werden.</p>
	<div class="dialog__actions">
		<button class="btn btn--ghost" type="button" onclick={() => (deleteDialogOpen = false)}>
			Abbrechen
		</button>
		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				isDeleting = true;
				return async ({ update }) => {
					await update();
					isDeleting = false;
					deleteDialogOpen = false;
				};
			}}
		>
			<button class="btn btn--danger" type="submit" disabled={isDeleting}>
				{isDeleting ? 'Löschen…' : 'Löschen'}
			</button>
		</form>
	</div>
</dialog>

<div class="page">
	<a href="/diary" class="back-link">← Tagebuch</a>
	<h1>{data.entry.title}</h1>

	<div class="meta-row">
		<span class="meta-date">{formatDate(data.entry.entryDate)}</span>
		{#if hasWeather}
			<span class="weather-chip">
				<span class="weather-chip__temp">{data.entry.weatherTemp}°C</span>
				{#if data.entry.weatherDesc}
					<span>{data.entry.weatherDesc}</span>
				{/if}
				{#if data.entry.weatherWindSpeed !== null}
					<span>{data.entry.weatherWindSpeed} km/h</span>
				{/if}
			</span>
		{/if}
	</div>

	{#if data.entry.body}
		<pre class="entry-body">{data.entry.body}</pre>
	{/if}

	<section class="history-section">
		<h2 class="history-title">Wetter (letzte 30 Tage)</h2>
		{#if data.entry.weatherUnavailable || !history}
			<div class="weather-unavailable">Wetterdaten nicht verfügbar</div>
		{:else if browser}
			{#await import('$lib/components/WeatherHistoryChart.svelte') then { default: WeatherHistoryChart }}
				<WeatherHistoryChart {history} />
			{/await}
		{/if}
	</section>

	<div class="actions-bar">
		<a href="/diary/{data.entry.id}/edit" class="btn btn--ghost">Bearbeiten</a>
		<button class="btn btn--danger" type="button" onclick={() => (deleteDialogOpen = true)}>
			Löschen
		</button>
	</div>
</div>

<style>
	.dialog {
		position: fixed;
		inset: 0;
		z-index: 100;
		margin: auto;
		width: calc(100% - 2rem);
		max-width: 380px;
		background: var(--color-surface, #ffffff);
		border: none;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
	}

	.dialog::backdrop {
		background: rgba(0, 0, 0, 0.4);
	}

	.dialog__title {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 0.5rem;
	}

	.dialog__body {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0 0 0.5rem;
	}

	.dialog__actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.25rem;
	}

	.page {
		max-width: 600px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-block;
		font-size: 0.85rem;
		color: var(--color-text-muted, #6b7280);
		text-decoration: none;
		margin-bottom: 0.5rem;
	}

	.back-link:hover {
		color: var(--color-text, #1a1a1a);
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 0.75rem;
		line-height: 1.25;
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.meta-date {
		font-size: 0.85rem;
		color: var(--color-text-muted, #6b7280);
		font-weight: 500;
	}

	.weather-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		padding: 0.25rem 0.625rem;
		background: #ecfdf5;
		color: #065f46;
		border: 1px solid #a7f3d0;
		border-radius: 999px;
	}

	.weather-chip__temp {
		font-weight: 700;
	}

	.entry-body {
		white-space: pre-wrap;
		font-family: inherit;
		font-size: 0.95rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-surface, #ffffff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
		padding: 1rem;
		margin: 0 0 1.5rem;
		line-height: 1.55;
	}

	.history-section {
		margin-bottom: 1.5rem;
	}

	.history-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 0.75rem;
	}

	.weather-unavailable {
		padding: 1.5rem 1rem;
		text-align: center;
		border: 1.5px dashed var(--color-border, #e5e7eb);
		border-radius: 10px;
		color: var(--color-text-muted, #6b7280);
		font-size: 0.875rem;
	}

	.actions-bar {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding-bottom: 2rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 48px;
		padding: 0 1.25rem;
		font-size: 0.95rem;
		font-weight: 600;
		border-radius: 8px;
		text-decoration: none;
		cursor: pointer;
		border: none;
		transition: background-color 0.15s ease;
		font-family: inherit;
		min-height: 44px;
	}

	.btn--ghost {
		background: transparent;
		color: var(--color-text-muted, #6b7280);
		border: 1px solid var(--color-border, #d1d5db);
	}
	.btn--ghost:hover {
		background: var(--color-hover, #f3f4f6);
	}

	.btn--danger {
		background: #dc2626;
		color: #ffffff;
	}
	.btn--danger:hover:not(:disabled) {
		background: #b91c1c;
	}
	.btn--danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
