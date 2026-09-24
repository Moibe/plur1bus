import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Escenarios que el usuario guarda desde el simulador. `parametros` es el JSON
// con solo las palancas que difieren del default (así un default que cambie en
// la API se refleja en los escenarios viejos).
export const escenarios = sqliteTable('escenarios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	nombre: text('nombre').notNull(),
	parametros: text('parametros', { mode: 'json' }).notNull().$type<Record<string, unknown>>(),
	creado: integer('creado', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type EscenarioGuardado = typeof escenarios.$inferSelect;
