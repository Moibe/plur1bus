<script lang="ts">
  // Barra lateral "de vidrio" con el mismo tilt 3D que la superior. Incluye el handle
  // para replegar/mostrar. Publica su ancho real a la variable CSS --sidebar-width
  // para que el panel de contenido se ajuste solo. Aquí viven los presets del
  // simulador y los escenarios guardados (SQLite del front).
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { _ } from 'svelte-i18n';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { PRESETS, estado, type Preset } from '$lib/estado.svelte';
  import { formato } from '$lib/formato';
  import { guardados } from '$lib/guardados.svelte';
  import { cambiosEnTexto, describirCambios } from '$lib/palancas';
  import type { EscenarioGuardado } from '$lib/tipos';

  let {
    collapsed = false,
    toggleCollapsed
  }: {
    collapsed?: boolean;
    toggleCollapsed: () => void;
  } = $props();

  let tiltX = $state(0);
  let tiltY = $state(0);
  let sidebarWidth = $state(240);

  $effect(() => {
    if (typeof document !== 'undefined' && !collapsed) {
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }
  });

  function handleMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    const MAX = 1.2;
    tiltX = -ny * MAX;
    tiltY = nx * MAX;
  }
  function handleLeave() {
    tiltX = 0;
    tiltY = 0;
  }
  function handleCollapseClick(e: MouseEvent) {
    e.stopPropagation();
    tiltX = 0;
    tiltY = 0;
    toggleCollapsed();
  }

  onMount(() => {
    guardados.recargar();
  });

  // Los guardados antes de que existiera la explicación la toman de lo que cambian.
  function explicacionDe(g: EscenarioGuardado): string {
    if (g.descripcion) return g.descripcion;
    const cambios = cambiosEnTexto(describirCambios(g.parametros, estado.esquema, $formato, $_));
    return cambios ? $_('sidebar.cambia', { values: { cambios } }) : $_('sidebar.igual_canon');
  }

  async function irA() {
    if (page.url.pathname !== '/') await goto('/');
  }
  function aplicarPreset(p: Preset) {
    estado.aplicarPreset(p);
    irA();
  }
  function aplicarGuardado(g: EscenarioGuardado) {
    estado.aplicarGuardado({ id: g.id, nombre: g.nombre, explicacion: explicacionDe(g), parametros: g.parametros });
    irA();
  }
  const presetActivo = (id: string) => (estado.origen.tipo === 'preset' && estado.origen.id === id ? 'page' : undefined);
  const guardadoActivo = (id: number) => (estado.origen.tipo === 'guardado' && estado.origen.id === id ? 'page' : undefined);

  let porBorrar = $state<EscenarioGuardado | null>(null);
  let borrando = $state(false);
  let errorBorrar = $state<string | null>(null);

  async function confirmarBorrado() {
    if (!porBorrar) return;
    borrando = true;
    try {
      await guardados.borrar(porBorrar.id);
      porBorrar = null;
      errorBorrar = null;
    } catch (e) {
      errorBorrar = $_('borrar.error', { values: { detalle: (e as Error).message } });
    } finally {
      borrando = false;
    }
  }
</script>

{#if !collapsed}
  <aside
    class="sidebar"
    style="transform: perspective(900px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
    bind:clientWidth={sidebarWidth}
    onmousemove={handleMove}
    onmouseleave={handleLeave}
  >
    <nav>
      <span class="nav-titulo">{$_('sidebar.escenarios')}</span>
      {#each PRESETS as p (p.id)}
        <button type="button" class="nav-item" aria-current={presetActivo(p.id)} onclick={() => aplicarPreset(p)}>
          <span class="nav-ico" aria-hidden="true"></span>
          <span class="nav-texto">
            <span class="nav-nombre">{$_(`presets.${p.id}.nombre`)}</span>
            <span class="nav-resumen">{$_(`presets.${p.id}.resumen`)}</span>
          </span>
        </button>
      {/each}

      <span class="nav-titulo">{$_('sidebar.guardados')}</span>
      {#if guardados.error}
        <span class="nav-vacio">{$_('sidebar.error_cargar', { values: { detalle: guardados.error } })}</span>
      {:else if !guardados.lista.length}
        <span class="nav-vacio">{$_('sidebar.vacio')}</span>
      {/if}
      {#each guardados.lista as g (g.id)}
        <div class="guardado" aria-current={guardadoActivo(g.id)}>
          <button type="button" class="nav-item" onclick={() => aplicarGuardado(g)}>
            <span class="nav-ico" aria-hidden="true"></span>
            <span class="nav-texto">
              <span class="nav-nombre">{g.nombre}</span>
              <span class="nav-resumen recortado">{explicacionDe(g)}</span>
            </span>
          </button>
          <button type="button" class="borrar" aria-label={$_('sidebar.borrar_aria', { values: { nombre: g.nombre } })} onclick={() => (porBorrar = g)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      {/each}
    </nav>

    <div class="sidebar-footer">
      <button type="button" class="collapse-btn" onclick={handleCollapseClick} aria-label={$_('sidebar.replegar')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
    </div>
  </aside>
{:else}
  <button type="button" class="reveal-handle" onclick={toggleCollapsed} aria-label={$_('sidebar.mostrar')}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  </button>
{/if}

<Dialog.Root open={porBorrar !== null} onOpenChange={(abierto) => { if (!abierto) porBorrar = null; }}>
  <Dialog.Content class="modal-glass">
    <Dialog.Header>
      <Dialog.Title>{$_('borrar.titulo', { values: { nombre: porBorrar?.nombre ?? '' } })}</Dialog.Title>
      <Dialog.Description>{$_('borrar.descripcion')}</Dialog.Description>
    </Dialog.Header>
    {#if errorBorrar}<p class="error-borrar">{errorBorrar}</p>{/if}
    <Dialog.Footer>
      <Button variant="ghost" onclick={() => (porBorrar = null)}>{$_('borrar.cancelar')}</Button>
      <Button variant="destructive" disabled={borrando} onclick={confirmarBorrado}>{borrando ? $_('borrar.borrando') : $_('borrar.confirmar')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .sidebar {
    position: fixed;
    top: calc(2rem + var(--topnav-height, 64px));
    inset-inline-start: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    width: max-content;
    min-width: 240px;
    max-width: 380px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid #fff;
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.12);
    transition: transform 0.18s ease-out;
    will-change: transform;
    user-select: none;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  nav::-webkit-scrollbar {
    display: none;
  }
  .nav-titulo {
    margin-block: 0.6rem 0.1rem;
    margin-inline: 0.4rem 0;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
  }
  .nav-titulo:first-child {
    margin-top: 0;
  }
  .nav-vacio {
    padding: 0.2rem 0.4rem;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.55);
    max-width: 240px;
  }
  .guardado {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .guardado .nav-item {
    flex: 1;
    min-width: 0;
  }
  .guardado[aria-current='page'] .nav-item {
    color: #fff;
    background: rgba(250, 204, 21, 0.16);
    border-color: rgba(250, 204, 21, 0.55);
  }
  .borrar {
    flex-shrink: 0;
    display: inline-flex;
    padding: 0.35rem;
    color: rgba(255, 255, 255, 0.6);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
  }
  .borrar:hover {
    color: #fff;
    background: rgba(208, 59, 59, 0.2);
    border-color: rgba(208, 59, 59, 0.5);
  }
  .error-borrar {
    margin: 0;
    font-size: 0.8rem;
    color: #f4a3a3;
  }
  .nav-item {
    width: 100%;
    background: transparent;
    font: inherit;
    text-align: start;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.6rem 0.9rem;
    color: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background 0.18s ease, border-color 0.18s ease;
  }
  .nav-texto {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .nav-resumen {
    /* ancho acotado: si no, max-content estira la sidebar hasta su tope */
    max-width: 15.5rem;
    font-size: 0.74rem;
    line-height: 1.3;
    letter-spacing: 0;
    color: rgba(255, 255, 255, 0.62);
  }
  .nav-resumen.recortado {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .nav-ico {
    width: 16px;
    height: 16px;
    margin-top: 0.15rem;
    border-radius: 5px;
    flex-shrink: 0;
    background: rgba(147, 197, 253, 0.55);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  .nav-item:hover {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.16);
  }
  .nav-item[aria-current='page'] {
    color: #fff;
    background: rgba(250, 204, 21, 0.16);
    border-color: rgba(250, 204, 21, 0.55);
    box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.16) inset;
  }
  .nav-item[aria-current='page'] .nav-ico {
    background: #93c5fd;
  }
  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .collapse-btn,
  .reveal-handle {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  }
  .collapse-btn:hover,
  .reveal-handle:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.24);
    color: #fff;
  }
  .reveal-handle {
    position: fixed;
    inset-inline-start: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.55rem 0.45rem;
    border-radius: 12px;
    border: 1px solid #fff;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.12);
    z-index: 10;
  }
  /* En árabe la barra vive a la derecha: los chevrons apuntan al revés. */
  :global([dir='rtl']) .collapse-btn svg,
  :global([dir='rtl']) .reveal-handle svg {
    transform: scaleX(-1);
  }
</style>
