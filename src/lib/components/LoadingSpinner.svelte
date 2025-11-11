<script lang="ts">
	interface Props {
		message?: string;
		size?: 'small' | 'medium' | 'large';
	}

	let { message = 'Loading...', size = 'medium' }: Props = $props();
</script>

<div class="loading-container" class:size-{size}>
	<div class="spinner"></div>
	{#if message}
		<p class="message">{message}</p>
	{/if}
</div>

<style>
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
	}

	.spinner {
		border: 3px solid #e2e8f0;
		border-top-color: #3182ce;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.size-small .spinner {
		width: 24px;
		height: 24px;
		border-width: 2px;
	}

	.size-medium .spinner {
		width: 40px;
		height: 40px;
		border-width: 3px;
	}

	.size-large .spinner {
		width: 64px;
		height: 64px;
		border-width: 4px;
	}

	.message {
		color: #4a5568;
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
	}

	.size-small .message {
		font-size: 0.75rem;
	}

	.size-large .message {
		font-size: 1rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>

