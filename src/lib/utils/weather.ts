// Framework-free WMO weather-code → German label mapping.
// Consumed by both client (inspection form) and server (Open-Meteo helpers).
// Never import from $app/* here.

/**
 * Maps a WMO weather code (0–99) to a short German description.
 * Returns "Unbekannt" for non-integers, negatives, or codes outside the known range.
 */
export function wmoDescription(code: number): string {
	if (!Number.isInteger(code) || code < 0) return 'Unbekannt';
	if (code === 0) return 'Klarer Himmel';
	if (code === 1) return 'Überwiegend klar';
	if (code === 2) return 'Teilweise bewölkt';
	if (code === 3) return 'Bedeckt';
	if (code <= 49) return 'Neblig';
	if (code <= 57) return 'Nieselregen';
	if (code <= 67) return 'Regen';
	if (code <= 77) return 'Schnee';
	if (code <= 82) return 'Regenschauer';
	if (code <= 86) return 'Schneeschauer';
	if (code <= 99) return 'Gewitter';
	return 'Unbekannt';
}
