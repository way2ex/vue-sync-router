const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, './src/index.ts'),
      name: 'vue-sync-router',
      fileName: format => `vue-sync-router.${format}.js`
    },
    rollupOptions: {
      external: ['vue-router'],
      output: {
        globals: {
          'vue-router': 'VueRouter'
        }
      }
    }
  }
})
