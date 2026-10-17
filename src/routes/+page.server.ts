import { getMaxFileMb } from '$lib/server/upload-limit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	maxFileMb: getMaxFileMb()
});
