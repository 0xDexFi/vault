import DOMPurify from './lib/dompurify.esm.js';
import { debounce, wordCount } from './utils.js';
import { api } from './api.js';

let currentNote = null;
let onChangeCallback = null;
let onNavigateCallback = null;
let slashRange = null;
let slashActiveIndex = 0;
let savedSelection = null;

const COLORS = [
  { label: 'Default', value: null },
  { label: 'Red', value: '#ff3333' },
  { label: 'Orange', value: '#ff9933' },
  { label: 'Yellow', value: '#ffcc00' },
  { label: 'Green', value: '#00d4ff' },
  { label: 'Cyan', value: '#00e5ff' },
  { label: 'Blue', value: '#6699ff' },
  { label: 'Purple', value: '#bd00ff' },
  { label: 'Pink', value: '#ff66cc' },
  { label: 'Gray', value: '#8b949e' },
];

const BG_COLORS = [
  { label: 'Default', value: null },
  { label: 'Red', value: 'rgba(255,51,51,0.15)' },
  { label: 'Orange', value: 'rgba(255,153,51,0.15)' },
  { label: 'Yellow', value: 'rgba(255,204,0,0.15)' },
  { label: 'Green', value: 'rgba(0,212,255,0.12)' },
  { label: 'Cyan', value: 'rgba(0,229,255,0.12)' },
  { label: 'Blue', value: 'rgba(102,153,255,0.15)' },
  { label: 'Purple', value: 'rgba(189,0,255,0.15)' },
  { label: 'Pink', value: 'rgba(255,102,204,0.15)' },
  { label: 'Gray', value: 'rgba(139,148,158,0.15)' },
];

export function initEditor(onChange, onNavigate) {
  onChangeCallback = onChange;
  onNavigateCallback = onNavigate;

  const editor = getEditor();
  const titleInput = document.getElementById('note-title-input');

  const debouncedSave = debounce(() => triggerSave(), 800);

  // Content change detection
  const observer = new MutationObserver(() => {
    updateWordCount();
    debouncedSave();
  });

  observer.observe(editor, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });

  editor.addEventListener('input', () => {
    updateWordCount();
    debouncedSave();
  });

  titleInput.addEventListener('input', debouncedSave);

  // Slash command detection
  editor.addEventListener('keydown', handleEditorKeydown);
  editor.addEventListener('input', handleSlashInput);

  // Floating toolbar on selection
  document.addEventListener('mouseup', () => setTimeout(handleSelectionChange, 10));
  document.addEventListener('keyup', handleSelectionChange);

  // Keyboard shortcuts
  editor.addEventListener('keydown', handleShortcuts);

  // Ensure there's always at least one paragraph
  editor.addEventListener('focus', ensureContent);

  // Setup floating toolbar buttons
  setupFloatingToolbar();
  setupTypePicker();
  setupSlashMenu();
  setupColorPicker();
  setupPageBlockClicks();

  // Close menus on outside click
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#floating-toolbar') && !e.target.closest('#type-picker') && !e.target.closest('#color-picker')) {
      hideFloatingToolbar();
    }
    if (!e.target.closest('#slash-menu')) {
      hideSlashMenu();
    }
  });
}

function getEditor() {
  return document.getElementById('note-editor');
}

function triggerSave() {
  if (!currentNote || !onChangeCallback) return;
  const editor = getEditor();
  const titleInput = document.getElementById('note-title-input');
  onChangeCallback({
    id: currentNote.id,
    title: titleInput.value,
    content: editor.innerHTML
  });
}

/* ═══════════════════════════════════════════
   NOTE LOADING
   ═══════════════════════════════════════════ */

export function loadNote(note) {
  currentNote = note;
  const editor = getEditor();
  const titleInput = document.getElementById('note-title-input');

  document.getElementById('editor-empty').classList.add('hidden');
  document.getElementById('editor-active').classList.remove('hidden');

  titleInput.value = note.title || '';
  editor.innerHTML = note.content || '<p><br></p>';

  // Pin button
  const pinBtn = document.getElementById('pin-btn');
  pinBtn.classList.toggle('pinned', !!note.is_pinned);

  updateWordCount();
  rebindPageBlocks();
  rebindTodoBlocks();

  // Breadcrumbs
  if (note.parent_id) {
    loadBreadcrumbs(note.id);
  } else {
    document.getElementById('breadcrumbs').classList.add('hidden');
  }
}

export function clearEditor() {
  currentNote = null;
  document.getElementById('editor-empty').classList.remove('hidden');
  document.getElementById('editor-active').classList.add('hidden');
}

export function getCurrentNote() {
  return currentNote;
}

async function loadBreadcrumbs(noteId) {
  const crumbs = await api.get(`/api/notes/${noteId}/breadcrumbs`);
  const container = document.getElementById('breadcrumb-list');
  container.innerHTML = '';

  crumbs.forEach((crumb, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = ' › ';
      container.appendChild(sep);
    }

    const item = document.createElement('span');
    item.className = 'breadcrumb-item';
    item.textContent = crumb.title || 'Untitled';

    if (i === crumbs.length - 1) {
      item.classList.add('current');
    } else {
      item.addEventListener('click', () => {
        if (onNavigateCallback) onNavigateCallback(crumb.id);
      });
    }
    container.appendChild(item);
  });

  document.getElementById('breadcrumbs').classList.remove('hidden');
}

/* ═══════════════════════════════════════════
   ENSURE CONTENT
   ═══════════════════════════════════════════ */

function ensureContent() {
  const editor = getEditor();
  if (!editor.innerHTML || editor.innerHTML === '<br>' || editor.innerHTML.trim() === '') {
    editor.innerHTML = '<p><br></p>';
    // Place cursor in the paragraph
    const p = editor.querySelector('p');
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/* ═══════════════════════════════════════════
   KEYBOARD SHORTCUTS
   ═══════════════════════════════════════════ */

function handleShortcuts(e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        document.execCommand('bold');
        break;
      case 'i':
        e.preventDefault();
        document.execCommand('italic');
        break;
      case 'u':
        e.preventDefault();
        document.execCommand('underline');
        break;
      case 's':
        e.preventDefault();
        triggerSave();
        break;
      case 'e':
        e.preventDefault();
        toggleInlineCode();
        break;
    }
  }

  // Tab handling
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertText', false, '  ');
  }
}

function handleEditorKeydown(e) {
  const slashMenu = document.getElementById('slash-menu');

  // If slash menu is open, handle navigation
  if (!slashMenu.classList.contains('hidden')) {
    const items = slashMenu.querySelectorAll('.slash-item:not(.hidden)');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      slashActiveIndex = Math.min(slashActiveIndex + 1, items.length - 1);
      updateSlashActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      slashActiveIndex = Math.max(slashActiveIndex - 1, 0);
      updateSlashActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[slashActiveIndex]) {
        items[slashActiveIndex].click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hideSlashMenu();
    }
    return;
  }

  // Enter key: handle special blocks
  if (e.key === 'Enter' && !e.shiftKey) {
    const block = getCurrentBlock();
    if (block) {
      const tagName = block.tagName.toLowerCase();
      // After headings, insert paragraph
      if (['h1', 'h2', 'h3'].includes(tagName)) {
        e.preventDefault();
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        block.after(p);
        placeCursor(p);
      }
      // After HR, insert paragraph
      if (tagName === 'hr') {
        e.preventDefault();
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        block.after(p);
        placeCursor(p);
      }
    }
  }
}

/* ═══════════════════════════════════════════
   SLASH COMMANDS
   ═══════════════════════════════════════════ */

function handleSlashInput() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const block = getCurrentBlock();
  if (!block) return;

  const text = block.textContent;

  // Check if text starts with "/"
  if (text.startsWith('/')) {
    const query = text.substring(1).toLowerCase();
    showSlashMenu(query);
    slashRange = { block };
  } else {
    hideSlashMenu();
  }
}

function showSlashMenu(query) {
  const menu = document.getElementById('slash-menu');
  const items = menu.querySelectorAll('.slash-item');
  let visibleCount = 0;

  items.forEach(item => {
    const label = item.querySelector('.slash-label').textContent.toLowerCase();
    const match = !query || label.includes(query);
    item.classList.toggle('hidden', !match);
    if (match) visibleCount++;
  });

  if (visibleCount === 0) {
    hideSlashMenu();
    return;
  }

  // Position below cursor
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();

  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.left = `${Math.max(rect.left - 20, 16)}px`;
  menu.classList.remove('hidden');

  slashActiveIndex = 0;
  updateSlashActive(menu.querySelectorAll('.slash-item:not(.hidden)'));
}

function hideSlashMenu() {
  document.getElementById('slash-menu').classList.add('hidden');
  slashRange = null;
}

function updateSlashActive(items) {
  items.forEach((item, i) => {
    item.classList.toggle('active', i === slashActiveIndex);
  });
  // Scroll active into view
  if (items[slashActiveIndex]) {
    items[slashActiveIndex].scrollIntoView({ block: 'nearest' });
  }
}

function setupSlashMenu() {
  document.querySelectorAll('.slash-item').forEach(item => {
    item.addEventListener('click', () => {
      const type = item.dataset.type;
      insertBlock(type);
      hideSlashMenu();
    });
  });
}

async function insertBlock(type) {
  const editor = getEditor();
  const block = slashRange?.block || getCurrentBlock();
  if (!block) return;

  // Remove the slash text
  block.textContent = '';

  switch (type) {
    case 'p':
      convertBlock(block, 'p');
      break;
    case 'h1':
      convertBlock(block, 'h1');
      break;
    case 'h2':
      convertBlock(block, 'h2');
      break;
    case 'h3':
      convertBlock(block, 'h3');
      break;
    case 'ul': {
      const ul = document.createElement('ul');
      const li = document.createElement('li');
      li.innerHTML = '<br>';
      ul.appendChild(li);
      block.replaceWith(ul);
      placeCursor(li);
      break;
    }
    case 'ol': {
      const ol = document.createElement('ol');
      const li = document.createElement('li');
      li.innerHTML = '<br>';
      ol.appendChild(li);
      block.replaceWith(ol);
      placeCursor(li);
      break;
    }
    case 'todo': {
      const div = document.createElement('div');
      div.className = 'todo-block';
      div.contentEditable = 'false';
      div.innerHTML = '<input type="checkbox"><span class="todo-text" contenteditable="true"><br></span>';
      block.replaceWith(div);
      bindTodoBlock(div);
      placeCursor(div.querySelector('.todo-text'));
      break;
    }
    case 'toggle': {
      const details = document.createElement('details');
      details.className = 'toggle-block';
      details.open = true;
      details.innerHTML = '<summary>Toggle heading</summary><div class="toggle-content" contenteditable="true"><br></div>';
      block.replaceWith(details);
      placeCursor(details.querySelector('summary'));
      break;
    }
    case 'code': {
      const pre = document.createElement('pre');
      pre.innerHTML = '<br>';
      block.replaceWith(pre);
      placeCursor(pre);
      break;
    }
    case 'quote': {
      const bq = document.createElement('blockquote');
      bq.innerHTML = '<br>';
      block.replaceWith(bq);
      placeCursor(bq);
      break;
    }
    case 'callout': {
      const div = document.createElement('div');
      div.className = 'callout-block';
      div.contentEditable = 'false';
      div.innerHTML = '<span class="callout-icon">💡</span><span class="callout-text" contenteditable="true"><br></span>';
      block.replaceWith(div);
      placeCursor(div.querySelector('.callout-text'));
      break;
    }
    case 'hr': {
      const hr = document.createElement('hr');
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      block.replaceWith(hr);
      hr.after(p);
      placeCursor(p);
      break;
    }
    case 'page': {
      await insertPageBlock(block);
      break;
    }
  }
}

/* ═══════════════════════════════════════════
   PAGE BLOCKS (SUB-PAGES)
   ═══════════════════════════════════════════ */

async function insertPageBlock(replaceBlock) {
  if (!currentNote) return;

  // Create a child note
  const childNote = await api.post('/api/notes', {
    title: 'Untitled page',
    content: '<p><br></p>',
    parentId: currentNote.id
  });

  const pageDiv = createPageBlockElement(childNote.id, childNote.title);

  const p = document.createElement('p');
  p.innerHTML = '<br>';

  replaceBlock.replaceWith(pageDiv);
  pageDiv.after(p);
  placeCursor(p);

  triggerSave();
}

function createPageBlockElement(pageId, title) {
  const div = document.createElement('div');
  div.className = 'page-block';
  div.contentEditable = 'false';
  div.dataset.pageId = pageId;
  div.innerHTML = `<span class="page-block-icon">📄</span><span class="page-block-title">${title || 'Untitled page'}</span>`;
  div.addEventListener('click', () => {
    if (onNavigateCallback) onNavigateCallback(pageId);
  });
  return div;
}

function rebindPageBlocks() {
  const editor = getEditor();
  editor.querySelectorAll('.page-block').forEach(block => {
    block.contentEditable = 'false';
    const pageId = block.dataset.pageId;
    // Remove old listeners by cloning
    const newBlock = block.cloneNode(true);
    block.replaceWith(newBlock);
    newBlock.addEventListener('click', () => {
      if (onNavigateCallback) onNavigateCallback(pageId);
    });
  });
}

function setupPageBlockClicks() {
  getEditor().addEventListener('click', (e) => {
    const pageBlock = e.target.closest('.page-block');
    if (pageBlock) {
      const pageId = pageBlock.dataset.pageId;
      if (pageId && onNavigateCallback) {
        onNavigateCallback(pageId);
      }
    }
  });
}

/* ═══════════════════════════════════════════
   TODO BLOCKS
   ═══════════════════════════════════════════ */

function bindTodoBlock(block) {
  const checkbox = block.querySelector('input[type="checkbox"]');
  if (!checkbox) return;
  checkbox.addEventListener('change', () => {
    block.classList.toggle('checked', checkbox.checked);
    triggerSave();
  });
}

function rebindTodoBlocks() {
  const editor = getEditor();
  editor.querySelectorAll('.todo-block').forEach(block => {
    block.contentEditable = 'false';
    const textSpan = block.querySelector('.todo-text');
    if (textSpan) textSpan.contentEditable = 'true';
    bindTodoBlock(block);
  });
}

/* ═══════════════════════════════════════════
   FLOATING TOOLBAR
   ═══════════════════════════════════════════ */

function handleSelectionChange() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    // Don't hide if interacting with toolbar
    if (!document.activeElement?.closest('#floating-toolbar')) {
      setTimeout(() => {
        const sel2 = window.getSelection();
        if (!sel2 || sel2.isCollapsed) hideFloatingToolbar();
      }, 100);
    }
    return;
  }

  // Check if selection is within editor
  const editor = getEditor();
  if (!editor.contains(sel.anchorNode)) {
    hideFloatingToolbar();
    return;
  }

  showFloatingToolbar();
}

function showFloatingToolbar() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const toolbar = document.getElementById('floating-toolbar');

  toolbar.classList.remove('hidden');

  const tbRect = toolbar.getBoundingClientRect();
  let left = rect.left + (rect.width / 2) - (tbRect.width / 2);
  left = Math.max(8, Math.min(left, window.innerWidth - tbRect.width - 8));

  toolbar.style.top = `${rect.top - tbRect.height - 8}px`;
  toolbar.style.left = `${left}px`;

  // Update active states
  updateToolbarStates();
}

function hideFloatingToolbar() {
  document.getElementById('floating-toolbar').classList.add('hidden');
  document.getElementById('type-picker').classList.add('hidden');
  document.getElementById('color-picker').classList.add('hidden');
}

function updateToolbarStates() {
  const commands = ['bold', 'italic', 'underline', 'strikeThrough'];
  commands.forEach(cmd => {
    const btn = document.querySelector(`[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
  });

  // Update type button text
  const block = getCurrentBlock();
  if (block) {
    const tag = block.tagName.toLowerCase();
    const typeMap = { p: 'Text', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', pre: 'Code', blockquote: 'Quote' };
    const typeBtn = document.getElementById('ft-type-btn');
    typeBtn.innerHTML = `${typeMap[tag] || 'Text'} <span class="ft-arrow">&#9662;</span>`;
  }
}

function setupFloatingToolbar() {
  // Format buttons
  document.querySelectorAll('#floating-toolbar .ft-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent losing selection
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;

      if (cmd === 'code') {
        toggleInlineCode();
      } else if (cmd === 'createLink') {
        const url = prompt('Enter URL:');
        if (url) document.execCommand('createLink', false, url);
      } else {
        document.execCommand(cmd);
      }
      updateToolbarStates();
    });
  });

  // Type button
  document.getElementById('ft-type-btn').addEventListener('mousedown', (e) => e.preventDefault());
  document.getElementById('ft-type-btn').addEventListener('click', (e) => {
    e.preventDefault();
    toggleTypePicker();
  });

  // Color buttons
  document.getElementById('ft-text-color').addEventListener('mousedown', (e) => e.preventDefault());
  document.getElementById('ft-text-color').addEventListener('click', (e) => {
    e.preventDefault();
    saveCurrentSelection();
    showColorPicker('text', e.currentTarget);
  });

  document.getElementById('ft-bg-color').addEventListener('mousedown', (e) => e.preventDefault());
  document.getElementById('ft-bg-color').addEventListener('click', (e) => {
    e.preventDefault();
    saveCurrentSelection();
    showColorPicker('bg', e.currentTarget);
  });
}

function toggleInlineCode() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const selected = range.toString();

  if (sel.anchorNode.parentElement.tagName === 'CODE') {
    // Unwrap code
    const code = sel.anchorNode.parentElement;
    const text = document.createTextNode(code.textContent);
    code.replaceWith(text);
  } else if (selected) {
    // Wrap in code
    const code = document.createElement('code');
    range.surroundContents(code);
  }
}

/* ═══════════════════════════════════════════
   TYPE PICKER
   ═══════════════════════════════════════════ */

function toggleTypePicker() {
  const picker = document.getElementById('type-picker');
  const btn = document.getElementById('ft-type-btn');
  const toolbar = document.getElementById('floating-toolbar');

  if (!picker.classList.contains('hidden')) {
    picker.classList.add('hidden');
    return;
  }

  const tbRect = toolbar.getBoundingClientRect();
  picker.style.top = `${tbRect.bottom + 4}px`;
  picker.style.left = `${tbRect.left}px`;
  picker.classList.remove('hidden');

  // Highlight current type
  const block = getCurrentBlock();
  const currentTag = block ? block.tagName.toLowerCase() : 'p';
  picker.querySelectorAll('.tp-item').forEach(item => {
    item.classList.toggle('active', item.dataset.type === currentTag);
  });
}

function setupTypePicker() {
  document.querySelectorAll('#type-picker .tp-item').forEach(item => {
    item.addEventListener('mousedown', (e) => e.preventDefault());
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const type = item.dataset.type;
      const block = getCurrentBlock();
      if (!block) return;

      if (['p', 'h1', 'h2', 'h3'].includes(type)) {
        convertBlock(block, type);
      } else if (type === 'code') {
        convertBlock(block, 'pre');
      } else if (type === 'quote') {
        convertBlock(block, 'blockquote');
      }
      // For complex types, use insertBlock
      if (['ul', 'ol', 'todo', 'toggle', 'callout', 'hr', 'page'].includes(type)) {
        slashRange = { block };
        insertBlock(type);
      }

      document.getElementById('type-picker').classList.add('hidden');
      hideFloatingToolbar();
    });
  });
}

/* ═══════════════════════════════════════════
   COLOR PICKER
   ═══════════════════════════════════════════ */

function saveCurrentSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    savedSelection = sel.getRangeAt(0).cloneRange();
  }
}

function restoreSelection() {
  if (savedSelection) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelection);
  }
}

function showColorPicker(mode, triggerBtn) {
  const picker = document.getElementById('color-picker');
  const label = document.getElementById('cp-label');
  const grid = document.getElementById('cp-grid');

  label.textContent = mode === 'text' ? 'TEXT COLOR' : 'BACKGROUND';
  grid.innerHTML = '';

  const colors = mode === 'text' ? COLORS : BG_COLORS;

  colors.forEach(c => {
    const swatch = document.createElement('div');
    swatch.className = 'cp-swatch';
    if (c.value === null) {
      swatch.classList.add('default');
    } else {
      swatch.style.background = c.value;
    }
    swatch.title = c.label;

    swatch.addEventListener('mousedown', (e) => e.preventDefault());
    swatch.addEventListener('click', (e) => {
      e.preventDefault();
      restoreSelection();

      if (mode === 'text') {
        if (c.value === null) {
          document.execCommand('removeFormat');
        } else {
          document.execCommand('foreColor', false, c.value);
        }
      } else {
        if (c.value === null) {
          document.execCommand('hiliteColor', false, 'transparent');
        } else {
          document.execCommand('hiliteColor', false, c.value);
        }
      }

      picker.classList.add('hidden');
    });

    grid.appendChild(swatch);
  });

  const rect = triggerBtn.getBoundingClientRect();
  picker.style.top = `${rect.bottom + 4}px`;
  picker.style.left = `${rect.left}px`;
  picker.classList.remove('hidden');
}

function setupColorPicker() {
  // Clicking outside closes it
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#color-picker') && !e.target.closest('.ft-color-trigger')) {
      document.getElementById('color-picker').classList.add('hidden');
    }
  });
}

/* ═══════════════════════════════════════════
   BLOCK UTILITIES
   ═══════════════════════════════════════════ */

function getCurrentBlock() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return null;

  let node = sel.anchorNode;
  const editor = getEditor();

  // Walk up to find direct child of editor
  while (node && node.parentElement !== editor) {
    node = node.parentElement;
  }

  return node && node.parentElement === editor ? node : null;
}

function convertBlock(block, newTag) {
  const editor = getEditor();
  if (!block || block.parentElement !== editor) return;

  if (block.tagName.toLowerCase() === newTag) return;

  const newEl = document.createElement(newTag);
  newEl.innerHTML = block.innerHTML || '<br>';
  block.replaceWith(newEl);
  placeCursor(newEl);
}

function placeCursor(element) {
  const sel = window.getSelection();
  const range = document.createRange();

  if (element.childNodes.length > 0) {
    const lastChild = element.childNodes[element.childNodes.length - 1];
    if (lastChild.nodeType === Node.TEXT_NODE) {
      range.setStart(lastChild, lastChild.length);
    } else {
      range.setStartAfter(lastChild);
    }
  } else {
    range.setStart(element, 0);
  }

  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  element.focus();
}

/* ═══════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════ */

function updateWordCount() {
  const editor = getEditor();
  const text = editor.innerText || '';
  const wc = document.getElementById('word-count');
  const count = wordCount(text);
  wc.textContent = `${count} word${count !== 1 ? 's' : ''}`;
}

export function setSaveStatus(status) {
  const el = document.getElementById('save-status');
  el.className = '';
  switch (status) {
    case 'saving':
      el.textContent = 'Saving...';
      el.classList.add('saving');
      break;
    case 'saved':
      el.textContent = 'Saved';
      el.classList.add('saved');
      el.classList.add('save-flash');
      setTimeout(() => el.classList.remove('save-flash'), 1000);
      break;
    case 'error':
      el.textContent = 'Save failed';
      el.classList.add('error');
      break;
    default:
      el.textContent = 'Ready';
  }
}

export function setLastModified(dateString) {
  const el = document.getElementById('last-modified');
  if (!dateString) { el.textContent = ''; return; }
  const date = new Date(dateString + 'Z');
  el.textContent = date.toLocaleString();
}
