<script lang="ts">
	// Selector de idioma de la TopNav. Guarda la elección en cookie (la lee el
	// servidor en la siguiente carga) y ajusta <html lang dir> al momento.
	import { locale, _ } from 'svelte-i18n';
	import { IDIOMAS, NOMBRES_IDIOMA, esRTL, normalizarIdioma, type Idioma } from '$lib/idiomas';
	import { aplicarIdiomaAlDocumento, guardarPreferencia } from '$lib/i18n';

	let abierto = $state(false);
	let raiz: HTMLDivElement | undefined = $state();
	const actual = $derived(normalizarIdioma($locale) ?? 'es');

	function elegir(lang: Idioma) {
		locale.set(lang);
		guardarPreferencia(lang);
		aplicarIdiomaAlDocumento(lang);
		abierto = false;
	}
	function clicFuera(e: MouseEvent) {
		if (abierto && raiz && !raiz.contains(e.target as Node)) abierto = false;
	}
	function tecla(e: KeyboardEvent) {
		if (e.key === 'Escape') abierto = false;
	}
</script>

<svelte:window onclick={clicFuera} onkeydown={tecla} />

<div class="idioma" bind:this={raiz}>
	<button
		type="button"
		class="boton"
		aria-haspopup="listbox"
		aria-expanded={abierto}
		aria-label={$_('idioma.actual', { values: { idioma: NOMBRES_IDIOMA[actual] } })}
		title={$_('idioma.cambiar')}
		onclick={() => (abierto = !abierto)}
	>
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
		<span class="codigo">{actual.toUpperCase()}</span>
	</button>
	{#if abierto}
		<ul class="menu" role="listbox" aria-label={$_('idioma.cambiar')}>
			{#each IDIOMAS as lang (lang)}
				<li>
					<button
						type="button"
						role="option"
						aria-selected={lang === actual}
						class:activo={lang === actual}
						lang={lang}
						dir={esRTL(lang) ? 'rtl' : 'ltr'}
						onclick={() => elegir(lang)}
					>
						{NOMBRES_IDIOMA[lang]}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.idioma {
		position: relative;
		margin-inline-start: auto;
	}
	.boton {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.7rem;
		font: inherit;
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease;
	}
	.boton:hover,
	.boton[aria-expanded='true'] {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(250, 204, 21, 0.55);
	}
	.codigo {
		letter-spacing: 0.04em;
	}
	.menu {
		position: absolute;
		top: calc(100% + 8px);
		inset-inline-end: 0;
		z-index: 20;
		min-width: 150px;
		margin: 0;
		padding: 0.3rem;
		list-style: none;
		background: rgba(23, 20, 51, 0.97);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 12px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
	}
	.menu button {
		width: 100%;
		padding: 0.45rem 0.7rem;
		font: inherit;
		font-size: 0.88rem;
		text-align: start;
		color: rgba(255, 255, 255, 0.88);
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
	}
	.menu button:hover {
		background: rgba(255, 255, 255, 0.08);
	}
	.menu button.activo {
		color: #fff;
		background: rgba(250, 204, 21, 0.16);
		border-color: rgba(250, 204, 21, 0.55);
	}
	@media (max-width: 680px) {
		.codigo {
			display: none;
		}
	}
</style>
