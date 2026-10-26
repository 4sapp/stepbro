<script setup>
import { nextTick, ref } from 'vue'
import { useSettingsDialog } from '../../composables/useSettingsDialog'
import { currencies, useFinanceStore } from '../../composables/useFinanceStore'
import FinanceSelect from '../FinanceSelect.vue'
import FinanceDialog from '../finance/FinanceDialog.vue'
import SettingsIcon from './SettingsIcon.vue'
import './SettingsPanel.css'

// Datos visuales de la referencia; una cuenta conectada puede aportar su perfil.
defineProps({ profile: { type: Object, default: () => ({ email: 'oxseduzco@gmail.com', name: 'Oxseduzco', plan: 'Prueba gratuita', verified: true }) } })
const { dialog, open: openDialog, close, backdrop, drag } = useSettingsDialog({ responsive: true })
const { activeCurrency } = useFinanceStore()
const section = ref('account')
const plans = ref(null)
const tabs = [{ id: 'account', label: 'Cuenta' }, { id: 'general', label: 'General' }, { id: 'agent', label: 'Agente' }]
async function open(tab = 'account', origin) {
  section.value = tabs.some(t => t.id === tab) ? tab : 'account'
  await nextTick()
  openDialog(origin)
}
async function tabKey(event, index) {
  const direction = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key]
  const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : direction ? (index + direction + tabs.length) % tabs.length : -1
  if (target < 0) return
  event.preventDefault()
  section.value = tabs[target].id
  await nextTick()
  dialog.value.querySelector(`#settings-tab-${section.value}`)?.focus()
}
defineExpose({ open })
</script>
<template>
  <Teleport to="body">
    <dialog ref="dialog" class="settings-panel" aria-label="Configuración" @cancel.prevent="close" @click="backdrop" @pointerdown="drag.start" @pointermove="drag.move" @pointerup="drag.end" @pointercancel="drag.cancel" @lostpointercapture="drag.cancel" @wheel="drag.wheel">
      <div class="settings-panel__layout" data-dialog-content>
        <nav class="settings-panel__nav" role="tablist" aria-label="Configuración" aria-orientation="vertical" data-no-drag>
          <button v-for="(tab, index) in tabs" :id="`settings-tab-${tab.id}`" :key="tab.id" type="button" role="tab" :aria-selected="section === tab.id" :aria-controls="`settings-content-${tab.id}`" :tabindex="section === tab.id ? 0 : -1" @click="section = tab.id" @keydown="tabKey($event, index)"><SettingsIcon :name="tab.id" /><span>{{ tab.label }}</span></button>
        </nav>
        <div class="settings-panel__content">
          <button class="settings-panel__close" type="button" aria-label="Cerrar ajustes" data-no-drag @click="close">×</button>
          <section :id="`settings-content-${section}`" :key="section" class="settings-panel__page" role="tabpanel" :aria-labelledby="`settings-tab-${section}`">
            <div v-if="section === 'account'" class="account-surface">
              <div class="account-surface__spacer" aria-hidden="true" />
              <div class="account-surface__copy">
                <dl class="settings-profile">
                  <div><dt>Correo</dt><dd class="settings-profile__email">{{ profile.email }}</dd></div>
                  <div><dt>Nombre</dt><dd class="settings-profile__name">{{ profile.name }}</dd></div>
                  <div><dt>Plan</dt><dd class="settings-profile__plan">{{ profile.plan }}</dd></div>
                </dl>
                <button class="settings-profile__plans" type="button" data-no-drag @click="plans.open($event.currentTarget)">Ver planes</button>
              </div>
              <div class="settings-verification"><SettingsIcon name="verified" /><div><span>Correo</span><small>{{ profile.verified ? 'Verificado' : 'Sin verificar' }}</small></div></div>
            </div>
            <div v-else-if="section === 'general'" class="settings-section" data-no-drag>
              <div class="settings-option"><div><h3>Divisa principal</h3><p>Se usa para mostrar los totales y las estadísticas.</p></div><FinanceSelect v-model="activeCurrency" aria-label="Divisa principal"><option v-for="currency in currencies" :key="currency">{{ currency }}</option></FinanceSelect></div>
              <div class="settings-option"><div><h3>Registrar ubicación</h3><p>Guarda tu ubicación al registrar un movimiento.</p><small>Disponible al conectar tu cuenta.</small></div><button class="settings-switch" type="button" role="switch" aria-label="Registrar ubicación" :aria-checked="false" disabled /></div>
            </div>
            <div v-else class="settings-section" data-no-drag>
              <div class="settings-option"><div><h3>Modo automático</h3><p>El agente ejecuta acciones reversibles sin pedir confirmación. Las acciones irreversibles siempre requieren confirmación.</p><small>Disponible al conectar tu agente.</small></div><button class="settings-switch" type="button" role="switch" aria-label="Modo automático" :aria-checked="false" disabled /></div>
              <div class="settings-option"><div><h3>Memoria del agente</h3><p>El agente recuerda información para ayudarte en futuras conversaciones. Puedes olvidarla cuando quieras.</p><small>Todavía no hay un agente conectado.</small></div></div>
              <div class="settings-option"><div><h3>Capacidad de IA</h3><p>Cuánta IA te queda esta semana. Se recupera poco a poco conforme tu uso deja de contar.</p><small>Conecta tu cuenta para consultar tu capacidad.</small></div></div>
            </div>
          </section>
        </div>
      </div>
    </dialog>
  </Teleport>
  <FinanceDialog ref="plans" title="Elige tu plan">
    <div class="settings-plan" data-no-drag><h3>Basic</h3><p>Todo lo de money, sin límites.</p><ul><li>Movimientos ilimitados</li><li>Categorías y cuentas personalizables</li><li>Chat IA para agregar movimientos por voz</li><li>Dashboard de balances y gráficas</li><li>Sin anuncios</li></ul><a href="https://stepbro.site/apps/money/#/home/dashboard" target="_blank" rel="noopener noreferrer">Ver planes en sb Money ↗</a></div>
  </FinanceDialog>
</template>
