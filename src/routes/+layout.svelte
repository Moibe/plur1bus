<script lang="ts">
  // Tailwind v4 + tokens de shadcn. El gradiente glass de :global(body) de abajo GANA:
  // los estilos :global de Svelte van sin @layer, así que pisan el @layer base de Tailwind.
  import '../app.css';
  // Único bootstrap de svelte-i18n: registra los diccionarios e inicializa.
  import { aplicarIdiomaAlDocumento } from '$lib/i18n';
  import { locale } from 'svelte-i18n';
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';
  import favicon from '$lib/assets/favicon.svg';
  import TopNav from '$lib/TopNav.svelte';
  import Sidebar from '$lib/Sidebar.svelte';

  let { children, data }: { children: Snippet; data: LayoutData } = $props();
  let collapsed = $state(false);

  // El idioma que el servidor resolvió para ESTA request se fija aquí, en el
  // cuerpo del script, que durante el SSR corre de forma síncrona como parte del
  // render. El store `locale` de svelte-i18n es de MÓDULO (compartido por todas las
  // requests): fijarlo desde un load() asíncrono dejaría que otra request se colara.
  // svelte-ignore state_referenced_locally
  locale.set(data.idioma);

  // En el navegador, el <html lang> y la dirección siguen al idioma elegido.
  $effect(() => {
    if (browser && $locale) aplicarIdiomaAlDocumento($locale);
  });

  // View Transitions cuando el browser las soporta para animar el repliegue.
  function withTransition(fn: () => void) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(fn);
    } else {
      fn();
    }
  }
  function toggleCollapsed() {
    withTransition(() => {
      collapsed = !collapsed;
    });
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<TopNav />
<Sidebar {collapsed} {toggleCollapsed} />
<main class={collapsed ? 'collapsed' : ''}>
  <div class="work-scroll">
    {@render children()}
  </div>
</main>

<style>
  :global(:root) {
    --topnav-height: 64px;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
  }
  :global(body) {
    min-height: 100vh;
    /* Violeta colmena (#7c3aed → #1e1b4b) que desemboca en el amarillo Pluribus del póster.
       Interpolado en oklch para que el paso índigo → amarillo pase por magenta y naranja
       (un atardecer) en lugar de mezclarse en café. */
    background: linear-gradient(135deg in oklch, #7c3aed 0%, #1e1b4b 62%, #facc15 100%);
    background-attachment: fixed;
    color: rgba(255, 255, 255, 0.95);
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  :global(*) {
    scrollbar-width: auto;
    scrollbar-color: rgba(255, 255, 255, 0.55) rgba(255, 255, 255, 0.1);
  }
  :global(::-webkit-scrollbar) {
    width: 14px;
    height: 14px;
  }
  :global(::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.07);
    border-radius: 999px;
  }
  :global(::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.55);
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: padding-box;
  }
  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.78);
    background-clip: padding-box;
  }

  main {
    position: fixed;
    top: calc(2rem + var(--topnav-height));
    inset-inline-end: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.012);
    backdrop-filter: blur(8px) saturate(110%);
    -webkit-backdrop-filter: blur(8px) saturate(110%);
    border: 1px solid #fff;
    border-radius: 16px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    /* lógicas: en árabe la sidebar va a la derecha y el panel se recorre con ella */
    transition: inset-inline-start 0.22s ease-out;
    inset-inline-start: calc(var(--sidebar-width, 240px) + 2rem);
  }
  main.collapsed {
    inset-inline-start: 2rem;
  }

  .work-scroll {
    position: absolute;
    top: 16px;
    bottom: 16px;
    left: 0;
    right: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 16px;
  }
</style>
