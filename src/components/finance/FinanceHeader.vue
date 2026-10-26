<script setup>defineProps({ title: String })</script>
<template><header class="finance-header"><h1>{{ title }}</h1><div class="finance-header__tools"><slot /></div></header></template>
