// Estado compartido del simulador: el esquema de palancas (viene de la API) y
// los valores actuales. La sidebar aplica presets y escenarios guardados; la
// página del simulador corre la simulación cada vez que cambian los valores.
import type { Traductor } from './formato';
import type { Escenario, EsquemaEscenario } from './tipos';

/**
 * Los textos de cada preset (nombre, resumen, explicación) viven en los
 * diccionarios bajo presets.<id>, para que se traduzcan con el idioma.
 */
export interface Preset {
	id: string;
	cambios: Escenario;
}

export const PRESETS: Preset[] = [
	{ id: 'canon', cambios: {} },
	{ id: 'cena', cambios: { racion_modo: 'fija', racion_fraccion: 0.67 } },
	{ id: 'estirar', cambios: { racion_modo: 'estirar', horizonte_estirar_anios: 10 } },
	{ id: 'diciembre', cambios: { mes_union: 12 } },
	{ id: 'ganado', cambios: { ganado_politica: 'alimentar' } },
	{
		id: 'resquicios',
		cambios: {
			ganado_politica: 'alimentar',
			partos_ganado: true,
			resquicio_huevos: 0.8,
			resquicio_miel: 1,
			cosecha_senescente: 0.7,
			siembra_senescente: 0.5
		}
	}
];

/**
 * De dónde viene lo que se está simulando. `base` son las palancas que cambiaba
 * respecto al canon cuando se cargó, para saber si ya se modificó.
 */
export type Origen =
	| { tipo: 'preset'; id: string; base: Escenario }
	| { tipo: 'guardado'; id: number; nombre: string; explicacion: string; base: Escenario };

/** Nombre y explicación del origen en el idioma activo (los de un guardado son los que escribió el usuario). */
export function textosDeOrigen(o: Origen, t: Traductor): { nombre: string; explicacion: string } {
	return o.tipo === 'preset'
		? { nombre: t(`presets.${o.id}.nombre`), explicacion: t(`presets.${o.id}.explicacion`) }
		: { nombre: o.nombre, explicacion: o.explicacion };
}

/** Igualdad que tolera el ruido de punto flotante de los sliders (0.7 vs 0.7000000000000001). */
function igual(a: unknown, b: unknown): boolean {
	if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
	return a === b;
}

function mismos(a: Escenario, b: Escenario): boolean {
	const ka = Object.keys(a);
	return ka.length === Object.keys(b).length && ka.every((k) => k in b && igual(a[k], b[k]));
}

class EstadoSimulador {
	esquema = $state<EsquemaEscenario | null>(null);
	valores = $state<Escenario>({});
	origen = $state<Origen>({ tipo: 'preset', id: 'canon', base: {} });

	defaults(): Escenario {
		if (!this.esquema) return {};
		return Object.fromEntries(Object.entries(this.esquema.properties).map(([k, p]) => [k, p.default]));
	}

	/** Cada cambio de idioma trae el esquema con otros textos; los valores se conservan. */
	iniciar(esquema: EsquemaEscenario) {
		const primeraVez = !this.esquema;
		this.esquema = esquema;
		if (primeraVez) this.valores = this.defaults();
	}

	aplicarPreset(p: Preset) {
		this.valores = { ...this.defaults(), ...p.cambios };
		this.origen = { tipo: 'preset', id: p.id, base: this.cambios() };
	}

	aplicarGuardado(g: { id: number; nombre: string; explicacion: string; parametros: Escenario }) {
		this.valores = { ...this.defaults(), ...g.parametros };
		this.origen = { tipo: 'guardado', id: g.id, nombre: g.nombre, explicacion: g.explicacion, base: this.cambios() };
	}

	/** Solo lo que difiere del default: es lo que vale la pena guardar o mostrar. */
	cambios(): Escenario {
		const d = this.defaults();
		return Object.fromEntries(Object.entries(this.valores).filter(([k, v]) => !igual(d[k], v)));
	}

	/** ¿Se movió alguna palanca después de cargar el escenario? */
	get modificado(): boolean {
		return !mismos(this.cambios(), this.origen.base);
	}
}

export const estado = new EstadoSimulador();
