// Cifras, fechas y duraciones en el idioma activo. Es un store derivado del
// idioma: en un componente se usa como $formato.personas(x) y se vuelve a
// pintar solo cuando el usuario cambia de idioma. Fechas y meses salen de Intl
// (ya vienen traducidos); las palabras de las cifras grandes y las duraciones
// salen de los diccionarios (numeros.* y duracion.*).
import { derived, type Readable } from 'svelte/store';
import { _, locale } from 'svelte-i18n';
import { IDIOMA_FUENTE } from './idiomas';

export type Traductor = (id: string, opciones?: { values?: Record<string, string | number> }) => string;

export interface Formato {
	numero(x: number | null | undefined, digitos?: number): string;
	/** notación científica para cifras enormes (1.23E12) */
	cientifica(x: number): string;
	pct(x: number | null | undefined, digitos?: number): string;
	/** 7,348 millones · 92 millones · 850 mil */
	personas(x: number | null | undefined): string;
	/** compacto para ejes y tooltips: 7,348 M · 92 M · 850 mil */
	millones(x: number): string;
	/** kcal al día en unidades de 10^12 */
	billonesKcal(x: number): string;
	anio(iso: string): string;
	fechaLarga(iso: string | null | undefined): string;
	mesAnio(iso: string | null | undefined): string;
	mes(m: number): string;
	mesCorto(m: number): string;
	/** "1 año y 8 meses" a partir de días */
	duracion(dias: number | null | undefined): string;
}

function fechaUTC(iso: string): Date {
	const [a, m, d] = iso.split('-').map(Number);
	return new Date(Date.UTC(a, m - 1, d || 1));
}

export function crearFormato(idioma: string, t: Traductor): Formato {
	const cache = new Map<string, Intl.NumberFormat>();
	const nf = (digitos: number, extra: Intl.NumberFormatOptions = {}) => {
		const clave = `${digitos}|${JSON.stringify(extra)}`;
		if (!cache.has(clave)) cache.set(clave, new Intl.NumberFormat(idioma, { maximumFractionDigits: digitos, ...extra }));
		return cache.get(clave)!;
	};
	const fecha = (opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(idioma, { timeZone: 'UTC', ...opciones });
	const fechaLarga = fecha({ day: 'numeric', month: 'long', year: 'numeric' });
	const mesAnio = fecha({ month: 'long', year: 'numeric' });
	const mesLargo = fecha({ month: 'long' });
	const mesCorto = fecha({ month: 'short' });
	const entero = nf(0);
	const uno = nf(1);

	return {
		numero: (x, digitos = 0) => (x == null ? '—' : nf(digitos).format(x)),
		cientifica: (x) => nf(2, { notation: 'scientific' }).format(x),
		pct: (x, digitos = 0) => (x == null ? '—' : nf(digitos, { style: 'percent' }).format(x)),
		personas(x) {
			if (x == null) return '—';
			if (x >= 1e9) return t('numeros.miles_de_millones', { values: { n: uno.format(x / 1e9) } });
			if (x >= 1e6) return t('numeros.millones', { values: { n: entero.format(x / 1e6) } });
			if (x >= 1e3) return t('numeros.miles', { values: { n: entero.format(x / 1e3) } });
			return entero.format(x);
		},
		millones(x) {
			if (x >= 1e6) return t('numeros.abrev_millones', { values: { n: entero.format(x / 1e6) } });
			if (x >= 1e3) return t('numeros.abrev_miles', { values: { n: entero.format(x / 1e3) } });
			return entero.format(x);
		},
		billonesKcal: (x) => t('numeros.billones', { values: { n: uno.format(x / 1e12) } }),
		anio: (iso) => nf(0, { useGrouping: false }).format(Number(iso.slice(0, 4))),
		fechaLarga: (iso) => (iso ? fechaLarga.format(fechaUTC(iso)) : '—'),
		mesAnio: (iso) => (iso ? mesAnio.format(fechaUTC(iso)) : '—'),
		mes: (m) => mesLargo.format(new Date(Date.UTC(2025, m - 1, 1))),
		mesCorto: (m) => mesCorto.format(new Date(Date.UTC(2025, m - 1, 1))),
		duracion(dias) {
			if (dias == null) return '—';
			const meses = Math.round(dias / 30.44);
			if (meses < 1) return t('duracion.dias', { values: { n: Math.round(dias) } });
			const a = Math.floor(meses / 12);
			const m = meses % 12;
			const partes = [];
			if (a) partes.push(t('duracion.anios', { values: { n: a } }));
			if (m) partes.push(t('duracion.meses', { values: { n: m } }));
			return partes.length === 2 ? t('duracion.y', { values: { a: partes[0], b: partes[1] } }) : partes[0];
		}
	};
}

export const formato: Readable<Formato> = derived([locale, _], ([$locale, $t]) =>
	crearFormato($locale ?? IDIOMA_FUENTE, $t as Traductor)
);
