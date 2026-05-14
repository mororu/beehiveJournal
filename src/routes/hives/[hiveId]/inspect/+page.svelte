<script lang="ts">
	import { enhance } from '$app/forms';
	import { isOnline } from '$lib/client/stores/offline.js';
	import { addToOutbox } from '$lib/client/offline/db.js';
	import { pendingSync } from '$lib/client/stores/pendingSync.js';
	import { fromDatetimeLocal, toDatetimeLocal } from '$lib/client/utils/date.js';
	import PhotoCapture from '$lib/components/PhotoCapture.svelte';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Form state ─────────────────────────────────────────────────────────────
	let healthScore = $state<number | null>(null);
	let queenStatus = $state<string | null>(null);
	let fluglochBeobachtung = $state<string>('');
	let verhalten = $state<string>('');
	let isSubmitting = $state(false);
	let touched = $state(false);
	// Story 7.4 AC4: shown after a successful offline save
	let offlineSaved = $state(false);

	// Stable clientId for this form instance — same UUID used whether we go
	// online (server form action) or offline (IDB outbox). Prevents duplicates.
	const clientId = crypto.randomUUID();

	// ── Default inspection date/time = now, formatted for datetime-local input ──
	const defaultDatetime = toDatetimeLocal(Math.floor(Date.now() / 1000));

	// ── Weather state ───────────────────────────────────────────────────────────
	type WeatherStatus = 'idle' | 'loading' | 'ready' | 'unavailable';
	let weatherStatus = $state<WeatherStatus>('idle');
	let weatherData = $state<{
		temp: number;
		desc: string;
		windSpeed: number;
		code: number;
		lat: number;
		lon: number;
	} | null>(null);

	// WMO weather code → human-readable description
	function wmoDescription(code: number): string {
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

	// Fetch weather on mount, client-side only
	// (using $effect to run after render)
	$effect(() => {
		fetchWeather();
	});

	async function fetchWeather() {
		if (!navigator.geolocation) {
			weatherStatus = 'unavailable';
			return;
		}

		weatherStatus = 'loading';

		let position: GeolocationPosition;
		try {
			position = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					maximumAge: 5 * 60 * 1000, // accept cached position up to 5 min old
					timeout: 10_000,
				});
			});
		} catch {
			weatherStatus = 'unavailable';
			return;
		}

		const { latitude: lat, longitude: lon } = position.coords;

		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 5_000);

			const res = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`,
				{ signal: controller.signal }
			);
			clearTimeout(timer);

			if (!res.ok) throw new Error('Weather API error');

			const json = await res.json();
			const cw = json.current;
			const code: number = cw.weather_code;

			weatherData = {
				temp: Math.round(cw.temperature_2m * 10) / 10,
				desc: wmoDescription(code),
				windSpeed: Math.round(cw.wind_speed_10m * 10) / 10,
				code,
				lat,
				lon,
			};
			weatherStatus = 'ready';
		} catch {
			weatherStatus = 'unavailable';
		}
	}
</script>

<svelte:head>
	<title>Neue Kontrolle — {data.hive.name}</title>
</svelte:head>

<div class="form-page">
	<div class="form-page__header">
		<a href="/hives/{data.hive.id}" class="back-link">← {data.hive.name}</a>
		<h1>Neue Kontrolle</h1>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={(event) => {
			touched = true;

			// Client-side validation
			if (healthScore === null || queenStatus === null) {
				return () => {}; // cancel — validation errors shown in template
			}

			// Story 7.4 AC2: if offline, intercept and save to IDB instead
			if (!$isOnline) {
				event.cancel(); // prevent the fetch to the server action
				isSubmitting = true;

				const formData = new FormData(event.formElement);
				const inspectedAtRaw = (formData.get('inspectedAt') as string | null)?.trim() ?? '';
				const inspectedAt = inspectedAtRaw
					? fromDatetimeLocal(inspectedAtRaw)
					: Math.floor(Date.now() / 1000);

				addToOutbox({
					clientId,
					hiveId: data.hive.id,
					inspectedAt,
					healthScore: healthScore!,
					queenStatus: queenStatus!,
					fluglochBeobachtung: fluglochBeobachtung || null,
					verhalten: verhalten || null,
					behaviourNotes: (formData.get('behaviourNotes') as string | null)?.trim() || null,
					nextInspectNote: (formData.get('nextInspectNote') as string | null)?.trim() || null,
					// Story 7.4 AC5: weather is unavailable when offline
					weatherTemp: null,
					weatherDesc: null,
					weatherWindSpeed: null,
					weatherCode: null,
					weatherLat: null,
					weatherLon: null,
					weatherUnavailable: true,
					syncStatus: 'pending',
					createdAt: Math.floor(Date.now() / 1000),
				})
					.then(async () => {
						await pendingSync.refresh();
						isSubmitting = false;
						offlineSaved = true;
					})
					.catch(() => {
						isSubmitting = false;
					});

				return () => {}; // no-op update — we handled it ourselves
			}

			// Online path: normal server form action
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
			};
		}}
		onsubmit={(e) => {
			touched = true;
			if (healthScore === null || queenStatus === null) {
				e.preventDefault();
			}
		}}
	>
		<!-- Story 7.4 AC4: offline save confirmation -->
		{#if offlineSaved}
			<div class="form-offline-saved" role="status">
				Offline gespeichert — wird synchronisiert, sobald Sie wieder verbunden sind.
				<a href="/hives/{data.hive.id}" class="offline-saved__link">← Zurück zum Bienenstock</a>
			</div>
		{/if}

		<!-- Server-side error -->
		{#if form?.error}
			<div class="form-error" role="alert">{form.error}</div>
		{/if}

		<!-- ── Health Score ─────────────────────────────────────────────────── -->
		<div class="field">
			<span class="field-label">
				Gesundheitsbewertung <span class="required" aria-hidden="true">*</span>
			</span>
			{#if touched && healthScore === null}
				<span class="inline-error" role="alert">Bitte Gesundheitsbewertung auswählen</span>
			{/if}
			<div class="score-row" role="group" aria-label="Health score 1 to 5">
				{#each [1, 2, 3, 4, 5] as score (score)}
					<button
						class="score-btn"
						class:score-btn--selected={healthScore === score}
						class:score-btn--red={score <= 2}
						class:score-btn--amber={score === 3}
						class:score-btn--green={score >= 4}
						type="button"
						aria-pressed={healthScore === score}
						aria-label="Health score {score}"
						onclick={() => (healthScore = score)}
					>
						{score}
					</button>
				{/each}
			</div>
			<!-- Hidden input carries the value to the server -->
			{#if healthScore !== null}
				<input type="hidden" name="healthScore" value={healthScore} />
			{/if}
		</div>

		<!-- ── Queen Status ────────────────────────────────────────────────── -->
		<div class="field">
			<span class="field-label">
				Königinnenstatus <span class="required" aria-hidden="true">*</span>
			</span>
			{#if touched && queenStatus === null}
				<span class="inline-error" role="alert">Bitte Königinnenstatus auswählen</span>
			{/if}
			<div class="queen-row" role="group" aria-label="Queen status">
				{#each [{ value: 'seen', label: 'Gesehen' }, { value: 'not_seen', label: 'Nicht gesehen' }, { value: 'cells_present', label: 'Zellen vorhanden' }] as opt (opt.value)}
					<button
						class="queen-btn"
						class:queen-btn--selected={queenStatus === opt.value}
						type="button"
						aria-pressed={queenStatus === opt.value}
						onclick={() => (queenStatus = opt.value)}
					>
						{opt.label}
					</button>
				{/each}
			</div>
			{#if queenStatus !== null}
				<input type="hidden" name="queenStatus" value={queenStatus} />
			{/if}
		</div>

		<!-- ── Fluglochbeobachtung ─────────────────────────────────────────────── -->
		<div class="field">
			<label class="field-label" for="fluglochBeobachtung">
				Fluglochbeobachtung <span class="field-hint">(optional)</span>
			</label>
			<select
				class="field-input field-input--select"
				id="fluglochBeobachtung"
				name="fluglochBeobachtung"
				bind:value={fluglochBeobachtung}
				disabled={isSubmitting}
			>
				<option value="">— Keine Angabe —</option>
				<option value="keine">Keine</option>
				<option value="wenig">Wenig</option>
				<option value="mittel">Mittel</option>
				<option value="hoch">Hoch</option>
				<option value="sehr_hoch">Sehr Hoch</option>
			</select>
		</div>

		<!-- ── Verhalten ──────────────────────────────────────────────────────────── -->
		<div class="field">
			<label class="field-label" for="verhalten">
				Verhalten <span class="field-hint">(optional)</span>
			</label>
			<select
				class="field-input field-input--select"
				id="verhalten"
				name="verhalten"
				bind:value={verhalten}
				disabled={isSubmitting}
			>
				<option value="">— Keine Angabe —</option>
				<option value="ruhig">Ruhig</option>
				<option value="aufbrausend">Aufbrausend</option>
				<option value="aggressiv">Aggressiv</option>
			</select>
		</div>

		<!-- ── Inspection Date/Time ────────────────────────────────────────── -->
		<div class="field">
			<label class="field-label" for="inspectedAt">Datum & Uhrzeit</label>
			<input
				class="field-input"
				type="datetime-local"
				id="inspectedAt"
				name="inspectedAt"
				value={defaultDatetime}
				disabled={isSubmitting}
			/>
		</div>

		<!-- ── Behaviour Notes ─────────────────────────────────────────────── -->
		<div class="field">
			<label class="field-label" for="behaviourNotes">
				Verhaltensnotizen <span class="field-hint">(optional, max. 2000 Zeichen)</span>
			</label>
			<textarea
				class="field-input field-input--textarea"
				id="behaviourNotes"
				name="behaviourNotes"
				placeholder="z.B. Ruhig, gutes Brutnetz, Eier gesehen..."
				maxlength="2000"
				rows="3"
				disabled={isSubmitting}
			></textarea>
		</div>

		<!-- ── Next Inspection Note ────────────────────────────────────────── -->
		<div class="field">
			<label class="field-label" for="nextInspectNote">
				Notiz nächste Kontrolle <span class="field-hint">(optional, max. 1000 Zeichen)</span>
			</label>
			<textarea
				class="field-input field-input--textarea"
				id="nextInspectNote"
				name="nextInspectNote"
				placeholder="z.B. Schwarmzellen prüfen, Honigraum aufsetzen..."
				maxlength="1000"
				rows="2"
				disabled={isSubmitting}
			></textarea>
		</div>

		<!-- ── Weather ─────────────────────────────────────────────────────── -->
		<div class="weather-section">
			{#if weatherStatus === 'loading'}
				<div class="weather-badge weather-badge--loading">
					<span class="spinner" aria-hidden="true"></span>
					<span>Wetter wird geladen…</span>
				</div>
			{:else if weatherStatus === 'ready' && weatherData}
				<div class="weather-badge weather-badge--ready">
					<span class="weather-badge__temp">{weatherData.temp}°C</span>
					<span class="weather-badge__desc">{weatherData.desc}</span>
					<span class="weather-badge__wind">{weatherData.windSpeed} km/h</span>
				</div>
				<!-- Hidden weather fields sent with form -->
				<input type="hidden" name="weatherTemp" value={weatherData.temp} />
				<input type="hidden" name="weatherDesc" value={weatherData.desc} />
				<input type="hidden" name="weatherWindSpeed" value={weatherData.windSpeed} />
				<input type="hidden" name="weatherCode" value={weatherData.code} />
				<input type="hidden" name="weatherLat" value={weatherData.lat} />
				<input type="hidden" name="weatherLon" value={weatherData.lon} />
				<input type="hidden" name="weatherUnavailable" value="false" />
			{:else}
				<div class="weather-badge weather-badge--unavailable">Wetter nicht erfasst</div>
				<input type="hidden" name="weatherUnavailable" value="true" />
			{/if}
		</div>

		<!-- Stable UUID for this form instance — used for server dedup and IDB keying -->
		<input type="hidden" name="clientId" value={clientId} />

		<!-- ── Photos ─────────────────────────────────────────────────────── -->
		{#if $isOnline}
			<PhotoCapture disabled={isSubmitting} />
		{:else}
			<div class="photo-offline-note">Fotos können nur online hinzugefügt werden.</div>
		{/if}

		<!-- ── Submit ──────────────────────────────────────────────────────── -->
		<div class="form-actions">
			<a href="/hives/{data.hive.id}" class="btn btn--ghost">Abbrechen</a>
			<button
				class="btn btn--primary"
				type="submit"
				disabled={isSubmitting}
				aria-disabled={isSubmitting}
			>
				{isSubmitting ? 'Speichern…' : 'Kontrolle speichern'}
			</button>
		</div>
	</form>
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

	.form-offline-saved {
		background: #ecfdf5;
		color: #065f46;
		border: 1px solid #a7f3d0;
		border-radius: 8px;
		padding: 0.875rem 1rem;
		font-size: 0.9rem;
		font-weight: 500;
		margin-bottom: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.offline-saved__link {
		font-size: 0.875rem;
		color: #065f46;
		font-weight: 600;
		text-decoration: underline;
	}

	.form-error {
		background-color: #fef2f2;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	/* ── Fields ── */
	.field {
		margin-bottom: 1.5rem;
	}

	.field-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		margin-bottom: 0.5rem;
	}

	.field-hint {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--color-text-muted, #6b7280);
	}

	.required {
		color: #dc2626;
	}

	.inline-error {
		display: block;
		font-size: 0.8rem;
		color: #dc2626;
		margin-bottom: 0.375rem;
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

	.field-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.field-input--select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.875rem center;
		background-size: 12px 8px;
		padding-right: 2.5rem;
		cursor: pointer;
	}

	.field-input--textarea {
		height: auto;
		padding: 0.75rem 0.875rem;
		resize: vertical;
		field-sizing: content;
		min-height: 80px;
		max-height: 200px;
	}

	/* ── Health score selector ── */
	.score-row {
		display: flex;
		gap: 0.5rem;
	}

	.score-btn {
		flex: 1;
		height: 52px;
		font-size: 1.1rem;
		font-weight: 700;
		border: 2px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		background: var(--color-surface, #ffffff);
		color: var(--color-text, #1a1a1a);
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
	}

	.score-btn:hover {
		border-color: var(--color-text-muted, #6b7280);
	}

	.score-btn--selected.score-btn--red {
		background-color: #dc2626;
		border-color: #dc2626;
		color: #ffffff;
	}

	.score-btn--selected.score-btn--amber {
		background-color: #d97706;
		border-color: #d97706;
		color: #ffffff;
	}

	.score-btn--selected.score-btn--green {
		background-color: #16a34a;
		border-color: #16a34a;
		color: #ffffff;
	}

	/* ── Queen status selector ── */
	.queen-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.queen-btn {
		flex: 1;
		min-width: 0;
		height: 48px;
		padding: 0 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		border: 2px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		background: var(--color-surface, #ffffff);
		color: var(--color-text, #1a1a1a);
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
		white-space: nowrap;
	}

	.queen-btn:hover {
		border-color: var(--color-text-muted, #6b7280);
	}

	.queen-btn--selected {
		background-color: var(--color-accent, #f59e0b);
		border-color: var(--color-accent, #f59e0b);
		color: #ffffff;
	}

	/* ── Weather ── */
	.weather-section {
		margin-bottom: 1.5rem;
	}

	.weather-badge {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.875rem;
		border-radius: 8px;
		font-size: 0.875rem;
	}

	.weather-badge--loading {
		background: #f3f4f6;
		color: var(--color-text-muted, #6b7280);
	}

	.weather-badge--ready {
		background: #ecfdf5;
		color: #065f46;
		border: 1px solid #a7f3d0;
	}

	.weather-badge__temp {
		font-weight: 700;
		font-size: 1rem;
	}

	.weather-badge--unavailable {
		background: #f9fafb;
		color: var(--color-text-muted, #6b7280);
		border: 1px dashed var(--color-border, #d1d5db);
		font-size: 0.825rem;
	}

	/* Simple CSS spinner */
	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid #d1d5db;
		border-top-color: #6b7280;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Photos offline note ── */
	.photo-offline-note {
		font-size: 0.825rem;
		color: var(--color-text-muted, #6b7280);
		background: #f9fafb;
		border: 1px dashed var(--color-border, #d1d5db);
		border-radius: 8px;
		padding: 0.625rem 0.875rem;
		margin-bottom: 1.5rem;
	}

	/* ── Form actions ── */
	.form-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 0.5rem;
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
		transition:
			background-color 0.15s ease,
			opacity 0.15s ease;
		font-family: inherit;
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
</style>
