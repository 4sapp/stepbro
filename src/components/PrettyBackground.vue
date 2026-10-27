<script setup>
const grainUrl = `url('${import.meta.env.BASE_URL}stepbro-grain.png')`
</script>

<template>
  <div class="money-background" aria-hidden="true">
    <div class="money-background__noise" :style="{ backgroundImage: grainUrl }" />
  </div>
</template>

<style>
/* PrettyBackground de sb Money: dos halos en órbita y una capa de grano. */

.money-background {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
  background: linear-gradient(165deg, var(--theme-gradient-base) 0%, var(--theme-gradient-two) 52%, var(--theme-gradient-one) 100%);
}

.money-background::before,
.money-background::after {
  content: '';
  position: absolute;
  width: 680px;
  height: 680px;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  opacity: 0.72;
  filter: saturate(165%);
  transition: opacity 1s ease;
}

.money-background::before {
  background: radial-gradient(circle at center, var(--theme-gradient-one) 0%, transparent 68%);
  animation: money-blob-one 10s linear infinite;
}

.money-background::after {
  background: radial-gradient(circle at center, var(--theme-gradient-two) 0%, transparent 68%);
  animation: money-blob-two 15s linear infinite;
}

.money-background__noise {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-repeat: repeat;
  opacity: 0.32;
}

@keyframes money-blob-one {
  from {
    transform: rotate(0deg) translate(150px) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translate(150px) rotate(-360deg);
  }
}

@keyframes money-blob-two {
  from {
    transform: rotate(180deg) translateY(120px) rotate(-180deg);
  }
  to {
    transform: rotate(-180deg) translateY(120px) rotate(180deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .money-background::before, .money-background::after {
    animation: none;
  }
}
</style>
