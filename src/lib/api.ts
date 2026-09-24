// Cliente de plur1bus-api. El navegador le pega directo (CORS abierto para el
// front en la API), igual que en nutricion_front.
import { env } from '$env/dynamic/public';
import type { EsquemaEscenario, Escenario, Fuentes, Resultado, Supuestos } from './tipos';

export const API_URL = (env.PUBLIC_API_URL || 'http://127.0.0.1:8004').replace(/\/$/, '');

async function pedir<T>(ruta: string, init?: RequestInit, f: typeof fetch = fetch): Promise<T> {
	const r = await f(`${API_URL}${ruta}`, init);
	if (!r.ok) {
		const texto = await r.text().catch(() => '');
		throw new Error(`${r.status} ${r.statusText} en ${ruta}${texto ? `: ${texto.slice(0, 200)}` : ''}`);
	}
	return r.json() as Promise<T>;
}

export const obtenerEscenario = (f?: typeof fetch) => pedir<EsquemaEscenario>('/escenario', undefined, f);

export const obtenerSupuestos = (f?: typeof fetch) => pedir<Supuestos>('/supuestos', undefined, f);

export const obtenerFuentes = (f?: typeof fetch) => pedir<Fuentes>('/fuentes', undefined, f);

export function simular(escenario: Escenario, signal?: AbortSignal) {
	return pedir<Resultado>('/simular', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(escenario),
		signal
	});
}
