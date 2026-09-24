<script lang="ts">
	import { onMount } from 'svelte';
	import GraficaApilada from '$lib/charts/GraficaApilada.svelte';
	import GraficaLineas from '$lib/charts/GraficaLineas.svelte';
	import Kpi from '$lib/components/Kpi.svelte';
	import Palancas from '$lib/components/Palancas.svelte';
	import GuardarEscenario from '$lib/components/GuardarEscenario.svelte';
	import { obtenerEscenario, simular, API_URL } from '$lib/api';
	import { estado } from '$lib/estado.svelte';
	import { billonesKcal, duracion, fechaLarga, mesAnio, millones, numero, pct, personas } from '$lib/formato';
	import type { Resultado } from '$lib/tipos';

	let resultado = $state<Resultado | null>(null);
	let cargando = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			estado.iniciar(await obtenerEscenario());
		} catch (e) {
			error = `No pude hablar con la API en ${API_URL}. ¿Está corriendo plur1bus-api? (${(e as Error).message})`;
		}
	});

	// Cada cambio de palancas vuelve a simular (con pausa corta para no disparar
	// una corrida por cada pixel del slider). Mientras llega, se queda lo anterior.
	let temporizador: ReturnType<typeof setTimeout> | undefined;
	let control: AbortController | undefined;
	$effect(() => {
		const valores = $state.snapshot(estado.valores);
		if (!estado.esquema) return;
		clearTimeout(temporizador);
		temporizador = setTimeout(async () => {
			control?.abort();
			control = new AbortController();
			cargando = true;
			try {
				resultado = await simular(valores, control.signal);
				error = null;
			} catch (e) {
				if ((e as Error).name !== 'AbortError') error = (e as Error).message;
			} finally {
				cargando = false;
			}
		}, 250);
	});

	// Cinco grupos de fuentes: más series que eso ya no se distinguen por color.
	const GRUPOS = [
		{ clave: 'cereal', nombre: 'Cereal', color: 'var(--serie-1)', pools: ['cereal'] },
		{
			clave: 'inventario',
			nombre: 'Otros inventarios',
			color: 'var(--serie-2)',
			pools: ['oleaginosas', 'aceites', 'azucar', 'legumbres', 'tuberculos', 'procesados', 'congelados']
		},
		{ clave: 'frescos', nombre: 'Frescos y fruta caída', color: 'var(--serie-3)', pools: ['perecederos', 'conservas'] },
		{ clave: 'hdp', nombre: 'HDP', color: 'var(--serie-4)', pools: ['hdp'] },
		{ clave: 'carne', nombre: 'Carne de animales', color: 'var(--serie-5)', pools: ['carne_animal'] }
	];

	const r = $derived(resultado);
	const s = $derived(r?.resumen);

	const seriePoblacion = $derived(
		r ? [{ clave: 'poblacion', nombre: 'Población', color: 'var(--serie-1)', valores: r.serie.poblacion }] : []
	);
	const marcas = $derived.by(() => {
		if (!r || s?.dia_inicio_hambruna == null) return [];
		return [{ i: Math.floor(s.dia_inicio_hambruna / 7), etiqueta: 'Empieza la hambruna' }];
	});
	const seriesFuentes = $derived(
		r
			? GRUPOS.map((g) => ({
					clave: g.clave,
					nombre: g.nombre,
					color: g.color,
					valores: r.serie.dia.map((_, i) => g.pools.reduce((acc, p) => acc + (r.serie.consumo_kcal[p]?.[i] ?? 0), 0) / 7)
				}))
			: []
	);
	const seriesCuerpo = $derived(
		r
			? [
					{ clave: 'racion', nombre: 'Ración', color: 'var(--serie-1)', valores: r.serie.racion },
					{ clave: 'reserva', nombre: 'Reserva corporal', color: 'var(--serie-2)', valores: r.serie.reserva_corporal }
				]
			: []
	);
	const principales = $derived(
		r ? [...r.fuentes].filter((f) => f.consumido_kcal > 0).sort((a, b) => b.consumido_kcal - a.consumido_kcal) : []
	);
	const anios = $derived(Number(estado.valores.anios ?? 15));
</script>

<div class="simulador">
	<aside class="panel-palancas">
		<header class="panel-titulo">
			<div>
				<h2>Escenario</h2>
				<p>{estado.origen}</p>
			</div>
			<GuardarEscenario />
		</header>
		{#if estado.esquema}
			<Palancas esquema={estado.esquema} bind:valores={estado.valores} />
		{/if}
	</aside>

	<section class="resultados" class:cargando>
		{#if error}
			<div class="aviso" role="alert">{error}</div>
		{/if}

		{#if r && s}
			<header class="hero">
				{#if s.dia_inicio_hambruna != null}
					<span class="hero-etiqueta">La hambruna empieza en</span>
					<span class="hero-valor">{duracion(s.dia_inicio_hambruna)}</span>
					<span class="hero-detalle">
						{fechaLarga(s.fecha_inicio_hambruna)}, con {numero(s.dias_de_comida_al_inicio)} días de comida guardada al inicio.
					</span>
				{:else}
					<span class="hero-etiqueta">En {anios} años</span>
					<span class="hero-valor">no hay hambruna</span>
					<span class="hero-detalle">La comida alcanza para todos en este escenario.</span>
				{/if}
			</header>

			<div class="kpis">
				<Kpi
					etiqueta="Población a la mitad"
					valor={s.fecha_mitad_poblacion ? mesAnio(s.fecha_mitad_poblacion) : 'Nunca'}
					detalle={s.dia_mitad_poblacion != null ? `a ${duracion(s.dia_mitad_poblacion)} de la Unión` : `en ${anios} años`}
				/>
				<Kpi
					etiqueta="Población a 10 años"
					valor={personas(s.poblacion_10_anios)}
					detalle={s.poblacion_10_anios != null ? `${pct(s.poblacion_10_anios / s.poblacion_inicial, 1)} de la colmena` : 'horizonte menor a 10 años'}
				/>
				<Kpi
					etiqueta="Capacidad de carga"
					valor={personas(s.capacidad_de_carga)}
					detalle="promedio de los últimos 2 años"
				/>
				<Kpi
					etiqueta="¿Acierta Koumba?"
					valor={s.koumba_acierta ? 'Sí' : 'No'}
					detalle={`${pct(s.muertos_hambre_10_anios_frac)} muere de hambre en 10 años`}
				/>
			</div>

			<GraficaLineas
				titulo="Población de la colmena"
				subtitulo="Personas vivas al cierre de cada semana"
				x={r.serie.fecha}
				series={seriePoblacion}
				formatoY={millones}
				area
				permitirLog
				{marcas}
			/>

			<GraficaApilada
				titulo="De dónde sale la comida"
				subtitulo="kcal consumidas al día, por fuente"
				x={r.serie.fecha}
				series={seriesFuentes}
				formatoY={billonesKcal}
			/>

			<GraficaLineas
				titulo="Ración y reserva corporal"
				subtitulo="Ración: fracción de lo que se necesita. Reserva: lo que le queda al cuerpo promedio."
				x={r.serie.fecha}
				series={seriesCuerpo}
				formatoY={(v) => pct(v)}
				yMax={1}
				alto={200}
			/>

			<section class="tarjeta-grafica">
				<h4>Todo lo que se comió en {anios} años</h4>
				<div class="tabla-scroll">
					<table>
						<thead>
							<tr><th>Fuente</th><th>Al inicio</th><th>Consumido</th><th>Parte de la dieta</th></tr>
						</thead>
						<tbody>
							{#each principales as f (f.clave)}
								<tr>
									<td>{f.nombre}</td>
									<td>{f.inicial_kcal ? `${numero(f.inicial_kcal / 1e12)} bill. kcal` : '—'}</td>
									<td>{numero(f.consumido_kcal / 1e12)} bill. kcal</td>
									<td>{pct(f.frac_consumo, 1)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{:else if !error}
			<p class="espera">Simulando…</p>
		{/if}
	</section>
</div>

<style>
	.simulador {
		display: grid;
		grid-template-columns: minmax(280px, 340px) 1fr;
		gap: 1rem;
		height: 100%;
	}
	.panel-palancas,
	.resultados {
		overflow-y: auto;
		min-height: 0;
	}
	.panel-palancas {
		padding: 0.25rem 0.9rem 1rem 0.25rem;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
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
	.panel-titulo p {
		margin: 0.1rem 0 0;
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.65);
	}
	.resultados {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 0.25rem 0.5rem 1rem 0;
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
			border-right: none;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		}
	}
</style>
