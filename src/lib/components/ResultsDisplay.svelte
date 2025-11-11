<script lang="ts">
	import type { CalculationResult } from '$lib/types';

	interface Props {
		calculationResult: CalculationResult;
	}

	let { calculationResult }: Props = $props();
	let showAlternatives = $state(false);
	let copiedNDC = $state<string | null>(null);

	function copyToClipboard(text: string, ndc: string) {
		navigator.clipboard.writeText(text).then(() => {
			copiedNDC = ndc;
			setTimeout(() => {
				copiedNDC = null;
			}, 2000);
		});
	}

	function getOverfillClass(percentage: number): string {
		if (percentage === 0) return 'overfill-exact';
		if (percentage <= 10) return 'overfill-low';
		if (percentage <= 20) return 'overfill-medium';
		return 'overfill-high';
	}

	function getOverfillLabel(percentage: number): string {
		if (percentage === 0) return 'Exact Match';
		if (percentage <= 10) return 'Minimal Overfill';
		if (percentage <= 20) return 'Moderate Overfill';
		return 'High Overfill';
	}
</script>

<div class="results-display">
	{#if calculationResult.normalizedDrug}
		<section class="section section-drug">
			<h2 class="section-title">
				<span class="icon">💊</span>
				Drug Information
			</h2>
			<div class="info-grid">
				<div class="info-item">
					<span class="info-label">Normalized Name:</span>
					<span class="info-value info-value-primary">{calculationResult.normalizedDrug.name}</span>
				</div>
				<div class="info-item">
					<span class="info-label">RxCUI:</span>
					<span class="info-value info-value-code">{calculationResult.normalizedDrug.rxcui}</span>
				</div>
				{#if calculationResult.normalizedDrug.synonym}
					<div class="info-item">
						<span class="info-label">Synonym:</span>
						<span class="info-value">{calculationResult.normalizedDrug.synonym}</span>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	{#if calculationResult.parsedSIG}
		<section class="section section-instructions">
			<h2 class="section-title">
				<span class="icon">📋</span>
				Parsed Prescription Instructions
			</h2>
			<div class="info-grid">
				<div class="info-item">
					<span class="info-label">Dose:</span>
					<span class="info-value info-value-highlight">
						{calculationResult.parsedSIG.dose} {calculationResult.parsedSIG.doseUnit}
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Frequency:</span>
					<span class="info-value">
						{calculationResult.parsedSIG.frequency === 0
							? 'As needed (PRN)'
							: `${calculationResult.parsedSIG.frequency} time${calculationResult.parsedSIG.frequency > 1 ? 's' : ''} per day`}
					</span>
				</div>
				<div class="info-item">
					<span class="info-label">Route:</span>
					<span class="info-value">{calculationResult.parsedSIG.route}</span>
				</div>
				<div class="info-item info-item-full">
					<span class="info-label">Full Instructions:</span>
					<span class="info-value">{calculationResult.parsedSIG.instructions}</span>
				</div>
			</div>
			{#if calculationResult.parsedSIG.isAmbiguous}
				<div class="alert alert-warning">
					<strong>⚠️ Ambiguous Instructions:</strong>
					{calculationResult.parsedSIG.clarificationNeeded ||
						'Prescription instructions are unclear and may need manual review'}
				</div>
			{/if}
		</section>
	{/if}

	{#if calculationResult.calculation}
		<section class="section section-calculation">
			<h2 class="section-title">
				<span class="icon">🧮</span>
				Quantity Calculation
			</h2>
			<div class="calculation-grid">
				<div class="calc-card calc-card-primary">
					<div class="calc-label">Total Quantity Needed</div>
					<div class="calc-value">
						{calculationResult.calculation.totalQuantityNeeded}
						<span class="calc-unit">{calculationResult.calculation.unit}</span>
					</div>
				</div>
				<div class="calc-card">
					<div class="calc-label">Daily Dose</div>
					<div class="calc-value">
						{calculationResult.calculation.dailyDose}
						<span class="calc-unit">{calculationResult.calculation.unit}</span>
					</div>
				</div>
				<div class="calc-card">
					<div class="calc-label">Days Supply</div>
					<div class="calc-value">
						{calculationResult.calculation.daysSupply}
						<span class="calc-unit">days</span>
					</div>
				</div>
			</div>
		</section>
	{/if}

	{#if calculationResult.selectedNDCs && calculationResult.selectedNDCs.length > 0}
		<section class="section section-selected">
			<h2 class="section-title">
				<span class="icon">✅</span>
				Selected NDC Package(s)
			</h2>
			<div class="ndc-list">
				{#each calculationResult.selectedNDCs as ndc, index}
					<div class="ndc-card ndc-card-primary">
						<div class="ndc-header">
							<div class="ndc-code-group">
								<span class="ndc-label-small">NDC</span>
								<button
									class="ndc-code-button"
									onclick={() => copyToClipboard(ndc.ndc, ndc.ndc)}
									title="Click to copy"
								>
									<span class="ndc-code">{ndc.ndc}</span>
									{#if copiedNDC === ndc.ndc}
										<span class="copy-indicator">✓ Copied!</span>
									{:else}
										<span class="copy-hint">📋</span>
									{/if}
								</button>
							</div>
							<div class="ndc-badges">
								<span class="badge badge-success">Primary</span>
								<span class="badge {getOverfillClass(ndc.overfillPercentage)}">
									{getOverfillLabel(ndc.overfillPercentage)}
								</span>
								{#if ndc.overfillPercentage > 0}
									<span class="badge badge-overfill">{ndc.overfillPercentage}%</span>
								{/if}
							</div>
						</div>
						<div class="ndc-details-grid">
							<div class="ndc-detail">
								<span class="ndc-detail-label">Product Name</span>
								<span class="ndc-detail-value">{ndc.productName}</span>
							</div>
							<div class="ndc-detail">
								<span class="ndc-detail-label">Manufacturer</span>
								<span class="ndc-detail-value">{ndc.manufacturer}</span>
							</div>
							<div class="ndc-detail">
								<span class="ndc-detail-label">Package Size</span>
								<span class="ndc-detail-value">
									{ndc.packageSize} {ndc.packageUnit}
								</span>
							</div>
							<div class="ndc-detail ndc-detail-highlight">
								<span class="ndc-detail-label">Quantity to Dispense</span>
								<span class="ndc-detail-value-large">
									{ndc.quantityToDispense} {ndc.packageUnit}
								</span>
							</div>
							<div class="ndc-detail ndc-detail-highlight">
								<span class="ndc-detail-label">Number of Packages</span>
								<span class="ndc-detail-value-large">{ndc.numberOfPackages}</span>
							</div>
							{#if ndc.overfillPercentage > 10}
								<div class="ndc-detail ndc-detail-warning">
									<span class="ndc-detail-label">Overfill Percentage</span>
									<span class="ndc-detail-value-warning">{ndc.overfillPercentage}%</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if calculationResult.warnings && calculationResult.warnings.length > 0}
		<section class="section section-warnings">
			<h2 class="section-title">
				<span class="icon">⚠️</span>
				Warnings
			</h2>
			<div class="warnings-list">
				{#each calculationResult.warnings as warning}
					<div class="warning-badge">
						<span class="warning-icon">⚠️</span>
						<span class="warning-text">{warning}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if calculationResult.errors && calculationResult.errors.length > 0}
		<section class="section section-errors">
			<h2 class="section-title">
				<span class="icon">❌</span>
				Errors
			</h2>
			<div class="errors-list">
				{#each calculationResult.errors as error}
					<div class="error-badge">
						<span class="error-icon">❌</span>
						<span class="error-text">{error}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if calculationResult.alternativeNDCs && calculationResult.alternativeNDCs.length > 0}
		<section class="section section-alternatives">
			<button
				class="section-toggle"
				onclick={() => (showAlternatives = !showAlternatives)}
				type="button"
			>
				<h2 class="section-title">
					<span class="icon">🔄</span>
					Alternative NDC Options ({calculationResult.alternativeNDCs.length})
					<span class="toggle-icon">{showAlternatives ? '▼' : '▶'}</span>
				</h2>
			</button>
			{#if showAlternatives}
				<div class="ndc-list">
					{#each calculationResult.alternativeNDCs as ndc}
						<div class="ndc-card ndc-card-alternative">
							<div class="ndc-header">
								<div class="ndc-code-group">
									<span class="ndc-label-small">NDC</span>
									<button
										class="ndc-code-button"
										onclick={() => copyToClipboard(ndc.ndc, ndc.ndc)}
										title="Click to copy"
									>
										<span class="ndc-code">{ndc.ndc}</span>
										{#if copiedNDC === ndc.ndc}
											<span class="copy-indicator">✓ Copied!</span>
										{:else}
											<span class="copy-hint">📋</span>
										{/if}
									</button>
								</div>
								<div class="ndc-badges">
									<span class="badge badge-info">Alternative</span>
									{#if ndc.overfillPercentage > 0}
										<span class="badge badge-overfill">{ndc.overfillPercentage}% overfill</span>
									{/if}
								</div>
							</div>
							<div class="ndc-details-grid">
								<div class="ndc-detail">
									<span class="ndc-detail-label">Product Name</span>
									<span class="ndc-detail-value">{ndc.productName}</span>
								</div>
								<div class="ndc-detail">
									<span class="ndc-detail-label">Manufacturer</span>
									<span class="ndc-detail-value">{ndc.manufacturer}</span>
								</div>
								<div class="ndc-detail">
									<span class="ndc-detail-label">Package Size</span>
									<span class="ndc-detail-value">
										{ndc.packageSize} {ndc.packageUnit}
									</span>
								</div>
								<div class="ndc-detail">
									<span class="ndc-detail-label">Quantity to Dispense</span>
									<span class="ndc-detail-value">{ndc.quantityToDispense} {ndc.packageUnit}</span>
								</div>
								<div class="ndc-detail">
									<span class="ndc-detail-label">Number of Packages</span>
									<span class="ndc-detail-value">{ndc.numberOfPackages}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.results-display {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.section-drug {
		border-left: 4px solid #3182ce;
	}

	.section-instructions {
		border-left: 4px solid #805ad5;
	}

	.section-calculation {
		border-left: 4px solid #38a169;
	}

	.section-selected {
		border-left: 4px solid #38a169;
	}

	.section-warnings {
		border-left: 4px solid #d69e2e;
	}

	.section-errors {
		border-left: 4px solid #e53e3e;
	}

	.section-alternatives {
		border-left: 4px solid #3182ce;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: #2d3748;
		margin: 0 0 1rem 0;
	}

	.icon {
		font-size: 1.5rem;
	}

	.section-toggle {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		width: 100%;
		text-align: left;
	}

	.toggle-icon {
		margin-left: auto;
		font-size: 0.875rem;
		color: #718096;
	}

	.info-grid {
		display: grid;
		gap: 1rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.info-item-full {
		grid-column: 1 / -1;
	}

	.info-label {
		font-size: 0.875rem;
		color: #718096;
		font-weight: 500;
	}

	.info-value {
		font-size: 1rem;
		color: #2d3748;
	}

	.info-value-primary {
		font-weight: 600;
		color: #3182ce;
		font-size: 1.125rem;
	}

	.info-value-code {
		font-family: 'Courier New', monospace;
		background: #f7fafc;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		display: inline-block;
	}

	.info-value-highlight {
		font-weight: 600;
		color: #38a169;
		font-size: 1.125rem;
	}

	.alert {
		padding: 1rem;
		border-radius: 6px;
		margin-top: 1rem;
	}

	.alert-warning {
		background-color: #fef5e7;
		color: #744210;
		border: 1px solid #fbd38d;
	}

	.calculation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.calc-card {
		background: #f7fafc;
		border-radius: 6px;
		padding: 1.25rem;
		text-align: center;
	}

	.calc-card-primary {
		background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%);
		border: 2px solid #38a169;
	}

	.calc-label {
		font-size: 0.875rem;
		color: #4a5568;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.calc-value {
		font-size: 2rem;
		font-weight: 700;
		color: #2d3748;
	}

	.calc-unit {
		font-size: 1rem;
		font-weight: 400;
		color: #718096;
		margin-left: 0.25rem;
	}

	.ndc-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.ndc-card {
		background: #f7fafc;
		border: 2px solid #e2e8f0;
		border-radius: 8px;
		padding: 1.25rem;
		transition: box-shadow 0.2s;
	}

	.ndc-card:hover {
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.ndc-card-primary {
		background: linear-gradient(135deg, #c6f6d5 0%, #f0fff4 100%);
		border-color: #38a169;
	}

	.ndc-card-alternative {
		background: #fef5e7;
		border-color: #fbd38d;
	}

	.ndc-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid #e2e8f0;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.ndc-code-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.ndc-label-small {
		font-size: 0.75rem;
		color: #718096;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.ndc-code-button {
		background: white;
		border: 1px solid #cbd5e0;
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		font-family: 'Courier New', monospace;
		font-size: 1.125rem;
		font-weight: 600;
		color: #2d3748;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
	}

	.ndc-code-button:hover {
		background: #edf2f7;
		border-color: #3182ce;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.ndc-code {
		user-select: all;
	}

	.copy-hint {
		font-size: 0.875rem;
		opacity: 0.6;
	}

	.copy-indicator {
		font-size: 0.875rem;
		color: #38a169;
		font-weight: 600;
	}

	.ndc-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.badge {
		padding: 0.375rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge-success {
		background-color: #c6f6d5;
		color: #22543d;
	}

	.badge-info {
		background-color: #bee3f8;
		color: #2c5282;
	}

	.badge-overfill {
		background-color: #feebc8;
		color: #744210;
	}

	.overfill-exact {
		background-color: #c6f6d5;
		color: #22543d;
	}

	.overfill-low {
		background-color: #d6f5d6;
		color: #276749;
	}

	.overfill-medium {
		background-color: #feebc8;
		color: #744210;
	}

	.overfill-high {
		background-color: #fed7d7;
		color: #742a2a;
	}

	.ndc-details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.ndc-detail {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.ndc-detail-highlight {
		background: rgba(56, 161, 105, 0.1);
		padding: 0.75rem;
		border-radius: 6px;
		border: 1px solid rgba(56, 161, 105, 0.2);
	}

	.ndc-detail-warning {
		background: rgba(214, 158, 46, 0.1);
		padding: 0.75rem;
		border-radius: 6px;
		border: 1px solid rgba(214, 158, 46, 0.2);
	}

	.ndc-detail-label {
		font-size: 0.875rem;
		color: #718096;
		font-weight: 500;
	}

	.ndc-detail-value {
		font-size: 1rem;
		color: #2d3748;
		font-weight: 500;
	}

	.ndc-detail-value-large {
		font-size: 1.25rem;
		color: #38a169;
		font-weight: 700;
	}

	.ndc-detail-value-warning {
		font-size: 1.125rem;
		color: #d69e2e;
		font-weight: 700;
	}

	.warnings-list,
	.errors-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.warning-badge,
	.error-badge {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		border-radius: 6px;
	}

	.warning-badge {
		background-color: #fef5e7;
		border: 1px solid #fbd38d;
		color: #744210;
	}

	.error-badge {
		background-color: #fed7d7;
		border: 1px solid #fc8181;
		color: #742a2a;
	}

	.warning-icon,
	.error-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.warning-text,
	.error-text {
		font-weight: 500;
	}

	@media (max-width: 640px) {
		.section {
			padding: 1rem;
		}

		.calculation-grid {
			grid-template-columns: 1fr;
		}

		.ndc-details-grid {
			grid-template-columns: 1fr;
		}

		.ndc-header {
			flex-direction: column;
		}

		.ndc-badges {
			width: 100%;
		}
	}
</style>

