<script lang="ts">
	import { isOnline } from '$lib/client/stores/offline.js';
</script>

{#if !$isOnline}
	<div class="offline-banner" role="status" aria-live="polite">
		Sie sind offline — neue Einträge werden synchronisiert, sobald Sie wieder verbunden sind
	</div>
{/if}

<style>
	.offline-banner {
		/* Story 7.3 AC3: sticky, always visible at top while offline */
		position: sticky;
		top: 0;
		z-index: 50;
		/* Story 7.3 AC7: amber/yellow theme-consistent background */
		background-color: #fef08a;
		color: #713f12;
		border-bottom: 1px solid #fde047;
		padding: 0.5rem 1.25rem;
		font-size: 0.85rem;
		font-weight: 500;
		text-align: center;
		/* Slide down when it appears */
		animation: slideDown 0.2s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-100%);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
