import { api } from './api.js';
import { setCurrentFolder } from './notes.js';
import { escapeHtml } from './utils.js';

let folders = [];
let activeFolderId = null;

export async function initFolders() {
  document.getElementById('new-folder-btn').addEventListener('click', createFolder);
  document.getElementById('all-notes-btn').addEventListener('click', () => {
    activeFolderId = null;
    setCurrentFolder(null, 'All Notes');
    updateActiveStates();
  });

  // Close context menu on click elsewhere
  document.addEventListener('click', () => {
    document.getElementById('context-menu').classList.add('hidden');
  });

  await loadFolders();
}

async function loadFolders() {
  folders = await api.get('/api/folders');
  renderFolderTree();
}

function renderFolderTree() {
  const tree = document.getElementById('folder-tree');
  tree.innerHTML = '';

  if (folders.length === 0) {
    tree.innerHTML = '<div style="padding:4px 12px;font-size:10px;color:var(--text-muted);">No folders</div>';
    return;
  }

  for (const folder of folders) {
    const item = document.createElement('div');
    item.className = `folder-item${folder.id === activeFolderId ? ' active' : ''}`;
    item.dataset.folderId = folder.id;

    item.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="folder-name">${escapeHtml(folder.name)}</span>
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      activeFolderId = folder.id;
      setCurrentFolder(folder.id, folder.name);
      updateActiveStates();
    });

    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e, folder);
    });

    item.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      startRename(item, folder);
    });

    // Drop target for notes
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const noteId = e.dataTransfer.getData('text/note-id');
      if (noteId) {
        await api.put(`/api/notes/${noteId}`, { folderId: folder.id });
        // Trigger reload if viewing a different folder
        setCurrentFolder(activeFolderId, activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 'All Notes');
      }
    });

    tree.appendChild(item);
  }
}

function updateActiveStates() {
  // Update all notes button
  const allNotesBtn = document.getElementById('all-notes-btn');
  allNotesBtn.classList.toggle('active', activeFolderId === null);

  // Update folder items
  document.querySelectorAll('.folder-item').forEach(item => {
    item.classList.toggle('active', item.dataset.folderId === activeFolderId);
  });
}

async function createFolder() {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;

  const folder = await api.post('/api/folders', { name: name.trim() });
  folders.push(folder);
  renderFolderTree();
}

function showContextMenu(e, folder) {
  const menu = document.getElementById('context-menu');
  menu.style.top = `${e.clientY}px`;
  menu.style.left = `${e.clientX}px`;
  menu.classList.remove('hidden');

  // Rebind actions
  const items = menu.querySelectorAll('.context-item');
  items.forEach(item => {
    const clone = item.cloneNode(true);
    item.parentNode.replaceChild(clone, item);

    clone.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      menu.classList.add('hidden');

      switch (clone.dataset.action) {
        case 'rename':
          const folderEl = document.querySelector(`[data-folder-id="${folder.id}"]`);
          if (folderEl) startRename(folderEl, folder);
          break;
        case 'delete':
          if (confirm(`Delete folder "${folder.name}"? Notes inside will be unassigned.`)) {
            await api.delete(`/api/folders/${folder.id}`);
            folders = folders.filter(f => f.id !== folder.id);
            if (activeFolderId === folder.id) {
              activeFolderId = null;
              setCurrentFolder(null, 'All Notes');
            }
            renderFolderTree();
            updateActiveStates();
          }
          break;
      }
    });
  });
}

function startRename(element, folder) {
  const nameSpan = element.querySelector('.folder-name');
  const oldName = folder.name;

  const input = document.createElement('input');
  input.className = 'folder-rename-input';
  input.value = oldName;

  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  async function finishRename() {
    const newName = input.value.trim();
    if (newName && newName !== oldName) {
      await api.put(`/api/folders/${folder.id}`, { name: newName });
      folder.name = newName;
    }
    await loadFolders();
  }

  input.addEventListener('blur', finishRename, { once: true });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
    if (e.key === 'Escape') {
      input.value = oldName;
      input.blur();
    }
  });
}

export function getFolders() { return folders; }
export function getActiveFolderId() { return activeFolderId; }
