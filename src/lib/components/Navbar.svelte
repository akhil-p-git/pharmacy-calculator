<script lang="ts">
	import { onMount } from 'svelte';

	let { onNavigate }: { onNavigate?: (section: string) => void } = $props();

	let theme = $state<'light' | 'dark'>('light');

	function handleNav(section: string) {
		if (onNavigate) {
			onNavigate(section);
		}
	}

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		if (typeof window !== 'undefined') {
			localStorage.setItem('theme', theme);
			document.documentElement.setAttribute('data-theme', theme);
		}
	}

	onMount(() => {
		if (typeof window === 'undefined') return;

		// Check localStorage or system preference
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

		theme = savedTheme || (prefersDark ? 'dark' : 'light');
		document.documentElement.setAttribute('data-theme', theme);
	});
</script>

<nav class="navbar">
	<div class="navbar-container">
		<!-- Logo -->
		<button class="logo" onclick={() => handleNav('home')}>
			<span class="logo-icon">💊</span>
			<span class="logo-text">MediCalc</span>
		</button>

		<!-- Theme Toggle -->
		<button
			class="theme-toggle"
			onclick={toggleTheme}
			aria-label="Toggle theme"
			title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
		>
			{#if theme === 'light'}
				<span class="theme-icon">🌙</span>
			{:else}
				<span class="theme-icon">☀️</span>
			{/if}
		</button>

		<!-- Navigation Links -->
		<div class="nav-links">
			<button class="nav-link" onclick={() => handleNav('calculator')}>Calculator</button>
			<button class="nav-link" onclick={() => handleNav('contact')}>Contact Us</button>
		</div>

		<!-- Auth Buttons -->
		<div class="auth-buttons">
			<button class="btn btn-secondary" onclick={() => handleNav('login')}>Login</button>
			<button class="btn btn-primary" onclick={() => handleNav('signup')}>Sign Up</button>
		</div>
	</div>
</nav>

<style>
	.navbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 1000;
		background: var(--navbar-bg);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-bottom: 1px solid var(--navbar-border);
		box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
	}

	.navbar-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.5rem;
		font-weight: 700;
		background: none;
		border: none;
		cursor: pointer;
		transition: transform 0.2s ease;
		padding: 0;
	}

	.logo:hover {
		transform: scale(1.05);
	}

	.logo-icon {
		font-size: 2rem;
		filter: drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3));
	}

	.logo-text {
		background: linear-gradient(135deg, #667eea, #764ba2);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		letter-spacing: -0.02em;
	}

	.theme-toggle {
		background: rgba(102, 126, 234, 0.1);
		border: 2px solid rgba(102, 126, 234, 0.3);
		border-radius: 10px;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 1rem;
	}

	.theme-toggle:hover {
		background: rgba(102, 126, 234, 0.2);
		border-color: #667eea;
		transform: translateY(-2px);
	}

	.theme-icon {
		font-size: 1.25rem;
		display: block;
		transition: transform 0.3s ease;
	}

	.theme-toggle:hover .theme-icon {
		transform: rotate(20deg) scale(1.1);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
		flex: 1;
		justify-content: center;
	}

	.nav-link {
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		transition: all 0.2s ease;
	}

	.nav-link:hover {
		color: #667eea;
		background: rgba(102, 126, 234, 0.1);
	}

	.auth-buttons {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.btn {
		padding: 0.625rem 1.5rem;
		border: none;
		border-radius: 10px;
		font-size: 0.9375rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		letter-spacing: 0.01em;
	}

	.btn-primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
	}

	.btn-secondary {
		background: transparent;
		color: #667eea;
		border: 2px solid rgba(102, 126, 234, 0.3);
	}

	.btn-secondary:hover {
		background: rgba(102, 126, 234, 0.1);
		border-color: #667eea;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.navbar-container {
			padding: 0.875rem 1rem;
		}

		.nav-links {
			display: none;
		}

		.logo-text {
			font-size: 1.25rem;
		}

		.auth-buttons {
			gap: 0.5rem;
		}

		.btn {
			padding: 0.5rem 1rem;
			font-size: 0.875rem;
		}
	}

	@media (max-width: 480px) {
		.btn-secondary {
			display: none;
		}
	}
</style>
