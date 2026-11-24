<script lang="ts">
	type Props = {
		selectedFile: File | null;
		maxFileMb: number;
		disabled: boolean;
		onFileSelect: (file: File | null, errorMessage?: string) => void;
	};

	let { selectedFile, maxFileMb, disabled, onFileSelect }: Props = $props();
	let fileInput: HTMLInputElement;
	let isDragging = $state(false);

	const maxFileBytes = $derived(maxFileMb * 1024 * 1024);

	$effect(() => {
		if (!selectedFile && fileInput) fileInput.value = '';
	});

	function formatSize(size: number): string {
		if (size < 1024) return `${size} bytes`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	}

	function selectFile(file: File | null): void {
		let errorMessage: string | undefined;
		if (file?.size === 0) errorMessage = 'Choose a nonempty file to convert.';
		else if (file && file.size > maxFileBytes) {
			errorMessage = `The selected file exceeds the ${maxFileMb} MB upload limit.`;
		}
		onFileSelect(file, errorMessage);
	}

	function handleFileChange(event: Event): void {
		if (event.currentTarget instanceof HTMLInputElement) {
			selectFile(event.currentTarget.files?.[0] ?? null);
		}
	}

	function handleDragOver(event: DragEvent): void {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		isDragging = !disabled;
	}

	function handleDrop(event: DragEvent): void {
		event.preventDefault();
		isDragging = false;
		if (disabled) return;

		const files = event.dataTransfer?.files;
		if (!files?.length) return;
		if (files.length !== 1) {
			onFileSelect(null, 'Choose one file at a time.');
			return;
		}
		selectFile(files[0]);
	}

	function openFilePicker(): void {
		if (!disabled) fileInput.click();
	}
</script>

<div
	class="dropzone"
	class:dragging={isDragging}
	role="group"
	aria-label="File drop area"
	ondragover={handleDragOver}
	ondragleave={() => (isDragging = false)}
	ondrop={handleDrop}
>
	<p class="drop-prompt">Drag and drop a file here, or choose one to upload.</p>
	<button
		class="browse"
		type="button"
		onclick={openFilePicker}
		disabled={disabled}
		aria-describedby="file-help"
	>
		Browse files
	</button>
	<input
		bind:this={fileInput}
		class="visually-hidden"
		id="file"
		name="file"
		type="file"
		onchange={handleFileChange}
		disabled={disabled}
		aria-hidden="true"
		tabindex="-1"
	/>
</div>
<p id="file-help" class="help">
	Maximum file size: {maxFileMb} MB. Supported formats depend on the installed converter.
</p>

{#if selectedFile}
	<div class="selected-file" aria-live="polite">
		<span class="file-name">{selectedFile.name}</span>
		<span>{formatSize(selectedFile.size)}</span>
	</div>
{/if}

<style>
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.dropzone {
		display: grid;
		justify-items: start;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px dashed #8ca2b4;
		border-radius: 0.65rem;
		background: #f8fafc;
	}

	.dropzone.dragging {
		border-color: #174c75;
		background: #eaf1f7;
	}

	.drop-prompt {
		margin: 0;
		color: #4b5968;
		line-height: 1.5;
	}

	.browse {
		min-height: 2.5rem;
		padding: 0.55rem 0.85rem;
		border: 1px solid #aebbc7;
		border-radius: 0.45rem;
		background: #fff;
		color: #274157;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.browse:disabled {
		cursor: not-allowed;
		opacity: 0.7;
	}

	.help {
		margin: 0;
		color: #566474;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.selected-file {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem 1rem;
		padding: 0.8rem 0.9rem;
		border-radius: 0.5rem;
		background: #f2f5f8;
		color: #344252;
		font-size: 0.92rem;
	}

	.file-name {
		overflow-wrap: anywhere;
		font-weight: 600;
	}
</style>
