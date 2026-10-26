import { createApp } from 'vue'
import App from './App.vue'
import './styles/base.css'
import './styles/background.css'
import { initializeTheme } from './composables/useAppearanceTheme'

initializeTheme()

createApp(App).mount('#app')
