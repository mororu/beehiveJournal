<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatDate } from '$lib/client/utils/date.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let deleteDialogOpen = $state(false);
	let saleToDelete = $state<number | null>(null);
	let isDeleting = $state(false);

	function requestDelete(id: number) {
		saleToDelete = id;
		deleteDialogOpen = true;
	}

	function cancelDelete() {
		saleToDelete = null;
		deleteDialogOpen = false;
	}
</script>

<svelte:head>
	<title>Verkäufe — beehiveJournal</title>
</svelte:head>

<dialog open={deleteDialogOpen || undefined} class="dialog" aria-labelledby="delete-sale-title">
	<h2 id="delete-sale-title" class="dialog__title">Verkauf löschen?</h2>
	<p class="dialog__body">Dies kann nicht rückgängig gemacht werden.</p>
	<div class="dialog__actions">
		<button class="btn btn--ghost" type="button" onclick={cancelDelete}>Abbrechen</button>
		{#if saleToDelete !== null}
			<form
				method="POST"
				action="?/delete"
				use:enhance={() => {
					isDeleting = true;
					return async ({ update }) => {
						await update();
						await invalidateAll();
						isDeleting = false;
						deleteDialogOpen = false;
					};
				}}
			>
				<input type="hidden" name="sellId" value={saleToDelete} />
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
		<h1>Verkäufe</h1>
		<a href="/sells/new" class="btn btn--primary">+ Neuer Verkauf</a>
	</div>

	{#if data.sales.length === 0}
		<div class="empty-state">
			<p>Noch keine Verkäufe erfasst.</p>
		</div>
	{:else}
		<ul class="sale-list">
			{#each data.sales as sale (sale.id)}
				<li class="sale-card">
					<div class="sale-card__header">
						<span class="sale-card__date">{formatDate(sale.soldAt)}</span>
						<span class="sale-card__lot">{sale.lot}</span>
					</div>
					<div class="sale-card__main">
						<div class="sale-card__info">
							<span class="sale-card__amount">
								{sale.amount} × {sale.containerName}
							</span>
							<span class="sale-card__customer">{sale.customerName}</span>
							{#if sale.isGift}
								<span class="sale-card__gift">Geschenk</span>
							{:else if sale.priceChf !== null}
								<span class="sale-card__price">{sale.priceChf.toFixed(2)} CHF</span>
							{/if}
						</div>
						<div class="sale-card__actions">
							<a class="btn btn--ghost btn--sm" href="/sells/{sale.id}/edit">Bearbeiten</a>
							<button
								class="btn btn--ghost btn--sm btn--delete-trigger"
								type="button"
								onclick={() => requestDelete(sale.id)}
								aria-label="Verkauf vom {formatDate(sale.soldAt)} löschen"
							>
								Löschen
							</button>
						</div>
					</div>
					{#if sale.notes}
						<p class="sale-card__notes">{sale.notes}</p>
					{/if}
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

	.sale-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.sale-card {
		padding: 0.875rem 1rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
	}

	.sale-card__header {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		margin-bottom: 0.4rem;
	}

	.sale-card__date {
		font-size: 0.825rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
	}

	.sale-card__lot {
		font-size: 0.775rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		color: var(--color-text-muted, #6b7280);
	}

	.sale-card__main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.sale-card__info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.sale-card__amount {
		font-size: 0.9rem;
		color: var(--color-text, #1a1a1a);
	}

	.sale-card__customer {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
	}

	.sale-card__price {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
	}

	.sale-card__gift {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		padding: 0.15rem 0.55rem;
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--color-success-bg, #ecfdf5);
		color: var(--color-success-fg, #065f46);
		border-radius: 999px;
	}

	.sale-card__actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.sale-card__notes {
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
