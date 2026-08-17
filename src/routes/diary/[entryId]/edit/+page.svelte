<script lang="ts">
	import { enhance } from '$app/forms';
	import { toDateInput } from '$lib/client/utils/date.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let dateInputValue = $state(form?.entryDateRaw || toDateInput(data.entry.entryDate));
	let title = $state(form?.title ?? data.entry.title);
	let body = $state(form?.body ?? data.entry.body ?? '');
	let isSubmitting = $state(false);

	type GpsStatus = 'idle' | 'requesting' | 'granted' | 'denied';
	let gpsStatus = $state<GpsStatus>('idle');
	let lat = $state<number | null>(null);
	let lon = $state<number | null>(null);

	$effect(() => {
		if (!navigator.geolocation) {
			gpsStatus = 'denied';
			return;
		}
		gpsStatus = 'requesting';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				lat = pos.coords.latitude;
				lon = pos.coords.longitude;
				gpsStatus = 'granted';
			},
			() => {
				gpsStatus = 'denied';
			},
			{ maximumAge: 5 * 60 * 1000, timeout: 10_000 }
		);
	});

	const originalDate = toDateInput(data.entry.entryDate);
	const dateChanged = $derived(dateInputValue !== originalDate);
</script>

<svelte:head>
	<title>Eintrag bearbeiten — Tagebuch</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/diary/{data.entry.id}" class="back-link">← {data.entry.title}</a>
		<h1>Eintrag bearbeiten</h1>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		{#if form?.error}
			<div class="form-error" role="alert">{form.error}</div>
		{/if}

		<div class="field">
			<label class="field-label" for="entryDate">
				Datum <span class="required" aria-hidden="true">*</span>
			</label>
			<input
				class="field-input"
				type="date"
				id="entryDate"
				name="entryDate"
				bind:value={dateInputValue}
				required
				disabled={isSubmitting}
			/>
		</div>

		<div class="field">
			<label class="field-label" for="title">
				Titel <span class="required" aria-hidden="true">*</span>
			</label>
			<input
				class="field-input"
				type="text"
				id="title"
				name="title"
				maxlength="200"
				bind:value={title}
				required
				disabled={isSubmitting}
			/>
		</div>

		<div class="field">
			<label class="field-label" for="body">
				Text <span class="field-hint">(optional, max. 5000 Zeichen)</span>
			</label>
			<textarea
				class="field-input field-input--textarea"
				id="body"
				name="body"
				rows="6"
				maxlength="5000"
				bind:value={body}
				disabled={isSubmitting}
			></textarea>
		</div>

		<input type="hidden" name="lat" value={lat ?? ''} />
		<input type="hidden" name="lon" value={lon ?? ''} />

		{#if dateChanged}
			<p class="gps-hint">
				{#if gpsStatus === 'requesting'}
					Standort wird ermittelt… Wetter wird nach dem Speichern neu erfasst.
				{:else if gpsStatus === 'granted'}
					Wetter wird nach dem Speichern für das neue Datum neu erfasst.
				{:else if gpsStatus === 'denied'}
					Wetter wird nicht erfasst (Standort nicht freigegeben).
				{/if}
			</p>
		{:else}
			<p class="gps-hint">Datum unverändert — Wetterdaten bleiben erhalten.</p>
		{/if}

		<div class="form-actions">
			<a href="/diary/{data.entry.id}" class="btn btn--ghost">Abbrechen</a>
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
		margin-bottom: 1.25rem;
	}

	.field-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		margin-bottom: 0.375rem;
	}

	.field-hint {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--color-text-muted, #6b7280);
	}

	.required {
		color: #dc2626;
	}

	.field-input {
		width: 100%;
		height: 48px;
		padding: 0 0.875rem;
		font-size: 1rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		box-sizing: border-box;
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
		min-height: 120px;
		max-height: 400px;
	}

	.gps-hint {
		font-size: 0.8rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0 0 1.25rem;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
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

	.btn--primary {
		background: var(--color-accent, #f59e0b);
		color: #ffffff;
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
