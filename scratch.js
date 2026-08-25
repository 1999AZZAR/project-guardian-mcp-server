const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('memory.db');
db.all("SELECT e.* FROM entities e JOIN entities_fts fts ON e.rowid = fts.rowid WHERE entities_fts MATCH 'port OR collision' ORDER BY bm25(entities_fts)", (err, rows) => {
  console.log(rows);
});
