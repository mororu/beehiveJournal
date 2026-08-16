<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSubmitting = $state(false);
	// Reset the form fields after a successful change
	let formEl = $state<HTMLFormElement | undefined>(undefined);
</script>

<svelte:head>
	<title>Einstellungen</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/hives" class="back-link">← Bienenstöcke</a>
		<h1>Einstellungen</h1>
	</div>

	<div class="account-card">
		<span class="account-card__label">Angemeldet als</span>
		<span class="account-card__value">{data.username}</span>
	</div>

	<h2 class="section-title">Passwort ändern</h2>

	<form
		bind:this={formEl}
		method="POST"
		action="?/changePassword"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update, result }) => {
				await update({ reset: false });
				isSubmitting = false;
				if (result.type === 'success') {
					formEl?.reset();
				}
			};
		}}
	>
		{#if form?.error}
			<div class="form-error" role="alert">{form.error}</div>
		{/if}

		{#if form?.success}
			<div class="form-success" role="status">Passwort wurde erfolgreich geändert.</div>
		{/if}

		<div class="field">
			<label class="field-label" for="currentPassword">Aktuelles Passwort</label>
			<input
				class="field-input"
				type="password"
				id="currentPassword"
				name="currentPassword"
				autocomplete="current-password"
				required
				disabled={isSubmitting}
			/>
		</div>

		<div class="field">
			<label class="field-label" for="newPassword">
				Neues Passwort <span class="field-hint">(mind. 8 Zeichen)</span>
			</label>
			<input
				class="field-input"
				type="password"
				id="newPassword"
				name="newPassword"
				autocomplete="new-password"
				minlength="8"
				required
				disabled={isSubmitting}
			/>
		</div>

		<div class="field">
			<label class="field-label" for="confirmPassword">Neues Passwort bestätigen</label>
			<input
				class="field-input"
				type="password"
				id="confirmPassword"
				name="confirmPassword"
				autocomplete="new-password"
				minlength="8"
				required
				disabled={isSubmitting}
			/>
		</div>

		<div class="form-actions">
			<button class="btn btn--primary" type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Speichern…' : 'Passwort ändern'}
			</button>
		</div>
	</form>

	<p class="hint-text">
		Passwort vergessen? Es gibt keine Selbstbedienungs-Zurücksetzung, da keine E-Mail-Adresse
		gespeichert wird. Das Passwort kann nur direkt auf dem Server zurückgesetzt werden:
		<code>npm run reset-password -- &lt;benutzername&gt; &lt;neues-passwort&gt;</code>
	</p>
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

	.account-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		background: var(--color-surface, #ffffff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
		padding: 0.875rem 1rem;
		margin-bottom: 2rem;
	}

	.account-card__label {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
	}

	.account-card__value {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
	}

	.section-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 1rem;
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

	.form-success {
		background: #ecfdf5;
		color: #065f46;
		border: 1px solid #a7f3d0;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		font-weight: 500;
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

	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
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

	.hint-text {
		font-size: 0.8rem;
		line-height: 1.6;
		color: var(--color-text-muted, #6b7280);
		background: #f9fafb;
		border: 1px dashed var(--color-border, #d1d5db);
		border-radius: 8px;
		padding: 0.75rem 0.875rem;
		margin-top: 2rem;
		margin-bottom: 2rem;
	}

	.hint-text code {
		display: inline-block;
		font-size: 0.75rem;
		background: var(--color-surface, #ffffff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 4px;
		padding: 0.15rem 0.4rem;
		margin-top: 0.35rem;
		word-break: break-all;
	}
</style>
