<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/client/utils/date.js';
	import type { DiaryEntry } from '$lib/server/db/schema.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let deleteDialogOpen = $state(false);
	let entryToDelete = $state<number | null>(null);
	let isDeleting = $state(false);

	function requestDelete(id: number) {
		entryToDelete = id;
		deleteDialogOpen = true;
	}

	function cancelDelete() {
		entryToDelete = null;
		deleteDialogOpen = false;
	}

	// Group entries by calendar year (based on entryDate local time),
	// return [year, entries] pairs sorted year DESC. Entries within each year keep
	// their DB order (already entryDate DESC from the query).
	const entriesByYear = $derived.by(() => {
		const map = new Map<number, DiaryEntry[]>();
		for (const e of data.entries) {
			const y = new Date(e.entryDate * 1000).getFullYear();
			const bucket = map.get(y);
			if (bucket) bucket.push(e);
			else map.set(y, [e]);
		}
		return [...map.entries()].sort((a, b) => b[0] - a[0]);
	});

	function firstBodyLine(body: string | null): string {
		if (!body) return '';
		const trimmed = body.trim();
		if (!trimmed) return '';
		const nl = trimmed.indexOf('\n');
		return nl >= 0 ? trimmed.slice(0, nl) : trimmed;
	}
</script>

<svelte:head>
	<title>Tagebuch — beehiveJournal</title>
</svelte:head>

<dialog open={deleteDialogOpen || undefined} class="dialog" aria-labelledby="delete-entry-title">
	<h2 id="delete-entry-title" class="dialog__title">Diesen Eintrag löschen?</h2>
	<p class="dialog__body">Dies kann nicht rückgängig gemacht werden.</p>
	<div class="dialog__actions">
		<button class="btn btn--ghost" type="button" onclick={cancelDelete}>Abbrechen</button>
		{#if entryToDelete !== null}
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
				<input type="hidden" name="entryId" value={entryToDelete} />
				<button class="btn btn--danger" type="submit" disabled={isDeleting}>
					{isDeleting ? 'Löschen…' : 'Löschen'}
				</button>
			</form>
		{/if}
	</div>
</dialog>

<div class="page">
	<div class="page-header">
		<h1>Tagebuch</h1>
		<a href="/diary/new" class="btn btn--primary">+ Neuer Eintrag</a>
	</div>

	<form method="GET" class="search-form">
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Suchen…"
			class="search-input"
			aria-label="Tagebuch durchsuchen"
		/>
		<button type="submit" class="btn btn--ghost btn--sm">Suchen</button>
	</form>

	{#if data.entries.length === 0}
		<div class="empty-state">
			{#if data.q}
				<p>Keine Ergebnisse für „{data.q}".</p>
				<a href="/diary" class="empty-state__link">Filter löschen</a>
			{:else}
				<p>Noch keine Einträge im Tagebuch.</p>
			{/if}
		</div>
	{:else}
		{#each entriesByYear as [year, entries] (year)}
			<h2 class="year-header">{year}</h2>
			<ul class="entry-list">
				{#each entries as entry (entry.id)}
					<li class="entry-card">
						<div class="entry-card__main">
							<a href="/diary/{entry.id}" class="entry-card__link">
								<div class="entry-card__meta">
									<span class="entry-card__date">{formatDate(entry.entryDate)}</span>
									{#if !entry.weatherUnavailable && entry.weatherTemp !== null}
										<span class="weather-chip">
											{entry.weatherTemp}°C{#if entry.weatherDesc}
												· {entry.weatherDesc}{/if}
										</span>
									{/if}
								</div>
								<h3 class="entry-card__title">{entry.title}</h3>
								{#if firstBodyLine(entry.body)}
									<p class="entry-card__preview">{firstBodyLine(entry.body)}</p>
								{/if}
							</a>
							<button
								class="btn btn--ghost btn--sm btn--delete-trigger"
								type="button"
								onclick={() => requestDelete(entry.id)}
								aria-label={`Eintrag „${entry.title}" löschen`}
							>
								Löschen
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/each}
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

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 1rem;
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

	.search-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.search-input {
		flex: 1;
		height: 44px;
		padding: 0 0.875rem;
		font-size: 1rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		box-sizing: border-box;
		font-family: inherit;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
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

	.empty-state__link {
		font-size: 0.875rem;
		color: var(--color-accent, #f59e0b);
		text-decoration: underline;
	}

	.year-header {
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text-muted, #6b7280);
		margin: 1.25rem 0 0.5rem;
		letter-spacing: 0.05em;
	}

	.entry-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.entry-card {
		padding: 0.875rem 1rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
	}

	.entry-card__main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.entry-card__link {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		text-decoration: none;
		color: inherit;
		flex: 1;
		min-width: 0;
	}

	.entry-card__meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.entry-card__date {
		font-size: 0.775rem;
		font-weight: 600;
		color: var(--color-text-muted, #6b7280);
	}

	.weather-chip {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		background: #ecfdf5;
		color: #065f46;
		border: 1px solid #a7f3d0;
		border-radius: 999px;
	}

	.entry-card__title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text, #1a1a1a);
		margin: 0;
		line-height: 1.35;
	}

	.entry-card__preview {
		font-size: 0.825rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0.25rem 0 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.45;
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
		flex-shrink: 0;
	}
	.btn--delete-trigger:hover {
		background: #fef2f2;
	}

	.btn--danger {
		background: #dc2626;
		color: #ffffff;
	}
	.btn--danger:hover:not(:disabled) {
		background: #b91c1c;
	}
	.btn--danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
