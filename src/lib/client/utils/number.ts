// src/lib/client/utils/number.ts
//
// Shared number formatting for the honey statistics screens.
//
// Deliberately NOT de-CH grouping: no other screen in the app groups thousands,
// and introducing it here alone would look inconsistent. This matches what
// already ships in sells/+page.svelte (`{sale.priceChf.toFixed(2)} CHF`).
//
// The unit suffix (kg, CHF) is added by the caller, not baked in, so table
// headers can carry the unit instead of repeating it on every row.

/** Kilograms with one decimal, e.g. `11.4`. */
export function formatKg(kg: number): string {
	return kg.toFixed(1);
}

/** Swiss francs with two decimals, e.g. `12.35`. */
export function formatChf(chf: number): string {
	return chf.toFixed(2);
}

/** Average price per kilogram, or an em dash when it is undefined. */
export function formatChfPerKg(value: number | null): string {
	return value === null ? '—' : value.toFixed(2);
}
