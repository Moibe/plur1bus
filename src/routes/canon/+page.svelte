<script lang="ts">
	// Lo que la serie dice sobre la comida de la colmena, y dónde las cuentas no cierran.
	import { onMount } from 'svelte';
	import { obtenerFuentes, obtenerSupuestos, API_URL } from '$lib/api';
	import { numero, personas } from '$lib/formato';
	import type { Fuentes, Supuestos } from '$lib/tipos';

	let fuentes = $state<Fuentes | null>(null);
	let supuestos = $state<Supuestos | null>(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			[fuentes, supuestos] = await Promise.all([obtenerFuentes(), obtenerSupuestos()]);
		} catch (e) {
			error = `No pude leer los datos de ${API_URL} (${(e as Error).message})`;
		}
	});

	const hechos = $derived(fuentes?.facts.filter((f) => f.dimension === 'canon') ?? []);
	const v = (k: string, d = 0) => supuestos?.valores[k]?.valor ?? d;

	// Canon (ep. 6): media pinta = 300 kcal, 8-12% HDP, 8 cartones al día para 2,400 kcal.
	const LITROS_DIA = 8 * 0.2366;
	const hdp = $derived.by(() => {
		const poblacion = v('poblacion_colmena', 7_348_292_411);
		const masa = v('masa_fallecido_promedio_kg', 52);
		const muertesDia = v('muertes_naturales_dia', 100_000);
		const muertosUnion = v('muertes_union', 886_477_591);
		const kcalCuerpo = v('kcal_cuerpo_adulto', 125_822);
		const necesarioBajo = poblacion * LITROS_DIA * 0.08; // kg HDP/día
		const necesarioAlto = poblacion * LITROS_DIA * 0.12;
		const disponible = muertesDia * masa;
		return {
			poblacion,
			necesarioBajo,
			necesarioAlto,
			disponible,
			cobertura: [disponible / necesarioAlto, disponible / necesarioBajo],
			diasUnion: [(muertosUnion * masa) / necesarioAlto, (muertosUnion * masa) / necesarioBajo],
			diasPersonaPorCuerpo: kcalCuerpo / v('kcal_dia_promedio', 2100),
			diasMundoUnion: (muertosUnion * kcalCuerpo * 0.83) / (poblacion * v('kcal_dia_promedio', 2100))
		};
	});
</script>

<div class="pagina">
	<header>
		<h1>Lo que dice el canon</h1>
		<p>
			La colmena no puede matar, dañar ni interferir con ninguna forma de vida, plantas incluidas. Come lo que ya
			existía, la fruta que cae sola, los animales que mueren de forma natural y el HDP de los humanos que mueren.
		</p>
	</header>

	{#if error}
		<div class="aviso" role="alert">{error}</div>
	{/if}

	<section class="tarjeta-grafica">
		<h4>Las cuentas del HDP no cierran</h4>
		<div class="cuentas">
			<div>
				<span class="cifra">{numero(hdp.necesarioBajo / 1e9, 2)}–{numero(hdp.necesarioAlto / 1e9, 2)} Mt</span>
				<span>de HDP al día harían falta si todos tomaran la bebida del canon (8 medias pintas al 8–12%)</span>
			</div>
			<div>
				<span class="cifra">{numero(hdp.disponible / 1e6, 1)} mil t</span>
				<span>es lo que dan las muertes diarias: {numero(hdp.cobertura[0] * 100, 2)}–{numero(hdp.cobertura[1] * 100, 2)}% de lo necesario</span>
			</div>
			<div>
				<span class="cifra">{numero(hdp.diasUnion[0])}–{numero(hdp.diasUnion[1])} días</span>
				<span>alcanzarían los cuerpos de la Unión para esa bebida</span>
			</div>
			<div>
				<span class="cifra">{numero(hdp.diasMundoUnion, 1)} días</span>
				<span>de comida para todo el mundo son, en calorías, los {personas(v('muertes_union', 886_477_591))} muertos de la Unión</span>
			</div>
		</div>
		<p class="nota">
			Cada cuerpo alimenta a una persona unos {numero(hdp.diasPersonaPorCuerpo)} días. En calorías, el HDP es casi simbólico: sirve como
			proteína para una minoría, no como la base de la dieta.
		</p>
	</section>

	<section class="tarjeta-grafica">
		<h4>Hechos del canon</h4>
		{#if hechos.length}
			<ul class="hechos">
				{#each hechos as h (h.id)}
					<li>
						<p>{h.statement}</p>
						{#if h.model_implication}<p class="implicacion">En el modelo: {h.model_implication}</p>{/if}
						<a href={h.source_url} target="_blank" rel="noreferrer">{new URL(h.source_url).hostname}</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="nota">Los hechos investigados del canon aparecen aquí en cuanto se carga el set de fuentes en la API.</p>
		{/if}
	</section>
</div>

<style>
	.pagina {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1rem;
		max-width: 1100px;
	}
	h1 {
		margin: 0.25rem 0 0.3rem;
		font-size: 1.5rem;
		font-weight: 600;
	}
	header p {
		margin: 0;
		color: rgba(255, 255, 255, 0.78);
		font-size: 0.92rem;
		max-width: 75ch;
	}
	.cuentas {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.9rem;
		margin-top: 0.75rem;
	}
	.cuentas div {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.82rem;
		color: var(--viz-ink-2);
	}
	.cifra {
		font-size: 1.5rem;
		font-weight: 600;
		color: #fff;
	}
	.nota {
		margin: 0.9rem 0 0;
		font-size: 0.84rem;
		color: var(--viz-ink-2);
	}
	.hechos {
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.hechos li {
		padding-bottom: 0.8rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}
	.hechos p {
		margin: 0 0 0.25rem;
		font-size: 0.88rem;
	}
	.implicacion {
		color: var(--viz-ink-2);
		font-size: 0.8rem !important;
	}
	.hechos a {
		font-size: 0.75rem;
		color: #fde68a;
	}
	.aviso {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: rgba(208, 59, 59, 0.18);
		border: 1px solid rgba(208, 59, 59, 0.55);
	}
</style>
