<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import favicon from '$lib/assets/favicon.svg';
	import OfflineBanner from '$lib/components/OfflineBanner.svelte';
	import PendingSyncBadge from '$lib/components/PendingSyncBadge.svelte';
	import { registerSyncTriggers } from '$lib/client/offline/sync.js';
	import type { LayoutData } from './$types.js';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let menuOpen = $state(false);

	// F5: close menu on every client-side navigation
	afterNavigate(() => {
		menuOpen = false;
	});

	// F1 + F6: close on Escape key or click outside nav+panel
	$effect(() => {
		if (!menuOpen) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				menuOpen = false;
				document.querySelector<HTMLButtonElement>('.hamburger-btn')?.focus();
			}
		};
		const handleClickOutside = (e: MouseEvent) => {
			const nav = document.querySelector('.app-nav');
			const panel = document.getElementById('mobile-menu-panel');
			const target = e.target as Node;
			if (nav && !nav.contains(target) && panel && !panel.contains(target)) {
				menuOpen = false;
			}
		};
		window.addEventListener('keydown', handleKey);
		document.addEventListener('click', handleClickOutside);
		return () => {
			window.removeEventListener('keydown', handleKey);
			document.removeEventListener('click', handleClickOutside);
		};
	});

	// Story 7.5: register online + visibilitychange sync triggers once on mount
	onMount(() => {
		registerSyncTriggers();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="title-bar">
	<span class="title-bar__domain">beeard.ch</span>
	<span class="title-bar__name">Bee Journal</span>
</header>

{#if data.user}
	<nav class="app-nav">
		<div class="nav-links">
			<a href="/hives" class="nav-link">Bienenstöcke</a>
			<a href="/stings" class="nav-link">Stiche</a>
			<a href="/todos" class="nav-link">Aufgaben</a>
			<a href="/harvests" class="nav-link">Ernten</a>
			<!-- Story 7.4 AC6: shows count of pending offline entries -->
			<PendingSyncBadge />
		</div>
		<div class="nav-right">
			<span class="nav-username">{data.user.username}</span>
			<form method="POST" action="/logout" use:enhance>
				<button class="logout-button" type="submit">Abmelden</button>
			</form>
		</div>
		<button
			class="hamburger-btn"
			onclick={() => (menuOpen = !menuOpen)}
			aria-label={menuOpen ? 'Menü schließen' : 'Menü öffnen'}
			aria-expanded={menuOpen}
			aria-haspopup="menu"
			aria-controls="mobile-menu-panel"
		>
			{menuOpen ? '✕' : '☰'}
		</button>
	</nav>

	{#if menuOpen}
		<nav class="mobile-menu" id="mobile-menu-panel" aria-label="Mobile Navigation">
			<a href="/hives" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Bienenstöcke</a>
			<a href="/stings" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Stiche</a>
			<a href="/todos" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Aufgaben</a>
			<a href="/harvests" class="mobile-nav-link" onclick={() => (menuOpen = false)}>Ernten</a>
			<div class="mobile-menu-badge">
				<PendingSyncBadge />
			</div>
			<div class="mobile-menu-footer">
				<span class="mobile-username">{data.user.username}</span>
				<form method="POST" action="/logout" use:enhance>
					<button class="logout-button" type="submit">Abmelden</button>
				</form>
			</div>
		</nav>
	{/if}
{/if}

<!-- Story 7.3: sticky offline banner shown on all pages when no connectivity -->
<OfflineBanner />

<main>
	{@render children()}
</main>

<style>
	.title-bar {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.5rem 1.25rem;
		background-color: var(--color-accent, #f59e0b);
	}

	.title-bar__domain {
		font-size: 0.95rem;
		font-weight: 700;
		color: #ffffff;
		letter-spacing: -0.01em;
	}

	.title-bar__name {
		font-size: 0.8rem;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.8);
	}

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

	.hamburger-btn {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1.5rem;
		color: var(--color-text, #1a1a1a);
		padding: 0.25rem 0.5rem;
		line-height: 1;
		min-height: 44px;
	}

	@media (max-width: 640px) {
		.nav-links,
		.nav-right {
			display: none;
		}
		.hamburger-btn {
			display: flex;
			align-items: center;
		}
	}

	.mobile-menu {
		background: var(--color-surface, #ffffff);
		border-bottom: 1px solid var(--color-border, #e5e7eb);
		padding: 0.25rem 0;
	}

	.mobile-nav-link {
		display: flex;
		align-items: center;
		padding: 0.75rem 1.25rem;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		text-decoration: none;
		min-height: 44px;
	}

	.mobile-nav-link:hover {
		background-color: var(--color-hover, #f3f4f6);
		color: var(--color-text, #1a1a1a);
	}

	.mobile-menu-badge {
		padding: 0.5rem 1.25rem;
	}

	.mobile-menu-footer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		border-top: 1px solid var(--color-border, #e5e7eb);
		margin-top: 0.25rem;
	}

	.mobile-username {
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
	}

	.hamburger-btn:focus-visible {
		outline: 2px solid var(--color-accent, #f59e0b);
		outline-offset: 2px;
		border-radius: 4px;
	}

	@media (min-width: 641px) {
		.mobile-menu {
			display: none;
		}
	}
</style>
