<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types.js';

	let { form }: { form: ActionData } = $props();

	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Neue Behältergröße — beehiveJournal</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/honey/containers" class="back-link">← Behältergrößen</a>
		<h1>Behältergröße anlegen</h1>
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
			<label class="field-label" for="name">
				Name <span class="required" aria-hidden="true">*</span>
			</label>
			<input
				class="field-input"
				type="text"
				id="name"
				name="name"
				maxlength="60"
				placeholder="z.B. 500g Glas"
				value={form?.name ?? ''}
				required
				disabled={isSubmitting}
			/>
		</div>

		<div class="field">
			<label class="field-label" for="sizeG">
				Größe (g) <span class="required" aria-hidden="true">*</span>
			</label>
			<input
				class="field-input"
				type="number"
				id="sizeG"
				name="sizeG"
				min="1"
				max="5000"
				step="1"
				value={form?.sizeGRaw ?? ''}
				required
				disabled={isSubmitting}
			/>
		</div>

		<div class="form-actions">
			<a href="/honey/containers" class="btn btn--ghost">Abbrechen</a>
			<button class="btn btn--primary" type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Speichern…' : 'Anlegen'}
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
