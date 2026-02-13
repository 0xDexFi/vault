import { api } from './api.js';
import { getNotes } from './notes.js';

let draggedNoteId = null;

export function initDragDrop() {
  const noteList = document.getElementById('note-list');

  noteList.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.note-card');
    if (!card) return;

    draggedNoteId = card.dataset.noteId;
    card.classList.add('dragging');
    e.dataTransfer.setData('text/note-id', draggedNoteId);
    e.dataTransfer.effectAllowed = 'move';
  });

  noteList.addEventListener('dragend', (e) => {
    const card = e.target.closest('.note-card');
    if (card) card.classList.remove('dragging');
    draggedNoteId = null;

    // Remove any insertion lines
    noteList.querySelectorAll('.drag-insert-line').forEach(l => l.remove());
  });

  noteList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Find the card we're hovering over
    const card = e.target.closest('.note-card');
    if (!card || card.dataset.noteId === draggedNoteId) return;

    // Remove previous insert lines
    noteList.querySelectorAll('.drag-insert-line').forEach(l => l.remove());

    // Determine if we're in the top or bottom half
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const line = document.createElement('div');
    line.className = 'drag-insert-line';

    if (e.clientY < midY) {
      card.before(line);
    } else {
      card.after(line);
    }
  });

  noteList.addEventListener('drop', async (e) => {
    e.preventDefault();
    noteList.querySelectorAll('.drag-insert-line').forEach(l => l.remove());

    if (!draggedNoteId) return;

    // Collect the new order from DOM
    const cards = noteList.querySelectorAll('.note-card');
    const noteIds = Array.from(cards).map(c => c.dataset.noteId);

    try {
      await api.put('/api/notes/reorder', { noteIds });
    } catch (err) {
      // Silently fail — UI already reflects the order
    }
  });
}
