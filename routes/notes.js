import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as notesDb from '../db/notes.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const folderId = req.query.folder_id || null;
  const notes = notesDb.getAllNotes(folderId);
  res.json(notes);
});

router.post('/', (req, res) => {
  const { title, content, folderId, parentId } = req.body;
  const note = notesDb.createNote({ title, content, folderId, parentId });
  res.status(201).json(note);
});

router.put('/reorder', (req, res) => {
  const { noteIds } = req.body;
  if (!Array.isArray(noteIds)) return res.status(400).json({ error: 'noteIds must be an array' });
  notesDb.reorderNotes(noteIds);
  res.json({ success: true });
});

// Specific sub-routes BEFORE the /:id catch-all
router.get('/:id/breadcrumbs', (req, res) => {
  const crumbs = notesDb.getBreadcrumbs(req.params.id);
  res.json(crumbs);
});

router.patch('/:id/pin', (req, res) => {
  const note = notesDb.togglePin(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

// Generic /:id routes last
router.get('/:id', (req, res) => {
  const note = notesDb.getNoteById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

router.put('/:id', (req, res) => {
  const fields = {};
  if (req.body.title !== undefined) fields.title = req.body.title;
  if (req.body.content !== undefined) fields.content = req.body.content;
  if (req.body.folderId !== undefined) fields.folder_id = req.body.folderId;
  if (req.body.isPinned !== undefined) fields.is_pinned = req.body.isPinned ? 1 : 0;
  if (req.body.sortOrder !== undefined) fields.sort_order = req.body.sortOrder;

  const note = notesDb.updateNote(req.params.id, fields);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

router.delete('/:id', (req, res) => {
  notesDb.deleteNote(req.params.id);
  res.json({ success: true });
});

export default router;
