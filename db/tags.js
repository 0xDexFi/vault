import { getDb, saveDatabase, generateId } from './schema.js';

export function getAllTags() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT t.*, COUNT(nt.note_id) as note_count
    FROM tags t
    LEFT JOIN note_tags nt ON nt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name ASC
  `);
  const tags = [];
  while (stmt.step()) {
    tags.push(stmt.getAsObject());
  }
  stmt.free();
  return tags;
}

export function createTag({ name, color = '#00d4ff' } = {}) {
  const db = getDb();

  // Check if tag already exists
  const check = db.prepare('SELECT * FROM tags WHERE name = ?');
  check.bind([name]);
  if (check.step()) {
    const existing = check.getAsObject();
    check.free();
    return existing;
  }
  check.free();

  const id = generateId();
  db.run('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)', [id, name, color]);
  saveDatabase();

  return { id, name, color, note_count: 0 };
}

export function deleteTag(id) {
  const db = getDb();
  db.run('DELETE FROM tags WHERE id = ?', [id]);
  saveDatabase();
}

export function addTagToNote(noteId, tagId) {
  const db = getDb();
  try {
    db.run('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)', [noteId, tagId]);
    saveDatabase();
  } catch (e) {
    // Ignore duplicate
  }
}

export function removeTagFromNote(noteId, tagId) {
  const db = getDb();
  db.run('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?', [noteId, tagId]);
  saveDatabase();
}

export function getTagsForNote(noteId) {
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
