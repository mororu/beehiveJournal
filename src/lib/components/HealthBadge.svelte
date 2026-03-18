<script lang="ts">
	/** Health score 1–5 */
	let { score }: { score: number } = $props();

	const colorClass = $derived(
		score <= 2 ? 'badge--red' : score === 3 ? 'badge--amber' : 'badge--green'
	);

	const label = $derived(
		score === 1
			? 'Critical'
			: score === 2
				? 'Poor'
				: score === 3
					? 'Fair'
					: score === 4
						? 'Good'
						: 'Excellent'
	);
</script>

<span
	class="health-badge {colorClass}"
	title="Health: {label}"
	aria-label="Health score {score} — {label}"
>
	{score}
</span>

<style>
	.health-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		font-size: 0.8rem;
		font-weight: 700;
		color: #ffffff;
		flex-shrink: 0;
	}

	.badge--red {
		background-color: #dc2626;
	}

	.badge--amber {
		background-color: #d97706;
	}

	.badge--green {
		background-color: #16a34a;
	}
</style>
