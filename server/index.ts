import { loadRuntimeConfig, RuntimeConfigError } from './config';
import { startRuntime } from './runtime';
import { isMainModule } from './scripts/is-main';

export { startRuntime } from './runtime';

if (isMainModule(import.meta.url)) {
  process.umask(0o077);
  try {
    const config = loadRuntimeConfig();
    const runtime = await startRuntime({ config });
    const stop = () => {
      void runtime.shutdown().catch(() => {
        process.stderr.write('ACT shutdown failed.\n');
        process.exitCode = 1;
      });
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
    process.stdout.write(`ACT listening on port ${config.port}.\n`);
  } catch (error) {
    const message = error instanceof RuntimeConfigError ? error.message : 'Check database access and compiled runtime assets.';
    process.stderr.write(`ACT startup failed: ${message}\n`);
    process.exitCode = 1;
  }
}
