<script lang="ts">
	// Todos los números base del modelo, con su rango y de dónde salen. Las
	// descripciones y unidades llegan traducidas por la API (?lang=).
	import { _, locale } from 'svelte-i18n';
	import { obtenerSupuestos, API_URL } from '$lib/api';
	import { formato } from '$lib/formato';
	import type { Supuestos } from '$lib/tipos';

	let datos = $state<Supuestos | null>(null);
	/** detalle técnico del error; el aviso se arma en el idioma activo */
	let error = $state<string | null>(null);
	let filtro = $state('');

	$effect(() => {
		const idioma = $locale;
		if (!idioma) return;
		let vigente = true;
		obtenerSupuestos(idioma)
			.then((d) => {
				if (!vigente) return;
				datos = d;
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

	const valores = $derived(
		datos
			? Object.entries(datos.valores).filter(
					([k, v]) => !filtro || `${k} ${v.descripcion}`.toLowerCase().includes(filtro.toLowerCase())
				)
			: []
	);

	function cifra(x: number): string {
		if (x === 0) return f.numero(0);
		const a = Math.abs(x);
		if (a >= 1e12) return f.cientifica(x);
		if (a >= 100) return f.numero(x);
		return f.numero(x, 3);
	}

	const MESES = Array.from({ length: 12 }, (_m, i) => i + 1);
</script>

<div class="pagina">
	<header>
		<h1>{$_('supuestos.titulo')}</h1>
		<p>
			{$_('supuestos.intro')}
			{#if datos?.nota}<br /><em>{datos.nota}</em>{/if}
		</p>
		<input class="buscar" bind:value={filtro} placeholder={$_('supuestos.buscar')} dir="auto" />
	</header>

	{#if error}
		<div class="aviso" role="alert">{$_('supuestos.error', { values: { url: API_URL, detalle: error } })}</div>
	{:else if datos}
		<section class="tarjeta-grafica">
			<h4>{$_('supuestos.valores')}</h4>
			<div class="tabla-scroll alta">
				<table>
					<thead>
						<tr>
							<th>{$_('supuestos.col_supuesto')}</th>
							<th>{$_('supuestos.col_valor')}</th>
							<th>{$_('supuestos.col_rango')}</th>
							<th>{$_('supuestos.col_unidad')}</th>
							<th>{$_('supuestos.col_fuentes')}</th>
						</tr>
					</thead>
					<tbody>
						{#each valores as [clave, v] (clave)}
							<tr>
								<td class="desc">
									<strong>{v.descripcion}</strong>
									<code>{clave}</code>
									{#if v.derivacion}<span class="derivacion">{v.derivacion}</span>{/if}
								</td>
								<td>{cifra(v.valor)}</td>
								<td>{v.bajo === v.alto ? '—' : $_('supuestos.rango', { values: { bajo: cifra(v.bajo), alto: cifra(v.alto) } })}</td>
								<td class="unidad">{v.unidad}</td>
								<td class="fuentes">
									{#each v.fuentes_detalle as fuente (fuente.id)}
										<!-- los títulos van en su idioma original: dir="auto" los aísla para que en árabe no se les mueva la puntuación -->
										<a href={fuente.source_url} target="_blank" rel="noreferrer" title={fuente.source_quote ?? ''} dir="auto">
											{fuente.source_title || new URL(fuente.source_url).hostname}
										</a>
										<span class="confianza {fuente.confidence}">
											{$_(`supuestos.confianza.${fuente.confidence}`, { default: fuente.confidence })}
										</span>
									{:else}
										<span class="sin-fuente">{$_('supuestos.sin_fuente')}</span>
									{/each}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="tarjeta-grafica">
			<h4>{$_('supuestos.tablas')}</h4>
			<div class="tabla-scroll">
				<table>
					<thead>
						<tr>
							<th>{$_('supuestos.col_tabla')}</th>
							{#each MESES as m (m)}<th>{f.mesCorto(m)}</th>{/each}
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(datos.tablas) as [clave, t] (clave)}
							<tr>
								<td class="desc"><strong>{t.descripcion}</strong><code>{clave} · {t.unidad}</code></td>
								{#each t.valores as x, i (i)}<td>{cifra(x)}</td>{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="tarjeta-grafica">
			<h4>{$_('supuestos.ganado')}</h4>
			<div class="tabla-scroll">
				<table>
					<thead>
						<tr>
							<th>{$_('supuestos.col_grupo')}</th>
							<th>{$_('supuestos.col_cabezas')}</th>
							<th>{$_('supuestos.col_kcal_cabeza')}</th>
							<th>{$_('supuestos.col_vida')}</th>
							<th>{$_('supuestos.col_pienso')}</th>
							<th>{$_('supuestos.col_pastoreo')}</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.entries(datos.ganado) as [clave, g] (clave)}
							<tr>
								<td>{g.nombre}</td>
								<td>{cifra(Number(g.cabezas))}</td>
								<td>{cifra(Number(g.kcal_comestible_cabeza))}</td>
								<td>{cifra(Number(g.vida_natural_dias))}</td>
								<td>{cifra(Number(g.alimento_kcal_dia))}</td>
								<td>{f.pct(Number(g.frac_pastoreo))}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{:else}
		<p>{$_('supuestos.cargando')}</p>
	{/if}
</div>

<style>
	.pagina {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1rem;
	}
	h1 {
		margin: 0.25rem 0 0.3rem;
		font-size: 1.5rem;
		font-weight: 600;
	}
	header p {
		margin: 0 0 0.75rem;
		color: rgba(255, 255, 255, 0.75);
		font-size: 0.9rem;
		max-width: 70ch;
	}
	.buscar {
		width: min(420px, 100%);
		padding: 0.5rem 0.75rem;
		color: #fff;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		outline: none;
	}
	.buscar:focus {
		border-color: rgba(250, 204, 21, 0.7);
	}
	.alta {
		max-height: 60vh;
	}
	.desc {
		text-align: start !important;
		white-space: normal !important;
		min-width: 260px;
	}
	.desc strong {
		display: block;
		font-weight: 500;
		color: #fff;
	}
	.desc code {
		font-size: 0.7rem;
		color: var(--viz-muted);
	}
	.derivacion {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.72rem;
		color: var(--viz-ink-2);
	}
	.unidad {
		color: var(--viz-ink-2);
	}
	.fuentes {
		text-align: start !important;
		white-space: normal !important;
		min-width: 200px;
	}
	.fuentes a {
		color: #fde68a;
		text-decoration: none;
		margin-inline-end: 0.3rem;
	}
	.fuentes a:hover {
		text-decoration: underline;
	}
	.confianza {
		display: inline-block;
		margin-inline-end: 0.6rem;
		padding: 0 0.4rem;
		font-size: 0.68rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: var(--viz-ink-2);
	}
	.sin-fuente {
		color: var(--viz-muted);
		font-style: italic;
	}
	.aviso {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: rgba(208, 59, 59, 0.18);
		border: 1px solid rgba(208, 59, 59, 0.55);
	}
</style>
