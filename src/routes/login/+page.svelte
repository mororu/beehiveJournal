<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types.js';

	// Svelte 5 runes: receive action data from the server action
	let { form }: { form: ActionData } = $props();

	// Track submission state to disable the button while the request is in flight
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Log in — beehiveJournal</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="login-header">
			<h1 class="login-title">beehiveJournal</h1>
			<p class="login-subtitle">Sign in to your journal</p>
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
				<div class="error-message" role="alert" aria-live="assertive">
					{form.error}
				</div>
			{/if}

			<div class="field">
				<label class="field-label" for="username">Username</label>
				<input
					class="field-input"
					type="text"
					id="username"
					name="username"
					autocomplete="username"
					autocapitalize="off"
					autocorrect="off"
					spellcheck="false"
					required
					disabled={isSubmitting}
				/>
			</div>

			<div class="field">
				<label class="field-label" for="password">Password</label>
				<input
					class="field-input"
					type="password"
					id="password"
					name="password"
					autocomplete="current-password"
					required
					disabled={isSubmitting}
				/>
			</div>

			<button class="submit-button" type="submit" disabled={isSubmitting}>
				{#if isSubmitting}
					Signing in…
				{:else}
					Log in
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
	/* ── Layout ── */
	.login-container {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background-color: var(--color-bg, #fafaf8);
	}

	.login-card {
		width: 100%;
		max-width: 375px;
		background-color: var(--color-surface, #ffffff);
		border-radius: 12px;
		padding: 2rem 1.5rem;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.08),
			0 4px 16px rgba(0, 0, 0, 0.06);
	}

	/* ── Header ── */
	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 0.25rem;
		letter-spacing: -0.02em;
	}

	.login-subtitle {
		font-size: 0.9rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0;
	}

	/* ── Error message ── */
	.error-message {
		background-color: var(--color-error-bg, #fef2f2);
		color: var(--color-error-text, #dc2626);
		border: 1px solid var(--color-error-border, #fecaca);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	/* ── Form fields ── */
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

	.field-input {
		width: 100%;
		height: 48px; /* ≥44px touch target */
		padding: 0 0.875rem;
		font-size: 1rem; /* prevents iOS auto-zoom on focus */
		color: var(--color-text, #1a1a1a);
		background-color: var(--color-input-bg, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		box-sizing: border-box;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 3px var(--color-accent-ring, rgba(245, 158, 11, 0.2));
	}

	.field-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* ── Submit button ── */
	.submit-button {
		width: 100%;
		height: 48px; /* ≥44px touch target */
		margin-top: 0.5rem;
		padding: 0 1rem;
		font-size: 1rem;
		font-weight: 600;
		color: #ffffff;
		background-color: var(--color-accent, #f59e0b);
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			opacity 0.15s ease;
	}

	.submit-button:hover:not(:disabled) {
		background-color: var(--color-accent-hover, #d97706);
	}

	.submit-button:active:not(:disabled) {
		background-color: var(--color-accent-active, #b45309);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.submit-button:focus-visible {
		outline: 3px solid var(--color-accent, #f59e0b);
		outline-offset: 2px;
	}
</style>
