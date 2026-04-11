<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let showCompleted = $state(false);

	// Group todos by hive; general todos (hiveId=null) use key -1
	const GENERAL_KEY = -1;
	const grouped = $derived.by(() => {
		const visible = showCompleted ? data.todos : data.todos.filter((t) => !t.isCompleted);

		const map = new Map<
			number,
			{ hiveId: number | null; hiveName: string | null; hiveNumber: number | null; items: typeof visible }
		>();

		for (const todo of visible) {
			const key = todo.hiveId ?? GENERAL_KEY;
			if (!map.has(key)) {
				map.set(key, {
					hiveId: todo.hiveId,
					hiveName: todo.hiveName,
					hiveNumber: todo.hiveNumber,
					items: [],
				});
			}
			map.get(key)!.items.push(todo);
		}

		// Put general group first, then hive groups
		const general = map.get(GENERAL_KEY);
		const hiveGroups = [...map.entries()]
			.filter(([k]) => k !== GENERAL_KEY)
			.map(([, v]) => v);
		return general ? [general, ...hiveGroups] : hiveGroups;
	});

	const openCount = $derived(data.todos.filter((t) => !t.isCompleted).length);
</script>

<svelte:head>
	<title>Aufgaben — beehiveJournal</title>
</svelte:head>

<div class="todos-page">
	<div class="page-header">
		<h1>Aufgaben</h1>
		<span class="open-badge">{openCount} offen</span>
	</div>

	<!-- Add todo form -->
	<form method="POST" action="?/create" use:enhance class="add-form">
		<select name="hiveId" class="hive-select" aria-label="Bienenstock auswählen">
			<option value="">Allgemein</option>
			{#each data.hives as hive (hive.id)}
				<option value={hive.id}>
					{hive.name}{hive.number != null ? ` #${hive.number}` : ''}
				</option>
			{/each}
		</select>
		<input
			type="text"
			name="title"
			class="todo-input"
			placeholder="Neue Aufgabe…"
			maxlength="200"
			required
			aria-label="Aufgabentitel"
		/>
		<button type="submit" class="btn btn--primary">Hinzufügen</button>
	</form>

	<!-- Show completed toggle -->
	<label class="show-completed-label">
		<input type="checkbox" bind:checked={showCompleted} class="show-completed-checkbox" />
		Erledigte anzeigen
	</label>

	<!-- Grouped todo list -->
	{#if grouped.length === 0}
		<div class="empty-state">
			<p>{showCompleted ? 'Keine Aufgaben vorhanden.' : 'Keine offenen Aufgaben.'}</p>
		</div>
	{:else}
		{#each grouped as group (group.hiveId ?? GENERAL_KEY)}
			<section class="hive-group">
				{#if group.hiveId != null}
					<a href="/hives/{group.hiveId}" class="hive-group__title">
						{group.hiveName}{group.hiveNumber != null ? ` #${group.hiveNumber}` : ''}
					</a>
				{:else}
					<span class="hive-group__title hive-group__title--general">Allgemein</span>
				{/if}
				<ul class="todo-list">
					{#each group.items as todo (todo.id)}
						<li class="todo-item" class:todo-item--done={todo.isCompleted}>
							<form method="POST" action="?/toggle" use:enhance class="todo-toggle-form">
								<input type="hidden" name="todoId" value={todo.id} />
								<button
									type="submit"
									class="todo-checkbox"
									aria-label={todo.isCompleted ? 'Als offen markieren' : 'Als erledigt markieren'}
									aria-pressed={todo.isCompleted}
								>
									{#if todo.isCompleted}
										<svg
											width="14"
											height="14"
											viewBox="0 0 14 14"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
											aria-hidden="true"
										>
											<path
												d="M2 7L5.5 10.5L12 3.5"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									{/if}
								</button>
							</form>
							<span class="todo-title">{todo.title}</span>
							<form method="POST" action="?/delete" use:enhance class="todo-delete-form">
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
			</section>
		{/each}
	{/if}
</div>

<style>
	.todos-page {
		max-width: 600px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
	}

	.open-badge {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted, #6b7280);
		background: var(--color-bg, #f3f4f6);
		padding: 0.2rem 0.6rem;
		border-radius: 99px;
	}

	/* Add form */
	.add-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.hive-select {
		height: 44px;
		padding: 0 0.75rem;
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-input-bg, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		font-family: inherit;
		cursor: pointer;
		min-width: 160px;
	}

	.hive-select:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
	}

	.todo-input {
		flex: 1;
		height: 44px;
		padding: 0 0.875rem;
		font-size: 0.875rem;
		color: var(--color-text, #1a1a1a);
		background: var(--color-input-bg, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		font-family: inherit;
		min-width: 180px;
	}

	.todo-input:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
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
		cursor: pointer;
		border: none;
		transition: background-color 0.15s ease;
		white-space: nowrap;
		font-family: inherit;
	}

	.btn--primary {
		background-color: var(--color-accent, #f59e0b);
		color: #ffffff;
	}

	.btn--primary:hover {
		background-color: var(--color-accent-hover, #d97706);
	}

	/* Show completed toggle */
	.show-completed-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
		margin-bottom: 1.5rem;
		cursor: pointer;
		user-select: none;
	}

	.show-completed-checkbox {
		width: 16px;
		height: 16px;
		accent-color: var(--color-accent, #f59e0b);
		cursor: pointer;
	}

	/* Empty state */
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

	/* Hive group */
	.hive-group {
		margin-bottom: 1.5rem;
	}

	.hive-group__title {
		display: block;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-text-muted, #6b7280);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		text-decoration: none;
		margin-bottom: 0.5rem;
	}

	.hive-group__title:hover {
		color: var(--color-accent, #f59e0b);
	}

	.hive-group__title--general {
		cursor: default;
	}

	.hive-group__title--general:hover {
		color: var(--color-text-muted, #6b7280);
	}

	.todo-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	/* Todo item */
	.todo-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.625rem 0.875rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 8px;
		transition: border-color 0.15s ease;
	}

	.todo-item:hover {
		border-color: var(--color-accent, #f59e0b);
	}

	.todo-item--done {
		opacity: 0.55;
	}

	.todo-toggle-form,
	.todo-delete-form {
		display: contents;
	}

	.todo-checkbox {
		flex-shrink: 0;
		width: 22px;
		height: 22px;
		border: 2px solid var(--color-border, #d1d5db);
		border-radius: 6px;
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

	.todo-item--done .todo-checkbox {
		background: var(--color-accent, #f59e0b);
		border-color: var(--color-accent, #f59e0b);
	}

	.todo-checkbox:hover {
		border-color: var(--color-accent, #f59e0b);
	}

	.todo-title {
		flex: 1;
		font-size: 0.9rem;
		color: var(--color-text, #1a1a1a);
		line-height: 1.4;
	}

	.todo-item--done .todo-title {
		text-decoration: line-through;
	}

	.todo-delete-btn {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border: none;
		background: none;
		color: var(--color-text-muted, #9ca3af);
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
		opacity: 0;
	}

	.todo-item:hover .todo-delete-btn {
		opacity: 1;
	}

	.todo-delete-btn:hover {
		background: #fee2e2;
		color: #dc2626;
	}
</style>
