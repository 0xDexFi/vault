import { api } from './api.js';
import { debounce, truncate, stripMarkdown, escapeHtml, relativeTime } from './utils.js';
import { selectNote, loadNotes, getCurrentFolderId } from './notes.js';

let isSearching = false;

export function initSearch() {
  const input = document.getElementById('search-input');

  const debouncedSearch = debounce(async () => {
    const query = input.value.trim();
    if (!query) {
      clearSearch();
      return;
    }
    await performSearch(query);
  }, 300);

  input.addEventListener('input', debouncedSearch);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      clearSearch();
      input.blur();
    }
  });
}

async function performSearch(query) {
  isSearching = true;
  const results = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
  renderSearchResults(results, query);

  document.getElementById('current-folder-name').textContent = `Search: "${query}"`;
  document.getElementById('note-count').textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
}

function renderSearchResults(results, query) {
  const list = document.getElementById('note-list');
  list.innerHTML = '';

  if (results.length === 0) {
    list.innerHTML = `
      <div class="note-list-empty">
        <p>No results for "${escapeHtml(query)}"</p>
      </div>
    `;
    return;
  }

  for (const note of results) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.noteId = note.id;

    const preview = truncate(stripMarkdown(note.content), 100);
    const highlightedTitle = highlightMatch(note.title || 'Untitled', query);
    const highlightedPreview = highlightMatch(preview, query);

    card.innerHTML = `
      <div class="note-card-header">
        <span class="note-card-title">${highlightedTitle}</span>
      </div>
      ${preview ? `<div class="note-card-preview">${highlightedPreview}</div>` : ''}
      <div class="note-card-meta">
        <span class="note-card-date">${relativeTime(note.updated_at)}</span>
      </div>
    `;

    card.addEventListener('click', () => selectNote(note.id));
    list.appendChild(card);
  }
}

function highlightMatch(text, query) {
  if (!text || !query) return escapeHtml(text || '');
  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return escaped.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearSearch() {
  if (!isSearching) return;
  isSearching = false;
  loadNotes(getCurrentFolderId());
}
