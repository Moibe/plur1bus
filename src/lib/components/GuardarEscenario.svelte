<script lang="ts">
	// Botón + modal para guardar el escenario actual con un nombre y una explicación.
	// La explicación es obligatoria: todo escenario tiene que decir qué es.
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { estado } from '$lib/estado.svelte';
	import { guardados } from '$lib/guardados.svelte';
	import { cambiosEnTexto, describirCambios } from '$lib/palancas';

	let abierto = $state(false);
	let nombre = $state('');
	let descripcion = $state('');
	let guardando = $state(false);
	let error = $state<string | null>(null);

	const listo = $derived(!!nombre.trim() && !!descripcion.trim());

	// Borrador para no empezar en blanco: de dónde parte y qué palancas cambia.
	function borrador(): string {
		const cambios = cambiosEnTexto(describirCambios(estado.cambios(), estado.esquema));
		if (!cambios) return 'Igual al canon: no mueve ninguna palanca.';
		const partida = estado.origen.nombre === 'Canon estricto' ? 'el canon' : `«${estado.origen.nombre}»`;
		return `Parte de ${partida}. Cambia: ${cambios}.`;
	}

	function abrir() {
		nombre = estado.origen.guardado || estado.origen.nombre !== 'Canon estricto' ? estado.origen.nombre : '';
		descripcion = borrador();
		error = null;
		abierto = true;
	}

	async function guardar(ev: SubmitEvent) {
		ev.preventDefault();
		if (!listo) return;
		guardando = true;
		try {
			await guardados.guardar(nombre.trim(), descripcion.trim(), estado.cambios());
			estado.origen = { nombre: nombre.trim(), explicacion: descripcion.trim(), base: estado.cambios(), guardado: true };
			abierto = false;
		} catch (e) {
			error = `No se pudo guardar: ${(e as Error).message}`;
		} finally {
			guardando = false;
		}
	}
</script>

<Button variant="outline" size="sm" onclick={abrir}>Guardar</Button>

<Dialog.Root bind:open={abierto}>
	<Dialog.Content class="modal-glass">
		<Dialog.Header>
			<Dialog.Title>Guardar escenario</Dialog.Title>
			<Dialog.Description>Se guardan solo las palancas que moviste respecto al canon.</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={guardar} class="formulario">
			<label>
				<span>Nombre</span>
				<!-- svelte-ignore a11y_autofocus -->
				<input bind:value={nombre} maxlength="80" placeholder="Ej. Junio con leche y huevo" autofocus />
			</label>
			<label>
				<span>¿Qué es este escenario?</span>
				<textarea bind:value={descripcion} maxlength="1000" rows="5" placeholder="Qué supones y por qué vale la pena verlo"></textarea>
				<small>Obligatoria. Te dejé un borrador con lo que cambia; cuéntalo con tus palabras.</small>
			</label>
			{#if error}<p class="error">{error}</p>{/if}
			<Dialog.Footer>
				<Button variant="ghost" type="button" onclick={() => (abierto = false)}>Cancelar</Button>
				<Button type="submit" disabled={guardando || !listo}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
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
