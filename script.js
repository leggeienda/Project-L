const DEFAULT_TOOLS = [
  { id: 1, title: 'Fast C++ File Batch Organizer', category: 'CLI', badge: 'C++', description: 'Utility cli veloce per ordinare file e cartelle.', downloads: 142, githubUrl: '#', actionText: 'Scarica eseguibile', icon: 'folder-archive' },
  { id: 2, title: 'Student Grade & GPA Tracker', category: 'CLI', badge: 'C++ / Console', description: 'App per media, obiettivi e storico voti.', downloads: 89, githubUrl: '#', actionText: 'Codice sorgente', icon: 'calculator' },
  { id: 3, title: 'Discord Bot Auto-Notifier', category: 'Automation', badge: 'Python', description: 'Bot per feed e aggiornamenti in canale.', downloads: 215, githubUrl: '#', actionText: 'Ottieni script', icon: 'bot' },
  { id: 4, title: 'Markdown Live Web Previewer', category: 'Web', badge: 'HTML / JS', description: 'Preview live per markdown e documenti.', downloads: 304, githubUrl: '#', actionText: 'Apri tool', icon: 'layout' },
];

const DEFAULT_COMMENTS = [
  { id: 101, author: 'Marco', tag: 'New Tool Idea', content: 'Magari un software per monitorare CPU e temperatura mentre gioco.', upvotes: 12, date: '2 giorni fa', userVoted: false },
  { id: 102, author: 'DevFriend_04', tag: 'Feature Request', content: 'Adoro il file organizer! Vorrei anche auto-rimozione cartelle vuote.', upvotes: 8, date: 'Ieri', userVoted: false },
];

const SUPABASE_URL = 'https://hbmpqrgeggamwirsxqep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibXBxcmdlZ2dhbXdpcnN4cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDQ1MTIsImV4cCI6MjEwODE4MDUxMn0.8h1Y8uQm5IT28ur6po1QfMgsIHWFeNnkfjsQY58gA5w';
const supabaseClient = window.supabase ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentFilter = 'all';
let searchQuery = '';
let comments = loadLocalComments();

function loadLocalComments() {
  try {
    const saved = localStorage.getItem('nova_nest_comments');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (error) {
    console.warn('Impossibile leggere commenti salvati localmente:', error);
  }
  return [...DEFAULT_COMMENTS];
}

function persistLocalComments() {
  try {
    localStorage.setItem('nova_nest_comments', JSON.stringify(comments));
  } catch (error) {
    console.warn('Impossibile salvare commenti localmente:', error);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return map[char] || char;
  });
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'Recentemente';
  }
}

async function loadComments() {
  comments = loadLocalComments();
  renderComments();

  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient.from('comments').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    if (Array.isArray(data) && data.length) {
      comments = data.map((item) => ({
        id: item.id || Date.now() + Math.random(),
        author: item.author || 'Anonimo',
        tag: item.tag || 'General Feedback',
        content: item.text || item.content || '',
        upvotes: Number(item.upvotes) || 0,
        date: item.created_at ? formatDate(item.created_at) : 'Recentemente',
        userVoted: false,
      }));
      persistLocalComments();
    }
  } catch (error) {
    console.warn('Errore caricamento Supabase, fallback locale:', error);
    comments = loadLocalComments();
  }

  renderComments();
  updateStats();
}

async function sendCommentToServer(author, text, tag) {
  if (!supabaseClient) return false;

  try {
    const { error } = await supabaseClient.from('comments').insert([{ author, text, tag }]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('Errore invio Supabase:', error);
    return false;
  }
}

function renderTools() {
  const container = document.getElementById('tools-grid');
  if (!container) return;

  container.innerHTML = '';
  const filtered = DEFAULT_TOOLS.filter((tool) => {
    const matchesCategory = currentFilter === 'all' || tool.category === currentFilter;
    const matchesSearch =
      tool.title.toLowerCase().includes(searchQuery) ||
      tool.description.toLowerCase().includes(searchQuery) ||
      tool.badge.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-gray-500"><i data-lucide="package-open" class="w-12 h-12 mx-auto mb-3 opacity-40"></i><p>Nessun tool trovato con i filtri attuali.</p></div>`;
    lucide.createIcons();
    return;
  }

  filtered.forEach((tool) => {
    const card = document.createElement('div');
    card.className = 'bg-cardbg border border-borderbg rounded-2xl p-6 glow-effect flex flex-col justify-between';
    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="px-2.5 py-1 rounded-md bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-semibold">${escapeHtml(tool.badge)}</span>
          <div class="p-2 bg-darkbg border border-borderbg rounded-lg text-gray-400"><i data-lucide="${tool.icon}" class="w-5 h-5"></i></div>
        </div>
        <h3 class="text-lg font-bold text-white mb-2">${escapeHtml(tool.title)}</h3>
        <p class="text-xs text-gray-400 leading-relaxed mb-6">${escapeHtml(tool.description)}</p>
      </div>
      <div class="pt-4 border-t border-borderbg/60 flex items-center justify-between gap-3">
        <span class="text-xs text-gray-500 flex items-center gap-1"><i data-lucide="download" class="w-3.5 h-3.5"></i> ${tool.downloads} utilizzi</span>
        <button type="button" data-tool-id="${tool.id}" class="focus-ring px-3 py-1.5 rounded-lg bg-darkbg hover:bg-brand-500 hover:text-white border border-borderbg text-xs font-medium text-gray-300 transition-colors flex items-center gap-2">
          <span>${escapeHtml(tool.actionText)}</span>
          <i data-lucide="external-link" class="w-3 h-3"></i>
        </button>
      </div>
    `;
    card.querySelector('[data-tool-id]').addEventListener('click', () => showToast(`Preparazione ${tool.title}...`));
    container.appendChild(card);
  });

  lucide.createIcons();
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('tool-search');
  const commentForm = document.getElementById('comment-form');

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      searchQuery = event.target.value.trim().toLowerCase();
      renderTools();
    });
  }

  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
  }

  document.querySelectorAll('.category-btn').forEach((button) => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.cat || 'all';
      document.querySelectorAll('.category-btn').forEach((el) => {
        const active = el.dataset.cat === currentFilter;
        el.classList.toggle('active', active);
        el.classList.toggle('bg-brand-500/20', active);
        el.classList.toggle('text-brand-500', active);
        el.classList.toggle('font-medium', active);
        el.classList.toggle('text-gray-400', !active);
      });
      renderTools();
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

  renderTools();
  renderComments();
  updateStats();
  loadComments();
  lucide.createIcons();
});

function renderComments() {
  const container = document.getElementById('comments-container');
  const badge = document.getElementById('comments-total-badge');
  if (!container) return;

  container.innerHTML = '';

  if (!comments.length) {
    container.innerHTML = `
      <div class="py-12 text-center text-gray-500 bg-cardbg border border-borderbg rounded-2xl">
        <i data-lucide="message-square-off" class="w-10 h-10 mx-auto mb-2 opacity-40"></i>
        <p>Nessun commento ancora. Sii il primo a scriverne uno!</p>
      </div>
    `;
    if (badge) badge.textContent = '0 Post';
    lucide.createIcons();
    return;
  }

  comments.forEach((comment) => {
    const card = document.createElement('div');
    card.className = 'bg-cardbg border border-borderbg rounded-xl p-5 transition-all hover:border-gray-700';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div class="flex-grow">
          <div class="flex items-center flex-wrap gap-2 mb-2">
            <span class="font-bold text-sm text-white">${escapeHtml(comment.author)}</span>
            <span class="text-xs text-gray-600">•</span>
            <span class="text-xs text-gray-500">${escapeHtml(comment.date)}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-300 border border-borderbg">${escapeHtml(comment.tag || 'General Feedback')}</span>
          </div>
          <p class="text-sm text-gray-300 leading-relaxed">${escapeHtml(comment.content)}</p>
        </div>
        <button type="button" data-comment-id="${comment.id}" class="focus-ring flex flex-col items-center justify-center p-2 min-w-[48px] rounded-lg border ${comment.userVoted ? 'bg-brand-500/10 border-brand-500/30 text-brand-500' : 'bg-darkbg border-borderbg text-gray-400'}">
          <i data-lucide="thumbs-up" class="w-4 h-4 mb-1"></i>
          <span class="text-xs font-bold">${Number(comment.upvotes) || 0}</span>
        </button>
      </div>
    `;
    card.querySelector('[data-comment-id]').addEventListener('click', () => toggleUpvote(comment.id));
    container.appendChild(card);
  });

  if (badge) badge.textContent = `${comments.length} ${comments.length === 1 ? 'Post' : 'Post'}`;
  lucide.createIcons();
}

async function handleCommentSubmit(event) {
  event.preventDefault();
  const author = document.getElementById('author-input')?.value.trim();
  const tag = document.getElementById('tag-input')?.value || 'General Feedback';
  const content = document.getElementById('content-input')?.value.trim();

  if (!author || !content) {
    showToast('Completa nome e messaggio prima di inviare.');
    return;
  }

  const newComment = {
    id: Date.now(),
    author,
    tag,
    content,
    upvotes: 1,
    date: 'Adesso',
    userVoted: true,
  };

  comments = [newComment, ...comments];
  persistLocalComments();
  renderComments();
  updateStats();

  const serverSaved = await sendCommentToServer(author, content, tag);
  if (serverSaved) {
    showToast('Idea inviata al server con successo!');
  } else {
    showToast('Idea salvata localmente. Server non disponibile.');
  }

  const form = document.getElementById('comment-form');
  if (form) form.reset();
}

function toggleUpvote(id) {
  comments = comments.map((comment) => {
    if (comment.id !== id) return comment;
    const nextUpvotes = comment.userVoted ? (Number(comment.upvotes) || 0) - 1 : (Number(comment.upvotes) || 0) + 1;
    return { ...comment, upvotes: Math.max(0, nextUpvotes), userVoted: !comment.userVoted };
  });
  persistLocalComments();
  renderComments();
}

function updateStats() {
  const toolCount = document.getElementById('stat-tools-count');
  const commentCount = document.getElementById('stat-comments-count');
  if (toolCount) toolCount.textContent = String(DEFAULT_TOOLS.length);
  if (commentCount) commentCount.textContent = String(comments.length);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toast-message');
  if (!toast || !text) return;
  text.textContent = message;
  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none'), 3000);
}

function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
