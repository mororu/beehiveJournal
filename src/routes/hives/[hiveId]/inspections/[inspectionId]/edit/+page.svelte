<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { toDatetimeLocal } from '$lib/client/utils/date.js';
	import PhotoCapture from '$lib/components/PhotoCapture.svelte';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// untrack ensures Svelte doesn't treat these as reactive dependencies.
	// We intentionally read the initial values once for pre-filling the form.
	let healthScore = $state<number>(untrack(() => data.inspection.healthScore));
	let queenStatus = $state<string>(untrack(() => data.inspection.queenStatus));
	let isSubmitting = $state(false);
	let touched = $state(false);
</script>

<svelte:head>
	<title>Kontrolle bearbeiten — {data.hive.name}</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/hives/{data.hive.id}/inspections/{data.inspection.id}" class="back-link"
			>← Kontrolle</a
		>
		<h1>Kontrolle bearbeiten</h1>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			touched = true;
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
		onsubmit={(e) => {
			touched = true;
			if (!healthScore || !queenStatus) e.preventDefault();
		}}
	>
		{#if form?.error}
			<div class="form-error" role="alert">{form.error}</div>
		{/if}

		<!-- ── Health Score ── -->
		<div class="field">
			<span class="field-label">
				Gesundheitsbewertung <span class="required" aria-hidden="true">*</span>
			</span>
			{#if touched && !healthScore}
				<span class="inline-error" role="alert">Bitte Gesundheitsbewertung auswählen</span>
			{/if}
			<div class="score-row" role="group" aria-label="Health score 1 to 5">
				{#each [1, 2, 3, 4, 5] as score (score)}
					<button
						class="score-btn"
						class:score-btn--selected={healthScore === score}
						class:score-btn--red={score <= 2}
						class:score-btn--amber={score === 3}
						class:score-btn--green={score >= 4}
						type="button"
						aria-pressed={healthScore === score}
						aria-label="Health score {score}"
						onclick={() => (healthScore = score)}
					>
						{score}
					</button>
				{/each}
			</div>
			<input type="hidden" name="healthScore" value={healthScore} />
		</div>

		<!-- ── Queen Status ── -->
		<div class="field">
			<span class="field-label">
				Königinnenstatus <span class="required" aria-hidden="true">*</span>
			</span>
			{#if touched && !queenStatus}
				<span class="inline-error" role="alert">Bitte Königinnenstatus auswählen</span>
			{/if}
			<div class="queen-row" role="group" aria-label="Queen status">
				{#each [{ value: 'seen', label: 'Gesehen' }, { value: 'not_seen', label: 'Nicht gesehen' }, { value: 'cells_present', label: 'Zellen' }] as opt (opt.value)}
					<button
						class="queen-btn"
						class:queen-btn--selected={queenStatus === opt.value}
						type="button"
						aria-pressed={queenStatus === opt.value}
						onclick={() => (queenStatus = opt.value)}
					>
						{opt.label}
					</button>
				{/each}
			</div>
			<input type="hidden" name="queenStatus" value={queenStatus} />
		</div>

		<!-- ── Date/Time ── -->
		<div class="field">
			<label class="field-label" for="inspectedAt">Datum & Uhrzeit</label>
			<input
				class="field-input"
				type="datetime-local"
				id="inspectedAt"
				name="inspectedAt"
				value={toDatetimeLocal(data.inspection.inspectedAt)}
				disabled={isSubmitting}
			/>
		</div>

		<!-- ── Behaviour Notes ── -->
		<div class="field">
			<label class="field-label" for="behaviourNotes">
				Verhaltensnotizen <span class="field-hint">(optional)</span>
			</label>
			<textarea
				class="field-input field-input--textarea"
				id="behaviourNotes"
				name="behaviourNotes"
				maxlength="2000"
				rows="3"
				disabled={isSubmitting}>{data.inspection.behaviourNotes ?? ''}</textarea
			>
		</div>

		<!-- ── Next Inspection Note ── -->
		<div class="field">
			<label class="field-label" for="nextInspectNote">
				Notiz nächste Kontrolle <span class="field-hint">(optional)</span>
			</label>
			<textarea
				class="field-input field-input--textarea"
				id="nextInspectNote"
				name="nextInspectNote"
				maxlength="1000"
				rows="2"
				disabled={isSubmitting}>{data.inspection.nextInspectNote ?? ''}</textarea
			>
		</div>

		<!-- ── Weather (read-only) ── -->
		{#if !data.inspection.weatherUnavailable && data.inspection.weatherTemp != null}
			<div class="weather-readonly">
				<span class="weather-readonly__label">Wetter (bei Erstellung erfasst)</span>
				<div class="weather-readonly__data">
					<span>{data.inspection.weatherTemp}°C</span>
					{#if data.inspection.weatherDesc}<span>{data.inspection.weatherDesc}</span>{/if}
					{#if data.inspection.weatherWindSpeed != null}<span
							>{data.inspection.weatherWindSpeed} km/h</span
						>{/if}
				</div>
			</div>
		{/if}

		<!-- ── Photos ── -->
		<PhotoCapture existingPhotoIds={data.photos.map((p) => p.id)} disabled={isSubmitting} />

		<div class="form-actions">
			<a href="/hives/{data.hive.id}/inspections/{data.inspection.id}" class="btn btn--ghost"
				>Abbrechen</a
			>
			<button class="btn btn--primary" type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Speichern…' : 'Änderungen speichern'}
			</button>
		</div>
	</form>
</div>

<style>
	.form-page {
		max-width: 480px;
		margin: 0 auto;
	}

	.form-page__header {
		margin-bottom: 1.5rem;
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
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
	}

	.form-error {
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.field {
		margin-bottom: 1.5rem;
	}

	.field-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		margin-bottom: 0.5rem;
	}

	.field-hint {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--color-text-muted, #6b7280);
	}

	.required {
		color: #dc2626;
	}

	.inline-error {
		display: block;
		font-size: 0.8rem;
		color: #dc2626;
		margin-bottom: 0.375rem;
	}

	.field-input {
		width: 100%;
		height: 48px;
		padding: 0 0.875rem;
		font-size: 1rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-input-bg, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		box-sizing: border-box;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		font-family: inherit;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
	}

	.field-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.field-input--textarea {
		height: auto;
		padding: 0.75rem 0.875rem;
		resize: vertical;
		field-sizing: content;
		min-height: 80px;
		max-height: 200px;
	}

	/* Score selector */
	.score-row {
		display: flex;
		gap: 0.5rem;
	}

	.score-btn {
		flex: 1;
		height: 52px;
		font-size: 1.1rem;
		font-weight: 700;
		border: 2px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		background: var(--color-surface, #ffffff);
		color: var(--color-text, #1a1a1a);
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.score-btn:hover {
		border-color: var(--color-text-muted, #6b7280);
	}
	.score-btn--selected.score-btn--red {
		background: #dc2626;
		border-color: #dc2626;
		color: #fff;
	}
	.score-btn--selected.score-btn--amber {
		background: #d97706;
		border-color: #d97706;
		color: #fff;
	}
	.score-btn--selected.score-btn--green {
		background: #16a34a;
		border-color: #16a34a;
		color: #fff;
	}

	/* Queen selector */
	.queen-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.queen-btn {
		flex: 1;
		min-width: 0;
		min-height: 48px;
		padding: 0.25rem 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		border: 2px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		background: var(--color-surface, #ffffff);
		color: var(--color-text, #1a1a1a);
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.queen-btn:hover {
		border-color: var(--color-text-muted, #6b7280);
	}
	.queen-btn--selected {
		background: var(--color-accent, #f59e0b);
		border-color: var(--color-accent, #f59e0b);
		color: #fff;
	}

	/* Weather read-only */
	.weather-readonly {
		background: #f9fafb;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
	}

	.weather-readonly__label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted, #6b7280);
		margin-bottom: 0.375rem;
	}

	.weather-readonly__data {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
	}

	/* Form actions */
	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
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
	}

	.btn--primary {
		background: var(--color-accent, #f59e0b);
		color: #fff;
	}
	.btn--primary:hover:not(:disabled) {
		background: var(--color-accent-hover, #d97706);
	}
	.btn--primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn--ghost {
		background: transparent;
		color: var(--color-text-muted, #6b7280);
		border: 1px solid var(--color-border, #d1d5db);
	}

	.btn--ghost:hover {
		background: var(--color-hover, #f3f4f6);
	}
</style>
