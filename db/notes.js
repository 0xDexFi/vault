import { getDb, saveDatabase, generateId } from './schema.js';

export function getAllNotes(folderId = null) {
  const db = getDb();
  let stmt;
  if (folderId) {
    stmt = db.prepare('SELECT * FROM notes WHERE folder_id = ? AND parent_id IS NULL ORDER BY is_pinned DESC, sort_order ASC, updated_at DESC');
    stmt.bind([folderId]);
  } else {
    stmt = db.prepare('SELECT * FROM notes WHERE parent_id IS NULL ORDER BY is_pinned DESC, sort_order ASC, updated_at DESC');
  }

  const notes = [];
  while (stmt.step()) {
    notes.push(stmt.getAsObject());
  }
  stmt.free();
  return notes;
}

export function getNoteById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM notes WHERE id = ?');
  stmt.bind([id]);

  let note = null;
  if (stmt.step()) {
    note = stmt.getAsObject();
  }
  stmt.free();

  if (note) {
    note.tags = getTagsForNote(id);
    note.childPages = getChildPages(id);
  }
  return note;
}

function getTagsForNote(noteId) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT t.* FROM tags t
    JOIN note_tags nt ON nt.tag_id = t.id
    WHERE nt.note_id = ?
  `);
  stmt.bind([noteId]);

  const tags = [];
  while (stmt.step()) {
    tags.push(stmt.getAsObject());
  }
  stmt.free();
  return tags;
}

function getChildPages(noteId) {
  const db = getDb();
  const stmt = db.prepare('SELECT id, title, created_at, updated_at FROM notes WHERE parent_id = ? ORDER BY sort_order ASC, created_at ASC');
  stmt.bind([noteId]);

  const pages = [];
  while (stmt.step()) {
    pages.push(stmt.getAsObject());
  }
  stmt.free();
  return pages;
}

export function createNote({ title = 'Untitled', content = '', folderId = null, parentId = null } = {}) {
  const db = getDb();
  const id = generateId();
  db.run(
    'INSERT INTO notes (id, title, content, folder_id, parent_id) VALUES (?, ?, ?, ?, ?)',
    [id, title, content, folderId, parentId]
  );
  saveDatabase();
  return getNoteById(id);
}

export function updateNote(id, fields) {
  const db = getDb();
  const allowed = ['title', 'content', 'folder_id', 'parent_id', 'is_pinned', 'sort_order'];
  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (sets.length === 0) return getNoteById(id);

  sets.push("updated_at = datetime('now')");
  values.push(id);

  db.run(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`, values);
  saveDatabase();
  return getNoteById(id);
}

export function deleteNote(id) {
  const db = getDb();
  db.run('DELETE FROM notes WHERE id = ?', [id]);
  saveDatabase();
}

export function togglePin(id) {
  const db = getDb();
  db.run("UPDATE notes SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?", [id]);
  saveDatabase();
  return getNoteById(id);
}

export function reorderNotes(noteIds) {
  const db = getDb();
  for (let i = 0; i < noteIds.length; i++) {
    db.run('UPDATE notes SET sort_order = ? WHERE id = ?', [i, noteIds[i]]);
  }
  saveDatabase();
}

export function searchNotes(query) {
  const db = getDb();
  const pattern = `%${query}%`;
  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE title LIKE ? OR content LIKE ?
    ORDER BY is_pinned DESC, updated_at DESC
  `);
  stmt.bind([pattern, pattern]);

  const notes = [];
  while (stmt.step()) {
    notes.push(stmt.getAsObject());
  }
  stmt.free();
  return notes;
}

export function getBreadcrumbs(noteId) {
  const db = getDb();
  const crumbs = [];
  let currentId = noteId;

  while (currentId) {
    const stmt = db.prepare('SELECT id, title, parent_id FROM notes WHERE id = ?');
    stmt.bind([currentId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      crumbs.unshift({ id: row.id, title: row.title });
      currentId = row.parent_id;
    } else {
      currentId = null;
    }
    stmt.free();
  }

  return crumbs;
}
