<script lang="ts">
	import { onDestroy } from 'svelte';
	import ConversionStatus from '$lib/components/ConversionStatus.svelte';
	import DownloadCard from '$lib/components/DownloadCard.svelte';
	import FileDropzone from '$lib/components/FileDropzone.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let selectedFile = $state<File | null>(null);
	let isConverting = $state(false);
	let errorMessage = $state('');
	let succeeded = $state(false);
	let downloadUrl = $state('');
	let downloadFilename = $state('converted.md');

	const maxFileBytes = $derived(data.maxFileMb * 1024 * 1024);

	function releaseDownload(): void {
		if (downloadUrl) URL.revokeObjectURL(downloadUrl);
		downloadUrl = '';
	}

	function clearResult(): void {
		releaseDownload();
		errorMessage = '';
		succeeded = false;
	}

	function selectFile(file: File | null, selectionError?: string): void {
		clearResult();
		selectedFile = file;
		errorMessage = selectionError ?? '';
	}

	function safeDownloadFilename(disposition: string | null): string {
		let candidate =
			disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ??
			disposition?.match(/filename="?([^";]+)"?/i)?.[1] ??
			'converted.md';
		try {
			candidate = decodeURIComponent(candidate);
		} catch {
			candidate = 'converted.md';
		}
		const basename = candidate.replace(/\\/g, '/').split('/').pop() ?? '';
		const safeName = basename.replace(/[^A-Za-z0-9._ -]/g, '_').trim();
		if (safeName.toLowerCase().endsWith('.md')) return safeName;
		const stem = safeName.replace(/\.[^.]*$/, '');
		return `${stem || 'converted'}.md`;
	}

	function reset(): void {
		selectFile(null);
	}

	async function convertFile(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (isConverting) return;

		clearResult();
		if (!selectedFile || selectedFile.size === 0) {
			errorMessage = 'Choose a nonempty file before converting.';
			return;
		}
		if (selectedFile.size > maxFileBytes) {
			errorMessage = `The selected file exceeds the ${data.maxFileMb} MB upload limit.`;
			return;
		}

		isConverting = true;
		try {
			const formData = new FormData();
			formData.append('file', selectedFile);
			const response = await fetch('/api/convert', { method: 'POST', body: formData });
			if (!response.ok) {
				const body: unknown = await response.json().catch(() => null);
				const message =
					typeof body === 'object' &&
					body !== null &&
					'error' in body &&
					typeof body.error === 'string'
						? body.error
						: 'The file could not be converted. Try again or choose another file.';
				throw new Error(message);
			}

			const markdown = await response.blob();
			if (markdown.size === 0) throw new Error('The converter returned an empty Markdown file.');

			downloadFilename = safeDownloadFilename(response.headers.get('Content-Disposition'));
			downloadUrl = URL.createObjectURL(markdown);
			succeeded = true;

			const link = document.createElement('a');
			link.href = downloadUrl;
			link.download = downloadFilename;
			link.hidden = true;
			document.body.append(link);
			link.click();
			link.remove();
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: 'The file could not be converted. Try again or choose another file.';
		} finally {
			isConverting = false;
		}
	}

	onDestroy(releaseDownload);
</script>

<svelte:head>
	<title>MarkItDown — File to Markdown</title>
	<meta
		name="description"
		content="Convert one file to Markdown with the local MarkItDown converter."
	/>
</svelte:head>

<main>
	<section class="converter" aria-labelledby="page-title">
		<p class="eyebrow">Local file converter</p>
		<h1 id="page-title">Convert a file to Markdown</h1>
		<p class="intro">Choose one file and download its Markdown conversion.</p>

		<form onsubmit={convertFile}>
			<FileDropzone
				selectedFile={selectedFile}
				maxFileMb={data.maxFileMb}
				disabled={isConverting}
				onFileSelect={selectFile}
			/>

			<ConversionStatus {errorMessage} {succeeded} {isConverting} />

			<div class="actions">
				<button type="submit" disabled={!selectedFile || isConverting || succeeded}>
					{isConverting ? 'Converting…' : errorMessage ? 'Try again' : 'Convert to Markdown'}
				</button>
				{#if selectedFile}
					<button class="secondary" type="button" onclick={reset} disabled={isConverting}>
						Choose another file
					</button>
				{/if}
			</div>
		</form>

		{#if succeeded && downloadUrl}
			<DownloadCard {downloadUrl} {downloadFilename} onReset={reset} />
		{/if}
	</section>
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		background: #f4f6f8;
		color: #18212b;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	}

	main {
		display: grid;
		min-height: 100vh;
		place-items: center;
		padding: 2rem 1rem;
	}

	.converter {
		width: min(100%, 38rem);
		padding: clamp(1.25rem, 5vw, 2.5rem);
		border: 1px solid #d9e0e7;
		border-radius: 1rem;
		background: #fff;
		box-shadow: 0 1rem 3rem rgb(24 33 43 / 8%);
	}

	.eyebrow {
		margin: 0 0 0.5rem;
		color: #315d83;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: clamp(1.6rem, 6vw, 2.2rem);
		line-height: 1.15;
	}

	.intro {
		margin: 0.75rem 0 2rem;
		color: #4b5968;
		line-height: 1.5;
	}

	form {
		display: grid;
		gap: 0.75rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	button {
		min-height: 2.75rem;
		padding: 0.7rem 1rem;
		border: 0;
		border-radius: 0.5rem;
		background: #174c75;
		color: #fff;
		font: inherit;
		font-weight: 650;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
	}

	button:disabled {
		background: #8b9aa7;
		cursor: not-allowed;
	}

	button.secondary {
		border: 1px solid #aebbc7;
		background: #fff;
		color: #274157;
	}

	:global(button:focus-visible),
	:global(input:focus-visible),
	:global(a:focus-visible) {
		outline: 3px solid #e19b2d;
		outline-offset: 3px;
	}

	@media (max-width: 30rem) {
		.actions {
			display: grid;
			grid-template-columns: 1fr;
		}
	}
</style>
