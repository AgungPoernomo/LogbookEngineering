import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Hanya muat bobot 400, 500, 600 untuk subset latin (mengeliminasi aset Cyrillic/Greek/Vietnamese)
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import './assets/tokens.css'
import './assets/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')
