<template>
  <span class="empty-state-dots" aria-hidden="true">
    <span v-for="dot in 20" :key="dot" :style="{ '--dot-delay': `${-3.2 + ((dot - 1) % 5 + Math.floor((dot - 1) / 5)) * 0.16}s` }" />
  </span>
</template>

<style>
.empty-state-dots {
  display: grid;
  grid-template-columns: repeat(5, 3px);
  grid-template-rows: repeat(4, 3px);
  align-content: center;
  justify-content: center;
  gap: 7px;
  inline-size: 3.1rem;
  block-size: 2.4rem;
  color: var(--theme-muted, #a098a7);
  mask-image: linear-gradient(to bottom, #000 20%, rgb(0 0 0 / 20%));
}
.empty-state-dots > span {
  inline-size: 3px;
  block-size: 3px;
  border-radius: 1px;
  background: currentColor;
  animation: empty-dot-wave 3.2s ease-in-out infinite;
  animation-delay: var(--dot-delay);
}
@keyframes empty-dot-wave {
  0%, 65%, 100% { opacity: 0.35; transform: translateY(0) scale(0.85) rotate(45deg); }
  30% { opacity: 0.85; transform: translateY(-2px) scale(1.2) rotate(45deg); }
}
@media (prefers-reduced-motion: reduce) {
  .empty-state-dots > span { animation: none; opacity: 0.55; transform: rotate(45deg); }
}
</style>
