<script lang="ts">
	let { onNavigate }: { onNavigate: (section: string) => void } = $props();

	const quickTips = [
		'Use generic names for better results',
		'NDC format: XXXXX-XXXX-XX',
		'Include strength in drug name',
		'SIG examples: "Take 1 tablet by mouth daily"'
	];
</script>

<div class="landing">
	<div class="hero">
		<h1 class="hero-title">Welcome to MediCalc</h1>
		<p class="hero-subtitle">Your AI-powered prescription fulfillment assistant</p>
		<p class="hero-description">What would you like to do?</p>

		<div class="action-cards">
			<button class="action-card" onclick={() => onNavigate('calculator')}>
				<div class="card-icon">🧮</div>
				<h3 class="card-title">Calculate</h3>
				<p class="card-description">Calculate NDC packaging and quantities for prescriptions</p>
			</button>

			<div class="action-card info-card">
				<div class="card-icon">💡</div>
				<h3 class="card-title">Quick Tips</h3>
				<ul class="tips-list">
					{#each quickTips as tip}
						<li class="tip-item">{tip}</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</div>

<style>
	.landing {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 2rem;
		min-height: calc(100vh - 80px);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hero {
		text-align: center;
		width: 100%;
	}

	.hero-title {
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 900;
		color: #ffffff;
		margin: 0 0 0.75rem 0;
		letter-spacing: -0.02em;
		text-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
	}

	.hero-subtitle {
		color: #ffffff;
		font-size: 1.25rem;
		font-weight: 400;
		margin: 0 0 2rem 0;
		letter-spacing: 0.01em;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.hero-description {
		color: #ffffff;
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 2rem 0;
		text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
	}

	.action-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 2rem;
		max-width: 900px;
		margin: 0 auto;
	}

	.action-card {
		background: var(--card-bg);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 20px;
		padding: 2rem;
		border: 1px solid var(--card-border);
		box-shadow: 0 8px 32px var(--card-shadow);
		transition: all 0.3s ease;
		text-align: center;
		cursor: pointer;
	}

	.action-card:hover {
		transform: translateY(-8px);
		box-shadow: 0 12px 40px rgba(31, 38, 135, 0.4);
		border-color: rgba(102, 126, 234, 0.5);
	}

	.info-card {
		cursor: default;
		text-align: left;
	}

	.info-card:hover {
		transform: translateY(-4px);
	}

	.card-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
		filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.3));
	}

	.card-title {
		font-size: 1.5rem;
		font-weight: 700;
		background: linear-gradient(135deg, #667eea, #764ba2);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 0.75rem 0;
	}

	.card-description {
		color: var(--text-secondary);
		font-size: 1rem;
		line-height: 1.6;
		margin: 0;
	}

	.tips-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.tip-item {
		color: var(--text-secondary);
		font-size: 0.9375rem;
		line-height: 1.6;
		padding-left: 1.5rem;
		position: relative;
	}

	.tip-item::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: #667eea;
		font-weight: bold;
		font-size: 1.125rem;
	}

	@media (max-width: 768px) {
		.landing {
			padding: 1.5rem 1rem;
		}

		.hero-title {
			font-size: 2rem;
		}

		.hero-subtitle {
			font-size: 1.125rem;
			margin-bottom: 1.5rem;
		}

		.hero-description {
			font-size: 1.25rem;
			margin-bottom: 1.5rem;
		}

		.action-cards {
			grid-template-columns: 1fr;
		}
	}
</style>
