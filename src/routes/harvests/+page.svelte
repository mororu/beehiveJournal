<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/client/utils/date.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let deleteDialogOpen = $state(false);
	let harvestToDelete = $state<number | null>(null);
	let isDeleting = $state(false);

	function requestDelete(id: number) {
		harvestToDelete = id;
		deleteDialogOpen = true;
	}

	function cancelDelete() {
		harvestToDelete = null;
		deleteDialogOpen = false;
	}
</script>

<svelte:head>
	<title>Ernteverlauf — beehiveJournal</title>
</svelte:head>

<!-- Delete confirmation dialog -->
<dialog open={deleteDialogOpen || undefined} class="dialog" aria-labelledby="delete-harvest-title">
	<h2 id="delete-harvest-title" class="dialog__title">Diesen Ernteeintrag löschen?</h2>
	<p class="dialog__body">Dies kann nicht rückgängig gemacht werden.</p>
	<div class="dialog__actions">
		<button class="btn btn--ghost" type="button" onclick={cancelDelete}>Abbrechen</button>
		{#if harvestToDelete !== null}
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
				<input type="hidden" name="harvestId" value={harvestToDelete} />
				<button class="btn btn--danger" type="submit" disabled={isDeleting}>
					{isDeleting ? 'Löschen…' : 'Löschen'}
				</button>
			</form>
		{/if}
	</div>
</dialog>

<div class="page">
	<!-- Header -->
	<div class="page-header">
		<h1>Ernteverlauf</h1>
		<a href="/harvests/new" class="btn btn--primary">+ Neue Ernte erfassen</a>
	</div>

	<!-- List -->
	{#if data.harvests.length === 0}
		<div class="empty-state">
			<p>Noch keine Ernten erfasst.</p>
		</div>
	{:else}
		<ul class="harvest-list">
			{#each data.harvests as harvest (harvest.id)}
				<li class="harvest-card">
					<div class="harvest-card__main">
						<div class="harvest-card__info">
							<span class="harvest-card__date">{formatDate(harvest.harvestedAt)}</span>
							<span class="harvest-card__lot">{harvest.lot}</span>
							<span class="harvest-card__amount">{harvest.amountKg.toFixed(1)} kg</span>
						</div>
						<button
							class="btn btn--ghost btn--sm btn--delete-trigger"
							type="button"
							onclick={() => requestDelete(harvest.id)}
							aria-label="Ernte vom {formatDate(harvest.harvestedAt)} löschen"
						>
							Löschen
						</button>
					</div>
					{#if harvest.notes}
						<p class="harvest-card__notes">{harvest.notes}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	/* ── Dialog ── */
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

	/* ── Page ── */
	.page {
		max-width: 600px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
	}

	/* ── Empty state ── */
	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
		border: 1.5px dashed var(--color-border, #e5e7eb);
		border-radius: 10px;
		color: var(--color-text-muted, #6b7280);
		font-size: 0.9rem;
	}

	.empty-state p {
		margin: 0;
	}

	/* ── Harvest list ── */
	.harvest-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.harvest-card {
		padding: 0.875rem 1rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
	}

	.harvest-card__main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.harvest-card__info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.harvest-card__date {
		font-size: 0.825rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
	}

	.harvest-card__lot {
		font-size: 0.775rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		color: var(--color-text-muted, #6b7280);
	}

	.harvest-card__amount {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
	}

	.harvest-card__notes {
		font-size: 0.825rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0.5rem 0 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.5;
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
		flex-shrink: 0;
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
