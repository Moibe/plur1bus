import type { Idioma } from '$lib/idiomas';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** idioma de esta request, resuelto en hooks.server.ts */
			idioma: Idioma;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
