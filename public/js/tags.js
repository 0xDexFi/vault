import { api } from './api.js';
import { escapeHtml, randomTagColor } from './utils.js';
import { loadNotes, getCurrentFolderId } from './notes.js';

let allTags = [];
let currentNoteForTags = null;
let activeTagFilter = null;

export async function initTags() {
  await loadAllTags();

  document.getElementById('add-tag-btn').addEventListener('click', toggleTagDropdown);
  document.getElementById('tag-search-input').addEventListener('input', filterTagDropdown);
  document.getElementById('tag-search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createAndAssignTag();
    }
    if (e.key === 'Escape') {
      closeTagDropdown();
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#tag-bar')) {
      closeTagDropdown();
    }
  });
}

export function initNoteTags() {
  // Called from notes.js after editor init
}

async function loadAllTags() {
  allTags = await api.get('/api/tags');
  renderTagCloud();
}

function renderTagCloud() {
  const cloud = document.getElementById('tag-cloud');
  cloud.innerHTML = '';

  if (allTags.length === 0) {
    cloud.innerHTML = '<div style="padding:4px 0;font-size:10px;color:var(--text-muted);">No tags</div>';
    return;
  }

  for (const tag of allTags) {
    const pill = document.createElement('span');
    pill.className = `tag-pill${tag.id === activeTagFilter ? ' active' : ''}`;
    pill.style.background = `${tag.color || '#00d4ff'}22`;
    pill.style.color = tag.color || '#00d4ff';
    pill.style.borderColor = tag.id === activeTagFilter ? tag.color : 'transparent';
    pill.textContent = tag.name;
    pill.title = `${tag.note_count || 0} notes`;

    pill.addEventListener('click', () => {
      if (activeTagFilter === tag.id) {
        activeTagFilter = null;
        loadNotes(getCurrentFolderId());
      } else {
        activeTagFilter = tag.id;
        // Filter notes by tag (client-side for simplicity)
        loadNotes(getCurrentFolderId());
      }
      renderTagCloud();
    });

    cloud.appendChild(pill);
  }
}

export function loadNoteTags(note) {
  currentNoteForTags = note;
  const container = document.getElementById('note-tags');
  container.innerHTML = '';

  if (!note.tags || note.tags.length === 0) return;

  for (const tag of note.tags) {
    const el = document.createElement('span');
    el.className = 'note-tag';
    el.style.background = `${tag.color || '#00d4ff'}22`;
    el.style.color = tag.color || '#00d4ff';
    el.innerHTML = `${escapeHtml(tag.name)}<span class="note-tag-remove" data-tag-id="${tag.id}">&times;</span>`;

    el.querySelector('.note-tag-remove').addEventListener('click', async () => {
      await api.delete(`/api/tags/note/${note.id}/${tag.id}`);
      note.tags = note.tags.filter(t => t.id !== tag.id);
      loadNoteTags(note);
      await loadAllTags();
    });

    container.appendChild(el);
  }
}

function toggleTagDropdown() {
  const dropdown = document.getElementById('tag-dropdown');
  const isOpen = !dropdown.classList.contains('hidden');

  if (isOpen) {
    closeTagDropdown();
  } else {
    dropdown.classList.remove('hidden');
    document.getElementById('tag-search-input').value = '';
    document.getElementById('tag-search-input').focus();
    renderTagDropdownList('');
  }
}

function closeTagDropdown() {
  document.getElementById('tag-dropdown').classList.add('hidden');
}

function filterTagDropdown() {
  const query = document.getElementById('tag-search-input').value.trim().toLowerCase();
  renderTagDropdownList(query);
}

function renderTagDropdownList(query) {
  const list = document.getElementById('tag-dropdown-list');
  list.innerHTML = '';

  const noteTags = currentNoteForTags?.tags || [];
  const noteTagIds = new Set(noteTags.map(t => t.id));

  // Filter tags not already on the note
  let available = allTags.filter(t => !noteTagIds.has(t.id));
  if (query) {
    available = available.filter(t => t.name.toLowerCase().includes(query));
  }

  for (const tag of available) {
    const item = document.createElement('div');
    item.className = 'tag-dropdown-item';
    item.innerHTML = `<span class="tag-color-dot" style="background:${tag.color || '#00d4ff'}"></span>${escapeHtml(tag.name)}`;
    item.addEventListener('click', () => assignTag(tag));
    list.appendChild(item);
  }

  // Show "create new" option
  if (query && !allTags.some(t => t.name.toLowerCase() === query)) {
    const createItem = document.createElement('div');
    createItem.className = 'tag-dropdown-item tag-dropdown-create';
    createItem.textContent = `+ Create "${query}"`;
    createItem.addEventListener('click', () => createAndAssignTag(query));
    list.appendChild(createItem);
  }

  if (available.length === 0 && !query) {
    list.innerHTML = '<div style="padding:8px;font-size:10px;color:var(--text-muted);">No tags available</div>';
  }
}

async function assignTag(tag) {
  if (!currentNoteForTags) return;
  await api.post(`/api/tags/note/${currentNoteForTags.id}/${tag.id}`);

  if (!currentNoteForTags.tags) currentNoteForTags.tags = [];
  currentNoteForTags.tags.push(tag);
  loadNoteTags(currentNoteForTags);
  closeTagDropdown();
  await loadAllTags();
}

async function createAndAssignTag(name) {
  if (!name) {
    name = document.getElementById('tag-search-input').value.trim();
  }
  if (!name || !currentNoteForTags) return;

  const color = randomTagColor();
  const tag = await api.post('/api/tags', { name, color });
  await api.post(`/api/tags/note/${currentNoteForTags.id}/${tag.id}`);

  if (!currentNoteForTags.tags) currentNoteForTags.tags = [];
  currentNoteForTags.tags.push(tag);
  loadNoteTags(currentNoteForTags);
  closeTagDropdown();
  await loadAllTags();
}
