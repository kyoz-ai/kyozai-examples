import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const output = new URL('../dist/assets/', import.meta.url);
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'dashboard.html', 'dashboard.css']) {
  await copyFile(new URL(`../${name}`, import.meta.url), new URL(name, output));
}
await copyFile(new URL('../dist/assets/lab/favicon.ico', import.meta.url), new URL('favicon.ico', output));
await addManifestCredentials(output);

async function addManifestCredentials(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const target = new URL(entry.name, directory);
      if (entry.isDirectory()) {
        await addManifestCredentials(new URL(`${entry.name}/`, directory));
        return;
      }
      if (!entry.name.endsWith('.html')) {
        return;
      }
      const html = await readFile(target, 'utf8');
      const authenticatedManifest = html.replace(
        '<link rel="manifest"',
        '<link rel="manifest" crossorigin="use-credentials"',
      );
      const writes = [];
      let scriptNumber = 0;
      const externalScripts = authenticatedManifest.replace(
        /<script>([\s\S]*?)<\/script>/g,
        (_script, source) => {
          scriptNumber += 1;
          const name = `inline-${scriptNumber}.js`;
          writes.push(writeFile(new URL(name, target), source));
          return `<script src="./${name}"></script>`;
        },
      );
      await Promise.all(writes);
      await writeFile(target, externalScripts);
    }),
  );
}
