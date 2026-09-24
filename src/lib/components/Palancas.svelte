<script lang="ts">
	// Controles del escenario, armados directo del esquema que regresa la API
	// (GET /escenario): rangos, pasos, etiquetas y textos viven en el motor.
	import { Slider } from '$lib/components/ui/slider';
	import { Switch } from '$lib/components/ui/switch';
	import { ETIQUETAS_OPCION, mostrarValor as mostrar } from '$lib/palancas';
	import type { Escenario, EsquemaEscenario, Palanca } from '$lib/tipos';

	let { esquema, valores = $bindable() }: { esquema: EsquemaEscenario; valores: Escenario } = $props();

	const grupos = $derived.by(() => {
		const orden: string[] = [];
		const por: Record<string, [string, Palanca][]> = {};
		for (const [clave, p] of Object.entries(esquema.properties)) {
			if (!por[p.grupo]) {
				por[p.grupo] = [];
				orden.push(p.grupo);
			}
			por[p.grupo].push([clave, p]);
		}
		return orden.map((g) => ({ nombre: g, palancas: por[g] }));
	});

	const esNullable = (p: Palanca) => !!p.anyOf?.some((t) => t.type === 'null');
	const tipo = (p: Palanca) => p.type ?? p.anyOf?.find((t) => t.type !== 'null')?.type;

	// Rango para palancas opcionales sin máximo razonable en el esquema.
	const rangoNullable = (p: Palanca): [number, number] => [p.minimum ?? 0, Math.min(p.maximum ?? 5000, 4000)];
</script>

<div class="palancas">
	{#each grupos as g (g.nombre)}
		<section class="grupo">
			<h3>{g.nombre}</h3>
			{#each g.palancas as [clave, p] (clave)}
				<div class="palanca">
					{#if p.enum}
						<div class="fila">
							<span class="etiqueta">{p.etiqueta}</span>
						</div>
						<div class="opciones" role="radiogroup" aria-label={p.etiqueta}>
							{#each p.enum as op (op)}
								<button
									type="button"
									role="radio"
									aria-checked={valores[clave] === op}
									class:activa={valores[clave] === op}
									onclick={() => (valores = { ...valores, [clave]: op })}
								>
									{ETIQUETAS_OPCION[op] ?? op}
								</button>
							{/each}
						</div>
					{:else if tipo(p) === 'boolean'}
						<label class="fila">
							<span class="etiqueta">{p.etiqueta}</span>
							<Switch
								checked={valores[clave] as boolean}
								onCheckedChange={(v) => (valores = { ...valores, [clave]: v })}
							/>
						</label>
					{:else if esNullable(p)}
						{@const [min, max] = rangoNullable(p)}
						<div class="fila">
							<span class="etiqueta">{p.etiqueta}</span>
							<label class="auto">
								<span>Por mes</span>
								<Switch
									checked={valores[clave] == null}
									onCheckedChange={(auto) => (valores = { ...valores, [clave]: auto ? null : 2000 })}
								/>
							</label>
						</div>
						{#if valores[clave] != null}
							<div class="fila">
								<Slider
									type="single"
									value={valores[clave] as number}
									{min}
									{max}
									step={p.paso ?? 1}
									onValueCommit={(v: number) => (valores = { ...valores, [clave]: v })}
								/>
								<span class="valor">{mostrar(p, valores[clave])}</span>
							</div>
						{/if}
					{:else}
						<div class="fila">
							<span class="etiqueta">{p.etiqueta}</span>
							<span class="valor">{mostrar(p, valores[clave])}</span>
						</div>
						<Slider
							type="single"
							value={valores[clave] as number}
							min={p.minimum ?? 0}
							max={p.maximum ?? 1}
							step={p.paso ?? 1}
							onValueChange={(v: number) => (valores = { ...valores, [clave]: v })}
						/>
					{/if}
					{#if p.description}
						<p class="ayuda">{p.description}</p>
					{/if}
				</div>
			{/each}
		</section>
	{/each}
</div>

<style>
	.palancas {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.grupo h3 {
		margin: 0 0 0.6rem;
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.6);
	}
	.palanca {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.6rem 0 0.8rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.fila {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.etiqueta {
		font-size: 0.88rem;
		color: rgba(255, 255, 255, 0.92);
	}
	.valor {
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: #fff;
		white-space: nowrap;
	}
	.auto {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.7);
	}
	.ayuda {
		margin: 0;
		font-size: 0.74rem;
		line-height: 1.35;
		color: rgba(255, 255, 255, 0.55);
	}
	.opciones {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}
	.opciones button {
		padding: 0.3rem 0.7rem;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.85);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 999px;
		cursor: pointer;
		transition: background 0.18s ease, border-color 0.18s ease;
	}
	.opciones button:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.opciones button.activa {
		color: #fff;
		background: rgba(250, 204, 21, 0.16);
		border-color: rgba(250, 204, 21, 0.55);
	}
</style>
