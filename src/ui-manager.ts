import express from 'express';
import cors from 'cors';
import { Server } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { MemoryManager } from './memory-manager.js';

export class UIManager {
  private server: Server | null = null;
  private port: number | null = null;

  constructor(private memoryManager: MemoryManager) {}

  public async start(): Promise<number> {
    if (this.server && this.port) {
      return this.port; // Already running
    }

    const app = express();
    app.use(cors());
    const cwdUiPath = join(process.cwd(), 'ui', 'dist');
    const guardianUiPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'ui', 'dist');
    const altPath = '/home/azzar/project/MCPservers/Project-Guardian-mcp-server/ui/dist';
    let uiPath = guardianUiPath;
    if (existsSync(join(cwdUiPath, 'index.html'))) uiPath = cwdUiPath;
    else if (existsSync(join(guardianUiPath, 'index.html'))) uiPath = guardianUiPath;
    else if (existsSync(join(altPath, 'index.html'))) uiPath = altPath;
    console.error(`UI static path: ${uiPath}`);
    app.use(express.static(uiPath));

    app.get('/api/graph/project', async (req, res) => {
      try {
        const limit = req.query.limit ? Math.min(10000, Math.max(1, parseInt(String(req.query.limit), 10) || 5000)) : 5000;
        const offset = req.query.offset ? Math.max(0, parseInt(String(req.query.offset), 10) || 0) : undefined;
        const graph = await this.memoryManager.readStore('memory', { limit, offset });
        res.json(graph);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.get('/api/graph/central', async (req, res) => {
      try {
        const limit = req.query.limit ? Math.min(10000, Math.max(1, parseInt(String(req.query.limit), 10) || 5000)) : 5000;
        const offset = req.query.offset ? Math.max(0, parseInt(String(req.query.offset), 10) || 0) : undefined;
        const graph = await this.memoryManager.readStore(this.memoryManager.getCentralDatabaseId(), { limit, offset });
        res.json(graph);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.get('/api/search', async (req, res) => {
      try {
        const q = String(req.query.q || req.query.query || '');
        if (!q.trim()) return res.json({ entities: [], relations: [] });
        const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20)) : 20;
        const mode = String(req.query.mode || 'hybrid') as 'keyword'|'vector'|'hybrid';
        const result = await this.memoryManager.searchNodes(q, limit, mode);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.get('/api/graph/stream', async (req, res) => {
      try {
        const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
        const limit = req.query.limit ? Math.min(1000, Math.max(1, parseInt(String(req.query.limit), 10) || 500)) : 500;
        const result = await this.memoryManager.readGraphStream(cursor, limit);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    // SPA fallback
    app.use((req, res) => {
      res.sendFile(join(uiPath, 'index.html'));
    });

    return new Promise((resolve, reject) => {
      let currentPort = parseInt(process.env.PORT || '3000', 10);
      
      const tryListen = (p: number) => {
        const serverInstance = app.listen(p, () => {
          console.error(`UI Server running on http://localhost:${p}`);
          this.server = serverInstance;
          this.port = p;
          resolve(p);
        });
        
        serverInstance.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            console.error(`Port ${p} in use, trying ${p + 1}...`);
            tryListen(p + 1);
          } else {
            console.error(`UI Server error:`, err);
            reject(err);
          }
        });
      };
      
      tryListen(currentPort);
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.port = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
