<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toDatetimeLocal, fromDatetimeLocal } from '$lib/client/utils/date.js';
	import { addToHarvestsOutbox } from '$lib/client/offline/db.js';
	import { pendingSync } from '$lib/client/stores/pendingSync.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Stable UUID for this form instance — one UUID whether online or offline
	let clientId = $state(crypto.randomUUID());
	let isSubmitting = $state(false);

	const defaultDatetime = toDatetimeLocal(Math.floor(Date.now() / 1000));
</script>

<svelte:head>
	<title>Neue Ernte — beehiveJournal</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/harvests" class="back-link">← Ernteverlauf</a>
		<h1>Ernte erfassen</h1>
	</div>

	{#if data.hives.length === 0}
		<p class="no-hives">
			Kein aktiver Bienenstock vorhanden. Bitte zuerst einen Bienenstock anlegen.
		</p>
	{:else}
		<form
			method="POST"
			use:enhance={(event) => {
				if (!navigator.onLine) {
					event.cancel();
					isSubmitting = true;

					const formData = new FormData(event.formElement);
					const hiveIdStr = (formData.get('hiveId') as string | null) ?? '';
					const hiveId = parseInt(hiveIdStr, 10);
					if (isNaN(hiveId)) {
						isSubmitting = false;
						return () => {};
					}
					const harvestedAtRaw = (formData.get('harvestedAt') as string | null)?.trim() ?? '';
					const harvestedAt = harvestedAtRaw
						? fromDatetimeLocal(harvestedAtRaw)
						: Math.floor(Date.now() / 1000);
					const amountKg = parseFloat((formData.get('amountKg') as string | null) ?? '0');
					const notes = (formData.get('notes') as string | null)?.trim() || null;

					addToHarvestsOutbox({
						clientId,
						hiveId,
						harvestedAt,
						amountKg,
						notes,
						syncStatus: 'pending',
						createdAt: Math.floor(Date.now() / 1000),
					})
						.then(async () => {
							await pendingSync.refresh();
							isSubmitting = false;
							goto('/harvests');
						})
						.catch(() => {
							isSubmitting = false;
						});

					return () => {};
				}

				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
		>
			{#if form?.error}
				<div class="form-error" role="alert">{form.error}</div>
			{/if}

			<!-- Hive selector -->
			<div class="field">
				<label class="field-label" for="hiveId">
					Bienenstock <span class="required" aria-hidden="true">*</span>
				</label>
				<select
					class="field-input field-input--select"
					id="hiveId"
					name="hiveId"
					required
					disabled={isSubmitting}
				>
					<option value="">Bienenstock wählen</option>
					{#each data.hives as hive (hive.id)}
						<option value={String(hive.id)} selected={form?.hiveIdRaw === String(hive.id)}>
							{hive.name}{hive.number != null ? ` (#${hive.number})` : ''}
						</option>
					{/each}
				</select>
			</div>

			<!-- Harvest date -->
			<div class="field">
				<label class="field-label" for="harvestedAt">
					Erntedatum <span class="required" aria-hidden="true">*</span>
				</label>
				<input
					class="field-input"
					type="datetime-local"
					id="harvestedAt"
					name="harvestedAt"
					value={defaultDatetime}
					required
					disabled={isSubmitting}
				/>
			</div>

			<!-- Amount kg -->
			<div class="field">
				<label class="field-label" for="amountKg">
					Menge (kg) <span class="required" aria-hidden="true">*</span>
				</label>
				<input
					class="field-input"
					type="number"
					id="amountKg"
					name="amountKg"
					step="0.1"
					min="0.1"
					max="9999"
					value={form?.amountKgRaw ?? ''}
					placeholder="z.B. 11.4"
					required
					disabled={isSubmitting}
				/>
			</div>

			<!-- Notes (optional) -->
			<div class="field">
				<label class="field-label" for="notes">
					Notizen <span class="field-hint">(optional)</span>
				</label>
				<textarea
					class="field-input field-input--textarea"
					id="notes"
					name="notes"
					placeholder="z.B. Frühjahrsschleuderung, gute Qualität..."
					rows="3"
					maxlength="2000"
					disabled={isSubmitting}>{form?.notes ?? ''}</textarea
				>
			</div>

			<input type="hidden" name="clientId" value={clientId} />

			<div class="form-actions">
				<a href="/harvests" class="btn btn--ghost">Abbrechen</a>
				<button class="btn btn--primary" type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Speichern…' : 'Ernte erfassen'}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
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

	.no-hives {
		font-size: 0.9rem;
		color: var(--color-text-muted, #6b7280);
		padding: 2rem 1rem;
		text-align: center;
		border: 1.5px dashed var(--color-border, #e5e7eb);
		border-radius: 10px;
	}

	.form-error {
		background: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

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
		background: var(--color-surface, #ffffff);
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

	.field-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.field-input--select {
		appearance: auto;
	}

	.field-input--textarea {
		height: auto;
		padding: 0.75rem 0.875rem;
		resize: vertical;
		field-sizing: content;
		min-height: 80px;
		max-height: 200px;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
		padding-bottom: 2rem;
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
		min-height: 44px;
	}

	.btn--primary {
		background: var(--color-accent, #f59e0b);
		color: #ffffff;
	}
	.btn--primary:hover:not(:disabled) {
		background: var(--color-accent-hover, #d97706);
	}
	.btn--primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn--ghost {
		background: transparent;
		color: var(--color-text-muted, #6b7280);
		border: 1px solid var(--color-border, #d1d5db);
	}
	.btn--ghost:hover {
		background: var(--color-hover, #f3f4f6);
	}
</style>
