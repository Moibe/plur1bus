import { json, error } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { escenarios } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const filas = await db.select().from(escenarios).orderBy(desc(escenarios.creado));
	return json(filas);
};

export const POST: RequestHandler = async ({ request }) => {
	const cuerpo = await request.json().catch(() => null);
	const nombre = typeof cuerpo?.nombre === 'string' ? cuerpo.nombre.trim().slice(0, 80) : '';
	const parametros = cuerpo?.parametros;
	if (!nombre) error(400, 'Falta el nombre del escenario');
	if (!parametros || typeof parametros !== 'object' || Array.isArray(parametros)) error(400, 'Parámetros inválidos');
	const [fila] = await db.insert(escenarios).values({ nombre, parametros }).returning();
	return json(fila, { status: 201 });
};
