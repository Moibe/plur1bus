// Cómo se muestra el valor de una palanca, y la lista legible de lo que un
// escenario cambia respecto al canon. Lo usan los controles y las explicaciones.
// Las etiquetas vienen de la API ya traducidas; aquí solo se da formato al valor.
import type { Formato, Traductor } from './formato';
import type { Escenario, EsquemaEscenario, Palanca } from './tipos';

export function mostrarValor(p: Palanca, v: unknown, f: Formato, t: Traductor): string {
	if (v === null || v === undefined) return t('palancas.automatico');
	if (typeof v === 'boolean') return v ? t('palancas.si') : t('palancas.no');
	if (typeof v === 'string') return t(`opciones.${v}`);
	if (typeof v !== 'number') return String(v);
	switch (p.formato) {
		case 'mes':
			return f.mes(v);
		case 'pct':
			return f.pct(v, p.paso && p.paso < 0.01 ? 1 : 0);
		case 'x':
			return `${f.numero(v, 2)}×`;
		case 'kcal':
			return `${f.numero(v)} kcal`;
		default:
			return f.numero(v, p.paso && p.paso < 1 ? 2 : 0);
	}
}

export interface Cambio {
	clave: string;
	etiqueta: string;
	valor: string;
}

/** Las palancas que el escenario mueve respecto al canon, en el orden del esquema. */
export function describirCambios(cambios: Escenario, esquema: EsquemaEscenario | null, f: Formato, t: Traductor): Cambio[] {
	if (!esquema) return [];
	return Object.entries(esquema.properties)
		.filter(([clave]) => clave in cambios)
		.map(([clave, p]) => ({ clave, etiqueta: p.etiqueta, valor: mostrarValor(p, cambios[clave], f, t) }));
}

/** "Mes de la Unión: diciembre; Ganado: Alimentar" — para borradores de explicación. */
export function cambiosEnTexto(cambios: Cambio[]): string {
	return cambios.map((c) => `${c.etiqueta}: ${c.valor}`).join('; ');
}
