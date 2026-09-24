// Contrato con plur1bus-api (POST /simular, GET /escenario, GET /supuestos).

export type Escenario = Record<string, number | string | boolean | null>;

export interface Palanca {
	title?: string;
	description?: string;
	type?: string;
	enum?: string[];
	anyOf?: { type: string }[];
	minimum?: number;
	maximum?: number;
	default: number | string | boolean | null;
	grupo: string;
	etiqueta: string;
	paso?: number;
	formato?: 'mes' | 'pct' | 'x' | 'kcal' | 'entero';
}

export interface EsquemaEscenario {
	properties: Record<string, Palanca>;
}

export interface Resumen {
	poblacion_inicial: number;
	dias_de_comida_al_inicio: number;
	dia_inicio_hambruna: number | null;
	fecha_inicio_hambruna: string | null;
	dia_mitad_poblacion: number | null;
	fecha_mitad_poblacion: string | null;
	poblacion_10_anios: number | null;
	poblacion_final: number;
	poblacion_minima: number;
	dia_poblacion_minima: number;
	capacidad_de_carga: number | null;
	muertes_hambre: number;
	muertes_naturales: number;
	nacimientos: number;
	muertos_hambre_10_anios_frac: number;
	racion_promedio: number;
	koumba_acierta: boolean;
}

export interface Fuente {
	clave: string;
	nombre: string;
	inicial_kcal: number;
	consumido_kcal: number;
	frac_consumo: number;
}

export interface Serie {
	dia: number[];
	fecha: string[];
	poblacion: number[];
	poblacion_cohortes: Record<string, number[]>;
	muertes_hambre: number[];
	muertes_naturales: number[];
	nacimientos: number[];
	racion: number[];
	reserva_corporal: number[];
	consumo_kcal: Record<string, number[]>;
	inventario_kcal: Record<string, number[]>;
	entradas_kcal: Record<string, number[]>;
	ganado_cabezas: Record<string, number[]>;
}

export interface Resultado {
	escenario: Escenario;
	resumen: Resumen;
	fuentes: Fuente[];
	serie: Serie;
}

export interface SupuestoFuente {
	id: string;
	description: string;
	value: number;
	unit: string;
	source_title?: string;
	source_url: string;
	source_quote?: string;
	confidence: 'high' | 'medium' | 'low';
	verify?: string;
}

export interface Supuesto {
	valor: number;
	bajo: number;
	alto: number;
	unidad: string;
	descripcion: string;
	fuentes: string[];
	derivacion?: string;
	fuentes_detalle: SupuestoFuente[];
}

export interface Supuestos {
	version: string;
	nota?: string;
	valores: Record<string, Supuesto>;
	tablas: Record<string, { valores: number[]; unidad: string; descripcion: string; fuentes: string[]; derivacion?: string }>;
	ganado: Record<string, Record<string, number | string | string[]>>;
}

export interface Hecho {
	id: string;
	statement: string;
	source_url: string;
	source_quote?: string;
	confidence: 'high' | 'medium' | 'low';
	model_implication?: string;
	dimension?: string;
	verify?: string;
}

export interface Fuentes {
	params: (SupuestoFuente & { dimension?: string })[];
	facts: Hecho[];
}

export interface EscenarioGuardado {
	id: number;
	nombre: string;
	parametros: Escenario;
	creado: string;
}
