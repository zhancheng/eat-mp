import { createRequire } from 'node:module'
import { defineConfig, type Plugin } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import path from 'path'

const require = createRequire(import.meta.url)
const { copyCloudfunctionsAndPatch } = require('./scripts/copy-cloudfunctions.js') as {
  copyCloudfunctionsAndPatch: () => string[]
}

function copyCloudfunctionsPlugin(): Plugin {
  return {
    name: 'copy-cloudfunctions',
    closeBundle() {
      if (process.env.UNI_PLATFORM === 'mp-weixin') {
        copyCloudfunctionsAndPatch()
      }
    }
  }
}

export default defineConfig({
  plugins: [uni(), copyCloudfunctionsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // uni-app 仍使用 sass.render()，暂无法切 modern API，先静默弃用提示
        silenceDeprecations: ['legacy-js-api', 'import']
      }
    }
  }
})
