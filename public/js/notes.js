import { api } from './api.js';
import { relativeTime, truncate, stripMarkdown, escapeHtml } from './utils.js';
import { initEditor, loadNote, clearEditor, setSaveStatus, setLastModified } from './editor.js';
import { initNoteTags, loadNoteTags } from './tags.js';

let notes = [];
let currentNoteId = null;
let currentFolderId = null;

export async function initNotes() {
  initEditor(onNoteChange, onNavigateToPage);

  document.getElementById('new-note-btn').addEventListener('click', createNote);
  document.getElementById('pin-btn').addEventListener('click', togglePin);
  document.getElementById('delete-btn').addEventListener('click', deleteCurrentNote);

  // Panel toggles
  setupPanelToggles();

  await loadNotes();
}

function setupPanelToggles() {
  const app = document.getElementById('phase-app');

  // Restore saved widths
  const savedSidebar = localStorage.getItem('vault_sidebar_width');
  const savedNotelist = localStorage.getItem('vault_notelist_width');
  if (savedSidebar) document.documentElement.style.setProperty('--sidebar-width', savedSidebar);
  if (savedNotelist) document.documentElement.style.setProperty('--notelist-width', savedNotelist);

  // Restore collapsed states
  if (localStorage.getItem('vault_sidebar_collapsed') === 'true') {
    app.classList.add('sidebar-collapsed');
  }
  if (localStorage.getItem('vault_notelist_collapsed') === 'true') {
    app.classList.add('notelist-collapsed');
  }

  // Resize handle: sidebar
  setupResizeHandle('resize-sidebar', '--sidebar-width', 'sidebar-collapsed', 100, 400);
  // Resize handle: notelist
  setupResizeHandle('resize-notelist', '--notelist-width', 'notelist-collapsed', 100, 500);
}

function setupResizeHandle(handleId, cssVar, collapseClass, minWidth, maxWidth) {
  const handle = document.getElementById(handleId);
  const app = document.getElementById('phase-app');
  let startX, startWidth, dragging = false;

  // Double-click to collapse/expand
  handle.addEventListener('dblclick', (e) => {
    e.preventDefault();
    const isCollapsed = app.classList.contains(collapseClass);
    if (isCollapsed) {
      app.classList.remove(collapseClass);
      localStorage.setItem(`vault_${collapseClass}`, 'false');
    } else {
      app.classList.add(collapseClass);
      localStorage.setItem(`vault_${collapseClass}`, 'true');
    }
  });

  // Drag to resize
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue(cssVar)) || 250;
    handle.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    let newWidth = startWidth + delta;

    // If dragged below minimum, collapse
    if (newWidth < minWidth / 2) {
      app.classList.add(collapseClass);
      localStorage.setItem(`vault_${collapseClass}`, 'true');
      return;
    }

    // Un-collapse if dragging wider
    if (app.classList.contains(collapseClass)) {
      app.classList.remove(collapseClass);
      localStorage.setItem(`vault_${collapseClass}`, 'false');
    }

    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    document.documentElement.style.setProperty(cssVar, `${newWidth}px`);
    localStorage.setItem(`vault_${cssVar.replace('--', '')}`, `${newWidth}px`);
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}

export async function loadNotes(folderId = null) {
  currentFolderId = folderId;
  const url = folderId ? `/api/notes?folder_id=${folderId}` : '/api/notes';
  notes = await api.get(url);
  renderNoteList();

  if (notes.length > 0 && !currentNoteId) {
    selectNote(notes[0].id);
  } else if (notes.length === 0) {
    currentNoteId = null;
    clearEditor();
  } else if (currentNoteId) {
    const stillExists = notes.find(n => n.id === currentNoteId);
    if (!stillExists && notes.length > 0) {
      selectNote(notes[0].id);
    }
  }

  updateNoteCount();
}

function renderNoteList() {
  const list = document.getElementById('note-list');
  list.innerHTML = '';

  if (notes.length === 0) {
    list.innerHTML = `
      <div class="note-list-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No notes yet</p>
        <p style="font-size:10px;margin-top:4px;">Click + NEW to create one</p>
      </div>
    `;
    return;
  }

  for (const note of notes) {
    const card = document.createElement('div');
    card.className = `note-card${note.id === currentNoteId ? ' active' : ''}`;
    card.dataset.noteId = note.id;
    card.draggable = true;

    // Strip HTML tags for preview
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = note.content || '';
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    const preview = truncate(plainText, 100);

    const pinHtml = note.is_pinned ? '<span class="note-pin-icon">&#128204;</span>' : '';

    let tagsHtml = '';
    if (note.tags && note.tags.length > 0) {
      tagsHtml = note.tags.slice(0, 3).map(t =>
        `<span class="note-card-tag" style="background:${escapeHtml(t.color || '#00d4ff')}22;color:${escapeHtml(t.color || '#00d4ff')}">${escapeHtml(t.name)}</span>`
      ).join('');
    }

    card.innerHTML = `
      <div class="note-card-header">
        ${pinHtml}
        <span class="note-card-title">${escapeHtml(note.title || 'Untitled')}</span>
      </div>
      ${preview ? `<div class="note-card-preview">${escapeHtml(preview)}</div>` : ''}
      <div class="note-card-meta">
        <div class="note-card-tags">${tagsHtml}</div>
        <span class="note-card-date">${relativeTime(note.updated_at)}</span>
      </div>
    `;

    card.addEventListener('click', () => selectNote(note.id));
    list.appendChild(card);
  }
}

export async function selectNote(id) {
  currentNoteId = id;

  document.querySelectorAll('.note-card').forEach(card => {
    card.classList.toggle('active', card.dataset.noteId === id);
  });

  const note = await api.get(`/api/notes/${id}`);
  loadNote(note);
  loadNoteTags(note);
  setLastModified(note.updated_at);
}

// Navigate to a sub-page
async function onNavigateToPage(pageId) {
  await selectNote(pageId);
}

async function onNoteChange({ id, title, content }) {
  setSaveStatus('saving');
  try {
    const updated = await api.put(`/api/notes/${id}`, { title, content });
    setSaveStatus('saved');
    setLastModified(updated.updated_at);

    const noteIndex = notes.findIndex(n => n.id === id);
    if (noteIndex >= 0) {
      notes[noteIndex] = { ...notes[noteIndex], title, content, updated_at: updated.updated_at };
      renderNoteList();
    }

    localStorage.removeItem('vault_unsaved');
  } catch (e) {
    setSaveStatus('error');
  }
}

async function createNote() {
  const note = await api.post('/api/notes', {
    title: 'Untitled',
    content: '<p><br></p>',
    folderId: currentFolderId
  });

  notes.unshift(note);
  renderNoteList();
  selectNote(note.id);
  updateNoteCount();

  setTimeout(() => {
    const titleInput = document.getElementById('note-title-input');
    titleInput.focus();
    titleInput.select();
  }, 100);
}

async function togglePin() {
  if (!currentNoteId) return;
  const updated = await api.patch(`/api/notes/${currentNoteId}/pin`);

  const idx = notes.findIndex(n => n.id === currentNoteId);
  if (idx >= 0) {
    notes[idx].is_pinned = updated.is_pinned;
  }

  const pinBtn = document.getElementById('pin-btn');
  pinBtn.classList.toggle('pinned', !!updated.is_pinned);

  notes.sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned;
    return 0;
  });
  renderNoteList();
}

async function deleteCurrentNote() {
  if (!currentNoteId) return;

  const confirmed = await showConfirm(
    'DELETE NOTE',
    'This action cannot be undone. Proceed?'
  );
  if (!confirmed) return;

  await api.delete(`/api/notes/${currentNoteId}`);
  notes = notes.filter(n => n.id !== currentNoteId);
  currentNoteId = null;

  renderNoteList();
  updateNoteCount();

  if (notes.length > 0) {
    selectNote(notes[0].id);
  } else {
    clearEditor();
  }
}

function updateNoteCount() {
  document.getElementById('note-count').textContent = `${notes.length} note${notes.length !== 1 ? 's' : ''}`;
}

function showConfirm(title, message) {
  return new Promise(resolve => {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-title').dataset.text = title;
    document.getElementById('confirm-message').textContent = message;
    modal.classList.remove('hidden');

    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    function cleanup() {
      modal.classList.add('hidden');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
    }

    function onOk() { cleanup(); resolve(true); }
    function onCancel() { cleanup(); resolve(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) { cleanup(); resolve(false); }
    }, { once: true });
  });
}

export function getCurrentFolderId() { return currentFolderId; }
export function getCurrentNoteId() { return currentNoteId; }
export function getNotes() { return notes; }
export function setCurrentFolder(id, name) {
  currentFolderId = id;
  document.getElementById('current-folder-name').textContent = name || 'All Notes';
  currentNoteId = null;
  loadNotes(id);
}
