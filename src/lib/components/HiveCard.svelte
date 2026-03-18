<script lang="ts">
	import HealthBadge from './HealthBadge.svelte';
	import { formatDate } from '$lib/client/utils/date.js';
	import type { HiveWithLastInspection } from '$lib/server/db/queries/hives.js';

	let { hive }: { hive: HiveWithLastInspection } = $props();
</script>

<a href="/hives/{hive.id}" class="hive-card">
	<div class="hive-card__header">
		<div class="hive-card__title">
			{#if hive.number != null}
				<span class="hive-card__number">#{hive.number}</span>
			{/if}
			<span class="hive-card__name">{hive.name}</span>
		</div>
		{#if hive.lastHealthScore != null}
			<HealthBadge score={hive.lastHealthScore} />
		{/if}
	</div>

	<p class="hive-card__meta">
		{#if hive.lastInspectedAt != null}
			Last inspected: {formatDate(hive.lastInspectedAt)}
		{:else}
			No inspections yet
		{/if}
	</p>

	{#if hive.description}
		<p class="hive-card__description">{hive.description}</p>
	{/if}
</a>

<style>
	.hive-card {
		display: block;
		padding: 1rem;
		background-color: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
		text-decoration: none;
		color: inherit;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.hive-card:hover,
	.hive-card:focus-visible {
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 3px var(--color-accent-ring, rgba(245, 158, 11, 0.15));
		outline: none;
	}

	.hive-card__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.375rem;
	}

	.hive-card__title {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		min-width: 0;
	}

	.hive-card__number {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted, #6b7280);
		flex-shrink: 0;
	}

	.hive-card__name {
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.hive-card__meta {
		font-size: 0.825rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0 0 0.25rem;
	}

	.hive-card__description {
		font-size: 0.825rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
