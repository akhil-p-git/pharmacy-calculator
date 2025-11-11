<script lang="ts">
	interface Props {
		warnings: string[];
	}

	let { warnings }: Props = $props();
</script>

{#if warnings && warnings.length > 0}
	<div class="warnings-container">
		{#each warnings as warning}
			<div class="warning-badge">
				<span class="warning-icon">⚠️</span>
				<span class="warning-text">{warning}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.warnings-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.warning-badge {
		background: #fef3c7;
		color: #92400e;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-left: 3px solid #f59e0b;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.warning-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.warning-text {
		flex: 1;
	}
</style>

