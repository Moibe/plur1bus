<script lang="ts">
	// Qué es el escenario activo y qué palancas mueve respecto al canon. La lista
	// sale de los valores que se están simulando, así que nunca queda desfasada.
	import { _ } from 'svelte-i18n';
	import { estado, textosDeOrigen } from '$lib/estado.svelte';
	import { formato } from '$lib/formato';
	import { describirCambios } from '$lib/palancas';

	const cambios = $derived(describirCambios(estado.cambios(), estado.esquema, $formato, $_));
	const textos = $derived(textosDeOrigen(estado.origen, $_));
</script>

<section class="explicacion" aria-labelledby="escenario-activo">
	<div class="titulo">
		<h3 id="escenario-activo">{textos.nombre}</h3>
		{#if estado.origen.tipo === 'guardado'}<span class="marca">{$_('escenario.guardado')}</span>{/if}
		{#if estado.modificado}<span class="marca modificado">{$_('escenario.modificado')}</span>{/if}
	</div>
	<p>{textos.explicacion}</p>

	<h4>{$_('escenario.que_cambia')}</h4>
	{#if cambios.length}
		<ul>
			{#each cambios as c (c.clave)}
				<li><span>{c.etiqueta}</span><strong>{c.valor}</strong></li>
			{/each}
		</ul>
	{:else}
		<p class="base">{$_('escenario.nada')}</p>
	{/if}
	{#if estado.modificado}
		<p class="aviso">{$_('escenario.movido')}</p>
	{/if}
</section>

<style>
	.explicacion {
		margin: 0 0 1rem;
		padding: 0.8rem 0.9rem;
		background: rgba(23, 20, 51, 0.72);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 12px;
	}
	.titulo {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.35rem;
	}
	h3 {
		margin: 0;
		font-size: 0.98rem;
		font-weight: 600;
		color: #fff;
	}
	.marca {
		padding: 0 0.45rem;
		font-size: 0.68rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.75);
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 999px;
	}
	.marca.modificado {
		color: #fde68a;
		border-color: rgba(250, 204, 21, 0.55);
	}
	p {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.8);
	}
	h4 {
		margin: 0.75rem 0 0.35rem;
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.55);
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.75);
	}
	li strong {
		font-weight: 600;
		color: #fff;
		text-align: end;
	}
	.base,
	.aviso {
		font-size: 0.76rem;
		color: rgba(255, 255, 255, 0.6);
	}
	.aviso {
		margin-top: 0.5rem;
		color: #fde68a;
	}
</style>
