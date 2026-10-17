import { json } from '@sveltejs/kit';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, isAbsolute, join, resolve } from 'node:path';
import { getMaxFileBytes } from '$lib/server/upload-limit';
import type { RequestHandler } from './$types';

const BYTES_PER_MB = 1024 * 1024;
const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const MAX_CONVERTER_OUTPUT_BYTES = 50 * BYTES_PER_MB;
const CONVERTER_TIMEOUT_MS = 60_000;

type ConversionFailureKind = 'unavailable' | 'timeout' | 'output_limit' | 'failed';

class ConversionFailure extends Error {
	constructor(readonly kind: ConversionFailureKind) {
		super(kind);
	}
}

function converterPath(): string {
	const configured = process.env.MARKITDOWN_BIN?.trim() || '.venv/bin/markitdown';
	return isAbsolute(configured) ? configured : resolve(process.cwd(), configured);
}

function markdownFilename(uploadName: string): string {
	const stem = basename(uploadName.replace(/\\/g, '/')).replace(/\.[^.]*$/, '');
	const safeStem = stem
		.normalize('NFKC')
		.replace(/[^A-Za-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	return `${safeStem || 'converted'}.md`;
}

function convert(inputPath: string): Promise<Buffer> {
	return new Promise((resolveOutput, rejectOutput) => {
		let child;
		try {
			child = spawn(converterPath(), [inputPath], {
				stdio: ['ignore', 'pipe', 'pipe']
			});
		} catch {
			rejectOutput(new ConversionFailure('unavailable'));
			return;
		}

		const output: Buffer[] = [];
		let outputBytes = 0;
		let stderrBytes = 0;
		let failure: ConversionFailure | undefined;
		let settled = false;

		const timeout = setTimeout(() => {
			failure = new ConversionFailure('timeout');
			child.kill('SIGKILL');
		}, CONVERTER_TIMEOUT_MS);

		child.stdout.on('data', (chunk: Buffer) => {
			if (failure) return;
			outputBytes += chunk.length;
			if (outputBytes > MAX_CONVERTER_OUTPUT_BYTES) {
				failure = new ConversionFailure('output_limit');
				child.kill('SIGKILL');
				return;
			}
			output.push(chunk);
		});

		child.stderr.on('data', (chunk: Buffer) => {
			stderrBytes += chunk.length;
		});

		child.once('error', (error: Error) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			console.error('[api/convert] Could not start MarkItDown:', error.message);
			rejectOutput(new ConversionFailure('unavailable'));
		});

		child.once('close', (code, signal) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);

			if (failure) {
				rejectOutput(failure);
				return;
			}
			if (code !== 0) {
				console.error('[api/convert] MarkItDown failed:', { code, signal, stderrBytes });
				rejectOutput(new ConversionFailure('failed'));
				return;
			}
			resolveOutput(Buffer.concat(output, outputBytes));
		});
	});
}

export const POST: RequestHandler = async ({ request }) => {
	const maxBytes = getMaxFileBytes();
	const contentLength = request.headers.get('content-length');
	if (
		contentLength &&
		/^\d+$/.test(contentLength) &&
		Number(contentLength) > maxBytes + MAX_MULTIPART_OVERHEAD_BYTES
	) {
		return json({ error: 'The selected file exceeds the upload size limit.' }, { status: 413 });
	}

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Send one file using the file field.' }, { status: 400 });
	}

	const entries = Array.from(formData.entries());
	if (entries.length !== 1 || entries[0][0] !== 'file') {
		return json({ error: 'Send exactly one file using the file field.' }, { status: 400 });
	}

	const file = entries[0][1];
	if (!(file instanceof File)) {
		return json({ error: 'The file field must contain a file.' }, { status: 400 });
	}
	if (file.size === 0) {
		return json({ error: 'Choose a nonempty file to convert.' }, { status: 400 });
	}

	if (file.size > maxBytes) {
		return json({ error: 'The selected file exceeds the upload size limit.' }, { status: 413 });
	}

	let temporaryDirectory: string | undefined;
	try {
		temporaryDirectory = await mkdtemp(join(tmpdir(), 'markitdown-'));
		const extension = extname(file.name);
		const safeExtension = /^\.[A-Za-z0-9]{1,16}$/.test(extension) ? extension.toLowerCase() : '.bin';
		const inputPath = join(temporaryDirectory, `input${safeExtension}`);
		await writeFile(inputPath, Buffer.from(await file.arrayBuffer()), { flag: 'wx' });

		const markdown = await convert(inputPath);
		if (markdown.length === 0 || markdown.toString('utf8').trim().length === 0) {
			return json({ error: 'The file did not produce Markdown output.' }, { status: 422 });
		}

		const filename = markdownFilename(file.name);
		return new Response(markdown.toString('utf8'), {
			status: 200,
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error) {
		if (error instanceof ConversionFailure) {
			switch (error.kind) {
				case 'unavailable':
					return json({ error: 'The converter is unavailable. Check the server configuration.' }, { status: 503 });
				case 'timeout':
					return json({ error: 'Conversion took too long. Try a smaller file.' }, { status: 504 });
				case 'output_limit':
					return json({ error: 'The converted output is too large.' }, { status: 502 });
				case 'failed':
					return json({ error: 'The file could not be converted. Check that its format is supported.' }, { status: 422 });
			}
		}

		console.error('[api/convert] Request failed:', error);
		return json({ error: 'The file could not be converted.' }, { status: 500 });
	} finally {
		if (temporaryDirectory) {
			await rm(temporaryDirectory, { recursive: true, force: true }).catch((error: unknown) => {
				console.error('[api/convert] Could not remove a temporary conversion directory:', error);
			});
		}
	}
};
