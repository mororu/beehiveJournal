<script lang="ts">
	import { enhance } from '$app/forms';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types.js';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<nav class="app-nav">
		<div class="nav-links">
			<a href="/hives" class="nav-link">Hives</a>
			<a href="/stings" class="nav-link">Stings</a>
		</div>
		<div class="nav-right">
			<span class="nav-username">{data.user.username}</span>
			<form method="POST" action="/logout" use:enhance>
				<button class="logout-button" type="submit">Log out</button>
			</form>
		</div>
	</nav>
{/if}

<main>
	{@render children()}
</main>

<style>
	.app-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.625rem 1.25rem;
		background-color: var(--color-surface, #ffffff);
		border-bottom: 1px solid var(--color-border, #e5e7eb);
	}

	.nav-links {
		display: flex;
		gap: 0.25rem;
	}

	.nav-link {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		text-decoration: none;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.nav-link:hover {
		background-color: var(--color-hover, #f3f4f6);
		color: var(--color-text, #1a1a1a);
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.nav-username {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
	}

	.logout-button {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text, #1a1a1a);
		background: none;
		border: 1px solid var(--color-border, #d1d5db);
		border-radius: 6px;
		padding: 0.375rem 0.75rem;
		cursor: pointer;
		transition: background-color 0.15s ease;
	}

	.logout-button:hover {
		background-color: var(--color-hover, #f3f4f6);
	}

	main {
		padding: 1.25rem;
	}
</style>
