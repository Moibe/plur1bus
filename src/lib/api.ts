// Cliente de plur1bus-api. El navegador le pega directo (CORS abierto para el
// front en la API), igual que en nutricion_front. Todas las llamadas con texto
// mandan el idioma: la API responde con etiquetas y explicaciones traducidas.
import { env } from '$env/dynamic/public';
import type { EsquemaEscenario, Escenario, Fuentes, Resultado, Supuestos } from './tipos';

export const API_URL = (env.PUBLIC_API_URL || 'http://127.0.0.1:8004').replace(/\/$/, '');

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
	const r = await fetch(`${API_URL}${ruta}`, init);
	if (!r.ok) {
		const texto = await r.text().catch(() => '');
		throw new Error(`${r.status} ${r.statusText} — ${ruta}${texto ? `: ${texto.slice(0, 200)}` : ''}`);
	}
	return r.json() as Promise<T>;
}

const conIdioma = (ruta: string, idioma: string) => `${ruta}?lang=${encodeURIComponent(idioma)}`;

export const obtenerEscenario = (idioma: string) => pedir<EsquemaEscenario>(conIdioma('/escenario', idioma));

export const obtenerSupuestos = (idioma: string) => pedir<Supuestos>(conIdioma('/supuestos', idioma));

export const obtenerFuentes = (idioma: string) => pedir<Fuentes>(conIdioma('/fuentes', idioma));

export function simular(escenario: Escenario, idioma: string, signal?: AbortSignal) {
	return pedir<Resultado>(conIdioma('/simular', idioma), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(escenario),
		signal
	});
}
