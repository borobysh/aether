import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: path.resolve(__dirname, 'src/index.ts'), // Точка входа, где ты экспортируешь Engine, Layer и т.д.
            name: 'Aether',
        },
        rollupOptions: {
            // Важно: не вшиваем Pixi в билд либы
            external: ['pixi.js'],
            output: {
                globals: {
                    'pixi.js': 'PIXI'
                }
            }
        }
    }
});