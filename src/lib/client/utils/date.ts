// src/lib/client/utils/date.ts
// Date formatting helpers used across the app.
// All helpers accept Unix epoch integers (seconds).

/**
 * Format a Unix epoch (seconds) as a short date string.
 * Example: "Mon 12 Jan 2026"
 */
export function formatDate(epoch: number): string {
	return new Intl.DateTimeFormat('en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	}).format(new Date(epoch * 1000));
}

/**
 * Format a Unix epoch (seconds) as a short date + time string.
 * Example: "12 Jan 2026, 14:35"
 */
export function formatDateTime(epoch: number): string {
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(epoch * 1000));
}

/**
 * Format a Unix epoch (seconds) for use in a datetime-local input value.
 * Returns "YYYY-MM-DDTHH:mm" format required by <input type="datetime-local">.
 */
export function toDatetimeLocal(epoch: number): string {
	const d = new Date(epoch * 1000);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parse a datetime-local string ("YYYY-MM-DDTHH:mm") back to a Unix epoch (seconds).
 */
export function fromDatetimeLocal(value: string): number {
	return Math.floor(new Date(value).getTime() / 1000);
}

/**
 * Format a Unix epoch (seconds) as a "Los" (lot) label: `L` + ddmmyyyy in local time.
 * Example: 2026-08-04 → "L04082026".
 */
export function formatLot(epoch: number): string {
	const d = new Date(epoch * 1000);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `L${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}`;
}

/**
 * Format a Unix epoch (seconds) for use in a <input type="date"> value.
 * Returns "YYYY-MM-DD" in local time.
 */
export function toDateInput(epoch: number): string {
	const d = new Date(epoch * 1000);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Parse a date input string ("YYYY-MM-DD") to a Unix epoch (seconds) at local noon.
 *
 * Noon (not midnight) so DST spring-forward zones that skip 00:00 (rare, but exists in
 * some historical or exotic offsets) cannot silently shift the calendar day. getDate()
 * always returns the intended day for a component-based Date construction at noon.
 * Also avoids the ECMAScript quirk where `new Date("YYYY-MM-DD")` parses as UTC.
 */
export function fromDateInput(value: string): number {
	const [y, m, d] = value.split('-').map(Number);
	if (!y || !m || !d) return NaN;
	return Math.floor(new Date(y, m - 1, d, 12, 0, 0).getTime() / 1000);
}

/** German short month names, indexed 0–11 to match Date.getUTCMonth(). */
export const MONTH_NAMES_SHORT_DE = [
	'Jan',
	'Feb',
	'Mär',
	'Apr',
	'Mai',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Okt',
	'Nov',
	'Dez',
] as const;
