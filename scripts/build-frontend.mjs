import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

await mkdir(dist, { recursive: true });
await copyFile(path.join(root, 'devflow.html'), path.join(dist, 'index.html'));
console.log('Built dist/index.html');
