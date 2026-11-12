import {defineConfig} from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'painel.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'style[extname]',
        manualChunks: {'dados': ['./src/dados.js']},
      },
    },
  },
});
