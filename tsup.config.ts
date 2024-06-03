import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    "./src/wte-mkscript.ts"
  ],
  format: "esm",
  sourcemap: false,
  clean: true
})
