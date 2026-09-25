<script lang="ts">
	// Áreas apiladas (parte-del-todo en el tiempo): de dónde sale cada kcal que
	// come la colmena. Bandas separadas por un hueco de 2px del color de fondo,
	// leyenda siempre visible, tooltip con todas las bandas y el total, y tabla.
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
		alto = 260
	}: {
		titulo: string;
		subtitulo?: string;
		x: string[];
		series: SerieGrafica[]; // de abajo hacia arriba
		formatoY: (v: number) => string;
		alto?: number;
	} = $props();

	const M = { top: 14, right: 24, bottom: 26 };
	let ancho = $state(640);
	let hover = $state<number | null>(null);
	let verTabla = $state(false);

	const h = $derived(alto - M.top - M.bottom);
	const n = $derived(x.length);

	// acumulados[k][i] = suma de las series 0..k en el punto i
	const acumulados = $derived.by(() => {
		const acc: number[][] = [];
		series.forEach((s, k) => {
			acc.push(s.valores.map((v, i) => v + (k ? acc[k - 1][i] : 0)));
		});
		return acc;
	});
	const totales = $derived(acumulados.length ? acumulados[acumulados.length - 1] : []);
	const ticksY = $derived(ticksRedondos(Math.max(1e-9, ...totales), 4));
	const topeY = $derived(ticksY[ticksY.length - 1]);
	const ticksX = $derived(ticksAnio(x));
	const izq = $derived(margenEje(ticksY.map(formatoY)));
	const w = $derived(Math.max(120, ancho - izq - M.right));

	const sx = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
	const sy = (v: number) => h - (v / topeY) * h;

	function banda(k: number) {
		const arriba = acumulados[k];
		const abajo = k ? acumulados[k - 1] : null;
		let d = arriba.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('');
		for (let i = n - 1; i >= 0; i--) d += `L${sx(i).toFixed(1)},${sy(abajo ? abajo[i] : 0).toFixed(1)}`;
		return d + 'Z';
	}
	function borde(k: number) {
		return acumulados[k].map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join('');
	}

	function mover(ev: PointerEvent) {
		const r = (ev.currentTarget as SVGRectElement).getBoundingClientRect();
		hover = Math.max(0, Math.min(n - 1, Math.round(((ev.clientX - r.left) / r.width) * (n - 1))));
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
	const deArribaAbajo = $derived([...series].reverse());
</script>

<figure class="tarjeta-grafica">
	<figcaption>
		<div>
			<h4>{titulo}</h4>
			{#if subtitulo}<p>{subtitulo}</p>{/if}
		</div>
		<button type="button" class="ver-tabla" onclick={() => (verTabla = !verTabla)} aria-pressed={verTabla}>
			{verTabla ? $_('grafica.ver_grafica') : $_('grafica.ver_tabla')}
		</button>
	</figcaption>

	<ul class="leyenda">
		{#each series as s (s.clave)}
			<li><span class="clave-area" style="background:{s.color}"></span>{s.nombre}</li>
		{/each}
	</ul>

	{#if verTabla}
		<div class="tabla-scroll">
			<table>
				<thead>
					<tr>
						<th>{$_('grafica.semana')}</th>
						{#each series as s (s.clave)}<th>{s.nombre}</th>{/each}
						<th>{$_('grafica.total')}</th>
					</tr>
				</thead>
				<tbody>
					{#each filas as i (i)}
						<tr>
							<td>{$formato.mesAnio(x[i])}</td>
							{#each series as s (s.clave)}<td>{formatoY(s.valores[i])}</td>{/each}
							<td>{formatoY(totales[i])}</td>
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
					{#each ticksX as t (t.i)}
						<text class="tick" x={sx(t.i)} y={h + 18} text-anchor="middle">{$formato.anio(x[t.i])}</text>
					{/each}

					{#each series as s, k (s.clave)}
						<path d={banda(k)} fill={s.color} fill-opacity="0.75" />
					{/each}
					{#each series as s, k (s.clave)}
						{#if k < series.length - 1}
							<path d={borde(k)} fill="none" stroke="var(--viz-surface)" stroke-width="2" stroke-linejoin="round" />
						{/if}
					{/each}
					<line class="base" x1="0" x2={w} y1={h} y2={h} />

					{#if hover !== null}
						<line class="cruz" x1={sx(hover)} x2={sx(hover)} y1="0" y2={h} />
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
					{#each deArribaAbajo as s (s.clave)}
						<div class="tt-fila">
							<span class="clave-area" style="background:{s.color}"></span>
							<strong>{formatoY(s.valores[hover])}</strong>
							<span class="tt-nombre">{s.nombre}</span>
						</div>
					{/each}
					<div class="tt-fila tt-total">
						<strong>{formatoY(totales[hover])}</strong>
						<span class="tt-nombre">{$_('grafica.total')}</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</figure>

<style>
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
	.cruz {
		stroke: var(--viz-ink);
		stroke-width: 1;
	}
	.captura {
		fill: transparent;
		cursor: crosshair;
	}
</style>
