import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initAdapters } from './adapters'

// 初始化适配器（保留业务层能力）
await initAdapters()

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
