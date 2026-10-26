<script setup>
defineProps({ name: { type: String, required: true }, filled: Boolean })
</script>
<template><span class="material-icon" :class="{ 'material-icon--filled': filled }" aria-hidden="true">{{ name }}</span></template>
<style>
.material-icon {
  display: inline-block;
  flex-shrink: 0;
  font-family: 'Material Symbols Rounded';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.material-icon--filled {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
