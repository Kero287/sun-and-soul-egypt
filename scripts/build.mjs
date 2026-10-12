import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist/data', { recursive: true });
for (const file of ['index.html', 'style.css', 'script.js', 'admin.html', 'admin.css', 'admin.js']) {
  await copyFile(file, `dist/${file}`);
}
await copyFile('data/trips.json', 'dist/data/trips.json');
await cp('images', 'dist/images', { recursive: true });
console.log('Static website built in dist/. Server files and secrets are excluded.');
