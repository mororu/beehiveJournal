<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let deleteDialogOpen = $state(false);
	let containerToDelete = $state<number | null>(null);
	let isDeleting = $state(false);
	let errorBanner = $state<string | null>(form?.error ?? null);

	function requestDelete(id: number) {
		containerToDelete = id;
		deleteDialogOpen = true;
	}

	function cancelDelete() {
		containerToDelete = null;
		deleteDialogOpen = false;
	}
</script>

<svelte:head>
	<title>Behältergrößen — beehiveJournal</title>
</svelte:head>

<dialog
	open={deleteDialogOpen || undefined}
	class="dialog"
	aria-labelledby="delete-container-title"
>
	<h2 id="delete-container-title" class="dialog__title">Behältergröße löschen?</h2>
	<p class="dialog__body">Dies kann nicht rückgängig gemacht werden.</p>
	<div class="dialog__actions">
		<button class="btn btn--ghost" type="button" onclick={cancelDelete}>Abbrechen</button>
		{#if containerToDelete !== null}
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isDeleting = true;
					errorBanner = null;
					return async ({ result, update }) => {
						await update();
						isDeleting = false;
						deleteDialogOpen = false;
						if (result.type === 'failure') {
							const failData = result.data as { error?: unknown } | undefined;
							errorBanner = String(failData?.error ?? 'Löschen fehlgeschlagen');
							await tick();
							document.getElementById('delete-error-banner')?.focus();
						}
					};
				}}
			>
				<input type="hidden" name="containerId" value={containerToDelete} />
				<button class="btn btn--danger" type="submit" disabled={isDeleting}>
					{isDeleting ? 'Löschen…' : 'Löschen'}
				</button>
			</form>
		{/if}
	</div>
</dialog>

<div class="page">
	<a href="/honey" class="back-link">← Honig</a>

	<div class="page-header">
		<h1>Behältergrößen</h1>
		<a href="/honey/containers/new" class="btn btn--primary">+ Neue Größe</a>
	</div>

	{#if errorBanner}
		<div id="delete-error-banner" role="alert" tabindex="-1" class="form-error">
			{errorBanner}
		</div>
	{/if}

	{#if data.sizes.length === 0}
		<div class="empty-state">
			<p>Noch keine Behältergrößen.</p>
			<a href="/honey/containers/new" class="link">Erste Behältergröße anlegen</a>
		</div>
	{:else}
		<ul class="container-list">
			{#each data.sizes as size (size.id)}
				<li class="container-card">
					<div class="container-card__main">
						<div class="container-card__info">
							<span class="container-card__name">{size.name}</span>
							<span class="container-card__size">{size.sizeG} g</span>
						</div>
						<div class="container-card__actions">
							<a class="btn btn--ghost btn--sm" href="/honey/containers/{size.id}/edit">
								Bearbeiten
							</a>
							<button
								class="btn btn--ghost btn--sm btn--delete-trigger"
								type="button"
								onclick={() => requestDelete(size.id)}
								aria-label="Behältergröße {size.name} löschen"
							>
								Löschen
							</button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
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

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
		gap: 0.75rem;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	h1 {
		font-size: 1.5rem;
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

	.form-error:focus {
		outline: 2px solid #dc2626;
		outline-offset: 2px;
	}

	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
		border: 1.5px dashed var(--color-border, #e5e7eb);
		border-radius: 10px;
		color: var(--color-text-muted, #6b7280);
		font-size: 0.9rem;
	}

	.empty-state p {
		margin: 0 0 0.5rem;
	}

	.link {
		color: var(--color-accent, #f59e0b);
		text-decoration: none;
		font-weight: 500;
	}

	.link:hover {
		color: var(--color-accent-hover, #d97706);
		text-decoration: underline;
	}

	.container-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.container-card {
		padding: 0.875rem 1rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
	}

	.container-card__main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.container-card__info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.container-card__name {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
	}

	.container-card__size {
		font-size: 0.85rem;
		color: var(--color-text-muted, #6b7280);
	}

	.container-card__actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
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
		white-space: nowrap;
		min-height: 44px;
	}

	.btn--primary {
		background: var(--color-accent, #f59e0b);
		color: #ffffff;
	}
	.btn--primary:hover {
		background: var(--color-accent-hover, #d97706);
	}

	.btn--ghost {
		background: transparent;
		color: var(--color-text-muted, #6b7280);
		border: 1px solid var(--color-border, #d1d5db);
	}
	.btn--ghost:hover {
		background: var(--color-hover, #f3f4f6);
	}

	.btn--sm {
		height: 36px;
		font-size: 0.825rem;
		padding: 0 0.75rem;
		min-height: 36px;
	}

	.btn--delete-trigger {
		color: #dc2626;
		border-color: #fecaca;
	}
	.btn--delete-trigger:hover {
		background: #fef2f2;
	}

	.btn--danger {
		background: #dc2626;
		color: #ffffff;
		border: none;
	}
	.btn--danger:hover:not(:disabled) {
		background: #b91c1c;
	}
	.btn--danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
