import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
/**
 * 开发期 API 代理
 *
 * 不少第三方中转站（New API / one-api 等）不返回 CORS 头，浏览器直连会被预检拦下。
 * 在 .env.local 里设 VITE_API_PROXY_TARGET=https://你的服务域名，
 * 然后把应用内的 API URL 填成 /api-proxy/v1，请求就同源了，绕开 CORS。
 * 仅对 pnpm dev / pnpm preview 生效；部署后需由 Nginx/Vercel 等提供同样的反向代理。
 *
 * 注意：绝大多数官方服务商（OpenAI、DeepSeek、Moonshot、硅基流动、智谱、百炼）
 * 都已放行浏览器跨域，直接填它们的地址即可，不需要这个代理。
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET

  // dev 与 preview 共用同一套代理规则，否则 pnpm preview 验证不了生产构建
  const proxy = proxyTarget
    ? {
        '/api-proxy': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
        },
      }
    : undefined

  return {
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver({ importStyle: 'css' })],
        dts: false,
      }),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: 'css' })],
        dts: false,
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy,
    },
    preview: {
      proxy,
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'pinia'],
            xml: ['fast-xml-parser'],
          },
        },
      },
    },
  }
})
