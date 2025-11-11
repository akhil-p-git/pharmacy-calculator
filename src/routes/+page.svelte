<script lang="ts">
	import type { CalculationResult } from '$lib/types';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import ErrorAlert from '$lib/components/ErrorAlert.svelte';
	import WarningBadge from '$lib/components/WarningBadge.svelte';

	let drugNameOrNDC = $state('');
	let sig = $state('');
	let daysSupply = $state(30);
	let loading = $state(false);
	let result: CalculationResult | null = $state(null);
	let error: string | null = $state(null);
	let showAlternatives = $state(false);
	let copiedNDC = $state<string | null>(null);

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
	<title>NDC Packaging & Quantity Calculator</title>
	<style>
		:global(body) {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
				sans-serif;
			background: #f5f7fa;
			margin: 0;
			padding: 0;
		}
	</style>
</svelte:head>

<div class="container">
	<header class="header">
		<h1>NDC Packaging & Quantity Calculator</h1>
		<p class="subtitle">AI-powered prescription fulfillment assistant</p>
	</header>

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

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.header h1 {
		color: #1a365d;
		font-size: 2rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #4a5568;
		font-size: 1rem;
		margin: 0;
	}

	.form-container {
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.form {
		margin-bottom: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.label {
		display: block;
		font-weight: 500;
		color: #2d3748;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.required {
		color: #e53e3e;
	}

	.input,
	.textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #cbd5e0;
		border-radius: 4px;
		font-size: 1rem;
		font-family: inherit;
		transition: border-color 0.2s;
		box-sizing: border-box;
	}

	.input:focus,
	.textarea:focus {
		outline: none;
		border-color: #3182ce;
		box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
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
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.button-primary {
		background-color: #3182ce;
		color: white;
	}

	.button-primary:hover:not(:disabled) {
		background-color: #2c5aa0;
	}

	.button-secondary {
		background-color: #e2e8f0;
		color: #2d3748;
	}

	.button-secondary:hover {
		background-color: #cbd5e0;
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
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.results {
		margin-top: 2rem;
	}

	.results-title {
		color: #1a365d;
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 1.5rem 0;
	}

	.result-section {
		margin-bottom: 2rem;
	}

	.result-section h3 {
		color: #2d3748;
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e2e8f0;
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
		color: #4a5568;
		min-width: 180px;
	}

	.result-value {
		color: #2d3748;
	}

	.result-value-highlight {
		font-weight: 600;
		color: #3182ce;
		font-size: 1.125rem;
	}

	.ndc-card {
		background: #f7fafc;
		border: 1px solid #e2e8f0;
		border-radius: 6px;
		padding: 1.25rem;
		margin-bottom: 1rem;
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
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.badge-success {
		background-color: #c6f6d5;
		color: #22543d;
	}

	.badge-warning {
		background-color: #feebc8;
		color: #744210;
	}

	.badge-info {
		background-color: #bee3f8;
		color: #2c5282;
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

	@media (max-width: 640px) {
		.container {
			padding: 1rem 0.5rem;
		}

		.form-container {
			padding: 1.5rem;
		}

		.header h1 {
			font-size: 1.5rem;
		}

		.ndc-details {
			grid-template-columns: 1fr;
		}

		.form-actions {
			flex-direction: column;
		}

		.button {
			width: 100%;
		}
	}
</style>
