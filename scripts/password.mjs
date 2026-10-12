import { randomBytes, scryptSync } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
let hidden = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!hidden) process.stdout.write(chunk); callback(); } });
const input = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
input.question('Choose an admin password (at least 12 characters): ', password => {
  hidden = false;
  input.close();
  if (password.length < 12) { console.error('\nPassword must contain at least 12 characters.'); process.exitCode = 1; return; }
  const salt = randomBytes(16).toString('hex');
  console.log(`\nADMIN_PASSWORD_HASH=${salt}:${scryptSync(password, salt, 64).toString('hex')}`);
  console.log(`SESSION_SECRET=${randomBytes(32).toString('hex')}`);
});
hidden = true;
