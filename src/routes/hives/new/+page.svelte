<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Bienenstock hinzufügen — beehiveJournal</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/hives" class="back-link">← Bienenstöcke</a>
		<h1>Bienenstock hinzufügen</h1>
	</div>

	{#if data.atLimit}
		<div class="alert alert--warning">
			Sie haben die maximale Anzahl von 10 aktiven Bienenstöcken erreicht. Archivieren Sie einen vorhandenen Bienenstock, bevor Sie einen neuen hinzufügen.
		</div>
	{:else}
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
				<div class="field-error field-error--top" role="alert">{form.error}</div>
			{/if}

			<div class="field">
				<label class="field-label" for="name">
					Name des Bienenstocks <span class="required" aria-hidden="true">*</span>
				</label>
				<input
					class="field-input"
					type="text"
					id="name"
					name="name"
					value={form?.name ?? ''}
					placeholder="z.B. Wacholder"
					required
					disabled={isSubmitting}
					autocomplete="off"
				/>
			</div>

			<div class="field">
				<label class="field-label" for="number">
					Nummer <span class="field-hint">(optional)</span>
				</label>
				<input
					class="field-input field-input--short"
					type="number"
					id="number"
					name="number"
					value={form?.numberRaw ?? ''}
					placeholder="z.B. 3"
					min="1"
					step="1"
					disabled={isSubmitting}
				/>
			</div>

			<div class="field">
				<label class="field-label" for="description">
					Beschreibung <span class="field-hint">(optional)</span>
				</label>
				<textarea
					class="field-input field-input--textarea"
					id="description"
					name="description"
					placeholder="Notizen zu diesem Bienenstock..."
					disabled={isSubmitting}
					rows="3">{form?.description ?? ''}</textarea
				>
			</div>

			<div class="form-actions">
				<a href="/hives" class="btn btn--ghost">Abbrechen</a>
				<button class="btn btn--primary" type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Speichern…' : 'Bienenstock hinzufügen'}
				</button>
			</div>
		</form>
	{/if}
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

	.alert {
		padding: 0.875rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.alert--warning {
		background-color: #fffbeb;
		color: #92400e;
		border: 1px solid #fde68a;
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
		background-color: var(--color-input-bg, #ffffff);
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

	.field-input--short {
		max-width: 120px;
	}

	.field-input--textarea {
		height: auto;
		padding: 0.75rem 0.875rem;
		resize: vertical;
	}

	.field-error--top {
		background-color: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
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
		background-color: var(--color-accent, #f59e0b);
		color: #ffffff;
	}

	.btn--primary:hover:not(:disabled) {
		background-color: var(--color-accent-hover, #d97706);
	}

	.btn--primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn--ghost {
		background-color: transparent;
		color: var(--color-text-muted, #6b7280);
		border: 1px solid var(--color-border, #d1d5db);
	}

	.btn--ghost:hover {
		background-color: var(--color-hover, #f3f4f6);
	}
</style>
