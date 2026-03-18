<script lang="ts">
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.hive.name} — beehiveJournal</title>
</svelte:head>

<div class="hive-detail">
	<div class="hive-detail__header">
		<a href="/hives" class="back-link">← Hives</a>
		<div class="hive-detail__title-row">
			<h1>
				{data.hive.name}
				{#if data.hive.number != null}
					<span class="hive-number">#{data.hive.number}</span>
				{/if}
			</h1>
			<a href="/hives/{data.hive.id}/edit" class="btn btn--ghost btn--sm">Edit</a>
		</div>
		{#if data.hive.description}
			<p class="hive-description">{data.hive.description}</p>
		{/if}
	</div>

	<div class="hive-detail__actions">
		<a href="/hives/{data.hive.id}/inspect" class="btn btn--primary">+ New Inspection</a>
	</div>

	<!-- Sprint 6 fills in inspection history list and health chart -->
	<div class="placeholder-section">
		<p class="placeholder-text">Inspection history will appear here in Sprint 6.</p>
	</div>
</div>

<style>
	.hive-detail {
		max-width: 600px;
		margin: 0 auto;
	}

	.hive-detail__header {
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

	.hive-detail__title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.hive-number {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
	}

	.hive-description {
		font-size: 0.9rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0.5rem 0 0;
	}

	.hive-detail__actions {
		margin-bottom: 1.5rem;
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
	}

	.btn--primary {
		background-color: var(--color-accent, #f59e0b);
		color: #ffffff;
	}

	.btn--primary:hover {
		background-color: var(--color-accent-hover, #d97706);
	}

	.btn--ghost {
		background-color: transparent;
		color: var(--color-text-muted, #6b7280);
		border: 1px solid var(--color-border, #d1d5db);
	}

	.btn--ghost:hover {
		background-color: var(--color-hover, #f3f4f6);
	}

	.btn--sm {
		height: 36px;
		font-size: 0.85rem;
		padding: 0 0.875rem;
	}

	.placeholder-section {
		padding: 2rem 1rem;
		text-align: center;
		border: 1.5px dashed var(--color-border, #e5e7eb);
		border-radius: 10px;
	}

	.placeholder-text {
		color: var(--color-text-muted, #6b7280);
		font-size: 0.9rem;
		margin: 0;
	}
</style>
