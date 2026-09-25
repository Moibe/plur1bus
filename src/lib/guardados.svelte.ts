// Escenarios guardados en la base del front (SQLite vía /api/escenarios).
// Compartido entre la página del simulador (guardar) y la sidebar (listar/borrar).
import type { Escenario, EscenarioGuardado } from './tipos';

class Guardados {
	lista = $state<EscenarioGuardado[]>([]);
	/** detalle técnico del último error al cargar; la sidebar lo pone en su idioma */
	error = $state<string | null>(null);

	async recargar() {
		try {
			const r = await fetch('/api/escenarios');
			if (!r.ok) throw new Error(`${r.status}`);
			this.lista = await r.json();
			this.error = null;
		} catch (e) {
			this.error = (e as Error).message;
		}
	}

	/** Regresa la fila creada: su id identifica al escenario activo en la sidebar. */
	async guardar(nombre: string, descripcion: string, parametros: Escenario): Promise<EscenarioGuardado> {
		const r = await fetch('/api/escenarios', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ nombre, descripcion, parametros })
		});
		if (!r.ok) throw new Error(await r.text());
		const creado: EscenarioGuardado = await r.json();
		await this.recargar();
		return creado;
	}

	async borrar(id: number) {
		const r = await fetch(`/api/escenarios/${id}`, { method: 'DELETE' });
		if (!r.ok) throw new Error(await r.text());
		await this.recargar();
	}
}

export const guardados = new Guardados();
