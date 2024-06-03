import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    "./src/wte-config.ts",
    "./src/wte-mkscript.ts",
    "./src/wte-syscheck.ts"
  ],
  format: "esm",
  sourcemap: false,
  clean: true
})
