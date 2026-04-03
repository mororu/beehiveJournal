<script lang="ts">
	import HiveCard from '$lib/components/HiveCard.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let showArchived = $state(false);
</script>

<svelte:head>
	<title>Meine Bienenstöcke — beehiveJournal</title>
</svelte:head>

<div class="hives-page">
	<div class="page-header">
		<h1>Meine Bienenstöcke</h1>
		<a href="/hives/new" class="btn btn--primary">+ Bienenstock hinzufügen</a>
	</div>

	{#if data.activeHives.length === 0}
		<div class="empty-state">
			<p>Noch keine Bienenstöcke — <a href="/hives/new">ersten Bienenstock hinzufügen</a>.</p>
		</div>
	{:else}
		<ul class="hive-list">
			{#each data.activeHives as hive (hive.id)}
				<li>
					<HiveCard {hive} />
				</li>
			{/each}
		</ul>
	{/if}

	{#if data.archivedHives.length > 0}
		<div class="archived-section">
			<button
				class="archived-toggle"
				onclick={() => (showArchived = !showArchived)}
				aria-expanded={showArchived}
			>
				{showArchived ? '▲' : '▼'}
				Archivierte Bienenstöcke ({data.archivedHives.length})
			</button>

			{#if showArchived}
				<ul class="hive-list hive-list--archived">
					{#each data.archivedHives as hive (hive.id)}
						<li>
							<a href="/hives/{hive.id}/edit" class="archived-card">
								<span class="archived-card__name">{hive.name}</span>
								{#if hive.number != null}
									<span class="archived-card__number">#{hive.number}</span>
								{/if}
								<span class="archived-card__badge">Archiviert</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<style>
	.hives-page {
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

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		padding: 0 1rem;
		font-size: 0.9rem;
		font-weight: 600;
		border-radius: 8px;
		text-decoration: none;
		cursor: pointer;
		border: none;
		transition: background-color 0.15s ease;
	}

	.btn--primary {
		background-color: var(--color-accent, #f59e0b);
		color: #ffffff;
	}

	.btn--primary:hover {
		background-color: var(--color-accent-hover, #d97706);
	}

	.empty-state {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--color-text-muted, #6b7280);
		font-size: 0.95rem;
	}

	.empty-state a {
		color: var(--color-accent, #f59e0b);
		font-weight: 600;
	}

	.hive-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.archived-section {
		margin-top: 2rem;
		border-top: 1px solid var(--color-border, #e5e7eb);
		padding-top: 1.25rem;
	}

	.archived-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: none;
		border: none;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		cursor: pointer;
		padding: 0;
		margin-bottom: 0.75rem;
	}

	.archived-toggle:hover {
		color: var(--color-text, #1a1a1a);
	}

	.hive-list--archived {
		opacity: 0.75;
	}

	.archived-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: var(--color-surface, #ffffff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 8px;
		text-decoration: none;
		color: inherit;
	}

	.archived-card__name {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		flex: 1;
	}

	.archived-card__number {
		font-size: 0.8rem;
		color: var(--color-text-muted, #6b7280);
	}

	.archived-card__badge {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted, #6b7280);
		background-color: var(--color-bg, #f3f4f6);
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
	}
</style>
