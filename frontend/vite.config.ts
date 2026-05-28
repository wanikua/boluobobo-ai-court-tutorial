import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parsePathname(rawUrl: string): string {
  try {
    return new URL(rawUrl, 'http://local').pathname;
  } catch {
    return rawUrl || '/';
  }
}

function decodePathSegments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
}

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function safeResolve(
  root: string,
  ...segments: string[]
): { ok: true; resolved: string } | { ok: false; error: string } {
  for (const seg of segments) {
    if (seg === '.' || seg === '..') {
      return { ok: false, error: `invalid segment "${seg}"` };
    }
    if (seg.includes('/') || seg.includes('\\')) {
      return { ok: false, error: `invalid segment "${seg}"` };
    }
    if (!SAFE_ID.test(seg)) {
      return { ok: false, error: `invalid segment "${seg}"` };
    }
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(path.join(root, ...segments));
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    return { ok: false, error: 'path traversal' };
  }
  return { ok: true, resolved };
}

function resolveFixedFile(
  validatedDir: string,
  filename: string
): string | null {
  if (
    filename === '.' ||
    filename === '..' ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    return null;
  }
  const resolvedDir = path.resolve(validatedDir);
  const resolved = path.resolve(path.join(validatedDir, filename));
  if (resolved !== resolvedDir && !resolved.startsWith(resolvedDir + path.sep)) {
    return null;
  }
  return resolved;
}

function parseEventsJsonl(raw: string): unknown[] {
  const events: unknown[] = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // skip bad/torn lines
    }
  }
  return events;
}

function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function civagentApiPlugin() {
  return {
    name: 'civagent-api',
    configureServer(server: any) {
      server.middlewares.use('/api', async (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        if (req.method === 'OPTIONS') {
          res.setHeader('Content-Type', 'application/json');
          res.end();
          return;
        }

        if (req.method !== 'GET') {
          json(res, 405, { error: 'method not allowed' });
          return;
        }

        const rootDir = path.join(os.homedir(), '.civagent');
        const pathname = parsePathname(req.url || '');
        const segs = decodePathSegments(pathname);

        try {
          // /api/regimes
          if (pathname === '/regimes' || pathname === '/regimes/') {
            const projectRoot = path.resolve(__dirname, '..');
            const regimesDir = path.join(projectRoot, 'regimes');
            const result: any[] = [];

            const walk = (dir: string) => {
              if (!fs.existsSync(dir)) return;
              const files = fs.readdirSync(dir);
              for (const file of files) {
                if (file.startsWith('_') || file.startsWith('.')) continue;

                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                  if (fs.existsSync(path.join(fullPath, 'metadata.json'))) {
                    try {
                      const metadata = JSON.parse(
                        fs.readFileSync(path.join(fullPath, 'metadata.json'), 'utf8')
                      );
                      const id = path.relative(regimesDir, fullPath);

                      const identityPath = path.join(fullPath, 'IDENTITY.md');
                      let identity = '';
                      if (fs.existsSync(identityPath)) {
                        identity = fs.readFileSync(identityPath, 'utf8');
                      }

                      const soulPath = path.join(fullPath, 'SOUL.md');
                      let soul = '';
                      if (fs.existsSync(soulPath)) {
                        soul = fs.readFileSync(soulPath, 'utf8');
                      }

                      const skillsDir = path.join(fullPath, 'skills');
                      const skills = [];
                      if (fs.existsSync(skillsDir)) {
                        const skillFiles = fs
                          .readdirSync(skillsDir)
                          .filter((f: string) => f.endsWith('.md'));
                        for (const sf of skillFiles) {
                          const sContent = fs.readFileSync(
                            path.join(skillsDir, sf),
                            'utf8'
                          );
                          skills.push({ filename: sf, content: sContent });
                        }
                      }

                      result.push({ id, metadata, identity, soul, skills });
                    } catch (err) {
                      console.error(`Error parsing regime in ${fullPath}:`, err);
                    }
                  } else {
                    walk(fullPath);
                  }
                }
              }
            };

            walk(regimesDir);
            json(res, 200, result);
            return;
          }

          // /api/regimes/:region/:id/identity
          if (
            segs.length === 4 &&
            segs[0] === 'regimes' &&
            segs[3] === 'identity'
          ) {
            const region = segs[1];
            const id = segs[2];

            const projectRoot = path.resolve(__dirname, '..');
            const regimesDir = path.join(projectRoot, 'regimes');

            const resolved = safeResolve(regimesDir, region, id);
            if (!resolved.ok) {
              json(res, 400, { error: resolved.error });
              return;
            }

            const identityPath = path.join(resolved.resolved, 'IDENTITY.md');

            if (fs.existsSync(identityPath)) {
              try {
                const raw = fs.readFileSync(identityPath, 'utf8');
                json(res, 200, { id, region, raw });
              } catch (err: any) {
                json(res, 500, { error: err.message });
              }
            } else {
              json(res, 200, { id, region, raw: null });
            }
            return;
          }

          // /api/tournaments
          if (pathname === '/tournaments' || pathname === '/tournaments/') {
            const tournamentsDir = path.join(rootDir, 'tournaments');
            const list = [];
            if (fs.existsSync(tournamentsDir)) {
              const dirs = fs.readdirSync(tournamentsDir);
              for (const dir of dirs) {
                const manifestPath = path.join(tournamentsDir, dir, 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                  try {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

                    let judgeResult = '';
                    const resolvedDir = safeResolve(tournamentsDir, dir);
                    if (resolvedDir.ok) {
                      const resultPath = resolveFixedFile(resolvedDir.resolved, 'result.md');
                      if (resultPath && fs.existsSync(resultPath)) {
                        judgeResult = fs.readFileSync(resultPath, 'utf8');
                      }
                    }

                    list.push({
                      id: dir,
                      manifest,
                      judgeResult,
                    });
                  } catch (err) {
                    console.error(`Error parsing tournament manifest: ${manifestPath}`, err);
                  }
                }
              }
            }
            json(res, 200, list);
            return;
          }

          // /api/tournaments/:id
          if (segs.length === 2 && segs[0] === 'tournaments') {
            const id = segs[1];

            const resolved = safeResolve(rootDir, 'tournaments', id);
            if (!resolved.ok) {
              json(res, 400, { error: resolved.error });
              return;
            }

            const manifestPath = path.join(resolved.resolved, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
              try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

                let judgeResult = '';
                const resultPath = resolveFixedFile(resolved.resolved, 'result.md');
                if (resultPath && fs.existsSync(resultPath)) {
                  judgeResult = fs.readFileSync(resultPath, 'utf8');
                }

                json(res, 200, {
                  id,
                  manifest,
                  judgeResult,
                });
              } catch (err: any) {
                json(res, 500, { error: err.message });
              }
            } else {
              json(res, 404, { error: `Tournament '${id}' not found` });
            }
            return;
          }

          // /api/matches
          if (pathname === '/matches' || pathname === '/matches/') {
            const transcriptsDir = path.join(rootDir, 'transcripts');
            const matchesDir = path.join(rootDir, 'matches');
            const list = [];

            if (fs.existsSync(matchesDir)) {
              const dirs = fs.readdirSync(matchesDir);
              for (const dir of dirs) {
                const metaPath = path.join(matchesDir, dir, 'meta.json');
                if (fs.existsSync(metaPath)) {
                  try {
                    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    const stats = fs.statSync(metaPath);
                    list.push({
                      id: dir,
                      format: 'structured',
                      mtime: stats.mtimeMs,
                      meta,
                    });
                  } catch (err) {
                    console.error(`Error parsing match meta: ${metaPath}`, err);
                  }
                }
              }
            }

            if (fs.existsSync(transcriptsDir)) {
              const files = fs
                .readdirSync(transcriptsDir)
                .filter((f: string) => f.endsWith('.jsonl'));
              for (const file of files) {
                const matchId = file.replace('.jsonl', '');
                if (list.some((item) => item.id === matchId)) continue;

                const filePath = path.join(transcriptsDir, file);
                const stats = fs.statSync(filePath);
                list.push({
                  id: matchId,
                  format: 'legacy',
                  mtime: stats.mtimeMs,
                  meta: {
                    matchId,
                    regime: 'legacy',
                    backend: 'legacy',
                    ts: stats.mtimeMs,
                  },
                });
              }
            }

            list.sort((a, b) => b.mtime - a.mtime);
            json(res, 200, list);
            return;
          }

          // /api/matches/:id
          if (segs.length === 2 && segs[0] === 'matches') {
            const id = segs[1];

            const resolvedStructured = safeResolve(rootDir, 'matches', id);
            if (!resolvedStructured.ok) {
              json(res, 400, { error: resolvedStructured.error });
              return;
            }

            const eventsPath = path.join(resolvedStructured.resolved, 'events.jsonl');
            const metaPath = path.join(resolvedStructured.resolved, 'meta.json');

            if (fs.existsSync(eventsPath)) {
              try {
                const eventsRaw = fs.readFileSync(eventsPath, 'utf8');
                const events = parseEventsJsonl(eventsRaw);
                let meta = {};
                if (fs.existsSync(metaPath)) {
                  try {
                    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                  } catch {
                    // continue with empty meta
                  }
                }
                json(res, 200, { format: 'structured', meta, events });
              } catch (err: any) {
                json(res, 500, { error: err.message });
              }
              return;
            }

            const legacyPath = path.join(rootDir, 'transcripts', `${id}.jsonl`);
            if (fs.existsSync(legacyPath)) {
              try {
                const raw = fs.readFileSync(legacyPath, 'utf8');
                const lines = parseEventsJsonl(raw);

                const events = lines.map((l: any, index: number) => ({
                  matchId: id,
                  ts: l.t || Date.now(),
                  seq: index,
                  type: 'chunk',
                  text: l.chunk || '',
                }));

                json(res, 200, {
                  format: 'legacy',
                  meta: { matchId: id, regime: 'legacy' },
                  events,
                });
              } catch (err: any) {
                json(res, 500, { error: err.message });
              }
              return;
            }

            json(res, 404, { error: `Match '${id}' not found` });
            return;
          }

          json(res, 404, { error: `API route '${pathname}' not found` });
        } catch (e: any) {
          console.error('Error handling API request:', e);
          json(res, 500, { error: e.message });
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), civagentApiPlugin()],
  server: {
    port: 5173,
    host: true,
  },
});
