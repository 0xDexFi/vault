import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as foldersDb from '../db/folders.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(foldersDb.getAllFolders());
});

router.post('/', (req, res) => {
  const { name, parentId } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const folder = foldersDb.createFolder({ name, parentId });
  res.status(201).json(folder);
});

router.put('/reorder', (req, res) => {
  const { folderIds } = req.body;
  if (!Array.isArray(folderIds)) return res.status(400).json({ error: 'folderIds must be an array' });
  foldersDb.reorderFolders(folderIds);
  res.json({ success: true });
});

router.put('/:id', (req, res) => {
  const fields = {};
  if (req.body.name !== undefined) fields.name = req.body.name;
  if (req.body.parentId !== undefined) fields.parent_id = req.body.parentId;
  if (req.body.sortOrder !== undefined) fields.sort_order = req.body.sortOrder;

  const folder = foldersDb.updateFolder(req.params.id, fields);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  res.json(folder);
});

router.delete('/:id', (req, res) => {
  foldersDb.deleteFolder(req.params.id);
  res.json({ success: true });
});

export default router;
