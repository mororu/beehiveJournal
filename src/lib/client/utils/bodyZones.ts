// src/lib/client/utils/bodyZones.ts
//
// Single source of truth for the body-map geometry. Consumed by the interactive
// BodyMap (sting entry) and the read-only StingBodyHeatmap (statistics).
//
// Two key spaces exist here: geometry and text labels are keyed by `id`, while
// sting_incidents.body_location joins on the German `label` string. Renaming a
// label silently breaks that join — treat the label strings as stored data.

export type BodyZone =
	| { id: string; label: string; shape: 'circle'; cx: number; cy: number; r: number }
	| {
			id: string;
			label: string;
			shape: 'rect';
			x: number;
			y: number;
			width: number;
			height: number;
			rx: number;
	  };

export interface BodyZoneTextLabel {
	id: string;
	x: number;
	y: number;
	text: string;
	rotate?: number;
}

export const BODY_MAP_VIEWBOX = '0 0 200 390';

export const BODY_ZONES: BodyZone[] = [
	{ id: 'head', label: 'Kopf', shape: 'circle', cx: 100, cy: 40, r: 28 },
	{
		id: 'neck',
		label: 'Hals',
		shape: 'rect',
		x: 88,
		y: 68,
		width: 24,
		height: 15,
		rx: 5,
	},
	{
		id: 'chest',
		label: 'Brust',
		shape: 'rect',
		x: 60,
		y: 83,
		width: 80,
		height: 68,
		rx: 6,
	},
	{
		id: 'abdomen',
		label: 'Bauch',
		shape: 'rect',
		x: 62,
		y: 151,
		width: 76,
		height: 62,
		rx: 6,
	},
	{
		id: 'left-arm',
		label: 'Linker Arm',
		shape: 'rect',
		x: 32,
		y: 83,
		width: 28,
		height: 82,
		rx: 10,
	},
	{
		id: 'right-arm',
		label: 'Rechter Arm',
		shape: 'rect',
		x: 140,
		y: 83,
		width: 28,
		height: 82,
		rx: 10,
	},
	{
		id: 'left-forearm',
		label: 'Linker Unterarm',
		shape: 'rect',
		x: 26,
		y: 167,
		width: 26,
		height: 60,
		rx: 8,
	},
	{
		id: 'right-forearm',
		label: 'Rechter Unterarm',
		shape: 'rect',
		x: 148,
		y: 167,
		width: 26,
		height: 60,
		rx: 8,
	},
	{
		id: 'left-hand',
		label: 'Linke Hand',
		shape: 'rect',
		x: 20,
		y: 229,
		width: 30,
		height: 26,
		rx: 7,
	},
	{
		id: 'right-hand',
		label: 'Rechte Hand',
		shape: 'rect',
		x: 150,
		y: 229,
		width: 30,
		height: 26,
		rx: 7,
	},
	{
		id: 'left-thigh',
		label: 'Linker Oberschenkel',
		shape: 'rect',
		x: 62,
		y: 213,
		width: 30,
		height: 78,
		rx: 8,
	},
	{
		id: 'right-thigh',
		label: 'Rechter Oberschenkel',
		shape: 'rect',
		x: 108,
		y: 213,
		width: 30,
		height: 78,
		rx: 8,
	},
	{
		id: 'left-shin',
		label: 'Linkes Schienbein',
		shape: 'rect',
		x: 62,
		y: 293,
		width: 29,
		height: 68,
		rx: 8,
	},
	{
		id: 'right-shin',
		label: 'Rechtes Schienbein',
		shape: 'rect',
		x: 109,
		y: 293,
		width: 29,
		height: 68,
		rx: 8,
	},
	{
		id: 'left-foot',
		label: 'Linker Fuß',
		shape: 'rect',
		x: 52,
		y: 363,
		width: 38,
		height: 20,
		rx: 6,
	},
	{
		id: 'right-foot',
		label: 'Rechter Fuß',
		shape: 'rect',
		x: 110,
		y: 363,
		width: 38,
		height: 20,
		rx: 6,
	},
];

/** Text labels shown inside large-enough zones. Keyed by zone id. */
export const BODY_ZONE_TEXT_LABELS: BodyZoneTextLabel[] = [
	{ id: 'head', x: 100, y: 44, text: 'Kopf' },
	{ id: 'chest', x: 100, y: 121, text: 'Brust' },
	{ id: 'abdomen', x: 100, y: 186, text: 'Bauch' },
	{ id: 'left-arm', x: 46, y: 127, text: 'L.Arm', rotate: -90 },
	{ id: 'right-arm', x: 154, y: 127, text: 'R.Arm', rotate: -90 },
	{ id: 'left-thigh', x: 77, y: 256, text: 'Obers.', rotate: -90 },
	{ id: 'right-thigh', x: 123, y: 256, text: 'Obers.', rotate: -90 },
	{ id: 'left-shin', x: 76, y: 330, text: 'Schienb.', rotate: -90 },
	{ id: 'right-shin', x: 123, y: 330, text: 'Schienb.', rotate: -90 },
];

/**
 * Maps raw body_location counts onto zone ids, keeping anything that matches no
 * zone label in a separate list. body_location is free text on the write paths,
 * so an exact label match is not guaranteed.
 *
 * @returns perZone - counts keyed by zone **id** (zones with no stings are absent)
 * @returns unmatched - counts whose label matched no zone, descending by count
 */
export function splitCountsByZone(byLocation: { label: string; count: number }[]): {
	perZone: Map<string, number>;
	unmatched: { label: string; count: number }[];
} {
	const idByLabel = new Map(BODY_ZONES.map((z) => [z.label, z.id]));
	const perZone = new Map<string, number>();
	const unmatched: { label: string; count: number }[] = [];

	for (const entry of byLocation) {
		const id = idByLabel.get(entry.label);
		if (id === undefined) {
			unmatched.push(entry);
		} else {
			perZone.set(id, (perZone.get(id) ?? 0) + entry.count);
		}
	}

	unmatched.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
	return { perZone, unmatched };
}
