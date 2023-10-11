const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    hot: false,
    liveReload: false,
  },
  configureWebpack: {
    experiments: {
      syncWebAssembly: true
    },
    loader: {
      test: /\.wasm$/,
      loaders: ['wasm-loader']
    }
  }
})
