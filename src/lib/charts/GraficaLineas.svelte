<script lang="ts">
	// Gráfica de líneas en SVG: crosshair que se ajusta a la semana más cercana,
	// un tooltip con todas las series, etiqueta al final de cada línea y una
	// vista de tabla equivalente. Una sola escala Y (nunca doble eje).
	import { filasMuestreadas, margenEje, ticksAnio, ticksRedondos, type SerieGrafica } from './escalas';
	import { _, locale } from 'svelte-i18n';
	import { formato } from '$lib/formato';
	import { esRTL } from '$lib/idiomas';

	let {
		titulo,
		subtitulo = '',
		x,
		series,
		formatoY,
		yMax,
		alto = 240,
		area = false,
		marcas = [],
		permitirLog = false
	}: {
		titulo: string;
		subtitulo?: string;
		x: string[];
		series: SerieGrafica[];
		formatoY: (v: number) => string;
		yMax?: number;
		alto?: number;
		area?: boolean;
		marcas?: { i: number; etiqueta: string }[];
		/** muestra un botón para cambiar a escala logarítmica (útil cuando la serie cae varios órdenes de magnitud) */
		permitirLog?: boolean;
	} = $props();

	const M = { top: 14, right: 96, bottom: 26 };
	let ancho = $state(640);
	let hover = $state<number | null>(null);
	let verTabla = $state(false);
	let log = $state(false);

	const h = $derived(alto - M.top - M.bottom);
	const n = $derived(x.length);
	const maxDatos = $derived(Math.max(1e-9, ...series.flatMap((s) => s.valores)));
	const ticksLineal = $derived(ticksRedondos(yMax ?? maxDatos, 4));
	// Escala log: décadas desde la más baja con datos positivos hasta la que cubre el máximo.
	const decadas = $derived.by(() => {
		const positivos = series.flatMap((s) => s.valores).filter((v) => v > 0);
		const bajo = Math.floor(Math.log10(Math.max(1, Math.min(...positivos))));
		const alto = Math.ceil(Math.log10(maxDatos));
		return { bajo, alto: Math.max(alto, bajo + 1) };
	});
	const ticksY = $derived(
		log ? Array.from({ length: decadas.alto - decadas.bajo + 1 }, (_, k) => 10 ** (decadas.bajo + k)) : ticksLineal
	);
	const topeY = $derived(yMax ?? ticksLineal[ticksLineal.length - 1]);
	const ticksX = $derived(ticksAnio(x));
	const izq = $derived(margenEje(ticksY.map(formatoY)));
	const w = $derived(Math.max(120, ancho - izq - M.right));

	const sx = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
	const sy = (v: number) => {
		if (log) {
			const l = Math.log10(Math.max(v, 10 ** decadas.bajo));
			return h - ((l - decadas.bajo) / (decadas.alto - decadas.bajo)) * h;
		}
		return h - (Math.min(v, topeY) / topeY) * h;
	};

	function linea(valores: number[]) {
		return valores.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('');
	}
	function relleno(valores: number[]) {
		return `${linea(valores)}L${sx(n - 1).toFixed(1)},${h}L0,${h}Z`;
	}

	// Etiquetas al final solo si no chocan entre sí (si chocan, leyenda + tooltip).
	const finales = $derived.by(() => {
		const ys = series.map((s) => sy(s.valores[n - 1] ?? 0));
		const chocan = ys.some((a, i) => ys.some((b, j) => i !== j && Math.abs(a - b) < 14));
		return chocan ? [] : series.map((s, i) => ({ s, y: ys[i] }));
	});

	function mover(ev: PointerEvent) {
		const r = (ev.currentTarget as SVGRectElement).getBoundingClientRect();
		const px = ev.clientX - r.left;
		hover = Math.max(0, Math.min(n - 1, Math.round((px / r.width) * (n - 1))));
	}
	function teclado(ev: KeyboardEvent) {
		if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
		ev.preventDefault();
		const paso = ev.shiftKey ? 13 : 1;
		const actual = hover ?? n - 1;
		hover = Math.max(0, Math.min(n - 1, actual + (ev.key === 'ArrowRight' ? paso : -paso)));
	}

	const filas = $derived(filasMuestreadas(n, 13));
	const dirPagina = $derived(esRTL($locale ?? '') ? 'rtl' : 'ltr');
</script>

<figure class="tarjeta-grafica">
	<figcaption>
		<div>
			<h4>{titulo}</h4>
			{#if subtitulo}<p>{subtitulo}</p>{/if}
		</div>
		<div class="acciones">
			{#if permitirLog && !verTabla}
				<button type="button" class="ver-tabla" onclick={() => (log = !log)} aria-pressed={log}>
					{log ? $_('grafica.escala_lineal') : $_('grafica.escala_log')}
				</button>
			{/if}
			<button type="button" class="ver-tabla" onclick={() => (verTabla = !verTabla)} aria-pressed={verTabla}>
				{verTabla ? $_('grafica.ver_grafica') : $_('grafica.ver_tabla')}
			</button>
		</div>
	</figcaption>

	{#if series.length > 1}
		<ul class="leyenda">
			{#each series as s (s.clave)}
				<li><span class="clave-linea" style="background:{s.color}"></span>{s.nombre}</li>
			{/each}
		</ul>
	{/if}

	{#if verTabla}
		<div class="tabla-scroll">
			<table>
				<thead>
					<tr>
						<th>{$_('grafica.semana')}</th>
						{#each series as s (s.clave)}<th>{s.nombre}</th>{/each}
					</tr>
				</thead>
				<tbody>
					{#each filas as i (i)}
						<tr>
							<td>{$formato.mesAnio(x[i])}</td>
							{#each series as s (s.clave)}<td>{formatoY(s.valores[i])}</td>{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<!-- El tiempo corre de izquierda a derecha también en árabe: el lienzo es siempre LTR
		     (ejes, anclas de texto y posición del tooltip); el contenido del tooltip sigue a la página. -->
		<div class="lienzo" dir="ltr" bind:clientWidth={ancho}>
			<svg
				width={ancho}
				height={alto}
				role="slider"
				aria-valuemin={0}
				aria-valuemax={n - 1}
				aria-valuenow={hover ?? n - 1}
				aria-valuetext={$formato.mesAnio(x[hover ?? n - 1])}
				aria-label={$_('grafica.aria', { values: { titulo } })}
				tabindex="0"
				onkeydown={teclado}
				onblur={() => (hover = null)}
			>
				<g transform={`translate(${izq},${M.top})`}>
					{#each ticksY as t (t)}
						<line class="grid" x1="0" x2={w} y1={sy(t)} y2={sy(t)} />
						<text class="tick" x="-10" y={sy(t)} dy="0.32em" text-anchor="end">{formatoY(t)}</text>
					{/each}
					<line class="base" x1="0" x2={w} y1={h} y2={h} />
					{#each ticksX as t (t.i)}
						<text class="tick" x={sx(t.i)} y={h + 18} text-anchor="middle">{$formato.anio(x[t.i])}</text>
					{/each}

					{#each marcas as mk (mk.i)}
						<line class="marca" x1={sx(mk.i)} x2={sx(mk.i)} y1="0" y2={h} />
						<text class="marca-texto" x={sx(mk.i) + 5} y="10">{mk.etiqueta}</text>
					{/each}

					{#each series as s (s.clave)}
						{#if area && series.length === 1}
							<path d={relleno(s.valores)} fill={s.color} fill-opacity="0.1" />
						{/if}
						<path d={linea(s.valores)} fill="none" stroke={s.color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
					{/each}

					{#each finales as f (f.s.clave)}
						<circle cx={w} cy={f.y} r="4" fill={f.s.color} stroke="var(--viz-surface)" stroke-width="2" />
						<text class="final" x={w + 10} y={f.y} dy="0.32em">{formatoY(f.s.valores[n - 1])}</text>
					{/each}

					{#if hover !== null}
						<line class="cruz" x1={sx(hover)} x2={sx(hover)} y1="0" y2={h} />
						{#each series as s (s.clave)}
							<circle cx={sx(hover)} cy={sy(s.valores[hover])} r="4" fill={s.color} stroke="var(--viz-surface)" stroke-width="2" />
						{/each}
					{/if}

					<rect
						class="captura"
						x="0"
						y="0"
						width={w}
						height={h}
						role="presentation"
						onpointermove={mover}
						onpointerleave={() => (hover = null)}
					/>
				</g>
			</svg>

			{#if hover !== null}
				{@const izquierda = izq + sx(hover)}
				<div class="tooltip" dir={dirPagina} style={izquierda > ancho / 2 ? `right:${ancho - izquierda + 12}px` : `left:${izquierda + 12}px`}>
					<div class="tt-fecha">{$formato.mesAnio(x[hover])}</div>
					{#each series as s (s.clave)}
						<div class="tt-fila">
							<span class="clave-linea" style="background:{s.color}"></span>
							<strong>{formatoY(s.valores[hover])}</strong>
							<span class="tt-nombre">{s.nombre}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</figure>

<style>
	.acciones {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}
	.lienzo {
		position: relative;
		width: 100%;
	}
	svg {
		display: block;
		outline: none;
	}
	svg:focus-visible {
		box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.6);
		border-radius: 8px;
	}
	.grid {
		stroke: var(--viz-grid);
		stroke-width: 1;
	}
	.base {
		stroke: var(--viz-axis);
		stroke-width: 1;
	}
	.tick {
		fill: var(--viz-muted);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	.final {
		fill: var(--viz-ink);
		font-size: 12px;
		font-weight: 600;
	}
	.marca {
		stroke: var(--viz-axis);
		stroke-width: 1;
	}
	.marca-texto {
		fill: var(--viz-ink-2);
		font-size: 11px;
	}
	.cruz {
		stroke: var(--viz-ink-2);
		stroke-width: 1;
	}
	.captura {
		fill: transparent;
		cursor: crosshair;
	}
</style>
