import type { LayoutServerLoad } from './$types';

/** El idioma que resolvió hooks.server.ts, para que el layout lo fije antes de renderizar. */
export const load: LayoutServerLoad = ({ locals }) => ({ idioma: locals.idioma });
