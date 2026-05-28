import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Custom API middleware to serve ~/.civagent and ./regimes data
function civagentApiPlugin() {
  return {
    name: 'civagent-api',
    configureServer(server: any) {
      server.middlewares.use('/api', async (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        if (req.method === 'OPTIONS') {
          res.end();
          return;
        }

        const rootDir = path.join(os.homedir(), '.civagent');
        const url = req.url || '';

        try {
          // Endpoint: /api/regimes
          if (url === '/regimes' || url === '/regimes/') {
            const projectRoot = path.resolve(__dirname, '..');
            const regimesDir = path.join(projectRoot, 'regimes');
            const result: any[] = [];

            const walk = (dir: string) => {
              if (!fs.existsSync(dir)) return;
              const files = fs.readdirSync(dir);
              for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                  if (fs.existsSync(path.join(fullPath, 'metadata.json'))) {
                    try {
                      const metadata = JSON.parse(fs.readFileSync(path.join(fullPath, 'metadata.json'), 'utf8'));
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

                      // Check for sedimented skills in regimes/<civ>/skills/
                      const skillsDir = path.join(fullPath, 'skills');
                      const skills = [];
                      if (fs.existsSync(skillsDir)) {
                        const skillFiles = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
                        for (const sf of skillFiles) {
                          const sContent = fs.readFileSync(path.join(skillsDir, sf), 'utf8');
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
            res.end(JSON.stringify(result));
            return;
          }

          // Endpoint: /api/tournaments
          if (url === '/tournaments' || url === '/tournaments/') {
            const tournamentsDir = path.join(rootDir, 'tournaments');
            const list = [];
            if (fs.existsSync(tournamentsDir)) {
              const dirs = fs.readdirSync(tournamentsDir);
              for (const dir of dirs) {
                const manifestPath = path.join(tournamentsDir, dir, 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                  try {
                    list.push({
                      id: dir,
                      manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
                    });
                  } catch (err) {
                    console.error(`Error parsing tournament manifest: ${manifestPath}`, err);
                  }
                }
              }
            }
            res.end(JSON.stringify(list));
            return;
          }

          // Endpoint: /api/tournaments/:id
          if (url.startsWith('/tournaments/')) {
            const id = url.split('/').pop() || '';
            const manifestPath = path.join(rootDir, 'tournaments', id, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
              res.end(fs.readFileSync(manifestPath, 'utf8'));
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `Tournament '${id}' not found` }));
            }
            return;
          }

          // Endpoint: /api/matches
          if (url === '/matches' || url === '/matches/') {
            const transcriptsDir = path.join(rootDir, 'transcripts');
            const matchesDir = path.join(rootDir, 'matches');
            const list = [];

            // Read B4 structured matches
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

            // Read legacy transcripts as fallback
            if (fs.existsSync(transcriptsDir)) {
              const files = fs.readdirSync(transcriptsDir).filter(f => f.endsWith('.jsonl'));
              for (const file of files) {
                const matchId = file.replace('.jsonl', '');
                // Skip if already found in B4 structured matches
                if (list.some(item => item.id === matchId)) continue;

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
                  }
                });
              }
            }

            list.sort((a, b) => b.mtime - a.mtime);
            res.end(JSON.stringify(list));
            return;
          }

          // Endpoint: /api/matches/:id
          if (url.startsWith('/matches/')) {
            const id = url.split('/').pop() || '';
            const structuredDir = path.join(rootDir, 'matches', id);
            const eventsPath = path.join(structuredDir, 'events.jsonl');
            const metaPath = path.join(structuredDir, 'meta.json');

            // Try B4 structured matches
            if (fs.existsSync(eventsPath)) {
              const eventsRaw = fs.readFileSync(eventsPath, 'utf8');
              const events = eventsRaw.split('\n').filter(Boolean).map(line => JSON.parse(line));
              let meta = {};
              if (fs.existsSync(metaPath)) {
                meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
              }
              res.end(JSON.stringify({ format: 'structured', meta, events }));
              return;
            }

            // Try legacy transcript
            const legacyPath = path.join(rootDir, 'transcripts', `${id}.jsonl`);
            if (fs.existsSync(legacyPath)) {
              const raw = fs.readFileSync(legacyPath, 'utf8');
              const lines = raw.split('\n').filter(Boolean).map(line => JSON.parse(line));
              
              // Convert legacy formats to event chunks
              const events = lines.map((l, index) => ({
                matchId: id,
                ts: l.t || Date.now(),
                seq: index,
                type: 'chunk',
                text: l.chunk || '',
              }));

              res.end(JSON.stringify({
                format: 'legacy',
                meta: { matchId: id, regime: 'legacy' },
                events
              }));
              return;
            }

            res.statusCode = 404;
            res.end(JSON.stringify({ error: `Match '${id}' not found` }));
            return;
          }

          // Catch-all
          res.statusCode = 404;
          res.end(JSON.stringify({ error: `API route '${url}' not found` }));
        } catch (e: any) {
          console.error('Error handling API request:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), civagentApiPlugin()],
  server: {
    port: 5173,
    host: true,
  }
});
