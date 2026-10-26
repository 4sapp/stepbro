<script setup>
import EmptyStateDots from '../EmptyStateDots.vue'
import MaterialIcon from '../MaterialIcon.vue'
import { computed, ref } from 'vue'
import { useFeedbackStore } from '../../composables/useFeedbackStore'
import FinanceDialog from '../finance/FinanceDialog.vue'
import FinanceSelect from '../FinanceSelect.vue'
import './FeedbackView.css'
const emit = defineEmits(['back'])
const { profile, posts, error: storageError, createProfile, post, vote, comment } = useFeedbackStore()
const name = ref('')
const description = ref('')
const error = ref('')
const composer = ref(null)
const filters = ref(null)
const details = ref(null)
const body = ref('')
const reply = ref('')
const selectedId = ref(null)
const includeResolved = ref(false)
const order = ref('likes')
const type = ref('')
const page = ref(1)
const pageSize = 20
const types = { bug: 'Bug', feature: 'Funcionalidad', criticism: 'Crítica', praise: 'Elogio', suggestion: 'Sugerencia', other: 'Otro' }
const sorted = computed(() => [...posts.value].filter(p => (includeResolved.value || !p.resolved) && (!type.value || p.type === type.value)).sort((a, b) => order.value === 'date' ? b.createdAt - a.createdAt : b.likes.length - a.likes.length || b.createdAt - a.createdAt))
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize)))
const visible = computed(() => sorted.value.slice((Math.min(page.value, totalPages.value) - 1) * pageSize, Math.min(page.value, totalPages.value) * pageSize))
const selected = computed(() => posts.value.find(p => p.id === selectedId.value))
const initials = value => value.trim().split(/\s+/).slice(0, 2).map(v => v[0]).join('').toUpperCase()
const date = value => new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(value)
function attempt(action) { error.value = ''; try { action() } catch (cause) { error.value = cause.message } }
function start() { attempt(() => createProfile(name.value, description.value)) }
function compose(event) { error.value = ''; body.value = ''; composer.value.open(event.currentTarget) }
function publish() { attempt(() => { post(body.value); body.value = ''; page.value = 1; composer.value.close() }) }
function openPost(item, event) { selectedId.value = item.id; reply.value = ''; error.value = ''; details.value.open(event.currentTarget) }
function sendReply() { attempt(() => { comment(selectedId.value, reply.value); reply.value = '' }) }
function applyFilters() { page.value = 1; filters.value.close() }
</script>
<template>
  <section class="community" aria-label="Feedback">
    <button class="community__back" type="button" @click="emit('back')"><MaterialIcon name="arrow_back" />Volver a la app</button>
    <p v-if="storageError" role="alert" class="finance-form-error">{{ storageError }}</p>
    <div v-if="!profile" class="community-welcome">
      <MaterialIcon class="community-welcome__symbol" name="diversity_1" filled />
      <h1>Comparte tus ideas</h1>
      <p>Crea un perfil para enviar sugerencias, votar ideas y ayudar a mejorar</p>
      <form class="finance-fields" @submit.prevent="start">
        <label>Nombre<input v-model="name" placeholder="Tu nombre en la comunidad" maxlength="255" required autocomplete="nickname" /></label>
        <label class="visually-hidden" for="community-description">Sobre ti</label>
        <textarea id="community-description" v-model="description" placeholder="Cuéntanos algo sobre ti" maxlength="1000" />
        <p v-if="error" class="finance-form-error" role="alert">{{ error }}</p>
        <button class="community__primary" type="submit">Empezar a dar feedback</button>
      </form>
    </div>
    <template v-else>
      <header class="community__header"><h1>Feedback</h1><button class="community__filter" type="button" aria-label="Filtros de feedback" @click="error = ''; filters.open($event.currentTarget)"><MaterialIcon name="page_info" /></button></header>
      <button class="community-compose" type="button" @click="compose"><span>Me encanta esta app</span><span class="community-compose__action">Postear</span></button>
      <p v-if="error" role="alert" class="finance-form-error">{{ error }}</p>
      <div v-if="!visible.length" class="community-empty"><EmptyStateDots /><p>No se encontraron publicaciones</p></div>
      <ol v-else class="community-posts">
        <li v-for="item in visible" :key="item.id" class="community-card">
          <button class="community-card__open" type="button" @click="openPost(item, $event)">
            <span class="community-author"><span class="community-avatar" aria-hidden="true">{{ initials(item.author.name) }}</span><strong>{{ item.author.name }}</strong></span>
            <span class="community-card__meta"><span>{{ types[item.type] || 'Otro' }}</span><time :datetime="new Date(item.createdAt).toISOString()">{{ date(item.createdAt) }}</time><span v-if="item.resolved" class="community-resolved"><MaterialIcon name="check_circle" filled /> Resuelto</span></span>
            <span class="community-card__body">{{ item.body }}</span>
          </button>
          <footer><button type="button" :aria-label="`Votar publicación de ${item.author.name}`" :aria-pressed="item.likes.includes(profile.id)" @click="attempt(() => vote(item.id))"><MaterialIcon name="thumb_up" :filled="item.likes.includes(profile.id)" /> {{ item.likes.length }}</button><button type="button" @click="openPost(item, $event)"><MaterialIcon name="chat_bubble" /> {{ item.comments.length }}</button></footer>
        </li>
      </ol>
      <nav v-if="totalPages > 1" class="community-pagination" aria-label="Páginas de feedback"><button type="button" :disabled="page <= 1" @click="page--">Anterior</button><span>{{ Math.min(page, totalPages) }} / {{ totalPages }}</span><button type="button" :disabled="page >= totalPages" @click="page++">Siguiente</button></nav>
    </template>
    <FinanceDialog ref="composer" title="Comparte tu opinión">
      <form class="finance-fields" data-no-drag @submit.prevent="publish"><label>Tu opinión<textarea v-model="body" placeholder="Escribe tu opinión" maxlength="1000" required /></label><p v-if="error" role="alert" class="finance-form-error">{{ error }}</p><footer class="finance-fields__footer"><button type="button" @click="composer.close()">Cancelar</button><button type="submit">Postear</button></footer></form>
    </FinanceDialog>
    <FinanceDialog ref="filters" title="Filtros de feedback" variant="filters">
      <form class="finance-fields" data-no-drag @submit.prevent="applyFilters">
        <label class="community-check"><input v-model="includeResolved" type="checkbox" /> Incluir resueltos</label>
        <label>Tipo<FinanceSelect v-model="type" aria-label="Tipo de feedback"><option value="">Todos</option><option v-for="(label, value) in types" :key="value" :value="value">{{ label }}</option></FinanceSelect></label>
        <label>Ordenar por<FinanceSelect v-model="order" aria-label="Ordenar feedback"><option value="likes">Votos</option><option value="date">Fecha</option></FinanceSelect></label>
        <footer class="finance-fields__footer"><button type="button" @click="includeResolved = false; type = ''; order = 'likes'">Limpiar</button><button type="submit">Ver feedback</button></footer>
      </form>
    </FinanceDialog>
    <FinanceDialog ref="details" title="Publicación">
      <article v-if="selected" class="community-detail" data-no-drag>
        <header class="community-author"><span class="community-avatar" aria-hidden="true">{{ initials(selected.author.name) }}</span><strong>{{ selected.author.name }}</strong></header>
        <p class="community-card__meta">{{ date(selected.createdAt) }} <span v-if="selected.resolved" class="community-resolved"><MaterialIcon name="check_circle" filled /> Resuelto</span></p>
        <p class="community-card__body">{{ selected.body }}</p>
        <div class="community-detail__actions"><button type="button" :aria-pressed="selected.likes.includes(profile.id)" @click="attempt(() => vote(selected.id))"><MaterialIcon name="thumb_up" :filled="selected.likes.includes(profile.id)" /> {{ selected.likes.length }}</button></div>
        <h3>Comentarios · {{ selected.comments.length }}</h3>
        <p v-if="!selected.comments.length" class="community__muted">No hay comentarios</p>
        <ol class="community-comments"><li v-for="message in selected.comments" :key="message.id"><strong>{{ message.author.name }}</strong><time :datetime="new Date(message.createdAt).toISOString()">{{ date(message.createdAt) }}</time><p>{{ message.body }}</p></li></ol>
        <form class="finance-fields" @submit.prevent="sendReply"><label>Tu comentario<textarea v-model="reply" placeholder="Estoy de acuerdo" maxlength="1000" required /></label><p v-if="error" class="finance-form-error" role="alert">{{ error }}</p><footer class="finance-fields__footer"><button type="submit">Comentar</button></footer></form>
      </article>
    </FinanceDialog>
  </section>
</template>
