<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let isOpen = $state(false);

	const popularDrugs = [
		'Lisinopril 10mg',
		'Metformin 500mg',
		'Atorvastatin 20mg',
		'Amlodipine 5mg',
		'Omeprazole 20mg'
	];

	const quickTips = [
		'Use generic names for better results',
		'NDC format: XXXXX-XXXX-XX',
		'Include strength in drug name',
		'SIG examples: "Take 1 tablet by mouth daily"'
	];

	// Use Svelte 5 runes syntax for props
	let { onDrugSelect }: { onDrugSelect: (drugName: string) => void } = $props();

	function handleDrugClick(drug: string) {
		onDrugSelect(drug);
		// Close sidebar on mobile after selection
		if (typeof window !== 'undefined' && window.innerWidth < 1280) {
			isOpen = false;
		}
	}

	function toggleSidebar() {
		isOpen = !isOpen;
	}

	function closeSidebar() {
		isOpen = false;
	}

	// Check if we're on desktop (show by default) or mobile/tablet (hide by default)
	let isDesktop = $state(false);

	// Handle escape key to close sidebar
	function handleEscape(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen && !isDesktop) {
			closeSidebar();
		}
	}

	// Handle viewport resize
	function checkViewport() {
		if (typeof window === 'undefined') return;
		const wasDesktop = isDesktop;
		isDesktop = window.innerWidth >= 1280;
		if (isDesktop && !wasDesktop) {
			isOpen = true; // Open when switching to desktop
		} else if (!isDesktop && wasDesktop) {
			isOpen = false; // Close when switching to mobile/tablet
		}
	}

	onMount(() => {
		if (typeof window === 'undefined') return;

		// Initial check
		isDesktop = window.innerWidth >= 1280;
		if (isDesktop) {
			isOpen = true; // Always open on desktop
		}

		window.addEventListener('keydown', handleEscape);
		window.addEventListener('resize', checkViewport);
	});

	onDestroy(() => {
		if (typeof window === 'undefined') return;
		window.removeEventListener('keydown', handleEscape);
		window.removeEventListener('resize', checkViewport);
	});
</script>

<!-- Toggle button for mobile/tablet -->
{#if !isDesktop}
	<button
		class="sidebar-toggle"
		class:hidden={isOpen}
		onclick={toggleSidebar}
		aria-label="Toggle sidebar"
		aria-expanded={isOpen}
	>
		☰
	</button>
{/if}

<!-- Backdrop overlay -->
{#if isOpen && !isDesktop}
	<div class="backdrop" onclick={closeSidebar}></div>
{/if}

<!-- Sidebar -->
<aside class="sidebar" class:open={isOpen} aria-label="Sidebar navigation">
	{#if !isDesktop}
		<button class="close-button" onclick={closeSidebar} aria-label="Close sidebar">✕</button>
	{/if}

	<!-- Quick Tips Section -->
	<section class="sidebar-section">
		<h3 class="section-title">
			<span class="section-icon">💡</span>
			Quick Tips
		</h3>
		<div class="tips-card">
			<ul class="tips-list">
				{#each quickTips as tip}
					<li class="tip-item">{tip}</li>
				{/each}
			</ul>
		</div>
	</section>

	<!-- Popular Drugs Section -->
	<section class="sidebar-section">
		<h3 class="section-title">
			<span class="section-icon">💊</span>
			Popular Drugs
		</h3>
		<div class="drug-list">
			{#each popularDrugs as drug}
				<button class="drug-item" onclick={() => handleDrugClick(drug)}>
					{drug}
				</button>
			{/each}
		</div>
	</section>
</aside>

<style>
	.sidebar-toggle {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 60;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 2px solid rgba(102, 126, 234, 0.3);
		border-radius: 12px;
		padding: 0.75rem;
		cursor: pointer;
		font-size: 1.25rem;
		color: #667eea;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.sidebar-toggle:hover {
		background: white;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
	}

	.sidebar-toggle.hidden {
		opacity: 0;
		pointer-events: none;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		z-index: 40;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.sidebar {
		position: fixed;
		top: 2rem;
		left: 2rem;
		width: 320px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 20px;
		box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
		border: 1px solid rgba(255, 255, 255, 0.3);
		padding: 1.5rem;
		z-index: 50;
		max-height: calc(100vh - 4rem);
		overflow-y: auto;
		will-change: transform;
		animation: slideInLeft 0.6s ease-out 0.3s both;
	}

	.sidebar:not(.open) {
		transform: translateX(-100%);
		opacity: 0;
		pointer-events: none;
	}

	@keyframes slideInLeft {
		from {
			opacity: 0;
			transform: translateX(-100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.close-button {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: rgba(102, 126, 234, 0.1);
		border: 2px solid rgba(102, 126, 234, 0.2);
		border-radius: 8px;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 1.25rem;
		color: #667eea;
		transition: all 0.2s ease;
	}

	.close-button:hover {
		background: rgba(102, 126, 234, 0.2);
		border-color: rgba(102, 126, 234, 0.4);
		transform: scale(1.1);
	}

	.sidebar-section {
		margin-bottom: 2rem;
	}

	.sidebar-section:last-child {
		margin-bottom: 0;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: #2d3748;
		margin: 0 0 1rem 0;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid rgba(102, 126, 234, 0.2);
	}

	.section-icon {
		font-size: 1.25rem;
	}

	.tips-card {
		background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(240, 147, 251, 0.05));
		border: 2px solid rgba(102, 126, 234, 0.2);
		border-radius: 12px;
		padding: 1rem;
	}

	.tips-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.tip-item {
		color: #4a5568;
		font-size: 0.875rem;
		line-height: 1.5;
		padding-left: 1.25rem;
		position: relative;
	}

	.tip-item::before {
		content: '•';
		position: absolute;
		left: 0;
		color: #667eea;
		font-weight: bold;
		font-size: 1.25rem;
	}

	.drug-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.drug-item {
		width: 100%;
		padding: 0.875rem 1rem;
		background: rgba(255, 255, 255, 0.9);
		border: 2px solid rgba(102, 126, 234, 0.2);
		border-radius: 12px;
		font-size: 0.9375rem;
		font-weight: 500;
		color: #2d3748;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.drug-item:hover {
		background: white;
		border-color: #667eea;
		transform: translateX(4px) scale(1.02);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
	}

	.drug-item:active {
		transform: translateX(2px) scale(1);
	}

	/* Mobile/Tablet styles */
	@media (max-width: 1279px) {
		.sidebar {
			width: calc(100vw - 4rem);
			max-width: 400px;
			top: 1rem;
			left: 1rem;
			z-index: 100;
		}

		.sidebar.open {
			animation: slideInLeft 0.3s ease-out;
		}
	}

	/* Mobile specific */
	@media (max-width: 767px) {
		.sidebar {
			width: calc(100vw - 2rem);
			max-width: none;
		}
	}

	/* Desktop: always visible */
	@media (min-width: 1280px) {
		.sidebar {
			position: fixed;
			transform: translateX(0);
			opacity: 1;
			pointer-events: auto;
		}
	}

	/* Scrollbar styling */
	.sidebar::-webkit-scrollbar {
		width: 6px;
	}

	.sidebar::-webkit-scrollbar-track {
		background: rgba(102, 126, 234, 0.05);
		border-radius: 10px;
	}

	.sidebar::-webkit-scrollbar-thumb {
		background: rgba(102, 126, 234, 0.3);
		border-radius: 10px;
	}

	.sidebar::-webkit-scrollbar-thumb:hover {
		background: rgba(102, 126, 234, 0.5);
	}
</style>

