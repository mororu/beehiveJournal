// src/routes/sells/new/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { getContainerSizes } from '$lib/server/db/queries/containerSizes.js';
import { getHarvestEntriesWithRemaining } from '$lib/server/db/queries/honeyHarvests.js';
import { createHoneySale } from '$lib/server/db/queries/honeySales.js';
import { fromDateInput } from '$lib/client/utils/date.js';
import type { Actions, PageServerLoad } from './$types.js';

const MAX_CUSTOMER_LEN = 200;
const MAX_NOTES_LEN = 2000;
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 10000;
const MIN_SOLD_AT = Math.floor(new Date(2000, 0, 1, 12).getTime() / 1000);

type Raw = {
	harvestIdRaw: string;
	containerSizeIdRaw: string;
	soldAtRaw: string;
	amountRaw: string;
	customerName: string;
	priceChfRaw: string;
	isGift: boolean;
	notes: string;
};

function failWith(raw: Raw, message: string) {
	return fail(400, { error: message, ...raw });
}

export const load: PageServerLoad = () => {
	return {
		harvests: getHarvestEntriesWithRemaining(),
		containers: getContainerSizes(),
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		// Parse order matters — isGift FIRST so we know whether to touch price at all.
		const isGift = data.get('isGift') === 'on';

		const raw: Raw = {
			harvestIdRaw: ((data.get('harvestId') as string | null) ?? '').trim(),
			containerSizeIdRaw: ((data.get('containerSizeId') as string | null) ?? '').trim(),
			soldAtRaw: ((data.get('soldAt') as string | null) ?? '').trim(),
			amountRaw: ((data.get('amount') as string | null) ?? '').trim(),
			customerName: ((data.get('customerName') as string | null) ?? '').trim(),
			priceChfRaw: ((data.get('priceChf') as string | null) ?? '').trim(),
			isGift,
			notes: ((data.get('notes') as string | null) ?? '').trim(),
		};

		const harvestId = parseInt(raw.harvestIdRaw, 10);
		if (!Number.isFinite(harvestId) || harvestId <= 0) {
			return failWith(raw, 'Los ist erforderlich');
		}
		const containerSizeId = parseInt(raw.containerSizeIdRaw, 10);
		if (!Number.isFinite(containerSizeId) || containerSizeId <= 0) {
			return failWith(raw, 'Behältergröße ist erforderlich');
		}

		// Defence in depth — verify harvest + container exist BEFORE other
		// field-level checks, so form-tampered IDs surface the right message
		// instead of "Anzahl muss zwischen…" (spec: form-tamper safety).
		if (!getHarvestEntriesWithRemaining().some((h) => h.id === harvestId)) {
			return failWith(raw, 'Los existiert nicht');
		}
		if (!getContainerSizes().some((c) => c.id === containerSizeId)) {
			return failWith(raw, 'Behältergröße existiert nicht');
		}

		if (!raw.soldAtRaw) {
			return failWith(raw, 'Verkaufsdatum ist erforderlich');
		}
		const soldAt = fromDateInput(raw.soldAtRaw);
		if (!Number.isFinite(soldAt)) {
			return failWith(raw, 'Ungültiges Verkaufsdatum');
		}
		const maxSoldAt = Math.floor(Date.now() / 1000) + 24 * 3600;
		if (soldAt < MIN_SOLD_AT || soldAt > maxSoldAt) {
			return failWith(raw, 'Verkaufsdatum liegt außerhalb des zulässigen Bereichs');
		}

		const amount = parseInt(raw.amountRaw, 10);
		if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
			return failWith(raw, `Anzahl muss zwischen ${MIN_AMOUNT} und ${MAX_AMOUNT} liegen`);
		}

		if (!raw.customerName) {
			return failWith(raw, 'Kundenname ist erforderlich');
		}
		if (raw.customerName.length > MAX_CUSTOMER_LEN) {
			return failWith(raw, `Kundenname darf höchstens ${MAX_CUSTOMER_LEN} Zeichen enthalten`);
		}

		let notes: string | null = null;
		if (raw.notes) {
			if (raw.notes.length > MAX_NOTES_LEN) {
				return failWith(raw, `Notizen dürfen höchstens ${MAX_NOTES_LEN} Zeichen enthalten`);
			}
			notes = raw.notes;
		}

		let priceChf: number | null = null;
		if (!isGift) {
			// German-locale decimals — normalise comma before parseFloat.
			const normalised = raw.priceChfRaw.replace(',', '.');
			if (normalised === '') {
				return failWith(raw, 'Preis ist erforderlich (oder Geschenk auswählen)');
			}
			const parsed = parseFloat(normalised);
			if (!Number.isFinite(parsed) || parsed < 0) {
				return failWith(raw, 'Preis muss 0 oder größer sein');
			}
			priceChf = Math.round(parsed * 100) / 100;
		}

		createHoneySale({
			harvestId,
			containerSizeId,
			soldAt,
			amount,
			customerName: raw.customerName,
			isGift,
			priceChf,
			notes,
		});
		redirect(302, '/sells');
	},
};
