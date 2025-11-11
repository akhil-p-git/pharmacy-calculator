<script lang="ts">
	interface Props {
		message: string;
		onRetry?: () => void;
		dismissible?: boolean;
	}

	let { message, onRetry, dismissible = false }: Props = $props();
	let isVisible = $state(true);

	function handleDismiss() {
		isVisible = false;
	}
</script>

{#if isVisible}
	<div class="error-alert">
		<div class="error-content">
			<div class="error-icon">❌</div>
			<div class="error-message">
				<strong>Error:</strong> {message}
			</div>
		</div>
		<div class="error-actions">
			{#if onRetry}
				<button class="button button-retry" onclick={onRetry} type="button">
					<span class="button-icon">🔄</span>
					Retry
				</button>
			{/if}
			{#if dismissible}
				<button class="button button-dismiss" onclick={handleDismiss} type="button" title="Dismiss">
					<span class="button-icon">×</span>
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.error-alert {
		background-color: #fed7d7;
		border: 2px solid #e53e3e;
		border-left-width: 4px;
		border-radius: 6px;
		padding: 1rem 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.error-content {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		flex: 1;
	}

	.error-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.error-message {
		color: #742a2a;
		font-size: 0.9375rem;
		line-height: 1.5;
	}

	.error-message strong {
		font-weight: 600;
	}

	.error-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-shrink: 0;
	}

	.button {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.button-retry {
		background-color: #e53e3e;
		color: white;
	}

	.button-retry:hover {
		background-color: #c53030;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(229, 62, 62, 0.3);
	}

	.button-retry:active {
		transform: translateY(0);
	}

	.button-dismiss {
		background-color: transparent;
		color: #742a2a;
		padding: 0.5rem;
		min-width: auto;
		font-size: 1.25rem;
		line-height: 1;
	}

	.button-dismiss:hover {
		background-color: rgba(114, 42, 42, 0.1);
	}

	.button-icon {
		font-size: 1rem;
		line-height: 1;
	}

	@media (max-width: 640px) {
		.error-alert {
			flex-direction: column;
			align-items: stretch;
		}

		.error-actions {
			justify-content: flex-end;
		}

		.button-retry {
			flex: 1;
			justify-content: center;
		}
	}
</style>

