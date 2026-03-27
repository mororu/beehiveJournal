<script lang="ts">
	import { enhance } from '$app/forms';
	import { toDatetimeLocal } from '$lib/client/utils/date.js';
	import BodyMap from '$lib/components/BodyMap.svelte';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSubmitting = $state(false);
	let bodyLocation = $state(form?.bodyLocation ?? '');

	const defaultDatetime = toDatetimeLocal(Math.floor(Date.now() / 1000));
</script>

<svelte:head>
	<title>Log Sting — beehiveJournal</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/stings" class="back-link">← Sting Log</a>
		<h1>Log Sting</h1>
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

		<!-- Date & Time -->
		<div class="field">
			<label class="field-label" for="stungAt">
				Date & Time <span class="required" aria-hidden="true">*</span>
			</label>
			<input
				class="field-input"
				type="datetime-local"
				id="stungAt"
				name="stungAt"
				value={defaultDatetime}
				required
				disabled={isSubmitting}
			/>
		</div>

		<!-- Body Location -->
		<div class="field">
			<span class="field-label">
				Body Location <span class="required" aria-hidden="true">*</span>
			</span>
			<BodyMap bind:value={bodyLocation} />
			<input type="hidden" name="bodyLocation" value={bodyLocation} />
			{#if form?.error === 'Body location is required' && !bodyLocation}
				<p class="field-error">Please select a location on the body map.</p>
			{/if}
		</div>

		<!-- Hive (optional) -->
		<div class="field">
			<label class="field-label" for="hiveId">
				Hive <span class="field-hint">(optional)</span>
			</label>
			<select
				class="field-input field-input--select"
				id="hiveId"
				name="hiveId"
				disabled={isSubmitting}
			>
				<option value="">— None —</option>
				{#if data.activeHives.length > 0}
					<optgroup label="Active hives">
						{#each data.activeHives as hive (hive.id)}
							<option value={String(hive.id)} selected={form?.hiveIdRaw === String(hive.id)}>
								{hive.name}{hive.number != null ? ` (#${hive.number})` : ''}
							</option>
						{/each}
					</optgroup>
				{/if}
				{#if data.archivedHives.length > 0}
					<optgroup label="Archived hives">
						{#each data.archivedHives as hive (hive.id)}
							<option value={String(hive.id)} selected={form?.hiveIdRaw === String(hive.id)}>
								{hive.name} (archived)
							</option>
						{/each}
					</optgroup>
				{/if}
			</select>
		</div>

		<!-- Notes (optional) -->
		<div class="field">
			<label class="field-label" for="notes">
				Notes <span class="field-hint">(optional)</span>
			</label>
			<textarea
				class="field-input field-input--textarea"
				id="notes"
				name="notes"
				placeholder="e.g. Hive was very defensive, disturbed nest..."
				rows="3"
				disabled={isSubmitting}>{form?.notes ?? ''}</textarea
			>
		</div>

		<!-- Client ID for offline dedup -->
		<input type="hidden" name="clientId" value={crypto.randomUUID()} />

		<div class="form-actions">
			<a href="/stings" class="btn btn--ghost">Cancel</a>
			<button class="btn btn--primary" type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Saving…' : 'Log Sting'}
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

	.field-error {
		margin: 0.375rem 0 0;
		font-size: 0.8rem;
		color: #dc2626;
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

	.field-input--select {
		appearance: auto;
	}

	.field-input--textarea {
		height: auto;
		padding: 0.75rem 0.875rem;
		resize: vertical;
		field-sizing: content;
		min-height: 80px;
		max-height: 200px;
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
