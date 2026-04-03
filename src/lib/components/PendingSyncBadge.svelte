<script lang="ts">
	import { pendingSync } from '$lib/client/stores/pendingSync.js';
</script>

{#if $pendingSync > 0}
	<span
		class="sync-badge"
		title="{$pendingSync} Kontrolle{$pendingSync === 1 ? '' : 'n'} ausstehend"
		aria-label="{$pendingSync} ausstehend"
	>
		{$pendingSync}
	</span>
{/if}

<style>
	.sync-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.3rem;
		background: #dc2626;
		color: #ffffff;
		font-size: 0.7rem;
		font-weight: 700;
		border-radius: 99px;
		line-height: 1;
	}
</style>
