<script setup>
import { reactive, ref } from 'vue'
import { useCloudSession } from '../../composables/useCloudSession'
const { user, loading, error, login, register, logout } = useCloudSession()
const registering = ref(false)
const form = reactive({ name: '', email: '', password: '', password_confirmation: '' })
async function submit() {
  try {
    if (registering.value) await register(form)
    else await login({ email: form.email, password: form.password })
    form.password = ''
    form.password_confirmation = ''
  } catch { /* El servicio expone el error al formulario. */ }
}
async function signOut() {
  try { await logout() } catch { /* Se muestra el error de sesión. */ }
}
</script>

<template>
  <div class="cloud-account" data-no-drag>
    <template v-if="user">
      <dl class="settings-profile">
        <div><dt>Correo</dt><dd>{{ user.email }}</dd></div>
        <div><dt>Nombre</dt><dd>{{ user.name }}</dd></div>
      </dl>
      <button class="cloud-account__submit" type="button" :disabled="loading" @click="signOut">Cerrar sesión</button>
    </template>
    <form v-else class="finance-fields" @submit.prevent="submit">
      <h3>{{ registering ? 'Crear cuenta' : 'Iniciar sesión' }}</h3>
      <label v-if="registering">Nombre<input v-model="form.name" autocomplete="name" required maxlength="120" /></label>
      <label>Correo<input v-model="form.email" type="email" autocomplete="username" required maxlength="254" /></label>
      <label>Contraseña<input v-model="form.password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" :minlength="registering ? 8 : undefined" required /></label>
      <label v-if="registering">Confirmar contraseña<input v-model="form.password_confirmation" type="password" autocomplete="new-password" required /></label>
      <button class="cloud-account__submit" type="submit" :disabled="loading">{{ registering ? 'Crear cuenta' : 'Entrar' }}</button>
      <button class="cloud-account__switch" type="button" :disabled="loading" @click="registering = !registering">{{ registering ? 'Ya tengo cuenta' : 'Crear cuenta' }}</button>
    </form>
    <p v-if="error" class="finance-form-error" role="alert">{{ error }}</p>
  </div>
</template>

<style>
.cloud-account {
  padding: 1.5rem;
}

.cloud-account h3 {
  margin: 0 0 0.5rem;
  color: var(--theme-ink);
}

.cloud-account__submit,
.cloud-account__switch {
  padding: 0.9rem 1.25rem;
  border: 0;
  border-radius: 2rem;
  font: inherit;
  cursor: pointer;
}

.cloud-account__submit {
  margin-block-start: 1rem;
  background: var(--theme-accent);
  color: var(--theme-accent-ink);
}

.cloud-account__switch {
  background: transparent;
  color: var(--theme-muted);
}

.cloud-account button:disabled {
  opacity: 0.6;
  cursor: wait;
}
</style>
