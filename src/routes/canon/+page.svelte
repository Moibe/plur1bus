<script lang="ts">
	// Lo que la serie dice sobre la comida de la colmena, y dónde las cuentas no cierran.
	// Los hechos del canon llegan traducidos por la API (?lang=).
	import { _, locale } from 'svelte-i18n';
	import { obtenerFuentes, obtenerSupuestos, API_URL } from '$lib/api';
	import { formato } from '$lib/formato';
	import type { Fuentes, Supuestos } from '$lib/tipos';

	let fuentes = $state<Fuentes | null>(null);
	let supuestos = $state<Supuestos | null>(null);
	/** detalle técnico del error; el aviso se arma en el idioma activo */
	let error = $state<string | null>(null);

	$effect(() => {
		const idioma = $locale;
		if (!idioma) return;
		let vigente = true;
		Promise.all([obtenerFuentes(idioma), obtenerSupuestos(idioma)])
			.then(([fu, su]) => {
				if (!vigente) return;
				fuentes = fu;
				supuestos = su;
				error = null;
			})
			.catch((e: Error) => {
				if (vigente) error = e.message;
			});
		return () => {
			vigente = false;
		};
	});

	const f = $derived($formato);
	const hechos = $derived(fuentes?.facts.filter((h) => h.dimension === 'canon') ?? []);
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
		<h1>{$_('canon.titulo')}</h1>
		<p>{$_('canon.intro')}</p>
	</header>

	{#if error}
		<div class="aviso" role="alert">{$_('canon.error', { values: { url: API_URL, detalle: error } })}</div>
	{/if}

	<section class="tarjeta-grafica">
		<h4>{$_('canon.hdp_titulo')}</h4>
		<div class="cuentas">
			<div>
				<span class="cifra">
					{$_('canon.cifra_mt', { values: { desde: f.numero(hdp.necesarioBajo / 1e9, 2), hasta: f.numero(hdp.necesarioAlto / 1e9, 2) } })}
				</span>
				<span>{$_('canon.hdp_necesario')}</span>
			</div>
			<div>
				<span class="cifra">{$_('canon.cifra_miles_t', { values: { n: f.numero(hdp.disponible / 1e6, 1) } })}</span>
				<span>
					{$_('canon.hdp_disponible', {
						values: { desde: f.numero(hdp.cobertura[0] * 100, 2), hasta: f.numero(hdp.cobertura[1] * 100, 2) }
					})}
				</span>
			</div>
			<div>
				<span class="cifra">
					{$_('canon.cifra_dias_rango', { values: { desde: f.numero(hdp.diasUnion[0]), hasta: f.numero(hdp.diasUnion[1]) } })}
				</span>
				<span>{$_('canon.hdp_union')}</span>
			</div>
			<div>
				<span class="cifra">{$_('canon.cifra_dias', { values: { n: f.numero(hdp.diasMundoUnion, 1) } })}</span>
				<span>{$_('canon.hdp_mundo', { values: { muertos: f.personas(v('muertes_union', 886_477_591)) } })}</span>
			</div>
		</div>
		<p class="nota">{$_('canon.hdp_nota', { values: { dias: Math.round(hdp.diasPersonaPorCuerpo) } })}</p>
	</section>

	<section class="tarjeta-grafica">
		<h4>{$_('canon.hechos')}</h4>
		{#if hechos.length}
			<ul class="hechos">
				{#each hechos as h (h.id)}
					<li>
						<p>{h.statement}</p>
						{#if h.model_implication}<p class="implicacion">{$_('canon.en_modelo', { values: { texto: h.model_implication } })}</p>{/if}
						<a href={h.source_url} target="_blank" rel="noreferrer">{new URL(h.source_url).hostname}</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="nota">{$_('canon.sin_hechos')}</p>
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
