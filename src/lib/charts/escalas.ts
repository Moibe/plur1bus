// Utilidades de escala para las gráficas SVG hechas a mano.

/** Máximo "redondo" y sus ticks (0 ... max) en ~n pasos. */
export function ticksRedondos(max: number, n = 4): number[] {
	if (!(max > 0)) return [0, 1];
	const crudo = max / n;
	const potencia = 10 ** Math.floor(Math.log10(crudo));
	const paso = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= crudo) ?? 10 * potencia;
	const tope = Math.ceil(max / paso) * paso;
	const ticks = [];
	for (let v = 0; v <= tope + paso / 2; v += paso) ticks.push(+v.toPrecision(12));
	return ticks;
}

/** Índices donde empieza cada año de una serie de fechas ISO (para el eje X). */
export function ticksAnio(fechas: string[], maxEtiquetas = 8): { i: number; etiqueta: string }[] {
	const cambios: { i: number; etiqueta: string }[] = [];
	let anterior = '';
	fechas.forEach((f, i) => {
		const a = f.slice(0, 4);
		if (a !== anterior) {
			if (anterior) cambios.push({ i, etiqueta: a });
			anterior = a;
		}
	});
	const salto = Math.max(1, Math.ceil(cambios.length / maxEtiquetas));
	return cambios.filter((_, k) => k % salto === 0);
}

let medidor: CanvasRenderingContext2D | null | undefined;

/**
 * Margen izquierdo que necesitan las etiquetas del eje Y (texto de 11px pegado
 * al eje con 10px de hueco). En árabe, alemán o francés las cifras llevan
 * palabras ("8,000 مليون", "8.000 Mio.") y no caben en un margen fijo.
 */
export function margenEje(etiquetas: string[], minimo = 40): number {
	if (medidor === undefined && typeof document !== 'undefined') {
		medidor = document.createElement('canvas').getContext('2d');
		if (medidor) medidor.font = `11px ${getComputedStyle(document.body).fontFamily}`;
	}
	const ancho = Math.max(0, ...etiquetas.map((e) => (medidor ? medidor.measureText(e).width : e.length * 6.5)));
	return Math.max(minimo, Math.ceil(ancho) + 16);
}

/** Filas muestreadas para la vista de tabla: una cada `cada` puntos, más la última. */
export function filasMuestreadas(n: number, cada: number): number[] {
	const filas = [];
	for (let i = 0; i < n; i += cada) filas.push(i);
	if (filas[filas.length - 1] !== n - 1) filas.push(n - 1);
	return filas;
}

export interface SerieGrafica {
	clave: string;
	nombre: string;
	color: string;
	valores: number[];
}
