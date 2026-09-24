// Estado compartido del simulador: el esquema de palancas (viene de la API) y
// los valores actuales. La sidebar aplica presets y escenarios guardados; la
// página del simulador corre la simulación cada vez que cambian los valores.
import type { Escenario, EsquemaEscenario } from './tipos';

export interface Preset {
	nombre: string;
	/** una línea, para la sidebar */
	resumen: string;
	/** qué es el escenario y de dónde sale, para el panel del simulador */
	explicacion: string;
	cambios: Escenario;
}

export const PRESETS: Preset[] = [
	{
		nombre: 'Canon estricto',
		resumen: 'Lo que muestra la serie, sin mover nada.',
		explicacion:
			'La colmena no puede matar ni dañar ninguna forma de vida, ni siquiera una planta: no cosecha, no pesca y no sacrifica animales. Come lo que ya estaba guardado, la fruta que cae sola, los animales que mueren de forma natural y el HDP de los humanos que mueren. Suelta al ganado y a las mascotas, sigue ordeñando a las vacas y todos comen lo que necesitan hasta que se acaba. La Unión es en julio, el mes con menos grano almacenado del año; las pistas del canon apuntan a finales de primavera o verano.',
		cambios: {}
	},
	{
		nombre: 'La ración de Cena',
		resumen: 'Desde el día uno, la ración que implica el video de Cena: ~67%.',
		explicacion:
			'En el video del episodio 6, John Cena dice que alguien de su tamaño necesita ocho cartones de 300 kcal al día: 2,400 kcal. Pero Cena pesa unos 114 kg y un cuerpo así gasta cerca de 3,000, así que esa dieta ya es un déficit de ~21 kcal por kilo. Escalada a una persona promedio equivale a ~67% de lo que necesita. Aquí la colmena reparte esa ración fija desde el primer día: la comida dura más, pero los que ya eran delgados empiezan a morir pronto.',
		cambios: { racion_modo: 'fija', racion_fraccion: 0.67 }
	},
	{
		nombre: 'La colmena estira 10 años',
		resumen: 'Racionan para que la comida alcance los diez años de Koumba.',
		explicacion:
			'Koumba le dice a Carol que, según la propia colmena, la mayoría morirá de hambre en los próximos diez años. Aquí la colmena planea: cada día calcula la ración que haría durar la comida guardada, más lo que va a seguir llegando (fruta, HDP, carne, leche), hasta cumplir diez años, sin bajar nunca de 60% de lo que se necesita. Todos comen menos desde el principio, así que el hambre llega antes para los más vulnerables, pero el colapso general se retrasa.',
		cambios: { racion_modo: 'estirar', horizonte_estirar_anios: 10 }
	},
	{
		nombre: 'Unión en diciembre',
		resumen: 'Justo después de la cosecha del norte: graneros llenos.',
		explicacion:
			'El canon no dice en qué fecha fue la Unión, y el grano almacenado en el mundo cambia mucho con el calendario de cosechas: el 1 de julio hay ~1,385 millones de toneladas y el 1 de diciembre ~2,185. Con la Unión en diciembre la colmena arranca con unos 200 días más de comida. Todo lo demás es igual al canon.',
		cambios: { mes_union: 12 }
	},
	{
		nombre: 'Alimentar al ganado',
		resumen: 'No sueltan a los animales: comen el mismo grano que la gente.',
		explicacion:
			'En la serie la colmena suelta al ganado: los aldeanos de Kusimayu lo liberan al unirse. Aquí, para no dejar que los animales mueran de hambre, la colmena los sigue alimentando como antes. Pero hoy el ganado come ~1,100 millones de toneladas de cereal al año, más de lo que come la gente directamente, así que la comida guardada dura la mitad (de ~589 a ~288 días). A cambio, más animales mueren en granja y su carne se aprovecha mejor.',
		cambios: { ganado_politica: 'alimentar' }
	},
	{
		nombre: 'Con resquicios',
		resumen: 'Lecturas generosas de la regla: partos, huevo, miel y grano de plantas muertas.',
		explicacion:
			'La regla es no matar ni dañar, pero hay cosas que podrían caber en ella: dejar que el ganado siga pariendo para que nunca se acabe la leche, recoger los huevos y la miel (para eso la colmena sigue alimentando al ganado), levantar el grano de los cultivos que ya estaban sembrados cuando la planta muere sola al madurar (70% de lo que se habría cosechado) y, del segundo año en adelante, sembrar y recoger solo cuando la planta ya se secó (50% de una cosecha normal). No es canon: en el video Cena dice que no pueden cosechar trigo, maíz ni arroz. Sirve para ver que el problema es de reglas, no de comida.',
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

export interface Origen {
	nombre: string;
	explicacion: string;
	/** las palancas que cambiaba respecto al canon cuando se cargó, para saber si ya se modificó */
	base: Escenario;
	/** true si viene de un escenario guardado (no de un preset) */
	guardado: boolean;
}

/** Igualdad que tolera el ruido de punto flotante de los sliders (0.7 vs 0.7000000000000001). */
function igual(a: unknown, b: unknown): boolean {
	if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
	return a === b;
}

function mismos(a: Escenario, b: Escenario): boolean {
	const ka = Object.keys(a);
	return ka.length === Object.keys(b).length && ka.every((k) => k in b && igual(a[k], b[k]));
}

class EstadoSimulador {
	esquema = $state<EsquemaEscenario | null>(null);
	valores = $state<Escenario>({});
	/** el preset o escenario guardado que se aplicó por última vez */
	origen = $state<Origen>({ nombre: PRESETS[0].nombre, explicacion: PRESETS[0].explicacion, base: {}, guardado: false });

	defaults(): Escenario {
		if (!this.esquema) return {};
		return Object.fromEntries(Object.entries(this.esquema.properties).map(([k, p]) => [k, p.default]));
	}

	iniciar(esquema: EsquemaEscenario) {
		const primeraVez = !this.esquema;
		this.esquema = esquema;
		if (primeraVez) this.valores = this.defaults();
	}

	aplicar(cambios: Escenario, origen: { nombre: string; explicacion: string; guardado?: boolean }) {
		this.valores = { ...this.defaults(), ...cambios };
		this.origen = { ...origen, guardado: origen.guardado ?? false, base: this.cambios() };
	}

	/** Solo lo que difiere del default: es lo que vale la pena guardar o mostrar. */
	cambios(): Escenario {
		const d = this.defaults();
		return Object.fromEntries(Object.entries(this.valores).filter(([k, v]) => !igual(d[k], v)));
	}

	/** ¿Se movió alguna palanca después de cargar el escenario? */
	get modificado(): boolean {
		return !mismos(this.cambios(), this.origen.base);
	}
}

export const estado = new EstadoSimulador();
