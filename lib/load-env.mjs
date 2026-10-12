import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Keep local .env support quiet and optional. Vercel injects its environment
// variables itself, so existing values always win over this file.
try {
  const source = readFileSync(resolve('.env'), 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
