<script lang="ts">
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import GraficaApilada from '$lib/charts/GraficaApilada.svelte';
	import GraficaLineas from '$lib/charts/GraficaLineas.svelte';
	import Kpi from '$lib/components/Kpi.svelte';
	import Palancas from '$lib/components/Palancas.svelte';
	import GuardarEscenario from '$lib/components/GuardarEscenario.svelte';
	import ExplicacionEscenario from '$lib/components/ExplicacionEscenario.svelte';
	import Divisor from '$lib/components/Divisor.svelte';
	import { obtenerEscenario, simular, API_URL } from '$lib/api';
	import { estado } from '$lib/estado.svelte';
	import { formato } from '$lib/formato';
	import type { Resultado } from '$lib/tipos';

	// Ancho del panel del escenario: se cambia arrastrando el divisor y se recuerda
	// en este navegador. Los resultados nunca quedan más angostos que MIN_RESULTADOS.
	const ANCHO_PANEL = 340;
	const MIN_PANEL = 260;
	const MIN_RESULTADOS = 380;
	const DIVISOR = 16;
	const CLAVE_ANCHO = 'plur1bus:ancho-panel';
	let anchoPanel = $state(ANCHO_PANEL);
	let anchoSimulador = $state(0);
	// antes de medir (en el servidor) no hay tope: así el SSR ya sale con el ancho de siempre
	const maxPanel = $derived(anchoSimulador ? Math.max(MIN_PANEL, anchoSimulador - DIVISOR - MIN_RESULTADOS) : 720);
	const panel = $derived(Math.min(maxPanel, Math.max(MIN_PANEL, anchoPanel)));

	onMount(() => {
		try {
			const guardado = Number(localStorage.getItem(CLAVE_ANCHO));
			if (guardado > 0) anchoPanel = guardado;
		} catch {
			// sin almacenamiento (modo privado): se queda el ancho de siempre
		}
	});
	function recordarAncho(ancho: number) {
		try {
			localStorage.setItem(CLAVE_ANCHO, String(ancho));
		} catch {
			// sin almacenamiento: el ancho dura lo que dure la página
		}
	}

	let resultado = $state<Resultado | null>(null);
	let cargando = $state(false);
	/** detalle técnico si no se pudo pedir el esquema (el aviso se arma en el idioma activo) */
	let errorApi = $state<string | null>(null);
	let errorSimulacion = $state<string | null>(null);

	// El esquema trae etiquetas y ayudas en el idioma activo: se vuelve a pedir
	// cuando cambia (los valores de las palancas se conservan).
	$effect(() => {
		const idioma = $locale;
		if (!idioma) return;
		let vigente = true;
		obtenerEscenario(idioma)
			.then((esquema) => {
				if (!vigente) return;
				estado.iniciar(esquema);
				errorApi = null;
			})
			.catch((e: Error) => {
				if (vigente) errorApi = e.message;
			});
		return () => {
			vigente = false;
		};
	});

	// Cada cambio de palancas (o de idioma: los nombres de las fuentes vienen de la
	// API) vuelve a simular, con pausa corta para no disparar una corrida por cada
	// pixel del slider. Mientras llega, se queda lo anterior.
	let temporizador: ReturnType<typeof setTimeout> | undefined;
	let control: AbortController | undefined;
	$effect(() => {
		const valores = $state.snapshot(estado.valores);
		const idioma = $locale;
		if (!estado.esquema || !idioma) return;
		clearTimeout(temporizador);
		temporizador = setTimeout(async () => {
			control?.abort();
			const mio = new AbortController();
			control = mio;
			cargando = true;
			try {
				resultado = await simular(valores, idioma, mio.signal);
				errorSimulacion = null;
			} catch (e) {
				if ((e as Error).name !== 'AbortError') errorSimulacion = (e as Error).message;
			} finally {
				// una corrida cancelada no apaga el "simulando…" de la que la reemplazó
				if (control === mio) cargando = false;
			}
		}, 250);
	});

	const error = $derived(
		errorApi ? $_('simulador.error_api', { values: { url: API_URL, detalle: errorApi } }) : errorSimulacion
	);

	// Cinco grupos de fuentes: más series que eso ya no se distinguen por color.
	const GRUPOS = [
		{ clave: 'cereal', color: 'var(--serie-1)', pools: ['cereal'] },
		{
			clave: 'inventario',
			color: 'var(--serie-2)',
			pools: ['oleaginosas', 'aceites', 'azucar', 'legumbres', 'tuberculos', 'procesados', 'congelados']
		},
		{ clave: 'frescos', color: 'var(--serie-3)', pools: ['perecederos', 'conservas'] },
		{ clave: 'hdp', color: 'var(--serie-4)', pools: ['hdp'] },
		{ clave: 'carne', color: 'var(--serie-5)', pools: ['carne_animal'] }
	];

	const r = $derived(resultado);
	const s = $derived(r?.resumen);
	const f = $derived($formato);

	const seriePoblacion = $derived(
		r
			? [{ clave: 'poblacion', nombre: $_('simulador.graficas.poblacion_serie'), color: 'var(--serie-1)', valores: r.serie.poblacion }]
			: []
	);
	const marcas = $derived.by(() => {
		if (!r || s?.dia_inicio_hambruna == null) return [];
		return [{ i: Math.floor(s.dia_inicio_hambruna / 7), etiqueta: $_('simulador.graficas.hambruna') }];
	});
	const seriesFuentes = $derived(
		r
			? GRUPOS.map((g) => ({
					clave: g.clave,
					nombre: $_(`simulador.grupos.${g.clave}`),
					color: g.color,
					valores: r.serie.dia.map(
						(_d, i) => g.pools.reduce((acc, p) => acc + (r.serie.consumo_kcal[p]?.[i] ?? 0), 0) / r.serie.dias_tramo[i]
					)
				}))
			: []
	);
	const seriesCuerpo = $derived(
		r
			? [
					{ clave: 'racion', nombre: $_('simulador.graficas.racion'), color: 'var(--serie-1)', valores: r.serie.racion },
					{ clave: 'reserva', nombre: $_('simulador.graficas.reserva'), color: 'var(--serie-2)', valores: r.serie.reserva_corporal }
				]
			: []
	);
	const principales = $derived(
		r ? [...r.fuentes].filter((x) => x.consumido_kcal > 0).sort((a, b) => b.consumido_kcal - a.consumido_kcal) : []
	);
	const anios = $derived(Number(estado.valores.anios ?? 15));
	const billones = (kcal: number) => $_('simulador.tabla.bill_kcal', { values: { n: f.numero(kcal / 1e12) } });
</script>

<div class="simulador" bind:clientWidth={anchoSimulador} style="--ancho-panel: {panel}px">
	<aside class="panel-palancas" id="panel-escenario">
		<header class="panel-titulo">
			<h2>{$_('escenario.titulo')}</h2>
			<GuardarEscenario />
		</header>
		{#if estado.esquema}
			<ExplicacionEscenario />
			<Palancas esquema={estado.esquema} bind:valores={estado.valores} />
		{/if}
	</aside>

	<Divisor
		bind:ancho={anchoPanel}
		min={MIN_PANEL}
		max={maxPanel}
		original={ANCHO_PANEL}
		controla="panel-escenario"
		alCambiar={recordarAncho}
	/>

	<section class="resultados" class:cargando>
		{#if error}
			<div class="aviso" role="alert">{error}</div>
		{/if}

		{#if r && s}
			<header class="hero">
				{#if s.dia_inicio_hambruna != null}
					<span class="hero-etiqueta">{$_('simulador.hero.empieza')}</span>
					<span class="hero-valor">{f.duracion(s.dia_inicio_hambruna)}</span>
					<span class="hero-detalle">
						{$_('simulador.hero.detalle', {
							values: { fecha: f.fechaLarga(s.fecha_inicio_hambruna), dias: Math.round(s.dias_de_comida_al_inicio) }
						})}
					</span>
				{:else}
					<span class="hero-etiqueta">{$_('simulador.hero.sin_etiqueta', { values: { anios } })}</span>
					<span class="hero-valor">{$_('simulador.hero.sin_valor')}</span>
					<span class="hero-detalle">{$_('simulador.hero.sin_detalle')}</span>
				{/if}
			</header>

			<div class="kpis">
				<Kpi
					etiqueta={$_('simulador.kpi.mitad')}
					valor={s.fecha_mitad_poblacion ? f.mesAnio(s.fecha_mitad_poblacion) : $_('simulador.kpi.nunca')}
					detalle={s.dia_mitad_poblacion != null
						? $_('simulador.kpi.mitad_detalle', { values: { duracion: f.duracion(s.dia_mitad_poblacion) } })
						: $_('simulador.kpi.en_anios', { values: { anios } })}
				/>
				<Kpi
					etiqueta={$_('simulador.kpi.diez')}
					valor={f.personas(s.poblacion_10_anios)}
					detalle={$_('simulador.kpi.diez_detalle', { values: { pct: f.pct(s.poblacion_10_anios / s.poblacion_inicial, 1) } })}
				/>
				<Kpi
					etiqueta={$_('simulador.kpi.carga')}
					valor={f.personas(s.capacidad_de_carga)}
					detalle={$_('simulador.kpi.carga_detalle', {
						values: { desde: f.numero(s.capacidad_ventana_anios[0], 1), hasta: f.numero(s.capacidad_ventana_anios[1], 1) }
					})}
				/>
				<Kpi
					etiqueta={$_('simulador.kpi.koumba')}
					valor={s.koumba_acierta ? $_('simulador.kpi.si') : $_('simulador.kpi.no')}
					detalle={$_('simulador.kpi.koumba_detalle', { values: { pct: f.pct(s.muertos_hambre_10_anios_frac) } })}
				/>
			</div>

			<GraficaLineas
				titulo={$_('simulador.graficas.poblacion')}
				subtitulo={$_('simulador.graficas.poblacion_sub')}
				x={r.serie.fecha}
				series={seriePoblacion}
				formatoY={f.millones}
				area
				permitirLog
				{marcas}
			/>

			<GraficaApilada
				titulo={$_('simulador.graficas.fuentes')}
				subtitulo={$_('simulador.graficas.fuentes_sub')}
				x={r.serie.fecha}
				series={seriesFuentes}
				formatoY={f.billonesKcal}
			/>

			<GraficaLineas
				titulo={$_('simulador.graficas.cuerpo')}
				subtitulo={$_('simulador.graficas.cuerpo_sub')}
				x={r.serie.fecha}
				series={seriesCuerpo}
				formatoY={(v) => f.pct(v)}
				yMax={1}
				alto={200}
			/>

			<section class="tarjeta-grafica">
				<h4>{$_('simulador.tabla.titulo', { values: { anios } })}</h4>
				<div class="tabla-scroll">
					<table>
						<thead>
							<tr>
								<th>{$_('simulador.tabla.fuente')}</th>
								<th>{$_('simulador.tabla.inicio')}</th>
								<th>{$_('simulador.tabla.consumido')}</th>
								<th>{$_('simulador.tabla.parte')}</th>
							</tr>
						</thead>
						<tbody>
							{#each principales as fuente (fuente.clave)}
								<tr>
									<td>{fuente.nombre}</td>
									<td>{fuente.inicial_kcal ? billones(fuente.inicial_kcal) : '—'}</td>
									<td>{billones(fuente.consumido_kcal)}</td>
									<td>{f.pct(fuente.frac_consumo, 1)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{:else if !error}
			<p class="espera">{$_('simulador.simulando')}</p>
		{/if}
	</section>
</div>

<style>
	.simulador {
		display: grid;
		grid-template-columns: var(--ancho-panel, 340px) 1rem 1fr;
		height: 100%;
	}
	.panel-palancas,
	.resultados {
		overflow-y: auto;
		min-height: 0;
	}
	.panel-palancas {
		padding-block: 0.25rem 1rem;
		padding-inline: 0.25rem 0.9rem;
	}
	.panel-titulo {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}
	.panel-titulo h2 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
	}
	.resultados {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-block: 0.25rem 1rem;
		padding-inline: 0 0.5rem;
		transition: opacity 0.2s ease;
	}
	.resultados.cargando {
		opacity: 0.6;
	}
	.hero {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.25rem 0 0.25rem;
	}
	.hero-etiqueta {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.75);
	}
	.hero-valor {
		font-size: 3.2rem;
		font-weight: 650;
		line-height: 1.05;
		color: #fff;
	}
	.hero-detalle {
		font-size: 0.88rem;
		color: rgba(255, 255, 255, 0.72);
	}
	.kpis {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 0.75rem;
	}
	.aviso {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: rgba(208, 59, 59, 0.18);
		border: 1px solid rgba(208, 59, 59, 0.55);
		font-size: 0.88rem;
	}
	.espera {
		color: rgba(255, 255, 255, 0.7);
	}
	@media (max-width: 900px) {
		.simulador {
			grid-template-columns: 1fr;
			height: auto;
		}
		.panel-palancas,
		.resultados {
			overflow: visible;
		}
		.panel-palancas {
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		}
		/* en una sola columna no hay nada que redimensionar */
		.simulador :global(.divisor) {
			display: none;
		}
	}
</style>
