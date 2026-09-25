/**
 * Mitad PURA de la internacionalización: la lista de idiomas y cómo se
 * normaliza un texto a uno de ellos (mismo patrón que svelte_geo).
 *
 * No importa svelte-i18n ni toca `window`, `navigator` ni `localStorage` a
 * propósito: así el servidor puede resolver el idioma de una request sin
 * arrastrar el store de i18n ni los seis diccionarios.
 *
 * La mitad de navegador vive en i18n.ts.
 */

export const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de', 'ar'] as const;
export type Idioma = (typeof IDIOMAS)[number];

/** Cada idioma escrito en sí mismo, para el selector. */
export const NOMBRES_IDIOMA: Record<Idioma, string> = {
	es: 'Español',
	en: 'English',
	pt: 'Português',
	fr: 'Français',
	de: 'Deutsch',
	ar: 'العربية'
};

/** Idiomas que se escriben de derecha a izquierda. */
const RTL = new Set<string>(['ar']);

/** Si el navegador no pide ninguno de los seis, inglés: es la serie y el idioma más compartido. */
export const IDIOMA_POR_DEFECTO: Idioma = 'en';

/** El español es el idioma fuente: si a otro diccionario le falta una clave, se muestra en español. */
export const IDIOMA_FUENTE: Idioma = 'es';

/** Nombre de la cookie donde se guarda la preferencia explícita del usuario. */
export const COOKIE_IDIOMA = 'preferred_language';

export function esRTL(lang: string): boolean {
	return RTL.has(lang);
}

/** Normaliza 'es', 'es-MX' o 'ES_mx' a un idioma soportado, o null. */
export function normalizarIdioma(texto: string | null | undefined): Idioma | null {
	if (!texto) return null;
	const codigo = String(texto).trim().toLowerCase().split(/[-_]/)[0];
	return (IDIOMAS as readonly string[]).includes(codigo) ? (codigo as Idioma) : null;
}

/**
 * Mejor idioma de una cabecera Accept-Language, respetando los factores q.
 *
 * Se parsea a mano en vez de tomar el primero: un navegador puede mandar
 * `fr;q=0.2, es;q=0.9` y quedarse con el primero daría francés cuando el
 * usuario prefiere español.
 */
export function idiomaDeAcceptLanguage(cabecera: string | null | undefined): Idioma | null {
	if (!cabecera) return null;
	const candidatos = String(cabecera)
		.split(',')
		.map((parte) => {
			const [etiqueta, ...params] = parte.trim().split(';');
			const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
			return { etiqueta, q: q ? Number.parseFloat(q.slice(2)) : 1 };
		})
		.filter((c) => Number.isFinite(c.q))
		.sort((a, b) => b.q - a.q);
	for (const { etiqueta } of candidatos) {
		const idioma = normalizarIdioma(etiqueta);
		if (idioma) return idioma;
	}
	return null;
}

/**
 * Resuelve el idioma de una request en el SERVIDOR: preferencia explícita
 * (cookie) > Accept-Language > inglés.
 *
 * NO usa navigator.language: en Node esa propiedad EXISTE (v22 la define) y
 * devuelve el locale del PROCESO. No lanza error: simplemente serviría el
 * idioma del servidor a todo el mundo, en silencio.
 */
export function resolverIdiomaDeRequest({
	cookie,
	acceptLanguage
}: {
	cookie?: string | null;
	acceptLanguage?: string | null;
}): Idioma {
	return normalizarIdioma(cookie) || idiomaDeAcceptLanguage(acceptLanguage) || IDIOMA_POR_DEFECTO;
}
