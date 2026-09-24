<script lang="ts">
	// Botón + modal para guardar el escenario actual con un nombre.
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { estado } from '$lib/estado.svelte';
	import { guardados } from '$lib/guardados.svelte';

	let abierto = $state(false);
	let nombre = $state('');
	let guardando = $state(false);
	let error = $state<string | null>(null);

	function abrir() {
		nombre = estado.origen === 'Canon estricto' ? '' : estado.origen;
		error = null;
		abierto = true;
	}

	async function guardar(ev: SubmitEvent) {
		ev.preventDefault();
		if (!nombre.trim()) return;
		guardando = true;
		try {
			await guardados.guardar(nombre.trim(), estado.cambios());
			estado.origen = nombre.trim();
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
			{#if error}<p class="error">{error}</p>{/if}
			<Dialog.Footer>
				<Button variant="ghost" type="button" onclick={() => (abierto = false)}>Cancelar</Button>
				<Button type="submit" disabled={guardando || !nombre.trim()}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
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
	input {
		padding: 0.5rem 0.7rem;
		font-size: 0.9rem;
		color: #fff;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		outline: none;
	}
	input:focus {
		border-color: rgba(250, 204, 21, 0.7);
	}
	.error {
		margin: 0;
		font-size: 0.8rem;
		color: #f4a3a3;
	}
</style>
