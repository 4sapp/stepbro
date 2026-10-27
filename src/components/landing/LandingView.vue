<script setup>
import AppLogo from '../AppLogo.vue'
import MaterialIcon from '../MaterialIcon.vue'
import PrettyBackground from '../PrettyBackground.vue'
import './LandingView.css'

const emit = defineEmits(['start'])
const base = import.meta.env.BASE_URL
</script>

<template>
  <main class="landing">
    <header class="landing__header">
      <a class="landing__brand" href="#" aria-label="sb Money, inicio" @click.prevent>
        <AppLogo />
        <span>sb Money</span>
      </a>
      <button class="landing__sign-in" type="button" @click="emit('start', $event)">
        Entrar
        <MaterialIcon name="arrow_forward" />
      </button>
    </header>

    <section class="landing__hero" aria-labelledby="landing-title">
      <div class="landing__copy">
        <h1 id="landing-title">Tu dinero,<br /><span>en orden.</span></h1>
        <p>Movimientos, cuentas y saldos en un solo lugar.</p>
        <button class="landing__cta" type="button" @click="emit('start', $event)">
          Comenzar
          <MaterialIcon name="arrow_forward" />
        </button>
        <div class="landing__features" aria-label="Funciones">
          <span><MaterialIcon name="swap_vert" />Movimientos</span>
          <span><MaterialIcon name="account_balance_wallet" />Cuentas</span>
          <span><MaterialIcon name="palette" />A tu estilo</span>
        </div>
      </div>

      <div class="landing__visual" aria-label="Vista previa de sb Money">
        <PrettyBackground />
        <div class="landing__visual-glow" aria-hidden="true"></div>
        <div class="landing__desktop-frame">
          <img
            class="landing__desktop-image"
            :src="`${base}landing/money-desktop.webp`"
            width="1280"
            height="800"
            alt="Vista de escritorio de sb Money con movimientos, saldos y cuentas"
          />
        </div>
        <div class="landing__mobile-frame">
          <img
            class="landing__mobile-image"
            :src="`${base}landing/money-mobile.webp`"
            width="390"
            height="844"
            alt="Vista móvil de sb Money"
          />
        </div>
      </div>
    </section>

    <footer class="landing__footer"><span>sb Money</span></footer>
  </main>
</template>
