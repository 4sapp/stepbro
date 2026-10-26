<script setup>
import { nextTick, ref } from 'vue'
import { useSettingsDialog } from '../../composables/useSettingsDialog'
import './SettingsPanel.css'

const { dialog, open: openDialog, close, backdrop, drag } = useSettingsDialog()
const section = ref('account')
const tabs = [
  { id: 'account', label: 'Cuenta' },
  { id: 'agent', label: 'Agente' },
]

async function open(tab = 'account', origin) {
  section.value = tab
  await nextTick()
  openDialog(origin)
}

defineExpose({ open })

</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="settings-panel" aria-labelledby="settings-title" @cancel.prevent="close" @click="backdrop" @pointerdown="drag.start" @pointermove="drag.move" @pointerup="drag.end" @pointercancel="drag.cancel" @lostpointercapture="drag.cancel" @wheel="drag.wheel">
      <div class="settings-panel__layout" data-dialog-content>
        <nav class="settings-panel__nav" aria-label="Ajustes">
          <h2 id="settings-title">Configuración</h2>
          <button v-for="tab in tabs" :key="tab.id" type="button" :aria-current="section === tab.id ? 'page' : undefined" @click="section = tab.id">{{ tab.label }}</button>
        </nav>

        <div class="settings-panel__content">
          <button class="settings-panel__close" type="button" aria-label="Cerrar ajustes" @click="close">×</button>

          <template v-if="section === 'account'">
            <!-- Base visual: conecta aquí los datos reales de la cuenta. -->
            <div class="account-surface">
              <div class="account-surface__copy">
                <span>Tu espacio.</span>
                <h3>A tu manera.</h3>
              </div>
            </div>
            <dl class="settings-account">
              <div><dt>Cuenta</dt><dd>Sin conectar</dd></div>
              <div><dt>Nombre</dt><dd>Por configurar</dd></div>
            </dl>
          </template>

          <section v-else class="settings-section">
            <p class="settings-section__eyebrow">Agente</p>
            <h3>Espacio para tu agente.</h3>
            <p>Todavía no hay un agente conectado.</p>
            <!-- Aquí irá el componente de configuración del agente. -->
          </section>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
