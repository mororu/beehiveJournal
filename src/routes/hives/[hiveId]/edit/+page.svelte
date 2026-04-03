<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isSubmitting = $state(false);
	let archiveDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let confirmNameInput = $state('');

	// Derived: enable delete button only when typed name matches exactly
	const deleteEnabled = $derived(confirmNameInput === data.hive.name);
</script>

<svelte:head>
	<title>{data.hive.name} bearbeiten — beehiveJournal</title>
</svelte:head>

<!-- ── Archive confirmation dialog ─────────────────────────────────────── -->
<dialog open={archiveDialogOpen || undefined} class="dialog" aria-labelledby="archive-dialog-title">
	<h2 id="archive-dialog-title" class="dialog__title">{data.hive.name} archivieren?</h2>
	<p class="dialog__body">
		Er wird aus der aktiven Liste ausgeblendet, aber alle Kontrolldaten werden gespeichert. Sie können ihn später wiederherstellen.
	</p>
	<div class="dialog__actions">
		<button class="btn btn--ghost" type="button" onclick={() => (archiveDialogOpen = false)}>
			Abbrechen
		</button>
		<form method="POST" action="?/archive" use:enhance>
			<button class="btn btn--warning" type="submit">Bienenstock archivieren</button>
		</form>
	</div>
</dialog>

<!-- ── Delete confirmation dialog ──────────────────────────────────────── -->
<dialog open={deleteDialogOpen || undefined} class="dialog" aria-labelledby="delete-dialog-title">
	<h2 id="delete-dialog-title" class="dialog__title">{data.hive.name} löschen?</h2>
	<p class="dialog__body">
		Dies löscht dauerhaft <strong>{data.hive.name}</strong> und alle
		<strong>{data.inspectionCount}</strong>
		{data.inspectionCount === 1 ? 'Kontrolle' : 'Kontrollen'} dauerhaft. Dies kann nicht rückgängig gemacht werden.
	</p>
	<p class="dialog__body">
		Geben Sie <strong>{data.hive.name}</strong> zur Bestätigung ein:
	</p>

	{#if form?.action === 'delete' && form?.error}
		<div class="field-error" role="alert">{form.error}</div>
	{/if}

	<form
		method="POST"
		action="?/delete"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				// Reset on failure (redirect on success means this only runs on error)
				confirmNameInput = '';
			};
		}}
	>
		<input
			class="field-input"
			type="text"
			name="confirmName"
			bind:value={confirmNameInput}
			placeholder={data.hive.name}
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck="false"
		/>
		<div class="dialog__actions">
			<button
				class="btn btn--ghost"
				type="button"
				onclick={() => {
					deleteDialogOpen = false;
					confirmNameInput = '';
				}}
			>
				Cancel
			</button>
			<button class="btn btn--danger" type="submit" disabled={!deleteEnabled}>
				Dauerhaft löschen
			</button>
		</div>
	</form>
</dialog>

<!-- ── Main page ────────────────────────────────────────────────────────── -->
<div class="form-page">
	<div class="form-page__header">
		<a href="/hives/{data.hive.id}" class="back-link">← {data.hive.name}</a>
		<h1>Bienenstock bearbeiten</h1>
	</div>

	<!-- ── Unarchive banner (shown only for archived hives) ───────────────── -->
	{#if !data.hive.isActive}
		<div class="archived-banner">
			<span>Dieser Bienenstock ist archiviert.</span>
			{#if form?.action === 'unarchive' && form?.error}
				<span class="archived-banner__error">{form.error}</span>
			{/if}
			<form method="POST" action="?/unarchive" use:enhance>
				<button class="btn btn--sm btn--primary" type="submit">Wiederherstellen</button>
			</form>
		</div>
	{/if}

	<!-- ── Edit form ─────────────────────────────────────────────────────── -->
	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
	>
		{#if form?.action === 'update' && form?.error}
			<div class="field-error field-error--top" role="alert">{form.error}</div>
		{/if}

		<div class="field">
			<label class="field-label" for="name">
				Name des Bienenstocks <span class="required" aria-hidden="true">*</span>
			</label>
			<input
				class="field-input"
				type="text"
				id="name"
				name="name"
				value={form?.action === 'update' ? (form?.name ?? data.hive.name) : data.hive.name}
				required
				disabled={isSubmitting}
				autocomplete="off"
			/>
		</div>

		<div class="field">
			<label class="field-label" for="number">
				Nummer <span class="field-hint">(optional)</span>
			</label>
			<input
				class="field-input field-input--short"
				type="number"
				id="number"
				name="number"
				value={form?.action === 'update'
					? (form?.numberRaw ?? (data.hive.number != null ? String(data.hive.number) : ''))
					: data.hive.number != null
						? String(data.hive.number)
						: ''}
				min="1"
				step="1"
				disabled={isSubmitting}
			/>
		</div>

		<div class="field">
			<label class="field-label" for="description">
				Beschreibung <span class="field-hint">(optional)</span>
			</label>
			<textarea
				class="field-input field-input--textarea"
				id="description"
				name="description"
				rows="3"
				disabled={isSubmitting}
				>{form?.action === 'update'
					? (form?.description ?? data.hive.description ?? '')
					: (data.hive.description ?? '')}</textarea
			>
		</div>

		<div class="form-actions">
			<a href="/hives/{data.hive.id}" class="btn btn--ghost">Abbrechen</a>
			<button class="btn btn--primary" type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Speichern…' : 'Änderungen speichern'}
			</button>
		</div>
	</form>

	<!-- ── Danger zone ─────────────────────────────────────────────────── -->
	<div class="danger-zone">
		<h2 class="danger-zone__title">Gefahrenbereich</h2>

		{#if data.hive.isActive}
			<div class="danger-zone__item">
				<div class="danger-zone__info">
					<strong>Diesen Bienenstock archivieren</strong>
					<span>Aus der aktiven Liste ausblenden. Alle Kontrollen werden gespeichert.</span>
				</div>
				<button
					class="btn btn--sm btn--warning"
					type="button"
					onclick={() => (archiveDialogOpen = true)}
				>
					Archivieren
				</button>
			</div>
		{/if}

		<div class="danger-zone__item">
			<div class="danger-zone__info">
				<strong>Diesen Bienenstock löschen</strong>
				<span>
					Diesen Bienenstock und alle {data.inspectionCount}
					{data.inspectionCount === 1 ? 'Kontrolle' : 'Kontrollen'} dauerhaft löschen. Kann nicht rückgängig gemacht werden.
				</span>
			</div>
			<button
				class="btn btn--sm btn--danger"
				type="button"
				onclick={() => (deleteDialogOpen = true)}
			>
				Löschen
			</button>
		</div>
	</div>
</div>

<style>
	/* ── Dialog ── */
	.dialog {
		position: fixed;
		inset: 0;
		z-index: 100;
		margin: auto;
		width: calc(100% - 2rem);
		max-width: 420px;
		max-height: calc(100dvh - 2rem);
		background: var(--color-surface, #ffffff);
		border: none;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
		overflow-y: auto;
	}

	.dialog::backdrop {
		background: rgba(0, 0, 0, 0.4);
	}

	.dialog__title {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 0.75rem;
	}

	.dialog__body {
		font-size: 0.9rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0 0 0.75rem;
		line-height: 1.5;
	}

	.dialog__body strong {
		color: var(--color-text, #1a1a1a);
	}

	.dialog__actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.25rem;
	}

	/* ── Form page ── */
	.form-page {
		max-width: 480px;
		margin: 0 auto;
	}

	.form-page__header {
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

	h1 {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0;
	}

	/* ── Archived banner ── */
	.archived-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		background: #fffbeb;
		border: 1px solid #fde68a;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: #92400e;
		margin-bottom: 1.5rem;
	}

	.archived-banner span:first-child {
		flex: 1;
	}

	.archived-banner__error {
		color: #dc2626;
		font-weight: 500;
	}

	/* ── Fields ── */
	.field {
		margin-bottom: 1.25rem;
	}

	.field-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		margin-bottom: 0.375rem;
	}

	.field-hint {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--color-text-muted, #6b7280);
	}

	.required {
		color: #dc2626;
	}

	.field-input {
		width: 100%;
		height: 48px;
		padding: 0 0.875rem;
		font-size: 1rem;
		color: var(--color-text, #1a1a1a);
		background-color: var(--color-input-bg, #ffffff);
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		box-sizing: border-box;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
		font-family: inherit;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--color-accent, #f59e0b);
		box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
	}

	.field-input--short {
		max-width: 120px;
	}

	.field-input--textarea {
		height: auto;
		padding: 0.75rem 0.875rem;
		resize: vertical;
	}

	.field-error {
		background-color: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.field-error--top {
		margin-bottom: 1.25rem;
	}

	/* ── Form actions ── */
	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	/* ── Danger zone ── */
	.danger-zone {
		margin-top: 2.5rem;
		border-top: 1px solid var(--color-border, #e5e7eb);
		padding-top: 1.5rem;
	}

	.danger-zone__title {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #dc2626;
		margin: 0 0 1rem;
	}

	.danger-zone__item {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 8px;
		margin-bottom: 0.75rem;
	}

	.danger-zone__info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.danger-zone__info strong {
		font-size: 0.9rem;
		color: var(--color-text, #1a1a1a);
	}

	.danger-zone__info span {
		font-size: 0.8rem;
		color: var(--color-text-muted, #6b7280);
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
		transition:
			background-color 0.15s ease,
			opacity 0.15s ease;
		font-family: inherit;
		white-space: nowrap;
	}

	.btn--sm {
		height: 38px;
		padding: 0 0.875rem;
		font-size: 0.875rem;
	}

	.btn--primary {
		background-color: var(--color-accent, #f59e0b);
		color: #ffffff;
	}

	.btn--primary:hover:not(:disabled) {
		background-color: var(--color-accent-hover, #d97706);
	}

	.btn--primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn--ghost {
		background-color: transparent;
		color: var(--color-text-muted, #6b7280);
		border: 1px solid var(--color-border, #d1d5db);
	}

	.btn--ghost:hover {
		background-color: var(--color-hover, #f3f4f6);
	}

	.btn--warning {
		background-color: #d97706;
		color: #ffffff;
	}

	.btn--warning:hover {
		background-color: #b45309;
	}

	.btn--danger {
		background-color: #dc2626;
		color: #ffffff;
	}

	.btn--danger:hover:not(:disabled) {
		background-color: #b91c1c;
	}

	.btn--danger:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
