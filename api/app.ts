import { readFileSync } from 'fs';
import { join } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

// Ler os HTMLs uma vez no cold start (cache em memória)
const base = join(process.cwd(), 'public', 'app');
const pages: Record<string, string> = {
  index: readFileSync(join(base, 'index.html'), 'utf-8'),
  privacy: readFileSync(join(base, 'privacy.html'), 'utf-8'),
  terms: readFileSync(join(base, 'terms.html'), 'utf-8'),
};

export default function handler(req: IncomingMessage, res: ServerResponse) {
  // Headers permissivos para iframe embedding (Linea Dev)
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy', "frame-ancestors *;");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, max-age=3600');

  const url = req.url || '/';

  if (url.includes('privacy')) {
    res.writeHead(200);
    return res.end(pages.privacy);
  }
  if (url.includes('terms')) {
    res.writeHead(200);
    return res.end(pages.terms);
  }

  res.writeHead(200);
  return res.end(pages.index);
}
