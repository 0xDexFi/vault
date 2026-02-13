import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchNotes } from '../db/notes.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const q = req.query.q;
  if (!q || q.trim().length === 0) {
    return res.json([]);
  }
  const results = searchNotes(q.trim());
  res.json(results);
});

export default router;
