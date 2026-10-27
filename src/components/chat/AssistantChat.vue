<script setup>
import { computed, ref } from 'vue'
import { useSettingsDialog } from '../../composables/useSettingsDialog'
import MaterialIcon from '../MaterialIcon.vue'
import PrettyBackground from '../PrettyBackground.vue'
import './AssistantChat.css'

const props = defineProps({ canSend: { type: Boolean, default: false } })
const emit = defineEmits(['send', 'new-chat'])
const { dialog, open: openDialog, close: closeDialog, backdrop, drag } = useSettingsDialog({ responsive: true, fitContent: true, placement: 'center-desktop', motion: 'chat' })
const draft = ref('')
const messages = ref([])
const canSubmit = computed(() => props.canSend && draft.value.trim().length > 0)

function close() {
  closeDialog()
}

function open(origin) {
  openDialog(origin)
}

function newChat() {
  draft.value = ''
  messages.value = []
  emit('new-chat')
}

function submit() {
  const text = draft.value.trim()
  if (!text || !props.canSend) return
  emit('send', text)
  messages.value.push({ id: `${Date.now()}-${messages.value.length}`, text })
  draft.value = ''
}

defineExpose({ open, close })
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="assistant-chat"
      aria-label="Asistente"
      @cancel.prevent="close"
      @click="backdrop"
      @pointerdown="drag.start"
      @pointermove="drag.move"
      @pointerup="drag.end"
      @pointercancel="drag.cancel"
      @lostpointercapture="drag.cancel"
      @wheel="drag.wheel"
    >
      <section class="assistant-chat__content" data-dialog-content>
        <div class="assistant-chat__panel">
          <PrettyBackground />
          <header class="assistant-chat__toolbar">
            <button class="assistant-chat__icon-button" type="button" aria-label="Cerrar asistente" @click="close">
              <MaterialIcon name="close" />
            </button>
            <button class="assistant-chat__icon-button" type="button" aria-label="Nuevo chat" @click="newChat">
              <MaterialIcon name="maps_ugc" />
            </button>
          </header>

          <div class="assistant-chat__messages" aria-live="polite" aria-label="Mensajes">
            <p v-for="message in messages" :key="message.id" class="assistant-chat__message">{{ message.text }}</p>
          </div>

          <form class="assistant-chat__composer" data-no-drag @touchstart.stop @pointerdown.stop @wheel.stop @submit.prevent="submit">
            <textarea
              v-model="draft"
              aria-label="Escribe un mensaje"
              placeholder="Escribe un mensaje..."
              rows="1"
              @keydown.enter.exact.prevent="submit"
            />
            <div class="assistant-chat__actions">
              <button
                class="assistant-chat__icon-button assistant-chat__mic"
                type="button"
                aria-label="Dictar mensaje"
                disabled
              >
                <MaterialIcon name="mic" />
              </button>
              <button class="assistant-chat__send" type="submit" aria-label="Enviar mensaje" :disabled="!canSubmit">
                <MaterialIcon name="arrow_upward" />
              </button>
            </div>
          </form>
        </div>
      </section>
    </dialog>
  </Teleport>
</template>
