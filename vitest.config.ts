import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'], environment: 'node', coverage: { include: ['src/domain/**', 'src/state/**', 'src/server/**', 'src/services/**', 'src/three/utils/**'] } } });
