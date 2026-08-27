import { SQLiteManager } from '../dist/sqlite-manager.js';
import { MemoryManager } from '../dist/memory-manager.js';
import { embedText, toVecString } from '../dist/vector-manager.js';
import os from 'os'; import path from 'path';

const smCentral = new SQLiteManager(path.join(os.homedir(), 'memory'));
const mmCentral = new MemoryManager(smCentral, path.join(os.homedir(), 'memory'));
await mmCentral.initializeMemoryDatabase();
const smProj = new SQLiteManager(path.join(os.homedir(), '.local/share/project-guardian'));
const mmProj = new MemoryManager(smProj, path.join(os.homedir(), '.local/share/project-guardian'));
await mmProj.initializeMemoryDatabase();

async function backfill(mm, sm, label, dbName) {
  const g = await mm.readStore(dbName, {limit:10000});
  console.log(`[${label}] entities ${g.entities.length}`);
  let ok=0, fail=0;
  for (const e of g.entities) {
    const text = `${e.name} ${e.entityType} ${e.observations.join(' ')}`;
    try {
      const vec = await embedText(text);
      const vecStr = toVecString(vec);
      const row = await sm.executeSql(dbName, `SELECT rowid FROM entities WHERE name=?`, [e.name]);
      if (!row.success || !row.data.rows.length) continue;
      const rowid = row.data.rows[0].rowid;
      await sm.executeSql(dbName, `DELETE FROM vec_entities WHERE rowid=?`, [rowid]);
      const ins = await sm.executeSql(dbName, `INSERT INTO vec_entities(rowid, embedding) VALUES (?, ?)`, [rowid, vecStr]);
      if (ins.success) ok++; else { fail++; console.warn(`insert fail ${e.name}`, ins.error); }
      if ((ok+fail)%20===0) console.log(`[${label}] ${ok} ok ${fail} fail`);
    } catch (err) {
      fail++; console.warn(`embed fail ${e.name}`, err.message);
    }
  }
  console.log(`[${label}] done ok ${ok} fail ${fail}`);
  const cnt = await sm.executeSql(dbName, `SELECT COUNT(*) as c FROM vec_entities`);
  console.log(`[${label}] vec count`, cnt.data?.rows[0]?.c, cnt.error);
}
console.log('backfill start');
await backfill(mmCentral, smCentral, 'central', mmCentral.getCentralDatabaseId());
await backfill(mmProj, smProj, 'project', 'memory');
console.log('all done');
