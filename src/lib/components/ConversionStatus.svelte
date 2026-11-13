<script lang="ts">
	type Props = {
		errorMessage: string;
		succeeded: boolean;
		isConverting: boolean;
	};

	let { errorMessage, succeeded, isConverting }: Props = $props();
</script>

{#if errorMessage}
	<p class="message error" role="alert">{errorMessage}</p>
{:else if succeeded}
	<p class="message success" role="status">Conversion complete. Your Markdown file is ready.</p>
{:else if isConverting}
	<p class="message" role="status">Converting your file…</p>
{/if}

<style>
	.message {
		margin: 0.25rem 0;
		line-height: 1.5;
	}

	.error {
		color: #a12424;
	}

	.success {
		color: #17643d;
	}
</style>
