<script lang="ts">
	import HealthBadge from '$lib/components/HealthBadge.svelte';
	import { formatDate } from '$lib/client/utils/date.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// ── Success toast (Story 4.5) ─────────────────────────────────────────────
	// Shown when redirected here with ?saved=1 after creating an inspection.
	// Auto-dismisses after 3 seconds.
	let toastVisible = $state(false);
	// Initialise from server data once on mount — $effect reads reactive data correctly
	$effect(() => {
		toastVisible = data.justSaved;
	});
	$effect(() => {
		if (toastVisible) {
			const t = setTimeout(() => (toastVisible = false), 3000);
			return () => clearTimeout(t);
		}
	});

	const queenLabels: Record<string, string> = {
		seen: 'Seen',
		not_seen: 'Not Seen',
		cells_present: 'Cells',
	};
</script>

<svelte:head>
	<title>{data.hive.name} — beehiveJournal</title>
</svelte:head>

<!-- Success toast -->
{#if toastVisible}
	<div class="toast" role="status" aria-live="polite">Inspection saved</div>
{/if}

<div class="hive-detail">
	<!-- Header -->
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

	<!-- Primary CTA -->
	<div class="hive-detail__cta">
		<a href="/hives/{data.hive.id}/inspect" class="btn btn--primary">+ New Inspection</a>
	</div>

	<!-- Inspection history list -->
	{#if data.inspections.length === 0}
		<div class="empty-state">
			<p>No inspections yet — tap <strong>New Inspection</strong> to start.</p>
		</div>
	{:else}
		<ul class="inspection-list">
			{#each data.inspections as insp (insp.id)}
				<li>
					<a href="/hives/{data.hive.id}/inspections/{insp.id}" class="inspection-card">
						<div class="inspection-card__top">
							<span class="inspection-card__date">{formatDate(insp.inspectedAt)}</span>
							<div class="inspection-card__badges">
								{#if !insp.weatherUnavailable && insp.weatherTemp != null}
									<span class="weather-chip">{insp.weatherTemp}°C</span>
									{#if insp.weatherDesc}
										<span class="weather-chip">{insp.weatherDesc}</span>
									{/if}
								{/if}
								<span class="queen-chip queen-chip--{insp.queenStatus}">
									{queenLabels[insp.queenStatus] ?? insp.queenStatus}
								</span>
								<HealthBadge score={insp.healthScore} />
							</div>
						</div>
						{#if insp.behaviourNotes}
							<p class="inspection-card__notes">{insp.behaviourNotes}</p>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	/* ── Toast ── */
	.toast {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		background: #16a34a;
		color: #ffffff;
		font-size: 0.9rem;
		font-weight: 600;
		padding: 0.625rem 1.25rem;
		border-radius: 99px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 200;
		animation: fadeInUp 0.2s ease;
		white-space: nowrap;
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	/* ── Page ── */
	.hive-detail {
		max-width: 600px;
		margin: 0 auto;
	}

	.hive-detail__header {
		margin-bottom: 1.25rem;
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
		margin: 0.375rem 0 0;
	}

	.hive-detail__cta {
		margin-bottom: 1.5rem;
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

	/* ── Inspection list ── */
	.inspection-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.inspection-card {
		display: block;
		padding: 0.875rem 1rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
		text-decoration: none;
		color: inherit;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.inspection-card:hover,
	.inspection-card:focus-visible {
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
		outline: none;
	}

	.inspection-card__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.inspection-card__date {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
		flex-shrink: 0;
	}

	.inspection-card__badges {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
		flex-shrink: 0;
	}

	/* Weather chips */
	.weather-chip {
		font-size: 0.75rem;
		color: var(--color-text-muted, #6b7280);
		background: #f3f4f6;
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
		white-space: nowrap;
	}

	/* Queen status chips */
	.queen-chip {
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
		white-space: nowrap;
	}

	.queen-chip--seen {
		background: #ecfdf5;
		color: #065f46;
	}
	.queen-chip--not_seen {
		background: #f3f4f6;
		color: #374151;
	}
	.queen-chip--cells_present {
		background: #fffbeb;
		color: #92400e;
	}

	/* Notes preview — 2-line clamp */
	.inspection-card__notes {
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
		font-size: 0.85rem;
		padding: 0 0.875rem;
	}
</style>
