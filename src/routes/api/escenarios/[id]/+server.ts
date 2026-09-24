import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { escenarios } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) error(400, 'id inválido');
	const borrados = await db.delete(escenarios).where(eq(escenarios.id, id)).returning();
	if (!borrados.length) error(404, 'No existe ese escenario');
	return json({ ok: true });
};
