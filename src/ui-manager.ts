import express from 'express';
import cors from 'cors';
import { Server } from 'http';
import { join } from 'path';
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
    app.use(express.static(join(process.cwd(), 'ui', 'dist')));

    app.get('/api/graph/project', async (req, res) => {
      try {
        const graph = await this.memoryManager.readStore('memory');
        res.json(graph);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });

    app.get('/api/graph/central', async (req, res) => {
      try {
        const graph = await this.memoryManager.readStore(this.memoryManager.getCentralDatabaseId());
        res.json(graph);
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
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
