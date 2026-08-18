<svelte:head>
	<title>Honig — beehiveJournal</title>
</svelte:head>

<div class="page">
	<h1>Honig</h1>

	<ul class="tiles">
		<li>
			<a class="tile" href="/harvests">
				<span class="tile__title">Ernten</span>
				<span class="tile__desc">Erfasste Ernten</span>
			</a>
		</li>
		<li>
			<a class="tile" href="/sells">
				<span class="tile__title">Verkäufe</span>
				<span class="tile__desc">Verkaufsprotokoll</span>
			</a>
		</li>
		<li>
			<a class="tile" href="/honey/containers">
				<span class="tile__title">Behältergrößen</span>
				<span class="tile__desc">Behältertypen verwalten</span>
			</a>
		</li>
	</ul>
</div>

<style>
	.page {
		max-width: 600px;
		margin: 0 auto;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text, #1a1a1a);
		margin: 0 0 1.25rem;
	}

	.tiles {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
	}

	@media (min-width: 641px) {
		.tiles {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.tile {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.25rem;
		min-height: 96px;
		padding: 1rem 1.25rem;
		background: var(--color-surface, #ffffff);
		border: 1.5px solid var(--color-border, #e5e7eb);
		border-radius: 10px;
		text-decoration: none;
		color: var(--color-text, #1a1a1a);
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease;
	}

	.tile:hover {
		background: var(--color-hover, #f3f4f6);
		border-color: var(--color-accent, #f59e0b);
	}

	.tile__title {
		font-size: 1rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.tile__desc {
		font-size: 0.85rem;
		color: var(--color-text-muted, #6b7280);
	}
</style>
