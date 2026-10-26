<script setup>
import './MainPanel.css'
import { useNavigationLayout } from '../composables/useNavigationLayout'
const { desktop, mobile } = useNavigationLayout()
</script>

<template>
  <div class="main-panel" :data-navigation="desktop" :data-mobile-navigation="mobile">
    <slot />
  </div>
</template>
