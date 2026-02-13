import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDb, saveDatabase } from './db/schema.js';
import authRoutes from './routes/auth.js';
import noteRoutes from './routes/notes.js';
import folderRoutes from './routes/folders.js';
import tagRoutes from './routes/tags.js';
import searchRoutes from './routes/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.VAULT_PORT || 3000;

// Custom SQLite session store
class SqliteSessionStore extends session.Store {
  constructor() {
    super();
  }

  get(sid, cb) {
    try {
      const db = getDb();
      const stmt = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired > datetime(\'now\')');
      stmt.bind([sid]);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        cb(null, JSON.parse(row.sess));
      } else {
        stmt.free();
        cb(null, null);
      }
    } catch (e) {
      cb(e);
    }
  }

  set(sid, sess, cb) {
    try {
      const db = getDb();
      const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 86400000;
      const expired = new Date(Date.now() + maxAge).toISOString();
      db.run(
        'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)',
        [sid, JSON.stringify(sess), expired]
      );
      saveDatabase();
      cb(null);
    } catch (e) {
      cb(e);
    }
  }

  destroy(sid, cb) {
    try {
      const db = getDb();
      db.run('DELETE FROM sessions WHERE sid = ?', [sid]);
      saveDatabase();
      cb(null);
    } catch (e) {
      cb(e);
    }
  }

  clear(cb) {
    try {
      const db = getDb();
      db.run('DELETE FROM sessions');
      saveDatabase();
      cb(null);
    } catch (e) {
      cb(e);
    }
  }
}

async function start() {
  await initDatabase();

  const app = express();

  app.use(express.json({ limit: '5mb' }));

  app.use(session({
    store: new SqliteSessionStore(),
    secret: process.env.VAULT_SECRET || 'vault-0x7f-neural-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'strict'
    }
  }));

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/auth', authRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/folders', folderRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/search', searchRoutes);

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗`);
    console.log(`  ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝`);
    console.log(`  ██║   ██║███████║██║   ██║██║     ██║`);
    console.log(`  ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║`);
    console.log(`   ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║`);
    console.log(`    ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝`);
    console.log(`\n  [SYSTEM] Vault online at http://localhost:${PORT}`);
    console.log(`  [SYSTEM] Neural interface ready\n`);
  });
}

start().catch(err => {
  console.error('[FATAL] Vault initialization failed:', err);
  process.exit(1);
});
