// Escenarios guardados en la base del front (SQLite vía /api/escenarios).
// Compartido entre la página del simulador (guardar) y la sidebar (listar/borrar).
import type { Escenario, EscenarioGuardado } from './tipos';

class Guardados {
	lista = $state<EscenarioGuardado[]>([]);
	error = $state<string | null>(null);

	async recargar() {
		try {
			const r = await fetch('/api/escenarios');
			if (!r.ok) throw new Error(`${r.status}`);
			this.lista = await r.json();
			this.error = null;
		} catch (e) {
			this.error = `No se pudieron cargar los escenarios guardados (${(e as Error).message})`;
		}
	}

	async guardar(nombre: string, descripcion: string, parametros: Escenario) {
		const r = await fetch('/api/escenarios', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ nombre, descripcion, parametros })
		});
		if (!r.ok) throw new Error(await r.text());
		await this.recargar();
	}

	async borrar(id: number) {
		const r = await fetch(`/api/escenarios/${id}`, { method: 'DELETE' });
		if (!r.ok) throw new Error(await r.text());
		await this.recargar();
	}
}

export const guardados = new Guardados();
