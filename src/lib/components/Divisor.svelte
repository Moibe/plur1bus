<script lang="ts">
	// Divisor arrastrable entre dos paneles (patrón "window splitter" de ARIA): se
	// arrastra con mouse o touch, con el teclado se mueve con las flechas (Shift
	// para pasos largos, Home/End a los extremos) y con doble clic vuelve al ancho
	// original. `ancho` es el del panel que está ANTES del divisor; en árabe ese
	// panel queda a la derecha, así que el arrastre se invierte.
	import { _, locale } from 'svelte-i18n';
	import { esRTL } from '$lib/idiomas';

	let {
		ancho = $bindable(),
		min,
		max,
		original,
		controla,
		alCambiar
	}: {
		ancho: number;
		min: number;
		max: number;
		original: number;
		/** id del panel que cambia de ancho */
		controla: string;
		/** al terminar un cambio (soltar, tecla o doble clic): p. ej. para recordarlo */
		alCambiar?: (ancho: number) => void;
	} = $props();

	const rtl = $derived(esRTL($locale ?? ''));
	const limitar = (v: number) => Math.round(Math.min(max, Math.max(min, v)));
	let arrastre = $state<{ x: number; ancho: number } | null>(null);

	// Mientras se arrastra, todo el documento muestra el cursor de redimensionar y no se selecciona texto.
	$effect(() => {
		document.body.classList.toggle('redimensionando', !!arrastre);
	});

	function fijar(v: number) {
		ancho = limitar(v);
		alCambiar?.(ancho);
	}

	function bajar(e: PointerEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		arrastre = { x: e.clientX, ancho: limitar(ancho) };
	}
	function mover(e: PointerEvent) {
		if (!arrastre) return;
		const dx = e.clientX - arrastre.x;
		ancho = limitar(arrastre.ancho + (rtl ? -dx : dx));
	}
	function soltar() {
		if (!arrastre) return;
		arrastre = null;
		alCambiar?.(ancho);
	}
	function tecla(e: KeyboardEvent) {
		const paso = e.shiftKey ? 64 : 16;
		const actual = limitar(ancho);
		if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
			const haciaLaDerecha = e.key === 'ArrowRight' ? 1 : -1;
			fijar(actual + haciaLaDerecha * (rtl ? -paso : paso));
		} else if (e.key === 'Home') fijar(min);
		else if (e.key === 'End') fijar(max);
		else return;
		e.preventDefault();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	class="divisor"
	class:activo={!!arrastre}
	role="separator"
	aria-orientation="vertical"
	aria-controls={controla}
	aria-valuenow={limitar(ancho)}
	aria-valuemin={min}
	aria-valuemax={max}
	aria-label={$_('escenario.divisor')}
	title={$_('escenario.divisor_ayuda')}
	tabindex="0"
	onpointerdown={bajar}
	onpointermove={mover}
	onpointerup={soltar}
	onpointercancel={soltar}
	ondblclick={() => fijar(original)}
	onkeydown={tecla}
></div>

<style>
	.divisor {
		position: relative;
		cursor: col-resize;
		touch-action: none;
		outline: none;
	}
	/* la línea */
	.divisor::before {
		content: '';
		position: absolute;
		inset-block: 0;
		left: 50%;
		width: 1px;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.1);
		transition: background 0.15s ease, width 0.15s ease;
	}
	/* la agarradera, que aparece al pasar el mouse */
	.divisor::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 6px;
		height: 40px;
		transform: translate(-50%, -50%);
		border-radius: 999px;
		background: #facc15;
		opacity: 0;
		transition: opacity 0.15s ease;
	}
	.divisor:hover::before,
	.divisor:focus-visible::before,
	.divisor.activo::before {
		width: 2px;
		background: rgba(250, 204, 21, 0.55);
	}
	.divisor:hover::after,
	.divisor:focus-visible::after,
	.divisor.activo::after {
		opacity: 1;
	}
	:global(body.redimensionando),
	:global(body.redimensionando *) {
		cursor: col-resize !important;
		user-select: none !important;
	}
</style>
