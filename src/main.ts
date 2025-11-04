import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initAdapters } from './adapters'
import '@/styles/index.scss'
// Element Plus service components (styles for Message/Loading)
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/loading/style/css'

// 初始化适配器（保留业务层能力）
await initAdapters()

const app = createApp(App)

app.use(createPinia())

app.mount('#app')
