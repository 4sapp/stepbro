<template>
  <div class="money-background" aria-hidden="true"><div class="money-background__noise" /></div>
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
}
.money-background::before,
.money-background::after {
  content: '';
  position: absolute;
  width: 800px;
  height: 800px;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  opacity: 0.5;
  filter: saturate(150%);
  transition: opacity 1s ease;
}
.money-background::before {
  background: radial-gradient(circle at center, var(--theme-gradient-one) 0%, transparent 70%);
  animation: money-blob-one 10s linear infinite;
}
.money-background::after {
  background: radial-gradient(circle at center, var(--theme-gradient-two) 0%, transparent 70%);
  animation: money-blob-two 15s linear infinite;
}
.money-background__noise {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-image: url('/stepbro-grain.png');
  background-repeat: repeat;
  opacity: 0.3;
}
@keyframes money-blob-one {
  from { transform: rotate(0deg) translate(150px) rotate(0deg); }
  to { transform: rotate(360deg) translate(150px) rotate(-360deg); }
}
@keyframes money-blob-two {
  from { transform: rotate(180deg) translateY(120px) rotate(-180deg); }
  to { transform: rotate(-180deg) translateY(120px) rotate(180deg); }
}
@media (prefers-reduced-motion: reduce) {
  .money-background::before, .money-background::after { animation: none; }
}
</style>
