import { getDb, saveDatabase, generateId } from './schema.js';

export function getAllFolders() {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM folders ORDER BY sort_order ASC, name ASC');
  const folders = [];
  while (stmt.step()) {
    folders.push(stmt.getAsObject());
  }
  stmt.free();
  return folders;
}

export function createFolder({ name, parentId = null } = {}) {
  const db = getDb();
  const id = generateId();
  db.run(
    'INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)',
    [id, name, parentId]
  );
  saveDatabase();
  return getFolderById(id);
}

export function getFolderById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM folders WHERE id = ?');
  stmt.bind([id]);
  let folder = null;
  if (stmt.step()) {
    folder = stmt.getAsObject();
  }
  stmt.free();
  return folder;
}

export function updateFolder(id, fields) {
  const db = getDb();
  const allowed = ['name', 'parent_id', 'sort_order'];
  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (sets.length === 0) return getFolderById(id);

  sets.push("updated_at = datetime('now')");
  values.push(id);

  db.run(`UPDATE folders SET ${sets.join(', ')} WHERE id = ?`, values);
  saveDatabase();
  return getFolderById(id);
}

export function deleteFolder(id) {
  const db = getDb();
  db.run('DELETE FROM folders WHERE id = ?', [id]);
  saveDatabase();
}

export function reorderFolders(folderIds) {
  const db = getDb();
  for (let i = 0; i < folderIds.length; i++) {
    db.run('UPDATE folders SET sort_order = ? WHERE id = ?', [i, folderIds[i]]);
  }
  saveDatabase();
}
