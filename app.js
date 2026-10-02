/**
 * CyberVault Production v4.0 - Full Master Controller
 * PWA Service Worker, Vault CRUD, Local File Import/Export, WikiLinks Parser & Web Audio
 */

// -------------------------------------------------------------
// 1. PWA Service Worker Registration & Install Prompt
// -------------------------------------------------------------
let deferredPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('CyberVault PWA Service Worker Registered [Offline Ready]:', reg.scope))
      .catch(err => console.warn('PWA registration failed:', err));
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBtn = document.getElementById('btn-pwa-install');
  if (pwaBtn) {
    pwaBtn.style.display = 'block';
    pwaBtn.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === 'accepted') {
          pwaBtn.style.display = 'none';
        }
        deferredPrompt = null;
      });
    });
  }
});

// -------------------------------------------------------------
// 2. Web Audio Synthesizer
// -------------------------------------------------------------
class CyberAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  playNodeHum() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

window.soundFX = new CyberAudioSynthesizer();

// -------------------------------------------------------------
// 3. Vault Storage & Database
// -------------------------------------------------------------
const defaultVault = {
  'auth-p1': {
    id: 'auth-p1',
    title: '7. Industrial Revolution — Passphrases & Shared Secrets',
    arabicQuote: 'وهنا بدأ التفكير بشكل أكبر في <span class="tag-tech">Cryptography</span>.',
    breadcrumbs: '97-Backend / principles / Authentication / Authentication & Authorization p1',
    markdown: `# 7. Industrial Revolution — Passphrases & Shared Secrets

وهنا بدأ التفكير بشكل أكبر في **Cryptography**.

مع **Industrial Revolution** حصل تطور كبير في:
- Machines
- Communication
- Telegraph

و الـ **Telegraph** أصبح **Infrastructure** مهمة للتواصل وتبادل الإشارات المشفرة بين المراكز الحيوية.

راجع أيضاً: [[auth-jwt]] و [[shared-secrets]].

\`\`\`python
import math

def calculate_passphrase_entropy(length: int, alphabet_size: int = 94) -> float:
    """Calculates information-theoretic Shannon entropy bits for shared secrets."""
    return round(length * math.log2(alphabet_size), 2)

# Industrial Revolution telegraph transposition secret keys
key_entropy = calculate_passphrase_entropy(length=24, alphabet_size=26)
print(f"Telegraph Cipherspace Entropy: {key_entropy} bits")
\`\`\`
`,
    wikilinks: ['auth-jwt', 'shared-secrets', 'caching'],
    showMedia: true,
    showCode: true
  },
  'auth-jwt': {
    id: 'auth-jwt',
    title: '8. Modern Stateless Authentication — JWT Specification',
    arabicQuote: 'الانتقال من الجلسات التقليدية (Stateful Sessions) إلى التوكن الرقمي المشفر <span class="tag-tech">JWT Token</span>.',
    breadcrumbs: '97-Backend / principles / Authentication / Authentication JWT Specification',
    markdown: `# 8. Modern Stateless Authentication — JWT Specification

الانتقال من الجلسات التقليدية إلى **JWT Token**.

يتكون الـ **JWT Structure** من:
- **Header**: Algorithm (e.g. RS256) & Type.
- **Payload**: Claims, Expiration, Roles.
- **Signature**: HMACSHA256 signature verification.

مرتبط بـ: [[postgres]] و [[auth-p1]].
`,
    wikilinks: ['postgres', 'auth-p1'],
    showMedia: false,
    showCode: false
  },
  'caching': {
    id: 'caching',
    title: '4. High-Performance Caching — Redis In-Memory Layers',
    arabicQuote: 'تسريع زمن الاستجابة من 120ms إلى أقل من 2ms باستخدام <span class="tag-tech">Redis Cluster</span>.',
    breadcrumbs: '97-Backend / principles / caching mechanisms',
    markdown: `# 4. High-Performance Caching — Redis In-Memory Layers

تسريع زمن الاستجابة إلى أقل من 2ms.

استراتيجيات التخزين المؤقت:
- **Cache-Aside Pattern**: Lazy loading upon cache miss.
- **Write-Through**: Consistent synchronization.
- **TTL Expiration**: Eviction via LRU/LFU.
`,
    wikilinks: ['postgres', 'rest'],
    showMedia: false,
    showCode: false
  },
  'postgres': {
    id: 'postgres',
    title: '2. Relational ACID Integrity — PostgreSQL Deep Dive',
    arabicQuote: 'إدارة المعاملات المالية وقفل السجلات المتزامن عبر <span class="tag-tech">ACID Transactions</span>.',
    breadcrumbs: '97-Backend / principles / Database with postgres',
    markdown: `# 2. Relational ACID Integrity — PostgreSQL Deep Dive

إدارة المعاملات المالية عبر ACID Transactions.

- **Atomicity**: الكل أو لا شيء.
- **Consistency**: تطبيق القيود.
- **Isolation**: عزل العمليات المتزامنة MVCC.
- **Durability**: الحفظ عبر WAL Logs.
`,
    wikilinks: ['caching', 'auth-jwt'],
    showMedia: false,
    showCode: false
  },
  'shared-secrets': {
    id: 'shared-secrets',
    title: 'Shared Secrets & Asymmetric Encryption Keys',
    arabicQuote: 'بروتوكولات تبادل المفاتيح السرية عبر خوارزمية ديفي-هيلمان <span class="tag-tech">Diffie-Hellman Key Exchange</span>.',
    breadcrumbs: '97-Backend / principles / Authentication / Shared Secrets & Keys',
    markdown: `# Shared Secrets & Asymmetric Encryption Keys

بروتوكولات تبادل المفاتيح السرية عبر خوارزمية ديفي-هيلمان **Diffie-Hellman Key Exchange**.

- توليد المفاتيح العامة والخاصة (Public & Private Keys).
- التوقيع الإلكتروني ومنع التلاعب (Non-repudiation).
- مراجعة الارتباط: [[auth-p1]] و [[auth-jwt]].
`,
    wikilinks: ['auth-p1', 'auth-jwt'],
    showMedia: false,
    showCode: false
  }
};

let notesDatabase = { ...defaultVault };
let currentActiveNoteId = 'auth-p1';
let currentMode = 'read';

// -------------------------------------------------------------
// 4. Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Load persisted notes
  try {
    const saved = localStorage.getItem('cybervault_production_vault');
    if (saved) {
      const parsed = JSON.parse(saved);
      notesDatabase = Object.assign({}, defaultVault, parsed);
    }
  } catch (e) {
    console.warn("Storage read error:", e);
  }

  setupFileExplorer();
  setupEditorModeToggle();
  setupCommandPalette();
  setupCyberTerminal();
  setupSoundToggle();
  setupKeyboardShortcuts();
  setupVaultOperations();
  setupShortcutsModal();

  // Initial Sync with Graph
  setTimeout(() => {
    if (window.graphEngine) {
      window.graphEngine.syncWithVault(notesDatabase);
    }
  }, 300);

  // Open default note
  switchNote('auth-p1');

  // Reload window button
  const btnReload = document.getElementById('btn-win-reload');
  if (btnReload) {
    btnReload.addEventListener('click', () => window.location.reload());
  }

  updateVaultBadge();
});

function saveVaultToStorage() {
  try {
    localStorage.setItem('cybervault_production_vault', JSON.stringify(notesDatabase));
  } catch (e) {
    console.warn("Storage write error:", e);
  }
  updateVaultBadge();
}

function updateVaultBadge() {
  const badge = document.getElementById('vault-count-badge');
  if (badge) {
    badge.textContent = `${Object.keys(notesDatabase).length} Notes`;
  }
}

// -------------------------------------------------------------
// 5. File Explorer & Switching
// -------------------------------------------------------------
function setupFileExplorer() {
  bindFileClicks();

  const folderItems = document.querySelectorAll('.tree-item.folder');
  folderItems.forEach(folder => {
    folder.addEventListener('click', (e) => {
      e.stopPropagation();
      const arrow = folder.querySelector('.arrow');
      const children = folder.nextElementSibling;

      if (children && children.classList.contains('tree-children')) {
        const isClosed = folder.classList.contains('closed');
        if (isClosed) {
          folder.classList.remove('closed');
          folder.classList.add('open');
          if (arrow) arrow.textContent = '▼';
          children.style.display = 'block';
        } else {
          folder.classList.remove('open');
          folder.classList.add('closed');
          if (arrow) arrow.textContent = '▶';
          children.style.display = 'none';
        }
        if (window.soundFX) window.soundFX.playClick();
      }
    });
  });

  // Tree Quick Filter
  const treeSearch = document.getElementById('tree-search-input');
  if (treeSearch) {
    treeSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const fileItems = document.querySelectorAll('.tree-item.file');
      fileItems.forEach(file => {
        const name = file.querySelector('.name').textContent.toLowerCase();
        file.style.display = name.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Node inspector link jump
  const btnJump = document.getElementById('btn-open-linked-note');
  if (btnJump) {
    btnJump.addEventListener('click', () => {
      if (window.graphEngine && window.graphEngine.selectedNode && window.graphEngine.selectedNode.noteId) {
        switchNote(window.graphEngine.selectedNode.noteId);
      } else {
        switchNote('auth-p1');
      }
      if (window.soundFX) window.soundFX.playClick();
    });
  }
}

function bindFileClicks() {
  const fileItems = document.querySelectorAll('.tree-item.file');
  fileItems.forEach(item => {
    item.onclick = () => {
      fileItems.forEach(f => f.classList.remove('active-file'));
      item.classList.add('active-file');
      const fileId = item.dataset.file;
      switchNote(fileId);
      if (window.soundFX) window.soundFX.playClick();
    };
  });
}

function switchNote(noteId) {
  if (!notesDatabase[noteId]) {
    noteId = Object.keys(notesDatabase)[0] || 'auth-p1';
  }
  const note = notesDatabase[noteId];
  currentActiveNoteId = noteId;

  // Breadcrumbs
  const currentCrumb = document.getElementById('current-crumb');
  if (currentCrumb) {
    currentCrumb.textContent = note.title.split('—')[0] || note.title;
  }

  // Reading View
  const heading = document.getElementById('note-heading');
  const leadQuote = document.getElementById('lead-quote');
  const bodyText = document.getElementById('note-body-text');
  const mediaCard = document.getElementById('note-media-card');
  const codeCard = document.getElementById('note-code-card');

  if (heading) heading.innerHTML = note.title;
  if (leadQuote) leadQuote.innerHTML = note.arabicQuote || '';
  if (bodyText) bodyText.innerHTML = note.content || renderBasicMarkdown(note.markdown);
  if (mediaCard) mediaCard.style.display = note.showMedia ? 'block' : 'none';
  if (codeCard) codeCard.style.display = note.showCode ? 'block' : 'none';

  // Render WikiLinks
  renderWikiLinks(note);

  // Markdown Textarea
  const markdownInput = document.getElementById('markdown-input');
  if (markdownInput) {
    markdownInput.value = note.markdown || '';
  }

  // Tab Title
  const activeTabTitle = document.querySelector('.tab-item.active .tab-title');
  if (activeTabTitle) {
    activeTabTitle.textContent = note.title.slice(0, 18) + '...';
  }

  // Active in Explorer Tree
  const fileItems = document.querySelectorAll('.tree-item.file');
  fileItems.forEach(item => {
    item.classList.toggle('active-file', item.dataset.file === noteId);
  });
}

window.switchNote = switchNote;

function renderWikiLinks(note) {
  const container = document.getElementById('wikilinks-list');
  if (!container) return;
  container.innerHTML = '';

  const links = note.wikilinks || [];
  if (links.length === 0) {
    container.innerHTML = '<span style="color: #64748b; font-size: 11px;">No outbound references recorded yet. Type [[NoteName]] in Edit mode to link!</span>';
    return;
  }

  links.forEach(targetId => {
    const targetNote = notesDatabase[targetId];
    const label = targetNote ? targetNote.title.split('—')[0].trim() : targetId;
    const pill = document.createElement('span');
    pill.className = 'wikilink-pill';
    pill.textContent = `[[${label}]]`;
    pill.onclick = () => {
      switchNote(targetId);
      if (window.soundFX) window.soundFX.playClick();
    };
    container.appendChild(pill);
  });
}

function renderBasicMarkdown(md) {
  if (!md) return '';
  return md
    .replace(/^# (.*$)/gim, '<h2 class="note-heading">$1</h2>')
    .replace(/^## (.*$)/gim, '<h3 style="color: var(--accent-coral); margin: 16px 0;">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/\[\[(.*?)\]\]/gim, '<span class="tag-tech" style="cursor:pointer;" onclick="window.switchNote(\'$1\')">[[$1]]</span>')
    .replace(/\n$/gim, '<br />');
}

// -------------------------------------------------------------
// 6. Live Markdown Editor vs Reading View
// -------------------------------------------------------------
function setupEditorModeToggle() {
  const btnRead = document.getElementById('btn-toggle-read');
  const btnEdit = document.getElementById('btn-toggle-edit');
  const readingView = document.getElementById('note-reading-view');
  const editorView = document.getElementById('note-editor-view');
  const markdownInput = document.getElementById('markdown-input');
  const saveIndicator = document.getElementById('save-indicator');

  btnRead.addEventListener('click', () => {
    currentMode = 'read';
    btnRead.classList.add('active');
    btnEdit.classList.remove('active');
    readingView.style.display = 'block';
    editorView.style.display = 'none';
    switchNote(currentActiveNoteId); // refresh
    if (window.soundFX) window.soundFX.playClick();
  });

  btnEdit.addEventListener('click', () => {
    currentMode = 'edit';
    btnEdit.classList.add('active');
    btnRead.classList.remove('active');
    readingView.style.display = 'none';
    editorView.style.display = 'flex';
    markdownInput.focus();
    if (window.soundFX) window.soundFX.playClick();
  });

  // Auto-Save
  if (markdownInput) {
    markdownInput.addEventListener('input', () => {
      saveIndicator.textContent = '○ Saving...';
      saveIndicator.style.color = 'var(--accent-amber)';

      if (notesDatabase[currentActiveNoteId]) {
        notesDatabase[currentActiveNoteId].markdown = markdownInput.value;
        // Parse WikiLinks
        const matches = markdownInput.value.match(/\[\[(.*?)\]\]/g) || [];
        notesDatabase[currentActiveNoteId].wikilinks = matches.map(m => m.replace(/\[\[|\]\]/g, '').trim());
      }

      clearTimeout(window.saveTimeout);
      window.saveTimeout = setTimeout(() => {
        saveVaultToStorage();
        saveIndicator.textContent = '● Saved';
        saveIndicator.style.color = 'var(--wire-emerald)';
      }, 600);
    });
  }

  // Copy Markdown
  const btnCopy = document.getElementById('btn-copy-markdown');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const text = notesDatabase[currentActiveNoteId]?.markdown || '';
      navigator.clipboard.writeText(text);
      btnCopy.textContent = '✓';
      setTimeout(() => btnCopy.textContent = '📋', 1200);
      if (window.soundFX) window.soundFX.playClick();
    });
  }

  // Download Note (.md)
  const btnDownloadNote = document.getElementById('btn-download-note');
  if (btnDownloadNote) {
    btnDownloadNote.addEventListener('click', () => {
      const note = notesDatabase[currentActiveNoteId];
      if (!note) return;
      downloadFile(`${currentActiveNoteId}.md`, note.markdown);
      if (window.soundFX) window.soundFX.playClick();
    });
  }

  // Delete Active Note
  const btnDelete = document.getElementById('btn-delete-active-note');
  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      if (Object.keys(notesDatabase).length <= 1) {
        alert("Cannot delete the last remaining note in the Vault.");
        return;
      }
      if (confirm(`Are you sure you want to delete note "${notesDatabase[currentActiveNoteId].title}"?`)) {
        deleteNote(currentActiveNoteId);
        if (window.soundFX) window.soundFX.playClick();
      }
    });
  }
}

// -------------------------------------------------------------
// 7. Vault Operations: New Note, Delete, Export, Import
// -------------------------------------------------------------
function setupVaultOperations() {
  const newNoteModal = document.getElementById('new-note-modal');
  const btnNewNote = document.getElementById('btn-new-note');
  const btnNewTab = document.getElementById('btn-new-tab');
  const btnCloseNoteModal = document.getElementById('btn-close-note-modal');
  const btnCancelNewNote = document.getElementById('btn-cancel-new-note');
  const btnConfirmNewNote = document.getElementById('btn-confirm-new-note');
  const newNoteTitleInput = document.getElementById('new-note-title-input');

  function openNewNoteModal() {
    newNoteModal.classList.add('show');
    newNoteTitleInput.value = '';
    newNoteTitleInput.focus();
    if (window.soundFX) window.soundFX.playClick();
  }

  function closeNewNoteModal() {
    newNoteModal.classList.remove('show');
  }

  if (btnNewNote) btnNewNote.addEventListener('click', openNewNoteModal);
  if (btnNewTab) btnNewTab.addEventListener('click', openNewNoteModal);
  if (btnCloseNoteModal) btnCloseNoteModal.addEventListener('click', closeNewNoteModal);
  if (btnCancelNewNote) btnCancelNewNote.addEventListener('click', closeNewNoteModal);

  function createNoteFromTitle() {
    const rawTitle = newNoteTitleInput.value.trim();
    if (!rawTitle) return;

    const slug = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `note-${Date.now()}`;
    const newNote = {
      id: slug,
      title: rawTitle,
      arabicQuote: `توثيق جديد مضاف إلى الأرشيف: <span class="tag-tech">${rawTitle}</span>`,
      breadcrumbs: `97-Backend / Custom Notes / ${rawTitle}`,
      markdown: `# ${rawTitle}\n\nكتبت هذه الملاحظة في ${new Date().toLocaleDateString('ar-SA')}.\n\n- أضف أفكارك هنا...\n- يمكنك الربط مع ملاحظات أخرى عبر: [[auth-p1]]\n`,
      wikilinks: ['auth-p1'],
      showMedia: false,
      showCode: false
    };

    notesDatabase[slug] = newNote;
    saveVaultToStorage();

    // Inject into Explorer Tree DOM
    const container = document.getElementById('tree-custom-container') || document.getElementById('file-tree');
    const newFileItem = document.createElement('div');
    newFileItem.className = 'tree-item file';
    newFileItem.dataset.file = slug;
    newFileItem.innerHTML = `<span class="icon">📄</span><span class="name">${rawTitle}</span>`;
    container.appendChild(newFileItem);
    bindFileClicks();

    // Add node to Graph view dynamically
    if (window.graphEngine) {
      window.graphEngine.addCustomNode(slug, rawTitle);
    }

    closeNewNoteModal();
    switchNote(slug);

    // Switch to edit mode immediately
    document.getElementById('btn-toggle-edit').click();
  }

  if (btnConfirmNewNote) btnConfirmNewNote.addEventListener('click', createNoteFromTitle);
  if (newNoteTitleInput) {
    newNoteTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createNoteFromTitle();
      if (e.key === 'Escape') closeNewNoteModal();
    });
  }

  // Export Vault Backup (JSON)
  const btnExport = document.getElementById('btn-export-vault');
  const btnRailExport = document.getElementById('rail-btn-export');
  function exportFullVault() {
    const backupJson = JSON.stringify(notesDatabase, null, 2);
    downloadFile(`CyberVault_Backup_${Date.now()}.json`, backupJson);
    if (window.soundFX) window.soundFX.playClick();
  }
  if (btnExport) btnExport.addEventListener('click', exportFullVault);
  if (btnRailExport) btnRailExport.addEventListener('click', exportFullVault);

  // Import Markdown File
  const fileImportInput = document.getElementById('file-import-input');
  const btnImport = document.getElementById('btn-import-vault');
  const btnImportTool = document.getElementById('btn-import-md');

  function triggerFilePicker() {
    if (fileImportInput) fileImportInput.click();
    if (window.soundFX) window.soundFX.playClick();
  }

  if (btnImport) btnImport.addEventListener('click', triggerFilePicker);
  if (btnImportTool) btnImportTool.addEventListener('click', triggerFilePicker);

  if (fileImportInput) {
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const noteTitle = file.name.replace(/\.[^/.]+$/, "");
        const slug = noteTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        notesDatabase[slug] = {
          id: slug,
          title: noteTitle,
          arabicQuote: `مستند تم استيراده من القرص الصلب: <span class="tag-tech">${file.name}</span>`,
          breadcrumbs: `Imported / Local Drive / ${noteTitle}`,
          markdown: content,
          wikilinks: [],
          showMedia: false,
          showCode: false
        };

        saveVaultToStorage();
        if (window.graphEngine) {
          window.graphEngine.syncWithVault(notesDatabase);
        }

        // Add file to explorer tree
        const container = document.getElementById('tree-custom-container') || document.getElementById('file-tree');
        const newFileItem = document.createElement('div');
        newFileItem.className = 'tree-item file';
        newFileItem.dataset.file = slug;
        newFileItem.innerHTML = `<span class="icon">📄</span><span class="name">${noteTitle}</span>`;
        container.appendChild(newFileItem);
        bindFileClicks();

        switchNote(slug);
        alert(`Successfully imported note: ${file.name}`);
      };
      reader.readAsText(file);
    });
  }
}

function deleteNote(noteId) {
  delete notesDatabase[noteId];
  saveVaultToStorage();

  const fileItem = document.querySelector(`.tree-item.file[data-file="${noteId}"]`);
  if (fileItem) fileItem.remove();

  if (window.graphEngine) {
    window.graphEngine.syncWithVault(notesDatabase);
  }

  const remaining = Object.keys(notesDatabase);
  switchNote(remaining[0] || 'auth-p1');
}

function downloadFile(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// -------------------------------------------------------------
// 8. Shortcuts Cheat Sheet Modal (F1 / ?)
// -------------------------------------------------------------
function setupShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  const btnHelp = document.getElementById('btn-help');
  const btnClose = document.getElementById('btn-close-shortcuts');

  function openModal() {
    modal.classList.add('show');
    if (window.soundFX) window.soundFX.playClick();
  }

  function closeModal() {
    modal.classList.remove('show');
  }

  if (btnHelp) btnHelp.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  window.openShortcutsModal = openModal;
}

// -------------------------------------------------------------
// 9. Command Palette (Ctrl+K)
// -------------------------------------------------------------
function setupCommandPalette() {
  const modal = document.getElementById('command-modal');
  const input = document.getElementById('palette-search');
  const results = document.getElementById('palette-results');
  const btnTrigger = document.getElementById('btn-open-palette');

  function getCommands() {
    const list = [
      { title: 'Create: New Knowledge Note (Ctrl+N)', tag: 'ACTION', action: () => document.getElementById('btn-new-note').click() },
      { title: 'Export: Download Full Vault Backup (.JSON)', tag: 'BACKUP', action: () => document.getElementById('btn-export-vault').click() },
      { title: 'Import: Load Local Markdown File (.MD)', tag: 'FILES', action: () => document.getElementById('btn-import-vault').click() },
      { title: 'Action: Toggle Physics Engine (Pause/Run)', tag: 'GRAPH', action: () => document.getElementById('btn-toggle-physics').click() },
      { title: 'Action: Reset Graph Viewport & Zoom', tag: 'GRAPH', action: () => document.getElementById('btn-reset-zoom').click() },
      { title: 'Action: Toggle Interactive Cyber Terminal', tag: 'SYSTEM', action: () => window.toggleTerminal() },
      { title: 'Action: Toggle Live Edit Mode (Ctrl+E)', tag: 'EDITOR', action: () => document.getElementById('btn-toggle-edit').click() },
      { title: 'Help: View Keyboard Shortcuts & Manual (F1)', tag: 'HELP', action: () => window.openShortcutsModal() }
    ];

    // Add note jump commands
    Object.keys(notesDatabase).forEach(key => {
      const n = notesDatabase[key];
      list.push({
        title: `Open Note: ${n.title}`,
        tag: 'NOTE',
        action: () => switchNote(key)
      });
    });

    return list;
  }

  function openPalette() {
    modal.classList.add('show');
    input.value = '';
    renderResults(getCommands());
    input.focus();
    if (window.soundFX) window.soundFX.playClick();
  }

  function closePalette() {
    modal.classList.remove('show');
  }

  function renderResults(list) {
    results.innerHTML = '';
    list.forEach((cmd, idx) => {
      const item = document.createElement('div');
      item.className = `palette-item ${idx === 0 ? 'selected' : ''}`;
      item.innerHTML = `
        <span>${cmd.title}</span>
        <span class="palette-item-tag">${cmd.tag}</span>
      `;
      item.addEventListener('click', () => {
        cmd.action();
        closePalette();
        if (window.soundFX) window.soundFX.playClick();
      });
      results.appendChild(item);
    });
  }

  btnTrigger.addEventListener('click', openPalette);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePalette();
  });

  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = getCommands().filter(c => c.title.toLowerCase().includes(q));
    renderResults(filtered);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePalette();
    if (e.key === 'Enter') {
      const first = results.querySelector('.palette-item');
      if (first) first.click();
    }
  });

  window.openPalette = openPalette;
}

// -------------------------------------------------------------
// 10. Interactive Cyber Terminal REPL
// -------------------------------------------------------------
function setupCyberTerminal() {
  const drawer = document.getElementById('terminal-drawer');
  const btnToggle = document.getElementById('btn-toggle-terminal');
  const btnRail = document.getElementById('rail-btn-terminal');
  const btnClose = document.getElementById('btn-close-term');
  const btnClear = document.getElementById('btn-clear-term');
  const input = document.getElementById('terminal-input');
  const history = document.getElementById('term-history');

  function toggleTerminal() {
    drawer.classList.toggle('open');
    if (drawer.classList.contains('open')) {
      input.focus();
    }
    if (window.soundFX) window.soundFX.playClick();
  }

  window.toggleTerminal = toggleTerminal;

  btnToggle.addEventListener('click', toggleTerminal);
  if (btnRail) btnRail.addEventListener('click', toggleTerminal);
  btnClose.addEventListener('click', toggleTerminal);

  btnClear.addEventListener('click', () => {
    history.innerHTML = '';
    input.focus();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = input.value.trim();
      input.value = '';
      if (!val) return;

      appendTermLine(`tareq@cybervault:~$ ${val}`, 'user');
      executeCommand(val);
    }
  });

  function appendTermLine(text, type = 'output') {
    const line = document.createElement('div');
    line.className = `term-line ${type}`;
    line.textContent = text;
    history.appendChild(line);
    const body = document.getElementById('terminal-body');
    body.scrollTop = body.scrollHeight;
  }

  function executeCommand(raw) {
    const parts = raw.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (cmd) {
      case 'help':
        appendTermLine('CyberVault System CLI Commands:');
        appendTermLine('  help             - Show this instruction manual');
        appendTermLine('  stats            - Print workstation telemetry & graph density');
        appendTermLine('  ls               - List all registered notes in Vault');
        appendTermLine('  cat <note_id>    - Display raw note markdown (e.g. cat auth-p1)');
        appendTermLine('  open <note_id>   - Open note in main editor pane');
        appendTermLine('  export           - Export full vault as JSON backup file');
        appendTermLine('  clear            - Wipe console buffer');
        appendTermLine('  date             - Display current epoch and timestamp');
        break;

      case 'stats':
        appendTermLine(`[STATUS]: NOMINAL // SYSTEM ACTIVE`);
        appendTermLine(`Vault Registered Notes: ${Object.keys(notesDatabase).length}`);
        appendTermLine(`PWA Service Worker: REGISTERED [Offline Supported]`);
        appendTermLine(`Interactive 2D Physics: 60 FPS HTML5 Canvas`);
        break;

      case 'ls':
        Object.keys(notesDatabase).forEach(k => {
          appendTermLine(`  - ${k.padEnd(16)} | ${notesDatabase[k].title}`);
        });
        break;

      case 'cat':
        if (notesDatabase[arg]) {
          appendTermLine(notesDatabase[arg].markdown);
        } else {
          appendTermLine(`Error: Note '${arg}' not found. Use 'ls' to view notes.`, 'error');
        }
        break;

      case 'open':
        if (notesDatabase[arg]) {
          switchNote(arg);
          appendTermLine(`Switched view to [${arg}].`);
        } else {
          appendTermLine(`Error: Note '${arg}' not found.`, 'error');
        }
        break;

      case 'export':
        document.getElementById('btn-export-vault').click();
        appendTermLine('Vault export triggered successfully.');
        break;

      case 'clear':
        history.innerHTML = '';
        break;

      case 'date':
        appendTermLine(new Date().toISOString());
        break;

      default:
        appendTermLine(`Command not recognized: '${cmd}'. Type 'help' for instructions.`, 'error');
    }
  }
}

// -------------------------------------------------------------
// 11. Global Keyboard Shortcuts & Sound Toggle
// -------------------------------------------------------------
function setupSoundToggle() {
  const btn = document.getElementById('btn-toggle-sound');
  btn.addEventListener('click', () => {
    const isEnabled = window.soundFX.toggle();
    btn.textContent = isEnabled ? '🔊' : '🔇';
    btn.title = isEnabled ? 'Audio Synthesizer: ON' : 'Audio Synthesizer: MUTED';
    if (isEnabled) window.soundFX.playClick();
  });
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ctrl+K: Quick Command Palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      window.openPalette();
    }
    // Ctrl+N: New Note
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      document.getElementById('btn-new-note').click();
    }
    // Ctrl+E: Toggle Edit Mode
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      const isRead = currentMode === 'read';
      document.getElementById(isRead ? 'btn-toggle-edit' : 'btn-toggle-read').click();
    }
    // Ctrl+S: Save Indicator
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveVaultToStorage();
      const ind = document.getElementById('save-indicator');
      if (ind) {
        ind.textContent = '● Saved';
        ind.style.color = 'var(--wire-emerald)';
      }
    }
    // Ctrl+`: Toggle Terminal
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
      e.preventDefault();
      window.toggleTerminal();
    }
    // F1 or ?: Open Shortcuts
    if (e.key === 'F1') {
      e.preventDefault();
      window.openShortcutsModal();
    }
    // Escape: Close all modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('show'));
    }
  });
}
