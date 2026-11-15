<script lang="ts">
	type Props = {
		downloadUrl: string;
		downloadFilename: string;
		onReset: () => void;
	};

	let { downloadUrl, downloadFilename, onReset }: Props = $props();
</script>

<div class="download-card">
	<a class="download" href={downloadUrl} download={downloadFilename}>
		Download {downloadFilename}
	</a>
	<button class="text-button" type="button" onclick={onReset}>Convert another file</button>
</div>

<style>
	.download-card {
		margin-top: 1.25rem;
	}

	.download {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0.7rem 1rem;
		border-radius: 0.5rem;
		background: #17643d;
		color: #fff;
		font-weight: 650;
		text-align: center;
		text-decoration: none;
	}

	.text-button {
		display: block;
		margin-top: 0.75rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: #174c75;
		font: inherit;
		text-align: left;
		text-decoration: underline;
		cursor: pointer;
	}

	.download:focus-visible,
	.text-button:focus-visible {
		outline: 3px solid #e19b2d;
		outline-offset: 3px;
	}
</style>
