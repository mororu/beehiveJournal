<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { formatDate } from '$lib/client/utils/date.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// Delete dialog state
	let deleteDialogOpen = $state(false);
	let pendingDeleteId = $state<number | null>(null);
	let isDeleting = $state(false);

	function requestDelete(id: number) {
		pendingDeleteId = id;
		deleteDialogOpen = true;
	}

	function cancelDelete() {
		pendingDeleteId = null;
		deleteDialogOpen = false;
	}

	// Hive filter — drive via URL so page reload preserves filter
	function applyFilter(hiveId: string) {
		const url = hiveId ? `/stings?hiveId=${hiveId}` : '/stings';
		goto(url, { replaceState: true });
	}
</script>

<svelte:head>
	<title>Sting Log — beehiveJournal</title>
</svelte:head>

<!-- Delete confirmation dialog -->
<dialog open={deleteDialogOpen || undefined} class="dialog" aria-labelledby="delete-sting-title">
	<h2 id="delete-sting-title" class="dialog__title">Delete this sting entry?</h2>
	<p class="dialog__body">This cannot be undone.</p>
	<div class="dialog__actions">
		<button class="btn btn--ghost" type="button" onclick={cancelDelete}>Cancel</button>
		{#if pendingDeleteId !== null}
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
				<input type="hidden" name="stingId" value={pendingDeleteId} />
				<button class="btn btn--danger" type="submit" disabled={isDeleting}>
					{isDeleting ? 'Deleting…' : 'Delete'}
				</button>
			</form>
		{/if}
	</div>
</dialog>

<div class="page">
	<!-- Header -->
	<div class="page-header">
		<h1>Sting Log</h1>
		<a href="/stings/new" class="btn btn--primary">+ Log Sting</a>
	</div>

	<!-- Filter by hive -->
	{#if data.hivesWithStings.length > 0}
		<div class="filter-bar">
			<label class="filter-label" for="hiveFilter">Filter by hive</label>
			<select
				class="filter-select"
				id="hiveFilter"
				value={data.activeHiveFilter ? String(data.activeHiveFilter) : ''}
				onchange={(e) => applyFilter((e.target as HTMLSelectElement).value)}
			>
				<option value="">All hives</option>
				{#each data.hivesWithStings as hive (hive.id)}
					<option value={String(hive.id)}>{hive.name}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- List -->
	{#if data.stings.length === 0}
		<div class="empty-state">
			{#if data.activeHiveFilter}
				<p>No sting incidents for this hive.</p>
			{:else}
				<p>No sting incidents logged yet.</p>
			{/if}
		</div>
	{:else}
		<ul class="sting-list">
			{#each data.stings as sting (sting.id)}
				<li class="sting-card">
					<div class="sting-card__main">
						<div class="sting-card__info">
							<span class="sting-card__date">{formatDate(sting.stungAt)}</span>
							<span class="sting-card__location">{sting.bodyLocation}</span>
							{#if sting.hiveName}
								<span class="sting-card__hive">{sting.hiveName}</span>
							{:else}
								<span class="sting-card__hive sting-card__hive--unknown">Unknown hive</span>
							{/if}
						</div>
						<button
							class="btn btn--ghost btn--sm btn--delete-trigger"
							type="button"
							onclick={() => requestDelete(sting.id)}
							aria-label="Delete sting on {formatDate(sting.stungAt)}"
						>
							Delete
						</button>
					</div>
					{#if sting.notes}
						<p class="sting-card__notes">{sting.notes}</p>
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

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
	}

	/* ── Filter ── */
	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.filter-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		white-space: nowrap;
	}

	.filter-select {
		height: 40px;
		padding: 0 0.75rem;
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		font-family: inherit;
		flex: 1;
		max-width: 240px;
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
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

	/* ── Sting list ── */
	.sting-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.sting-card {
		padding: 0.875rem 1rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
	}

	.sting-card__main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.sting-card__info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.sting-card__date {
		font-size: 0.825rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
	}

	.sting-card__location {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
	}

	.sting-card__hive {
		font-size: 0.775rem;
		color: var(--color-text-muted, #6b7280);
	}

	.sting-card__hive--unknown {
		font-style: italic;
	}

	.sting-card__notes {
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
