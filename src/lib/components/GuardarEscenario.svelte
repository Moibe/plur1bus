<script lang="ts">
	// Botón + modal para guardar el escenario actual con un nombre y una explicación.
	// La explicación es obligatoria: todo escenario tiene que decir qué es.
	import { _ } from 'svelte-i18n';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { estado, textosDeOrigen } from '$lib/estado.svelte';
	import { formato } from '$lib/formato';
	import { guardados } from '$lib/guardados.svelte';
	import { cambiosEnTexto, describirCambios } from '$lib/palancas';

	let abierto = $state(false);
	let nombre = $state('');
	let descripcion = $state('');
	let guardando = $state(false);
	let error = $state<string | null>(null);

	const listo = $derived(!!nombre.trim() && !!descripcion.trim());
	const esCanon = () => estado.origen.tipo === 'preset' && estado.origen.id === 'canon';

	// Borrador para no empezar en blanco: de dónde parte y qué palancas cambia.
	function borrador(): string {
		const cambios = cambiosEnTexto(describirCambios(estado.cambios(), estado.esquema, $formato, $_));
		if (!cambios) return $_('guardar.borrador_igual');
		const partida = esCanon()
			? $_('guardar.partida_canon')
			: $_('guardar.partida_otro', { values: { nombre: textosDeOrigen(estado.origen, $_).nombre } });
		return $_('guardar.borrador', { values: { partida, cambios } });
	}

	function abrir() {
		nombre = esCanon() ? '' : textosDeOrigen(estado.origen, $_).nombre;
		descripcion = borrador();
		error = null;
		abierto = true;
	}

	async function guardar(ev: SubmitEvent) {
		ev.preventDefault();
		if (!listo) return;
		guardando = true;
		try {
			const creado = await guardados.guardar(nombre.trim(), descripcion.trim(), estado.cambios());
			estado.origen = {
				tipo: 'guardado',
				id: creado.id,
				nombre: creado.nombre,
				explicacion: creado.descripcion,
				base: estado.cambios()
			};
			abierto = false;
		} catch (e) {
			error = $_('guardar.error', { values: { detalle: (e as Error).message } });
		} finally {
			guardando = false;
		}
	}
</script>

<Button variant="outline" size="sm" onclick={abrir}>{$_('guardar.boton')}</Button>

<Dialog.Root bind:open={abierto}>
	<Dialog.Content class="modal-glass">
		<Dialog.Header>
			<Dialog.Title>{$_('guardar.titulo')}</Dialog.Title>
			<Dialog.Description>{$_('guardar.descripcion')}</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={guardar} class="formulario">
			<label>
				<span>{$_('guardar.nombre')}</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input bind:value={nombre} maxlength="80" placeholder={$_('guardar.nombre_ejemplo')} dir="auto" autofocus />
			</label>
			<label>
				<span>{$_('guardar.explicacion')}</span>
				<textarea bind:value={descripcion} maxlength="1000" rows="5" placeholder={$_('guardar.explicacion_ejemplo')} dir="auto"></textarea>
				<small>{$_('guardar.explicacion_ayuda')}</small>
			</label>
			{#if error}<p class="error">{error}</p>{/if}
			<Dialog.Footer>
				<Button variant="ghost" type="button" onclick={() => (abierto = false)}>{$_('guardar.cancelar')}</Button>
				<Button type="submit" disabled={guardando || !listo}>{guardando ? $_('guardar.guardando') : $_('guardar.boton')}</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<style>
	.formulario {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.82rem;
		color: rgba(255, 255, 255, 0.8);
	}
	input,
	textarea {
		padding: 0.5rem 0.7rem;
		font: inherit;
		font-size: 0.9rem;
		color: #fff;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		outline: none;
	}
	textarea {
		resize: vertical;
		line-height: 1.4;
	}
	input:focus,
	textarea:focus {
		border-color: rgba(250, 204, 21, 0.7);
	}
	small {
		font-size: 0.74rem;
		color: rgba(255, 255, 255, 0.55);
	}
	.error {
		margin: 0;
		font-size: 0.8rem;
		color: #f4a3a3;
	}
</style>
