const DEFAULT_MAX_FILE_MB = 100;
const BYTES_PER_MB = 1024 * 1024;

export function getMaxFileMb(): number {
	const configured = Number(process.env.MAX_FILE_MB);
	const valid =
		Number.isFinite(configured) &&
		configured > 0 &&
		configured <= Number.MAX_SAFE_INTEGER / BYTES_PER_MB;
	return valid ? configured : DEFAULT_MAX_FILE_MB;
}

export function getMaxFileBytes(): number {
	return Math.floor(getMaxFileMb() * BYTES_PER_MB);
}
