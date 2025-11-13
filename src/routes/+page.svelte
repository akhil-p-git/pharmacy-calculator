<script lang="ts">
	import type { CalculationResult } from '$lib/types';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import WarningBadge from '$lib/components/WarningBadge.svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import LandingPage from '$lib/components/LandingPage.svelte';

	let currentSection = $state('home');
	let drugNameOrNDC = $state('');
	let sig = $state('');
	let daysSupply = $state(30);
	let loading = $state(false);
	let result: CalculationResult | null = $state(null);
	let error: string | null = $state(null);
	let showAlternatives = $state(false);
	let copiedNDC = $state<string | null>(null);

	function handleNavigation(section: string) {
		currentSection = section;
		// Scroll to top on navigation
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function copyNDC(ndc: string) {
		navigator.clipboard.writeText(ndc).then(() => {
			copiedNDC = ndc;
			setTimeout(() => {
				copiedNDC = null;
			}, 2000);
		});
	}

	async function handleSubmit() {
		// Reset state
		loading = true;
		error = null;
		result = null;

		// Basic client-side validation
		if (!drugNameOrNDC.trim()) {
			error = 'Drug name or NDC is required';
			loading = false;
			return;
		}

		if (!sig.trim()) {
			error = 'Prescription instructions are required';
			loading = false;
			return;
		}

		if (daysSupply < 1 || daysSupply > 365) {
			error = 'Days supply must be between 1 and 365';
			loading = false;
			return;
		}

		try {
			const response = await fetch('/api/calculate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					drugNameOrNDC: drugNameOrNDC.trim(),
					sig: sig.trim(),
					daysSupply
				})
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				// Handle validation errors or API errors
				if (data.error) {
					if (data.error.details && Array.isArray(data.error.details)) {
						error = data.error.details.join(', ');
					} else {
						error = data.error.message || 'An error occurred';
					}
				} else if (data.errors && Array.isArray(data.errors)) {
					error = data.errors.join(', ');
				} else if (data.message) {
					error = data.message;
				} else {
					error = `HTTP ${response.status}: ${response.statusText}`;
				}
			} else {
				// Success - extract data from wrapped response
				if (data.success && data.data) {
					result = data.data;
				} else {
					error = 'Invalid response format';
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
			console.error('Calculation error:', err);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		drugNameOrNDC = '';
		sig = '';
		daysSupply = 30;
		result = null;
		error = null;
		showAlternatives = false;
		copiedNDC = null;
	}
</script>

<svelte:head>
	<title>MediCalc - NDC Packaging & Quantity Calculator</title>
	<style>
		:global(body) {
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
			background-attachment: fixed;
			margin: 0;
			padding: 0;
			min-height: 100vh;
		}
	</style>
</svelte:head>

<Navbar onNavigate={handleNavigation} />

<div class="page-content">
	{#if currentSection === 'home'}
		<LandingPage onNavigate={handleNavigation} />
	{:else if currentSection === 'calculator'}
		<div class="calculator-section">

	<div class="form-container">
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="form">
			<div class="form-group">
				<label for="drugNameOrNDC" class="label">
					Drug Name or NDC <span class="required">*</span>
				</label>
				<input
					type="text"
					id="drugNameOrNDC"
					bind:value={drugNameOrNDC}
					placeholder="e.g., Lisinopril 10mg or 00000-0000-00"
					class="input"
					disabled={loading}
					required
				/>
			</div>

			<div class="form-group">
				<label for="sig" class="label">
					Prescription Instructions (SIG) <span class="required">*</span>
				</label>
				<textarea
					id="sig"
					bind:value={sig}
					placeholder="e.g., Take 1 tablet by mouth daily"
					class="textarea"
					rows="3"
					disabled={loading}
					required
				></textarea>
			</div>

			<div class="form-group">
				<label for="daysSupply" class="label">
					Days Supply <span class="required">*</span>
				</label>
				<input
					type="number"
					id="daysSupply"
					bind:value={daysSupply}
					min="1"
					max="365"
					class="input input-number"
					disabled={loading}
					required
				/>
			</div>

			<div class="form-actions">
				<button type="submit" class="button button-primary" disabled={loading}>
					{#if loading}
						<span class="spinner-inline"></span>
						Calculating...
					{:else}
						Calculate
					{/if}
				</button>
				{#if result || error}
					<button type="button" class="button button-secondary" onclick={resetForm}>
						Reset
					</button>
				{/if}
			</div>
		</form>

		{#if loading}
			<LoadingSpinner message="Calculating..." size="large" />
		{/if}

		{#if error}
			<ErrorAlert message={error} onRetry={handleSubmit} dismissible={true} />
		{/if}

		{#if result}
			<div class="results card">
				<h2 class="results-title">Calculation Results</h2>

				{#if result.normalizedDrug}
					<div class="result-section">
						<h3>💊 Drug Information</h3>
						<div class="result-item">
							<span class="result-label">Name:</span>
							<span class="result-value">{result.normalizedDrug.name}</span>
						</div>
						<div class="result-item">
							<span class="result-label">RxCUI:</span>
							<span class="result-value">{result.normalizedDrug.rxcui}</span>
						</div>
					</div>
				{/if}

				{#if result.parsedSIG}
					<div class="result-section">
						<h3>📋 Parsed Instructions</h3>
						<div class="result-item">
							<span class="result-label">Dose:</span>
							<span class="result-value">{result.parsedSIG.dose} {result.parsedSIG.doseUnit}</span>
						</div>
						<div class="result-item">
							<span class="result-label">Frequency:</span>
							<span class="result-value">
								{result.parsedSIG.frequency === 0
									? 'As needed (PRN)'
									: `${result.parsedSIG.frequency} time${result.parsedSIG.frequency > 1 ? 's' : ''} per day`}
							</span>
						</div>
						<div class="result-item">
							<span class="result-label">Route:</span>
							<span class="result-value">{result.parsedSIG.route}</span>
						</div>
						<div class="result-item">
							<span class="result-label">Instructions:</span>
							<span class="result-value">{result.parsedSIG.instructions}</span>
						</div>
						{#if result.parsedSIG.isAmbiguous}
							<div class="alert alert-warning">
								<strong>Note:</strong> {result.parsedSIG.clarificationNeeded ||
									'Prescription instructions are ambiguous'}
							</div>
						{/if}
					</div>
				{/if}

				{#if result.calculation}
					<div class="result-section">
						<h3>🔢 Quantity Calculation</h3>
						<div class="result-item">
							<span class="result-label">Total Quantity Needed:</span>
							<span class="result-value result-value-highlight">
								{result.calculation.totalQuantityNeeded} {result.calculation.unit}
							</span>
						</div>
						<div class="result-item">
							<span class="result-label">Daily Dose:</span>
							<span class="result-value">{result.calculation.dailyDose} {result.calculation.unit}</span>
						</div>
						<div class="result-item">
							<span class="result-label">Days Supply:</span>
							<span class="result-value">{result.calculation.daysSupply} days</span>
						</div>
					</div>
				{/if}

				{#if result.selectedNDCs && result.selectedNDCs.length > 0}
					<div class="result-section">
						<h3>✅ Selected NDC Package(s)</h3>
						{#each result.selectedNDCs as ndc}
							<div class="ndc-card">
								<div class="ndc-header">
									<div class="ndc-code-container">
										<span class="ndc-code">{ndc.ndc}</span>
										<button
											type="button"
											class="button-copy"
											onclick={() => copyNDC(ndc.ndc)}
											title="Copy NDC"
										>
											{copiedNDC === ndc.ndc ? '✓ Copied' : '📋 Copy'}
										</button>
									</div>
									<div class="ndc-badges">
										{#if ndc.overfillPercentage > 10}
											<span class="badge badge-warning">
												{ndc.overfillPercentage.toFixed(1)}% overfill
											</span>
										{:else if ndc.overfillPercentage > 0}
											<span class="badge badge-info">
												{ndc.overfillPercentage.toFixed(1)}% overfill
											</span>
										{:else}
											<span class="badge badge-success">Exact match</span>
										{/if}
									</div>
								</div>
								<div class="ndc-details">
									<div class="ndc-detail-item">
										<span class="ndc-label">Product:</span>
										<span>{ndc.productName}</span>
									</div>
									<div class="ndc-detail-item">
										<span class="ndc-label">Manufacturer:</span>
										<span>{ndc.manufacturer}</span>
									</div>
									<div class="ndc-detail-item">
										<span class="ndc-label">Package Size:</span>
										<span>{ndc.packageSize} {ndc.packageUnit}</span>
									</div>
									<div class="ndc-detail-item">
										<span class="ndc-label">Quantity to Dispense:</span>
										<span class="ndc-value-highlight">{ndc.quantityToDispense} {ndc.packageUnit}</span>
									</div>
									<div class="ndc-detail-item">
										<span class="ndc-label">Number of Packages:</span>
										<span class="ndc-value-highlight">{ndc.numberOfPackages}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if result.alternativeNDCs && result.alternativeNDCs.length > 0}
					<div class="result-section">
						<button
							type="button"
							class="toggle-alternatives"
							onclick={() => (showAlternatives = !showAlternatives)}
						>
							<span class="toggle-icon">{showAlternatives ? '▼' : '▶'}</span>
							Alternative NDC Options ({result.alternativeNDCs.length})
						</button>
						{#if showAlternatives}
							<div class="alternatives-container">
								{#each result.alternativeNDCs as ndc}
							<div class="ndc-card ndc-card-alternative">
								<div class="ndc-header">
									<span class="ndc-code">{ndc.ndc}</span>
									<span class="badge badge-info">Alternative</span>
								</div>
								<div class="ndc-details">
									<div class="ndc-detail-item">
										<span class="ndc-label">Product:</span>
										<span>{ndc.productName}</span>
									</div>
									<div class="ndc-detail-item">
										<span class="ndc-label">Package Size:</span>
										<span>{ndc.packageSize} {ndc.packageUnit}</span>
									</div>
									<div class="ndc-detail-item">
										<span class="ndc-label">Quantity to Dispense:</span>
										<span>{ndc.quantityToDispense} {ndc.packageUnit}</span>
									</div>
									<div class="ndc-detail-item">
										<span class="ndc-label">Number of Packages:</span>
										<span>{ndc.numberOfPackages}</span>
									</div>
								</div>
							</div>
							{/each}
							</div>
						{/if}
					</div>
				{/if}

				{#if result.warnings && result.warnings.length > 0}
					<div class="result-section">
						<h3>Warnings</h3>
						<WarningBadge warnings={result.warnings} />
					</div>
				{/if}

				{#if result.errors && result.errors.length > 0}
					<div class="result-section">
						<h3>Errors</h3>
						<div class="errors-list">
							{#each result.errors as err}
								<div class="alert alert-error">{err}</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
		</div>
		</div>
	{:else}
		<div class="placeholder-section">
			<h2>Coming Soon</h2>
			<p>This section is under construction.</p>
		</div>
	{/if}
</div>

<style>
	/* CSS Variables for Theme Support */
	:root,
	:global([data-theme='light']) {
		--bg-gradient-start: #667eea;
		--bg-gradient-end: #764ba2;
		--text-primary: #2d3748;
		--text-secondary: #4a5568;
		--text-light: #718096;
		--text-on-gradient: rgba(255, 255, 255, 0.95);
		--card-bg: rgba(255, 255, 255, 0.95);
		--card-border: rgba(255, 255, 255, 0.3);
		--card-shadow: rgba(31, 38, 135, 0.37);
		--navbar-bg: rgba(255, 255, 255, 0.95);
		--navbar-border: rgba(102, 126, 234, 0.2);
		--input-bg: #ffffff;
		--input-border: rgba(102, 126, 234, 0.3);
		--button-gradient-start: #667eea;
		--button-gradient-end: #764ba2;
		--button-shadow: rgba(102, 126, 234, 0.3);
		--badge-bg: rgba(102, 126, 234, 0.1);
		--badge-text: #667eea;
	}

	:global([data-theme='dark']) {
		--bg-gradient-start: #1a0b2e;
		--bg-gradient-end: #2d1b4e;
		--text-primary: #e2e8f0;
		--text-secondary: #cbd5e0;
		--text-light: #a0aec0;
		--text-on-gradient: rgba(255, 255, 255, 0.95);
		--card-bg: rgba(30, 20, 60, 0.85);
		--card-border: rgba(147, 167, 255, 0.2);
		--card-shadow: rgba(0, 0, 0, 0.5);
		--navbar-bg: rgba(30, 20, 60, 0.95);
		--navbar-border: rgba(147, 167, 255, 0.2);
		--input-bg: rgba(20, 15, 40, 0.8);
		--input-border: rgba(147, 167, 255, 0.3);
		--button-gradient-start: #7c3aed;
		--button-gradient-end: #a855f7;
		--button-shadow: rgba(124, 58, 237, 0.4);
		--badge-bg: rgba(147, 167, 255, 0.15);
		--badge-text: #a5b4fc;
	}

	/* Smooth transitions for theme changes */
	:global(*) {
		transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
	}

	.page-content {
		padding-top: 80px; /* Account for fixed navbar */
		min-height: calc(100vh - 80px);
	}

	.calculator-section {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.placeholder-section {
		max-width: 800px;
		margin: 0 auto;
		padding: 4rem 2rem;
		text-align: center;
		color: white;
	}

	.placeholder-section h2 {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.placeholder-section p {
		font-size: 1.25rem;
		opacity: 0.9;
	}

	.form-container {
		background: var(--card-bg);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 20px;
		box-shadow: 0 8px 32px 0 var(--card-shadow);
		border: 1px solid var(--card-border);
		padding: 2.5rem;
		margin-bottom: 2rem;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
	}

	.form-container:hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.45);
	}

	.form {
		margin-bottom: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.label {
		display: block;
		font-weight: 600;
		color: #4a5568;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.required {
		color: #e53e3e;
	}

	.input,
	.textarea {
		width: 100%;
		padding: 0.875rem 1.125rem;
		border: 2px solid rgba(102, 126, 234, 0.2);
		border-radius: 12px;
		font-size: 1rem;
		font-family: inherit;
		transition: all 0.3s ease;
		box-sizing: border-box;
		background: var(--input-bg);
	}

	.input:focus,
	.textarea:focus {
		outline: none;
		border-color: #667eea;
		box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
		transform: translateY(-2px);
		background: var(--input-bg);
	}

	.input:disabled,
	.textarea:disabled {
		background-color: #f7fafc;
		cursor: not-allowed;
	}

	.textarea {
		resize: vertical;
		min-height: 80px;
	}

	.input-number {
		width: 150px;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.button {
		padding: 1rem 2rem;
		border: none;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		letter-spacing: 0.025em;
	}

	.button-primary {
		background: linear-gradient(135deg, var(--button-gradient-start) 0%, var(--button-gradient-end) 100%);
		color: white;
		box-shadow: 0 4px 15px 0 var(--button-shadow);
	}

	.button-primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px 0 rgba(102, 126, 234, 0.5);
	}

	.button-primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.button-secondary {
		background: var(--card-bg);
		color: #667eea;
		border: 2px solid #667eea;
		box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
	}

	.button-secondary:hover {
		background: white;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
	}

	.button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
	}

	.spinner-inline {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		display: inline-block;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.alert {
		padding: 1rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.alert-error {
		background-color: #fed7d7;
		color: #742a2a;
		border-left: 4px solid #e53e3e;
	}

	.alert-warning {
		background-color: #feebc8;
		color: #744210;
		border-left: 4px solid #dd6b20;
	}

	.card {
		background: var(--card-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border-radius: 20px;
		padding: 2rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
		border: 1px solid var(--card-border);
		transition: transform 0.3s ease, box-shadow 0.3s ease;
	}

	.card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
	}

	.results {
		margin-top: 2rem;
		animation: slideUp 0.6s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.results-title {
		font-size: 1.75rem;
		font-weight: 700;
		background: linear-gradient(135deg, #667eea, #764ba2);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin: 0 0 1.5rem 0;
	}

	.result-section {
		margin-bottom: 2rem;
	}

	.result-section h3 {
		color: var(--text-primary);
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid rgba(102, 126, 234, 0.2);
	}

	.result-item {
		display: flex;
		padding: 0.75rem 0;
		border-bottom: 1px solid #f7fafc;
	}

	.result-item:last-child {
		border-bottom: none;
	}

	.result-label {
		font-weight: 500;
		color: var(--text-secondary);
		min-width: 180px;
	}

	.result-value {
		color: var(--text-primary);
	}

	.result-value-highlight {
		font-weight: 600;
		color: #3182ce;
		font-size: 1.125rem;
	}

	.ndc-card {
		background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(240, 147, 251, 0.05));
		border: 2px solid rgba(102, 126, 234, 0.2);
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1rem;
		transition: all 0.3s ease;
	}

	.ndc-card:hover {
		transform: translateX(4px);
		border-color: rgba(102, 126, 234, 0.4);
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
	}

	.ndc-card-alternative {
		background: #fef5e7;
		border-color: #fbd38d;
	}

	.ndc-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e2e8f0;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.ndc-code-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.button-copy {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		background: #e2e8f0;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		color: #2d3748;
	}

	.button-copy:hover {
		background: #cbd5e0;
		transform: translateY(-1px);
	}

	.ndc-badges {
		display: flex;
		gap: 0.5rem;
	}

	.ndc-code {
		font-family: 'Courier New', monospace;
		font-weight: 600;
		color: #2d3748;
		font-size: 1.125rem;
	}

	.badge {
		padding: 0.375rem 0.875rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge-success {
		background: linear-gradient(135deg, #48bb78, #38a169);
		color: white;
	}

	.badge-warning {
		background: linear-gradient(135deg, #ed8936, #dd6b20);
		color: white;
	}

	.badge-info {
		background: linear-gradient(135deg, #4299e1, #3182ce);
		color: white;
	}

	.ndc-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 0.75rem;
	}

	.ndc-detail-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.ndc-label {
		font-size: 0.875rem;
		color: #718096;
		font-weight: 500;
	}

	.ndc-value-highlight {
		font-weight: 600;
		color: #3182ce;
		font-size: 1rem;
	}

	.warnings-list,
	.errors-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.toggle-alternatives {
		width: 100%;
		padding: 0.75rem 1rem;
		background: #f7fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		color: #2d3748;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
		margin-bottom: 1rem;
	}

	.toggle-alternatives:hover {
		background: #edf2f7;
		border-color: #cbd5e0;
	}

	.toggle-icon {
		font-size: 0.75rem;
		transition: transform 0.2s;
	}

	.alternatives-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1rem;
	}

	@media (max-width: 768px) {
		.calculator-section {
			padding: 1rem;
		}

		.form-container {
			padding: 1.5rem;
			border-radius: 16px;
		}

		.form-actions {
			flex-direction: column;
		}

		.button {
			width: 100%;
		}

		.ndc-details {
			grid-template-columns: 1fr;
		}
	}
</style>
