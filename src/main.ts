import App from './App.vue'
import { createSSRApp } from 'vue'
import type { App as VueApp } from 'vue'

export function createApp(): { app: VueApp } {
  const app = createSSRApp(App)
  return { app }
}
