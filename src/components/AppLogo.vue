<script setup>
import { useId } from 'vue'
import { createLogoSvg } from '../assets/appLogo'
const markup = createLogoSvg({
  id: useId(),
  accent: 'var(--theme-logo-accent, #238fcd)',
  highlight: 'var(--theme-logo-highlight, #e8f8ff)',
  secondary: 'var(--theme-logo-secondary, #74dced)',
  edge: 'var(--theme-logo-edge, #2085ba)',
})
</script>
<template><span class="app-logo" aria-hidden="true" v-html="markup" /></template>
<style>
.app-logo { display: inline-block; flex-shrink: 0; inline-size: 2.25rem; block-size: 2.25rem; }
.app-logo > svg { display: block; inline-size: 100%; block-size: 100%; overflow: visible; }
</style>
