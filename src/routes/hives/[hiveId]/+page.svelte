<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import HealthBadge from '$lib/components/HealthBadge.svelte';
	import { formatDate } from '$lib/client/utils/date.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	// ── Success toast ──────────────────────────────────────────────────────────
	let toastVisible = $state(false);
	$effect(() => {
		toastVisible = data.justSaved;
	});
	$effect(() => {
		if (toastVisible) {
			const t = setTimeout(() => (toastVisible = false), 3000);
			return () => clearTimeout(t);
		}
	});

	// ── Tab state ─────────────────────────────────────────────────────────────
	type Tab = 'list' | 'timeline';
	let activeTab = $state<Tab>('list');

	// ── Date range filter (Story 5.4) ─────────────────────────────────────────
	let filterFrom = $state('');
	let filterTo = $state('');

	// Convert a date input string "YYYY-MM-DD" to the start/end of that day (epoch seconds)
	function dateToStartEpoch(s: string): number {
		return Math.floor(new Date(s + 'T00:00:00').getTime() / 1000);
	}
	function dateToEndEpoch(s: string): number {
		return Math.floor(new Date(s + 'T23:59:59').getTime() / 1000);
	}

	// Filtered inspection list — recomputed reactively when filter changes
	const filteredInspections = $derived(
		data.inspections.filter((i) => {
			if (filterFrom && i.inspectedAt < dateToStartEpoch(filterFrom)) return false;
			if (filterTo && i.inspectedAt > dateToEndEpoch(filterTo)) return false;
			return true;
		})
	);

	const isFiltered = $derived(filterFrom !== '' || filterTo !== '');

	function clearFilter() {
		filterFrom = '';
		filterTo = '';
	}

	// ── Queen label map ────────────────────────────────────────────────────────
	const queenLabels: Record<string, string> = {
		seen: 'Gesehen',
		not_seen: 'Nicht gesehen',
		cells_present: 'Zellen',
	};

	// ── Todos ──────────────────────────────────────────────────────────────────
	let showCompletedTodos = $state(false);
	const visibleTodos = $derived(
		showCompletedTodos ? data.todos : data.todos.filter((t) => !t.isCompleted)
	);
	const openTodoCount = $derived(data.todos.filter((t) => !t.isCompleted).length);
</script>

<svelte:head>
	<title>{data.hive.name} — beehiveJournal</title>
</svelte:head>

<!-- Success toast -->
{#if toastVisible}
	<div class="toast" role="status" aria-live="polite">Kontrolle gespeichert</div>
{/if}

<div class="hive-detail">
	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="hive-detail__header">
		<a href="/hives" class="back-link">← Bienenstöcke</a>
		<div class="hive-detail__title-row">
			<h1>
				{data.hive.name}
				{#if data.hive.number != null}
					<span class="hive-number">#{data.hive.number}</span>
				{/if}
			</h1>
			<a href="/hives/{data.hive.id}/edit" class="btn btn--ghost btn--sm">Bearbeiten</a>
		</div>
		{#if data.hive.description}
			<p class="hive-description">{data.hive.description}</p>
		{/if}
	</div>

	<!-- ── Primary CTA ────────────────────────────────────────────────────── -->
	<div class="hive-detail__cta">
		<a href="/hives/{data.hive.id}/inspect" class="btn btn--primary">+ Neue Kontrolle</a>
	</div>

	<!-- ── Date range filter (Story 5.4) ──────────────────────────────────── -->
	{#if data.inspections.length > 0}
		<div class="filter-bar">
			<div class="filter-bar__inputs">
				<label class="filter-label" for="filterFrom">Von</label>
				<input
					class="filter-input"
					type="date"
					id="filterFrom"
					bind:value={filterFrom}
					max={filterTo || undefined}
				/>
				<label class="filter-label" for="filterTo">Bis</label>
				<input
					class="filter-input"
					type="date"
					id="filterTo"
					bind:value={filterTo}
					min={filterFrom || undefined}
				/>
			</div>
			{#if isFiltered}
				<button class="filter-clear" type="button" onclick={clearFilter}>Filter löschen</button>
			{/if}
		</div>
	{/if}

	<!-- ── Tab bar ────────────────────────────────────────────────────────── -->
	{#if data.inspections.length > 0}
		<div class="tab-bar" role="tablist">
			<button
				class="tab-btn"
				class:tab-btn--active={activeTab === 'list'}
				role="tab"
				aria-selected={activeTab === 'list'}
				onclick={() => (activeTab = 'list')}
			>
				Verlauf
				{#if isFiltered}
					<span class="tab-count">({filteredInspections.length})</span>
				{:else}
					<span class="tab-count">({data.inspections.length})</span>
				{/if}
			</button>
			<button
				class="tab-btn"
				class:tab-btn--active={activeTab === 'timeline'}
				role="tab"
				aria-selected={activeTab === 'timeline'}
				onclick={() => (activeTab = 'timeline')}
			>
				Zeitverlauf
			</button>
		</div>
	{/if}

	<!-- ── History tab ────────────────────────────────────────────────────── -->
	{#if activeTab === 'list'}
		{#if data.inspections.length === 0}
			<div class="empty-state">
				<p>
					Noch keine Kontrollen — tippen Sie auf <strong>Neue Kontrolle</strong> um zu beginnen.
				</p>
			</div>
		{:else if filteredInspections.length === 0}
			<div class="empty-state">
				<p>Keine Kontrollen in diesem Zeitraum.</p>
			</div>
		{:else}
			<ul class="inspection-list">
				{#each filteredInspections as insp (insp.id)}
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
	{/if}

	<!-- ── Timeline tab (Story 5.2) ───────────────────────────────────────── -->
	{#if activeTab === 'timeline'}
		{#if browser}
			{#await import('$lib/components/HealthChart.svelte') then { default: HealthChart }}
				<HealthChart
					inspections={filteredInspections}
					hiveId={data.hive.id}
					onPointClick={(id) => goto(`/hives/${data.hive.id}/inspections/${id}`)}
				/>
			{/await}
		{/if}
	{/if}

	<!-- ── Todos section ──────────────────────────────────────────────────── -->
	<section class="todos-section">
		<div class="todos-header">
			<h2 class="todos-title">
				Aufgaben
				{#if openTodoCount > 0}
					<span class="todos-count">{openTodoCount}</span>
				{/if}
			</h2>
			<label class="show-completed-label">
				<input type="checkbox" bind:checked={showCompletedTodos} class="show-completed-cb" />
				Erledigte anzeigen
			</label>
		</div>

		<form method="POST" action="?/createTodo" use:enhance class="todo-add-form">
			<input
				type="text"
				name="title"
				class="todo-input"
				placeholder="Neue Aufgabe hinzufügen…"
				maxlength="200"
				required
				aria-label="Aufgabentitel"
			/>
			<button type="submit" class="btn btn--ghost btn--sm">Hinzufügen</button>
		</form>

		{#if visibleTodos.length === 0}
			<p class="todos-empty">
				{showCompletedTodos ? 'Keine Aufgaben vorhanden.' : 'Keine offenen Aufgaben.'}
			</p>
		{:else}
			<ul class="todo-list">
				{#each visibleTodos as todo (todo.id)}
					<li class="todo-item" class:todo-item--done={todo.isCompleted}>
						<form method="POST" action="?/toggleTodo" use:enhance style="display:contents">
							<input type="hidden" name="todoId" value={todo.id} />
							<button
								type="submit"
								class="todo-checkbox"
								aria-label={todo.isCompleted ? 'Als offen markieren' : 'Als erledigt markieren'}
								aria-pressed={todo.isCompleted}
							>
								{#if todo.isCompleted}
									<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
										<path
											d="M2 7L5.5 10.5L12 3.5"
											stroke="currentColor"
											stroke-width="2.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								{/if}
							</button>
						</form>
						<span class="todo-title">{todo.title}</span>
						<form method="POST" action="?/deleteTodo" use:enhance style="display:contents">
							<input type="hidden" name="todoId" value={todo.id} />
							<button
								type="submit"
								class="todo-delete-btn"
								aria-label="Aufgabe löschen"
								onclick={(e) => {
									if (!confirm('Aufgabe löschen?')) e.preventDefault();
								}}
							>
								×
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
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
		margin-bottom: 1.25rem;
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* ── Date range filter ── */
	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding: 0.75rem 1rem;
		background: var(--color-surface, #ffffff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.filter-bar__inputs {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		flex: 1;
	}

	.filter-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		white-space: nowrap;
	}

	.filter-input {
		height: 36px;
		padding: 0 0.625rem;
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-input-bg, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 6px;
		font-family: inherit;
		flex: 1;
		min-width: 130px;
		max-width: 170px;
	}

	.filter-input:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
	}

	.filter-clear {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		background: none;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: 6px;
		padding: 0.3rem 0.75rem;
		height: 36px;
		cursor: pointer;
		white-space: nowrap;
		font-family: inherit;
		transition: background-color 0.15s ease;
	}

	.filter-clear:hover {
		background: var(--color-hover, #f3f4f6);
	}

	/* ── Tab bar ── */
	.tab-bar {
		display: flex;
		gap: 0;
		border-bottom: 2px solid var(--color-border, #e5e7eb);
		margin-bottom: 1.25rem;
	}

	.tab-btn {
		padding: 0.625rem 1.25rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		cursor: pointer;
		font-family: inherit;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.tab-btn:hover {
		color: var(--color-text, #1a1a1a);
	}

	.tab-btn--active {
		color: var(--color-text, #1a1a1a);
		font-weight: 600;
		border-bottom-color: var(--color-accent, #f59e0b);
	}

	.tab-count {
		font-size: 0.75rem;
		color: var(--color-text-muted, #6b7280);
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

	.weather-chip {
		font-size: 0.75rem;
		color: var(--color-text-muted, #6b7280);
		background: #f3f4f6;
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
		white-space: nowrap;
	}

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

	/* ── Todos section ── */
	.todos-section {
		margin-top: 2.5rem;
		border-top: 1px solid var(--color-border, #e5e7eb);
		padding-top: 1.5rem;
	}

	.todos-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.875rem;
		flex-wrap: wrap;
	}

	.todos-title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.todos-count {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-text-muted, #6b7280);
		background: var(--color-bg, #f3f4f6);
		padding: 0.15rem 0.5rem;
		border-radius: 99px;
	}

	.show-completed-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-muted, #6b7280);
		cursor: pointer;
		user-select: none;
	}

	.show-completed-cb {
		width: 14px;
		height: 14px;
		accent-color: var(--color-accent, #f59e0b);
		cursor: pointer;
	}

	.todo-add-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.875rem;
	}

	.todo-input {
		flex: 1;
		height: 38px;
		padding: 0 0.75rem;
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-input-bg, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		font-family: inherit;
	}

	.todo-input:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
	}

	.todos-empty {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0;
		padding: 0.75rem 0;
	}

	.todo-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.todo-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.75rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 8px;
		transition: border-color 0.15s ease;
	}

	.todo-item:hover {
		border-color: var(--color-accent, #f59e0b);
	}

	.todo-item--done {
		opacity: 0.5;
	}

	.todo-checkbox {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		border: 2px solid var(--color-border, #d1d5db);
		border-radius: 5px;
		background: var(--color-surface, #ffffff);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease;
		color: #ffffff;
	}

	.todo-checkbox:hover {
		border-color: var(--color-accent, #f59e0b);
	}

	.todo-item--done .todo-checkbox {
		background: var(--color-accent, #f59e0b);
		border-color: var(--color-accent, #f59e0b);
	}

	.todo-title {
		flex: 1;
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
		line-height: 1.4;
	}

	.todo-item--done .todo-title {
		text-decoration: line-through;
	}

	.todo-delete-btn {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border: none;
		background: none;
		color: var(--color-text-muted, #9ca3af);
		font-size: 1rem;
		cursor: pointer;
		border-radius: 5px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		opacity: 0;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.todo-item:hover .todo-delete-btn {
		opacity: 1;
	}

	.todo-delete-btn:hover {
		background: #fee2e2;
		color: #dc2626;
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
