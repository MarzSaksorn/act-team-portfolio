import { build } from 'vite';
import { resolve } from 'node:path';

await build({
  configFile: false,
  build: {
    ssr: true,
    outDir: 'dist-server',
    target: 'node24',
    rollupOptions: {
      input: {
        'server/index': resolve('server/index.ts'),
        'server/scripts/backup-database': resolve('server/scripts/backup-database.ts'),
        'server/scripts/create-admin-hash': resolve('server/scripts/create-admin-hash.ts'),
      },
      output: { entryFileNames: '[name].js', chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
});
