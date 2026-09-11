import { build } from './build.ts';

await build();
const root = new URL('../dist/', import.meta.url);

const server = Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const asset = new URL(path, root);
    if (!asset.href.startsWith(root.href)) return new Response('Not found', { status: 404 });
    const file = Bun.file(asset);
    return await file.exists() ? new Response(file) : new Response('Not found', { status: 404 });
  },
});

console.log(`AI Fitness ready at ${server.url}`);
