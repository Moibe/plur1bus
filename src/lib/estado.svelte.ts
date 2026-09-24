// Estado compartido del simulador: el esquema de palancas (viene de la API) y
// los valores actuales. La sidebar aplica presets y escenarios guardados; la
// página del simulador corre la simulación cada vez que cambian los valores.
import type { Escenario, EsquemaEscenario } from './tipos';

export interface Preset {
	nombre: string;
	descripcion: string;
	cambios: Escenario;
}

export const PRESETS: Preset[] = [
	{
		nombre: 'Canon estricto',
		descripcion: 'Todos comen completo hasta que se acaba, como en la serie.',
		cambios: {}
	},
	{
		nombre: 'La ración de Cena',
		descripcion: 'Cena come 2,400 kcal pesando ~114 kg: 21 kcal por kilo. Escalado a una persona promedio es ~67% de lo que necesita.',
		cambios: { racion_modo: 'fija', racion_fraccion: 0.67 }
	},
	{
		nombre: 'La colmena estira 10 años',
		descripcion: 'Racionan para que la comida dure lo que dice Koumba.',
		cambios: { racion_modo: 'estirar', horizonte_estirar_anios: 10 }
	},
	{
		nombre: 'Unión en diciembre',
		descripcion: 'Justo después de la cosecha del norte: los graneros están en su punto más alto.',
		cambios: { mes_union: 12 }
	},
	{
		nombre: 'Alimentar al ganado',
		descripcion: 'No soltar a los animales: comen del mismo grano que la gente.',
		cambios: { ganado_politica: 'alimentar' }
	},
	{
		nombre: 'Con resquicios',
		descripcion: 'Partos para que no se acabe la leche, huevo, miel y grano de plantas que mueren solas.',
		cambios: {
			ganado_politica: 'alimentar',
			partos_ganado: true,
			resquicio_huevos: 0.8,
			resquicio_miel: 1,
			cosecha_senescente: 0.7,
			siembra_senescente: 0.5
		}
	}
];

class EstadoSimulador {
	esquema = $state<EsquemaEscenario | null>(null);
	valores = $state<Escenario>({});
	/** nombre del preset o escenario guardado que se aplicó por última vez */
	origen = $state<string>('Canon estricto');

	defaults(): Escenario {
		if (!this.esquema) return {};
		return Object.fromEntries(Object.entries(this.esquema.properties).map(([k, p]) => [k, p.default]));
	}

	iniciar(esquema: EsquemaEscenario) {
		const primeraVez = !this.esquema;
		this.esquema = esquema;
		if (primeraVez) this.valores = this.defaults();
	}

	aplicar(cambios: Escenario, origen: string) {
		this.valores = { ...this.defaults(), ...cambios };
		this.origen = origen;
	}

	/** Solo lo que difiere del default: es lo que vale la pena guardar o mostrar. */
	cambios(): Escenario {
		const d = this.defaults();
		return Object.fromEntries(Object.entries(this.valores).filter(([k, v]) => d[k] !== v));
	}
}

export const estado = new EstadoSimulador();
