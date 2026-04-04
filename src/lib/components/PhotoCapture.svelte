<script lang="ts">
	// PhotoCapture.svelte
	//
	// Lets the user take photos with the camera or pick from gallery.
	// Renders previews and synchronises the selected files into a real
	// <input type="file" name="photos"> so the standard multipart form
	// submission carries them to the server action.
	//
	// Strategy: we maintain our own `previews` array in state.
	// Before form submission we use a DataTransfer to rebuild the file list
	// on the real hidden input. This works in all modern browsers and iOS Safari.

	const MAX_PHOTOS = 5;
	const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
	const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,image/*';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props {
		// IDs of photos already stored on the server (edit mode only)
		existingPhotoIds?: number[];
		disabled?: boolean;
	}
	let { existingPhotoIds = [], disabled = false }: Props = $props();

	// ── State ─────────────────────────────────────────────────────────────────
	interface Preview {
		id: string; // local UUID for list key + cleanup
		file: File;
		objectUrl: string;
	}
	let previews = $state<Preview[]>([]);
	// IDs of existing server-side photos the user wants to delete
	let removedExistingIds = $state<number[]>([]);
	let photoError = $state<string | null>(null);

	// Hidden input element refs
	let cameraInput = $state<HTMLInputElement | undefined>(undefined);
	let galleryInput = $state<HTMLInputElement | undefined>(undefined);
	// The real file input that carries files to the server
	let filesInput = $state<HTMLInputElement | undefined>(undefined);

	// ── Derived ───────────────────────────────────────────────────────────────
	const remainingExisting = $derived(
		existingPhotoIds.filter((id) => !removedExistingIds.includes(id))
	);
	const totalCount = $derived(remainingExisting.length + previews.length);
	const canAdd = $derived(totalCount < MAX_PHOTOS && !disabled);

	// ── File handling ─────────────────────────────────────────────────────────
	function handleFiles(files: FileList | null) {
		if (!files || files.length === 0) return;
		photoError = null;

		const toAdd = Array.from(files);
		const available = MAX_PHOTOS - totalCount;

		if (toAdd.length > available) {
			photoError =
				available === 1
					? `Maximal ${MAX_PHOTOS} Fotos erlaubt. Es kann noch 1 hinzugefügt werden.`
					: `Maximal ${MAX_PHOTOS} Fotos erlaubt. Es können noch ${available} hinzugefügt werden.`;
			return;
		}

		for (const file of toAdd) {
			if (file.size > MAX_BYTES) {
				photoError = `"${file.name}" ist zu groß (max. 10 MB pro Foto).`;
				return;
			}
		}

		const newPreviews: Preview[] = toAdd.map((file) => ({
			id: crypto.randomUUID(),
			file,
			objectUrl: URL.createObjectURL(file),
		}));
		previews = [...previews, ...newPreviews];
		syncFilesInput();
	}

	function removeNew(id: string) {
		const idx = previews.findIndex((p) => p.id === id);
		if (idx === -1) return;
		URL.revokeObjectURL(previews[idx].objectUrl);
		previews = previews.filter((p) => p.id !== id);
		syncFilesInput();
	}

	function removeExisting(photoId: number) {
		removedExistingIds = [...removedExistingIds, photoId];
	}

	/**
	 * Rebuild the hidden file input's FileList from our previews array.
	 * Uses DataTransfer — supported in all modern browsers and iOS Safari >= 14.1.
	 */
	function syncFilesInput() {
		if (!filesInput) return;
		const dt = new DataTransfer();
		for (const p of previews) dt.items.add(p.file);
		filesInput.files = dt.files;
	}

	// Clean up object URLs when component is destroyed
	$effect(() => {
		return () => {
			for (const p of previews) URL.revokeObjectURL(p.objectUrl);
		};
	});
</script>

<div class="photo-capture">
	<span class="field-label">
		Fotos <span class="field-hint">(optional, max. {MAX_PHOTOS} Fotos, je max. 10 MB)</span>
	</span>

	{#if photoError}
		<span class="photo-error" role="alert">{photoError}</span>
	{/if}

	<!-- ── Preview grid ── -->
	{#if remainingExisting.length > 0 || previews.length > 0}
		<div class="photo-grid">
			<!-- Existing server-side photos (edit mode) -->
			{#each remainingExisting as photoId (photoId)}
				<div class="photo-thumb">
					<img
						src="/api/photos/{photoId}"
						alt="Inspektionsfoto"
						class="photo-thumb__img"
						loading="lazy"
					/>
					{#if !disabled}
						<button
							type="button"
							class="photo-thumb__remove"
							aria-label="Foto entfernen"
							onclick={() => removeExisting(photoId)}
						>
							×
						</button>
					{/if}
				</div>
			{/each}

			<!-- Newly selected photos (client-side preview) -->
			{#each previews as preview (preview.id)}
				<div class="photo-thumb">
					<img src={preview.objectUrl} alt={preview.file.name} class="photo-thumb__img" />
					{#if !disabled}
						<button
							type="button"
							class="photo-thumb__remove"
							aria-label="Foto entfernen"
							onclick={() => removeNew(preview.id)}
						>
							×
						</button>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<!-- ── Add buttons ── -->
	{#if canAdd}
		<div class="photo-actions">
			<!-- Camera: capture="environment" opens rear camera on mobile -->
			<button
				type="button"
				class="photo-btn"
				{disabled}
				onclick={() => cameraInput?.click()}
				aria-label="Foto aufnehmen"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path
						d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
					/>
					<circle cx="12" cy="13" r="4" />
				</svg>
				Foto aufnehmen
			</button>

			<!-- Gallery: no capture attribute — opens OS photo picker -->
			<button
				type="button"
				class="photo-btn"
				{disabled}
				onclick={() => galleryInput?.click()}
				aria-label="Aus Galerie auswählen"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
					<circle cx="8.5" cy="8.5" r="1.5" />
					<polyline points="21 15 16 10 5 21" />
				</svg>
				Aus Galerie
			</button>
		</div>
	{:else if !disabled}
		<p class="photo-limit-note">Maximal {MAX_PHOTOS} Fotos erreicht.</p>
	{/if}

	<!-- ── Hidden file inputs ── -->

	<!-- Camera trigger — capture="environment" = rear camera on mobile -->
	<input
		bind:this={cameraInput}
		type="file"
		accept={ACCEPTED}
		capture="environment"
		class="visually-hidden"
		tabindex="-1"
		aria-hidden="true"
		onchange={(e) => {
			handleFiles((e.target as HTMLInputElement).files);
			(e.target as HTMLInputElement).value = '';
		}}
	/>

	<!-- Gallery trigger — no capture attribute, allows multiple -->
	<input
		bind:this={galleryInput}
		type="file"
		accept={ACCEPTED}
		multiple
		class="visually-hidden"
		tabindex="-1"
		aria-hidden="true"
		onchange={(e) => {
			handleFiles((e.target as HTMLInputElement).files);
			(e.target as HTMLInputElement).value = '';
		}}
	/>

	<!-- The actual form submission input.
	     Its FileList is kept in sync via syncFilesInput() / DataTransfer.
	     Named "photos" — server reads these as multipart file entries. -->
	<input
		bind:this={filesInput}
		type="file"
		name="photos"
		accept={ACCEPTED}
		multiple
		class="visually-hidden"
		tabindex="-1"
		aria-hidden="true"
	/>

	<!-- Hidden inputs for existing photos the user wants to remove (edit mode) -->
	{#each removedExistingIds as id (id)}
		<input type="hidden" name="removePhotoIds" value={id} />
	{/each}
</div>

<style>
	.photo-capture {
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

	.photo-error {
		display: block;
		font-size: 0.8rem;
		color: #dc2626;
		margin-bottom: 0.5rem;
	}

	/* ── Grid ── */
	.photo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.photo-thumb {
		position: relative;
		aspect-ratio: 1;
		border-radius: 8px;
		overflow: hidden;
		background: var(--color-border, #e5e7eb);
	}

	.photo-thumb__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.photo-thumb__remove {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		transition: background 0.15s ease;
	}

	.photo-thumb__remove:hover {
		background: rgba(220, 38, 38, 0.85);
	}

	/* ── Buttons ── */
	.photo-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.photo-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		height: 42px;
		padding: 0 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1.5px solid var(--color-border, #d1d5db);
		border-radius: 8px;
		background: var(--color-surface, #ffffff);
		color: var(--color-text, #1a1a1a);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease;
		font-family: inherit;
	}

	.photo-btn:hover:not(:disabled) {
		border-color: var(--color-accent, #f59e0b);
		background: #fffbeb;
	}

	.photo-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.photo-limit-note {
		font-size: 0.8rem;
		color: var(--color-text-muted, #6b7280);
		margin: 0 0 0.5rem;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
