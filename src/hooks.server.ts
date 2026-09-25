import type { Handle } from '@sveltejs/kit';
import { COOKIE_IDIOMA, esRTL, resolverIdiomaDeRequest } from '$lib/idiomas';

/**
 * Resuelve el idioma de cada request (cookie > Accept-Language > inglés) y lo
 * refleja en el <html>.
 *
 * El <html> vive en app.html, fuera del árbol de Svelte: ningún componente
 * puede tocar sus atributos durante el SSR, y transformPageChunk es el único
 * punto donde se puede. Sin esto, un visitante árabe recibiría un documento
 * que dice ser de izquierda a derecha (lo leen lectores de pantalla y
 * buscadores, no solo el layout).
 */
export const handle: Handle = async ({ event, resolve }) => {
	const idioma = resolverIdiomaDeRequest({
		cookie: event.cookies.get(COOKIE_IDIOMA),
		acceptLanguage: event.request.headers.get('accept-language')
	});
	event.locals.idioma = idioma;

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%idioma%', idioma).replace('%dir%', esRTL(idioma) ? 'rtl' : 'ltr')
	});
};
