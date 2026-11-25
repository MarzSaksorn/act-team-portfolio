import { createPasswordHash } from '../auth/password';
import { isMainModule } from './is-main';

export async function readHiddenPassword(): Promise<string> {
  if (!process.stdin.isTTY || !process.stderr.isTTY || process.argv.length > 2) {
    throw new Error('Use an interactive terminal with no password arguments or pipes.');
  }
  return new Promise<string>((resolvePassword, rejectPassword) => {
    let password = '';
    const wasRaw = process.stdin.isRaw;
    const finish = (error?: Error) => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(wasRaw);
      process.stdin.pause();
      process.stderr.write('\n');
      if (error) { password = ''; rejectPassword(error); } else resolvePassword(password);
    };
    const onData = (chunk: Buffer) => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003' || character === '\u0004') { finish(new Error('Password entry cancelled.')); return; }
        if (character === '\r' || character === '\n') {
          if (password.length < 12) finish(new Error('Use a password of at least 12 characters.'));
          else finish();
          return;
        }
        if (character === '\u007f' || character === '\b') password = Array.from(password).slice(0, -1).join('');
        else if (character >= ' ' && character !== '\u001b') password += character;
        if (Buffer.byteLength(password, 'utf8') > 1024) { finish(new Error('Password exceeds 1024 bytes.')); return; }
      }
    };
    process.stdin.setRawMode(true);
    process.stdin.on('data', onData);
    process.stderr.write('Password: ');
    process.stdin.resume();
  });
}

if (isMainModule(import.meta.url)) {
  try {
    const hash = await createPasswordHash(await readHiddenPassword());
    process.stdout.write(`${hash}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password hashing failed.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
