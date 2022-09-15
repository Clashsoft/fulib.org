import fs from 'fs/promises';
import child_process from 'child_process';

const text = await fs.readFile('../frontend/src/assets/projects/code-server-images.json', 'utf8');
const images = JSON.parse(text);
const argv = new Set(process.argv.slice(2));

for (let image of images) {
  if (argv.size && !argv.has(image.name)) {
    continue;
  }

  let args = [
    'build',
    '-t',
    image.tag,
    '-f',
    image.dockerfile,
    ...Object.entries(image.args).filter(([, v]) => v).flatMap(([k, v]) => ['--build-arg', `${k}=${v}`]),
    '.',
  ];
  console.log('docker', ...args);
  let child = child_process.execFile('docker', args);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
}
