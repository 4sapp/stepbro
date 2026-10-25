# Stepbro

Base de componentes en Vue 3 y CSS con animaciones de GSAP. Incluye un botón con efecto al tocarlo y un panel que se abre y se cierra conservando el icono y el título.

## Ejecutarlo

Necesitas Node.js 22.12 o superior.

```bash
npm install
npm run dev
```

Abre la dirección que aparece en la terminal.

## Dónde cambiar las cosas

- `src/components/`: componentes y sus archivos CSS.
- `src/composables/useMorphPanel.js`: lógica del panel. En `motion` puedes ajustar la duración, la curva y el blur.
- `src/styles/`: estilos generales y degradado del fondo.

Para usar el efecto en otro panel, toma `MovementPanel.vue` como ejemplo. Los atributos `data-shared-item` emparejan el icono y el título del botón con los del panel.

## Compilar

```bash
npm run build
```

El resultado queda en `dist/`. El proyecto sigue en desarrollo; por ahora es una base visual, sin guardado de movimientos.
