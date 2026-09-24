// Formatos en español de México para cifras de la simulación.

const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat('es-MX', opts);
const entero = nf({ maximumFractionDigits: 0 });
const uno = nf({ maximumFractionDigits: 1 });

export const MESES = [
	'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
	'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export function personas(x: number | null | undefined): string {
	if (x == null) return '—';
	if (x >= 1e9) return `${uno.format(x / 1e9)} mil millones`;
	if (x >= 1e6) return `${entero.format(x / 1e6)} millones`;
	if (x >= 1e3) return `${entero.format(x / 1e3)} mil`;
	return entero.format(x);
}

/** Compacto para ejes y tooltips: 7,348 M · 92 M · 850 mil */
export function millones(x: number): string {
	if (x >= 1e6) return `${entero.format(x / 1e6)} M`;
	if (x >= 1e3) return `${entero.format(x / 1e3)} mil`;
	return entero.format(x);
}

export function pct(x: number | null | undefined, digitos = 0): string {
	if (x == null) return '—';
	return `${nf({ maximumFractionDigits: digitos }).format(x * 100)}%`;
}

export function numero(x: number | null | undefined, digitos = 0): string {
	if (x == null) return '—';
	return nf({ maximumFractionDigits: digitos }).format(x);
}

/** kcal/día en billones (10^12), la escala natural del consumo mundial. */
export function billonesKcal(x: number): string {
	return `${uno.format(x / 1e12)} billones`;
}

export function fechaLarga(iso: string | null | undefined): string {
	if (!iso) return '—';
	const [a, m, d] = iso.split('-').map(Number);
	return `${d} de ${MESES[m - 1]} de ${a}`;
}

export function mesAnio(iso: string | null | undefined): string {
	if (!iso) return '—';
	const [a, m] = iso.split('-').map(Number);
	return `${MESES[m - 1]} de ${a}`;
}

/** "1 año y 8 meses" a partir de días. */
export function duracion(dias: number | null | undefined): string {
	if (dias == null) return '—';
	const meses = Math.round(dias / 30.44);
	if (meses < 1) return `${Math.round(dias)} días`;
	const a = Math.floor(meses / 12);
	const m = meses % 12;
	const partes = [];
	if (a) partes.push(`${a} ${a === 1 ? 'año' : 'años'}`);
	if (m) partes.push(`${m} ${m === 1 ? 'mes' : 'meses'}`);
	return partes.join(' y ');
}
