<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toDateInput } from '$lib/client/utils/date.js';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const todayIso = toDateInput(Math.floor(Date.now() / 1000));

	let harvestIdStr = $state<string>(form?.harvestIdRaw ?? '');
	let containerSizeIdStr = $state<string>(form?.containerSizeIdRaw ?? '');
	let soldAt = $state<string>(form?.soldAtRaw ?? todayIso);
	let amountStr = $state<string>(form?.amountRaw ?? '1');
	let customerName = $state<string>(form?.customerName ?? '');
	let priceChf = $state<string>(form?.priceChfRaw ?? '');
	let isGift = $state<boolean>(form?.isGift ?? false);
	let notes = $state<string>(form?.notes ?? '');
	let isSubmitting = $state(false);

	// When Geschenk is toggled on, clear the price input. The <input> is also
	// `disabled`, but browsers don't submit disabled inputs anyway — the server
	// parses isGift first and skips price parsing entirely when true.
	$effect(() => {
		if (isGift) priceChf = '';
	});

	const selectedHarvest = $derived(data.harvests.find((h) => String(h.id) === harvestIdStr));
	const selectedContainer = $derived(
		data.containers.find((c) => String(c.id) === containerSizeIdStr)
	);
	const amountNum = $derived(parseInt(amountStr, 10));

	const derivedKg = $derived(
		selectedContainer && Number.isFinite(amountNum) && amountNum > 0
			? (amountNum * selectedContainer.sizeG) / 1000
			: null
	);
	const overshootKg = $derived(
		derivedKg !== null && selectedHarvest ? derivedKg - selectedHarvest.remainingKg : null
	);
	const showOverSellWarning = $derived(overshootKg !== null && overshootKg > 0.05);
</script>

<svelte:head>
	<title>Neuer Verkauf — beehiveJournal</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/sells" class="back-link">← Verkäufe</a>
		<h1>Verkauf erfassen</h1>
	</div>

	{#if data.containers.length === 0}
		<div class="empty-state">
			<p>Zuerst mindestens eine Behältergröße anlegen.</p>
			<a href="/honey/containers/new" class="link">Behältergröße anlegen</a>
		</div>
	{:else if data.harvests.length === 0}
		<div class="empty-state">
			<p>Zuerst mindestens eine Ernte erfassen.</p>
			<a href="/harvests/new" class="link">Ernte erfassen</a>
		</div>
	{:else}
		<form
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					if (result.type === 'redirect') {
						await invalidateAll();
					}
					await update();
					isSubmitting = false;
				};
			}}
		>
			{#if form?.error}
				<div class="form-error" role="alert">{form.error}</div>
			{/if}

			<div class="field">
				<label class="field-label" for="harvestId">
					Los <span class="required" aria-hidden="true">*</span>
				</label>
				<select
					class="field-input"
					id="harvestId"
					name="harvestId"
					bind:value={harvestIdStr}
					required
					disabled={isSubmitting}
				>
					<option value="" disabled>Los wählen…</option>
					{#each data.harvests as h (h.id)}
						<option value={String(h.id)}>
							{h.lot} — {h.amountKg.toFixed(1)} kg ({h.remainingKg.toFixed(1)} kg übrig)
						</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label class="field-label" for="soldAt">
					Verkaufsdatum <span class="required" aria-hidden="true">*</span>
				</label>
				<input
					class="field-input"
					type="date"
					id="soldAt"
					name="soldAt"
					max={todayIso}
					bind:value={soldAt}
					required
					disabled={isSubmitting}
				/>
			</div>

			<div class="field">
				<label class="field-label" for="amount">
					Anzahl <span class="required" aria-hidden="true">*</span>
				</label>
				<input
					class="field-input"
					type="number"
					id="amount"
					name="amount"
					min="1"
					max="10000"
					step="1"
					bind:value={amountStr}
					required
					disabled={isSubmitting}
				/>
			</div>

			<div class="field">
				<label class="field-label" for="containerSizeId">
					Behältergröße <span class="required" aria-hidden="true">*</span>
				</label>
				<select
					class="field-input"
					id="containerSizeId"
					name="containerSizeId"
					bind:value={containerSizeIdStr}
					required
					disabled={isSubmitting}
				>
					<option value="" disabled>Behältergröße wählen…</option>
					{#each data.containers as c (c.id)}
						<option value={String(c.id)}>{c.name} ({c.sizeG} g)</option>
					{/each}
				</select>
			</div>

			{#if derivedKg !== null}
				<p class="derived-info">Berechnete Menge: {derivedKg.toFixed(1)} kg</p>
			{/if}
			{#if showOverSellWarning && overshootKg !== null}
				<p class="over-sell-warning" role="status">
					⚠ Überschreitet Restmenge des Loses um {overshootKg.toFixed(1)} kg — trotzdem speichern möglich.
				</p>
			{/if}

			<div class="field">
				<label class="field-label" for="customerName">
					Kundenname <span class="required" aria-hidden="true">*</span>
				</label>
				<input
					class="field-input"
					type="text"
					id="customerName"
					name="customerName"
					maxlength="200"
					bind:value={customerName}
					required
					disabled={isSubmitting}
				/>
			</div>

			<div class="field">
				<label class="field-label" for="priceChf">
					Preis (CHF)
					{#if !isGift}<span class="required" aria-hidden="true">*</span>{/if}
				</label>
				<input
					class="field-input"
					type="text"
					id="priceChf"
					name="priceChf"
					inputmode="decimal"
					pattern="[0-9]+([.,][0-9]+)?"
					bind:value={priceChf}
					disabled={isGift || isSubmitting}
					placeholder="z.B. 12.50"
					required={!isGift}
				/>
			</div>

			<div class="field field--checkbox">
				<label class="checkbox-label">
					<input type="checkbox" name="isGift" bind:checked={isGift} disabled={isSubmitting} />
					<span>Geschenk</span>
				</label>
			</div>

			<div class="field">
				<label class="field-label" for="notes">
					Notizen <span class="field-hint">(optional)</span>
				</label>
				<textarea
					class="field-input field-input--textarea"
					id="notes"
					name="notes"
					rows="3"
					maxlength="2000"
					bind:value={notes}
					disabled={isSubmitting}
				></textarea>
			</div>

			<div class="form-actions">
				<a href="/sells" class="btn btn--ghost">Abbrechen</a>
				<button class="btn btn--primary" type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Speichern…' : 'Verkauf erfassen'}
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

	.link {
		color: var(--color-accent, #f59e0b);
		text-decoration: none;
		font-weight: 500;
	}

	.link:hover {
		color: var(--color-accent-hover, #d97706);
		text-decoration: underline;
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

	.field--checkbox {
		margin-bottom: 1.25rem;
	}

	.checkbox-label {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
		font-size: 0.95rem;
		color: var(--color-text, #1a1a1a);
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		width: 20px;
		height: 20px;
		accent-color: var(--color-accent, #f59e0b);
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

	.field-input--textarea {
		height: auto;
		padding: 0.75rem 0.875rem;
		resize: vertical;
		field-sizing: content;
		min-height: 80px;
		max-height: 200px;
	}

	.derived-info {
		font-size: 0.85rem;
		color: var(--color-text-muted, #6b7280);
		margin: -0.75rem 0 1rem;
	}

	.over-sell-warning {
		font-size: 0.85rem;
		color: #92400e;
		background: #fef3c7;
		border: 1px solid #fde68a;
		border-radius: 8px;
		padding: 0.6rem 0.75rem;
		margin: 0 0 1.25rem;
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
