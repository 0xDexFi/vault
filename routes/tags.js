import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as tagsDb from '../db/tags.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(tagsDb.getAllTags());
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const tag = tagsDb.createTag({ name, color });
  res.status(201).json(tag);
});

router.delete('/:id', (req, res) => {
  tagsDb.deleteTag(req.params.id);
  res.json({ success: true });
});

router.post('/note/:noteId/:tagId', (req, res) => {
  tagsDb.addTagToNote(req.params.noteId, req.params.tagId);
  res.json({ success: true });
});

router.delete('/note/:noteId/:tagId', (req, res) => {
  tagsDb.removeTagFromNote(req.params.noteId, req.params.tagId);
  res.json({ success: true });
});

export default router;
