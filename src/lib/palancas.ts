// Cómo se muestra el valor de una palanca, y la lista legible de lo que un
// escenario cambia respecto al canon. Lo usan los controles y las explicaciones.
import { MESES, numero, pct } from './formato';
import type { Escenario, EsquemaEscenario, Palanca } from './tipos';

export const ETIQUETAS_OPCION: Record<string, string> = {
	completa: 'Completa',
	fija: 'Fija',
	estirar: 'Estirar',
	liberar: 'Liberar',
	alimentar: 'Alimentar'
};

export function mostrarValor(p: Palanca, v: unknown): string {
	if (v === null || v === undefined) return 'automático';
	if (typeof v === 'boolean') return v ? 'Sí' : 'No';
	if (typeof v === 'string') return ETIQUETAS_OPCION[v] ?? v;
	if (typeof v !== 'number') return String(v);
	switch (p.formato) {
		case 'mes':
			return MESES[v - 1];
		case 'pct':
			return pct(v);
		case 'x':
			return `${numero(v, 2)}×`;
		case 'kcal':
			return `${numero(v)} kcal`;
		default:
			return numero(v, p.paso && p.paso < 1 ? 2 : 0);
	}
}

export interface Cambio {
	clave: string;
	etiqueta: string;
	valor: string;
}

/** Las palancas que el escenario mueve respecto al canon, en el orden del esquema. */
export function describirCambios(cambios: Escenario, esquema: EsquemaEscenario | null): Cambio[] {
	if (!esquema) return [];
	return Object.entries(esquema.properties)
		.filter(([clave]) => clave in cambios)
		.map(([clave, p]) => ({ clave, etiqueta: p.etiqueta, valor: mostrarValor(p, cambios[clave]) }));
}

/** "Mes de la Unión: diciembre; Ganado: Alimentar" — para borradores de explicación. */
export function cambiosEnTexto(cambios: Cambio[]): string {
	return cambios.map((c) => `${c.etiqueta}: ${c.valor}`).join('; ');
}
