<script lang="ts">
	import { enhance } from '$app/forms';
	import HealthBadge from '$lib/components/HealthBadge.svelte';
	import { formatDateTime } from '$lib/client/utils/date.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// ── Queen status display ──────────────────────────────────────────────────
	const queenLabels: Record<string, string> = {
		seen: 'Gesehen',
		not_seen: 'Nicht gesehen',
		cells_present: 'Zellen vorhanden',
	};

	// ── Verhalten display ─────────────────────────────────────────────────────
	const verhaltenLabels: Record<string, string> = {
		ruhig: 'Ruhig',
		aufbrausend: 'Aufbrausend',
		aggressiv: 'Aggressiv',
	};

	// ── Delete dialog ─────────────────────────────────────────────────────────
	let deleteDialogOpen = $state(false);
	let isDeleting = $state(false);
</script>

<svelte:head>
	<title>Inspection {formatDateTime(data.inspection.inspectedAt)} — {data.hive.name}</title>
</svelte:head>

<!-- Delete confirmation dialog -->
<dialog open={deleteDialogOpen || undefined} class="dialog" aria-labelledby="delete-title">
	<h2 id="delete-title" class="dialog__title">Diese Kontrolle löschen?</h2>
	<p class="dialog__body">
		Dieser Kontrolleeintrag wird dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.
	</p>
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
				};
			}}
		>
			<button class="btn btn--danger" type="submit" disabled={isDeleting}>
				{isDeleting ? 'Löschen…' : 'Löschen'}
			</button>
		</form>
	</div>
</dialog>

<div class="detail-page">
	<!-- Header -->
	<div class="detail-page__header">
		<a href="/hives/{data.hive.id}" class="back-link">← {data.hive.name}</a>
		<div class="detail-page__title-row">
			<h1>{formatDateTime(data.inspection.inspectedAt)}</h1>
			<div class="detail-page__actions">
				<a
					href="/hives/{data.hive.id}/inspections/{data.inspection.id}/edit"
					class="btn btn--ghost btn--sm"
				>
					Bearbeiten
				</a>
				<button
					class="btn btn--ghost btn--sm btn--delete-trigger"
					type="button"
					onclick={() => (deleteDialogOpen = true)}
				>
					Löschen
				</button>
			</div>
		</div>
	</div>

	<!-- Core fields -->
	<div class="detail-card">
		<div class="detail-row detail-row--prominent">
			<span class="detail-label">Gesundheitsbewertung</span>
			<div class="detail-value detail-value--score">
				<HealthBadge score={data.inspection.healthScore} />
				<span class="score-word">
					{data.inspection.healthScore === 1
						? 'Kritisch'
						: data.inspection.healthScore === 2
							? 'Schlecht'
							: data.inspection.healthScore === 3
								? 'Mittel'
								: data.inspection.healthScore === 4
									? 'Gut'
									: 'Ausgezeichnet'}
				</span>
			</div>
		</div>

		<div class="detail-row">
			<span class="detail-label">Königinnenstatus</span>
			<span class="detail-value queen-status queen-status--{data.inspection.queenStatus}">
				{queenLabels[data.inspection.queenStatus] ?? data.inspection.queenStatus}
			</span>
		</div>

		{#if data.inspection.verhalten}
			<div class="detail-row">
				<span class="detail-label">Verhalten</span>
				<span class="detail-value">
					{verhaltenLabels[data.inspection.verhalten] ?? data.inspection.verhalten}
				</span>
			</div>
		{/if}
	</div>

	<!-- Next inspection note (most important — shown prominently) -->
	{#if data.inspection.nextInspectNote}
		<div class="note-card note-card--next">
			<p class="note-card__heading">Notiz nächste Kontrolle</p>
			<p class="note-card__body">{data.inspection.nextInspectNote}</p>
		</div>
	{/if}

	<!-- Behaviour notes -->
	{#if data.inspection.behaviourNotes}
		<div class="note-card">
			<p class="note-card__heading">Verhaltensnotizen</p>
			<p class="note-card__body">{data.inspection.behaviourNotes}</p>
		</div>
	{/if}

	<!-- Photos -->
	{#if data.photos.length > 0}
		<div class="detail-card">
			<p class="detail-section-title">Fotos ({data.photos.length})</p>
			<div class="photo-grid">
				{#each data.photos as photo (photo.id)}
					<a
						href="/api/photos/{photo.id}"
						target="_blank"
						rel="noopener noreferrer"
						class="photo-thumb"
						aria-label="Foto öffnen"
					>
						<img
							src="/api/photos/{photo.id}"
							alt="Inspektionsfoto"
							class="photo-thumb__img"
							loading="lazy"
						/>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Weather -->
	<div class="detail-card">
		<p class="detail-section-title">Wetter</p>
		{#if data.inspection.weatherUnavailable || (!data.inspection.weatherTemp && !data.inspection.weatherDesc)}
			<p class="detail-muted">Wetter nicht erfasst</p>
		{:else}
			<div class="weather-detail">
				{#if data.inspection.weatherTemp != null}
					<span class="weather-detail__temp">{data.inspection.weatherTemp}°C</span>
				{/if}
				{#if data.inspection.weatherDesc}
					<span class="weather-detail__desc">{data.inspection.weatherDesc}</span>
				{/if}
				{#if data.inspection.weatherWindSpeed != null}
					<span class="weather-detail__wind">{data.inspection.weatherWindSpeed} km/h Wind</span>
				{/if}
			</div>
			{#if data.inspection.weatherLat != null && data.inspection.weatherLon != null}
				<p class="detail-muted detail-muted--small">
					Standort: {data.inspection.weatherLat.toFixed(4)}, {data.inspection.weatherLon.toFixed(4)}
				</p>
			{/if}
		{/if}
	</div>
</div>

<style>
	/* ── Dialog ── */
	.dialog {
		position: fixed;
		inset: 0;
		z-index: 100;
		margin: auto;
		width: calc(100% - 2rem);
		max-width: 400px;
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
		margin: 0 0 0.625rem;
	}

	.dialog__body {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0 0 0.5rem;
		line-height: 1.5;
	}

	.dialog__actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.25rem;
	}

	/* ── Page layout ── */
	.detail-page {
		max-width: 560px;
		margin: 0 auto;
	}

	.detail-page__header {
		margin-bottom: 1.25rem;
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

	.detail-page__title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	h1 {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
		flex: 1;
	}

	.detail-page__actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	/* ── Cards ── */
	.detail-card {
		background: var(--color-surface, #ffffff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 0.875rem;
	}

	.detail-section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted, #6b7280);
		margin: 0 0 0.75rem;
	}

	.detail-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border, #f3f4f6);
	}

	.detail-row:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}

	.detail-row--prominent {
		padding: 0.625rem 0;
	}

	.detail-label {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
	}

	.detail-value {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		text-align: right;
	}

	.detail-value--score {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.score-word {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.queen-status {
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.2rem 0.625rem;
		border-radius: 99px;
	}

	.queen-status--seen {
		background: #ecfdf5;
		color: #065f46;
	}

	.queen-status--not_seen {
		background: #f3f4f6;
		color: #374151;
	}

	.queen-status--cells_present {
		background: #fffbeb;
		color: #92400e;
	}

	/* ── Note cards ── */
	.note-card {
		background: var(--color-surface, #ffffff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 0.875rem;
	}

	.note-card--next {
		border-color: var(--color-accent, #f59e0b);
		background: #fffbeb;
	}

	.note-card__heading {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted, #6b7280);
		margin: 0 0 0.5rem;
	}

	.note-card--next .note-card__heading {
		color: #92400e;
	}

	.note-card__body {
		font-size: 0.9rem;
		color: var(--color-text, #1a1a1a);
		margin: 0;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	/* ── Photos ── */
	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
		gap: 0.5rem;
	}

	.photo-thumb {
		display: block;
		aspect-ratio: 1;
		border-radius: 8px;
		overflow: hidden;
		background: var(--color-border, #e5e7eb);
	}

	.photo-thumb__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transition: opacity 0.15s ease;
	}

	.photo-thumb:hover .photo-thumb__img {
		opacity: 0.85;
	}

	/* ── Weather detail ── */
	.weather-detail {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.weather-detail__temp {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
	}

	.weather-detail__desc,
	.weather-detail__wind {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
	}

	.detail-muted {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0;
	}

	.detail-muted--small {
		font-size: 0.75rem;
		margin-top: 0.5rem;
	}

	/* ── Buttons ── */
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
	}

	.btn--sm {
		height: 36px;
		font-size: 0.825rem;
		padding: 0 0.75rem;
	}

	.btn--ghost {
		background-color: transparent;
		color: var(--color-text-muted, #6b7280);
		border: 1px solid var(--color-border, #d1d5db);
	}

	.btn--ghost:hover {
		background-color: var(--color-hover, #f3f4f6);
	}

	.btn--delete-trigger {
		color: #dc2626;
		border-color: #fecaca;
	}

	.btn--delete-trigger:hover {
		background-color: #fef2f2;
	}

	.btn--danger {
		background-color: #dc2626;
		color: #ffffff;
		border: none;
	}

	.btn--danger:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.btn--danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
