import { createApp } from 'vue'
import 'vue-sonner/style.css'
import './assets/index.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'


async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)
  try {
    await router.isReady()
  } catch (err) {
    console.error('Router failed to become ready:', err)
  }
  app.mount('#app')
}
bootstrap()
