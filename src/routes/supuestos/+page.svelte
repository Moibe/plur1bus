<script lang="ts">
	// Todos los números base del modelo, con su rango y de dónde salen.
	import { onMount } from 'svelte';
	import { obtenerSupuestos, API_URL } from '$lib/api';
	import { MESES, numero } from '$lib/formato';
	import type { Supuestos } from '$lib/tipos';

	let datos = $state<Supuestos | null>(null);
	let error = $state<string | null>(null);
	let filtro = $state('');

	onMount(async () => {
		try {
			datos = await obtenerSupuestos();
		} catch (e) {
			error = `No pude leer los supuestos de ${API_URL} (${(e as Error).message})`;
		}
	});

	const valores = $derived(
		datos
			? Object.entries(datos.valores).filter(
					([k, v]) => !filtro || `${k} ${v.descripcion}`.toLowerCase().includes(filtro.toLowerCase())
				)
			: []
	);

	function cifra(x: number): string {
		if (x === 0) return '0';
		const a = Math.abs(x);
		if (a >= 1e12) return x.toExponential(2);
		if (a >= 100) return numero(x);
		return numero(x, 3);
	}

	const CONFIANZA: Record<string, string> = { high: 'alta', medium: 'media', low: 'baja' };
</script>

<div class="pagina">
	<header>
		<h1>Supuestos del modelo</h1>
		<p>
			Cada número que usa el motor, con el rango que puedes explorar y las fuentes que lo respaldan.
			{#if datos?.nota}<br /><em>{datos.nota}</em>{/if}
		</p>
		<input class="buscar" bind:value={filtro} placeholder="Buscar (p. ej. cereal, hdp, perros)" />
	</header>

	{#if error}
		<div class="aviso" role="alert">{error}</div>
	{:else if datos}
		<section class="tarjeta-grafica">
			<h4>Valores</h4>
			<div class="tabla-scroll alta">
				<table>
					<thead>
						<tr><th>Supuesto</th><th>Valor</th><th>Rango</th><th>Unidad</th><th>Fuentes</th></tr>
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
								<td>{v.bajo === v.alto ? '—' : `${cifra(v.bajo)} a ${cifra(v.alto)}`}</td>
								<td class="unidad">{v.unidad}</td>
								<td class="fuentes">
									{#each v.fuentes_detalle as f (f.id)}
										<a href={f.source_url} target="_blank" rel="noreferrer" title={f.source_quote ?? ''}>
											{f.source_title || new URL(f.source_url).hostname}
										</a>
										<span class="confianza {f.confidence}">{CONFIANZA[f.confidence] ?? f.confidence}</span>
									{:else}
										<span class="sin-fuente">sin fuente todavía</span>
									{/each}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<section class="tarjeta-grafica">
			<h4>Tablas por mes</h4>
			<div class="tabla-scroll">
				<table>
					<thead>
						<tr>
							<th>Tabla</th>
							{#each MESES as m (m)}<th>{m.slice(0, 3)}</th>{/each}
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
			<h4>Ganado</h4>
			<div class="tabla-scroll">
				<table>
					<thead>
						<tr><th>Grupo</th><th>Cabezas</th><th>kcal comestibles por cabeza</th><th>Vida natural (días)</th><th>Pienso (kcal/día)</th><th>Pastoreo</th></tr>
					</thead>
					<tbody>
						{#each Object.entries(datos.ganado) as [clave, g] (clave)}
							<tr>
								<td>{g.nombre}</td>
								<td>{cifra(Number(g.cabezas))}</td>
								<td>{cifra(Number(g.kcal_comestible_cabeza))}</td>
								<td>{cifra(Number(g.vida_natural_dias))}</td>
								<td>{cifra(Number(g.alimento_kcal_dia))}</td>
								<td>{numero(Number(g.frac_pastoreo) * 100)}%</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{:else}
		<p>Cargando…</p>
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
		text-align: left !important;
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
		text-align: left !important;
		white-space: normal !important;
		min-width: 200px;
	}
	.fuentes a {
		color: #fde68a;
		text-decoration: none;
		margin-right: 0.3rem;
	}
	.fuentes a:hover {
		text-decoration: underline;
	}
	.confianza {
		display: inline-block;
		margin-right: 0.6rem;
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
