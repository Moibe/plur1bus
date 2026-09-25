#!/usr/bin/env node
/**
 * Valida las traducciones contra el español (el idioma fuente), en el front y en la API.
 *
 *   node scripts/validar-traducciones.mjs            # todos los idiomas
 *   node scripts/validar-traducciones.mjs fr ar      # solo esos
 *
 * Front (src/lib/locales/<idioma>.json, mensajes ICU de svelte-i18n):
 *   - mismas claves que es.json, ningún texto vacío
 *   - cada mensaje es ICU válido y usa los mismos argumentos ({n}, {fecha}...) que el español
 *   - y del mismo tipo: un argumento que en español es plural (recibe un número) lo es en todos
 *     los idiomas, y uno simple (recibe texto ya formateado) no se vuelve plural
 *   - los plurales solo usan categorías que existen en ese idioma y siempre traen `other`
 * API (../plur1bus-api/datos/i18n/<idioma>.json, textos planos):
 *   - mismas claves que es.json, ningún texto vacío
 *
 * Sale con código 1 si hay errores.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { parse, TYPE } = require('@formatjs/icu-messageformat-parser');

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FRONT = resolve(RAIZ, 'src/lib/locales');
const API = resolve(RAIZ, '../plur1bus-api/datos/i18n');
const IDIOMAS = ['en', 'pt', 'fr', 'de', 'ar'];

const leer = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'));

function aplanar(obj, prefijo = '', salida = {}) {
	for (const [k, v] of Object.entries(obj)) {
		const clave = prefijo ? `${prefijo}.${k}` : k;
		if (v && typeof v === 'object') aplanar(v, clave, salida);
		else salida[clave] = v;
	}
	return salida;
}

// Qué recibe cada argumento: un número (plural, number), texto ya formateado, una fecha o una opción.
const CLASE = {
	[TYPE.argument]: 'texto',
	[TYPE.number]: 'número',
	[TYPE.plural]: 'número',
	[TYPE.date]: 'fecha',
	[TYPE.time]: 'fecha',
	[TYPE.select]: 'opción'
};

/** Argumentos que usa un mensaje ICU (incluidos los de dentro de plurales), su clase y sus plurales. */
function analizar(ast, args = new Map(), plurales = []) {
	for (const el of ast) {
		if (el.type in CLASE) {
			if (!args.has(el.value)) args.set(el.value, new Set());
			args.get(el.value).add(CLASE[el.type]);
		}
		if (el.type === TYPE.plural) plurales.push(Object.keys(el.options));
		if (el.options) for (const op of Object.values(el.options)) analizar(op.value, args, plurales);
	}
	return { args, plurales };
}

function validarFront(idioma, fuente, errores) {
	const ruta = resolve(FRONT, `${idioma}.json`);
	if (!existsSync(ruta)) return errores.push(`[front ${idioma}] falta el archivo ${ruta}`);
	let destino;
	try {
		destino = aplanar(leer(ruta));
	} catch (e) {
		return errores.push(`[front ${idioma}] JSON inválido: ${e.message}`);
	}
	const categorias = new Set(new Intl.PluralRules(idioma).resolvedOptions().pluralCategories);
	for (const clave of Object.keys(fuente)) {
		if (!(clave in destino)) {
			errores.push(`[front ${idioma}] falta la clave ${clave}`);
			continue;
		}
		const texto = destino[clave];
		if (typeof texto !== 'string' || !texto.trim()) {
			errores.push(`[front ${idioma}] ${clave} está vacío`);
			continue;
		}
		let a, b;
		try {
			a = analizar(parse(fuente[clave]));
			b = analizar(parse(texto));
		} catch (e) {
			errores.push(`[front ${idioma}] ${clave} no es ICU válido (${e.message}): ${texto}`);
			continue;
		}
		const faltan = [...a.args.keys()].filter((x) => !b.args.has(x));
		const sobran = [...b.args.keys()].filter((x) => !a.args.has(x));
		if (faltan.length || sobran.length)
			errores.push(`[front ${idioma}] ${clave}: argumentos distintos (faltan: ${faltan.join(', ') || '—'}; sobran: ${sobran.join(', ') || '—'})`);
		for (const [arg, clases] of b.args) {
			const esperadas = a.args.get(arg);
			if (!esperadas) continue;
			const distintas = [...clases].filter((c) => !esperadas.has(c));
			if (distintas.length)
				errores.push(
					`[front ${idioma}] ${clave}: {${arg}} es ${[...esperadas].join('/')} en español y aquí ${distintas.join('/')}` +
						(esperadas.has('número') ? ' (usa {' + arg + ', plural, ...} como el español)' : ' (en español llega ya formateado: déjalo simple)')
				);
		}
		for (const ops of b.plurales) {
			if (!ops.includes('other')) errores.push(`[front ${idioma}] ${clave}: plural sin 'other'`);
			const raras = ops.filter((o) => !o.startsWith('=') && !categorias.has(o));
			if (raras.length) errores.push(`[front ${idioma}] ${clave}: categorías que no existen en ${idioma}: ${raras.join(', ')}`);
		}
	}
	for (const clave of Object.keys(destino)) if (!(clave in fuente)) errores.push(`[front ${idioma}] sobra la clave ${clave}`);
}

function validarApi(idioma, fuente, errores) {
	const ruta = resolve(API, `${idioma}.json`);
	if (!existsSync(ruta)) return errores.push(`[api ${idioma}] falta el archivo ${ruta}`);
	let destino;
	try {
		destino = leer(ruta);
	} catch (e) {
		return errores.push(`[api ${idioma}] JSON inválido: ${e.message}`);
	}
	for (const clave of Object.keys(fuente)) {
		if (!(clave in destino)) errores.push(`[api ${idioma}] falta la clave ${clave}`);
		else if (typeof destino[clave] !== 'string' || !destino[clave].trim()) errores.push(`[api ${idioma}] ${clave} está vacío`);
	}
	for (const clave of Object.keys(destino)) if (!(clave in fuente)) errores.push(`[api ${idioma}] sobra la clave ${clave}`);
}

const pedidos = process.argv.slice(2);
const idiomas = pedidos.length ? pedidos : IDIOMAS;
const fuenteFront = aplanar(leer(resolve(FRONT, 'es.json')));
const fuenteApi = leer(resolve(API, 'es.json'));
const errores = [];
for (const idioma of idiomas) {
	validarFront(idioma, fuenteFront, errores);
	validarApi(idioma, fuenteApi, errores);
}
if (errores.length) {
	console.error(errores.join('\n'));
	console.error(`\n${errores.length} problema(s)`);
	process.exit(1);
}
console.log(`OK: ${idiomas.join(', ')} — ${Object.keys(fuenteFront).length} mensajes del front y ${Object.keys(fuenteApi).length} textos de la API`);
