<script lang="ts">
	// Stat tile: etiqueta, valor y una línea de contexto.
	let { etiqueta, valor, detalle = '' }: { etiqueta: string; valor: string; detalle?: string } = $props();
</script>

<div class="kpi">
	<span class="etiqueta">{etiqueta}</span>
	<span class="valor">{valor}</span>
	{#if detalle}<span class="detalle">{detalle}</span>{/if}
</div>

<style>
	.kpi {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.8rem 0.95rem;
		background: rgba(23, 20, 51, 0.72);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 12px;
		min-width: 0;
	}
	.etiqueta {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.68);
	}
	.valor {
		font-size: 1.25rem;
		font-weight: 600;
		color: #fff;
		line-height: 1.25;
	}
	.detalle {
		font-size: 0.74rem;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
