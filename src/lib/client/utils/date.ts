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
