/**
 * Mitad de navegador de la internacionalización y único bootstrap de
 * svelte-i18n: registra los seis diccionarios y lo inicializa.
 *
 * OJO con el SSR: el store `locale` de svelte-i18n es de MÓDULO, compartido
 * por todas las requests del proceso Node. Por eso aquí el idioma inicial es
 * fijo, y el de cada visitante se fija de forma SÍNCRONA en el cuerpo del
 * <script> de +layout.svelte, donde no hay un `await` en el que otra request
 * pueda colarse (ver project-references: "svelte-i18n bajo SSR").
 */
import { get } from 'svelte/store';
import { addMessages, init, locale } from 'svelte-i18n';
import { browser } from '$app/environment';
import { COOKIE_IDIOMA, IDIOMA_FUENTE, IDIOMA_POR_DEFECTO, esRTL, normalizarIdioma, type Idioma } from './idiomas';

// Cada diccionario que exista en locales/ se registra solo: agregar un idioma es
// agregar su JSON (y su código en idiomas.ts). Lo que le falte cae al español.
type Diccionario = Parameters<typeof addMessages>[1];
const diccionarios = import.meta.glob<{ default: Diccionario }>('./locales/*.json', { eager: true });
for (const [ruta, modulo] of Object.entries(diccionarios)) {
	const idioma = ruta.match(/\/([a-z]{2})\.json$/)?.[1];
	if (idioma) addMessages(idioma, modulo.default);
}

// Con HMR este módulo se vuelve a ejecutar pero svelte-i18n no: se conserva el
// idioma que ya estaba en lugar de regresar un instante al de por defecto.
init({ fallbackLocale: IDIOMA_FUENTE, initialLocale: get(locale) || IDIOMA_POR_DEFECTO });

/**
 * Guarda la preferencia en cookie Y en localStorage. La cookie es la que lee
 * el servidor: sin ella, el primer render ignoraría la elección del usuario.
 */
export function guardarPreferencia(lang: Idioma) {
	if (!browser) return;
	const unAnio = 60 * 60 * 24 * 365;
	document.cookie = `${COOKIE_IDIOMA}=${encodeURIComponent(lang)}; path=/; max-age=${unAnio}; SameSite=Lax`;
	try {
		localStorage.setItem(COOKIE_IDIOMA, lang);
	} catch {
		// Modo privado o almacenamiento bloqueado: la cookie ya quedó, alcanza.
	}
}

/** Mantiene el <html lang> y la dirección de escritura en sintonía con el idioma. */
export function aplicarIdiomaAlDocumento(lang: string) {
	if (!browser) return;
	const idioma = normalizarIdioma(lang) ?? IDIOMA_POR_DEFECTO;
	document.documentElement.lang = idioma;
	document.documentElement.dir = esRTL(idioma) ? 'rtl' : 'ltr';
}
