const DEFAULT_TOOLS = [
  { id: 1, title: 'Fast C++ File Batch Organizer', category: 'CLI', badge: 'C++', description: 'Utility to batch organize files and folders.', downloads: 142, githubUrl: '#', actionText: 'View tool', icon: 'folder-open' },
  { id: 2, title: 'Student Grade & GPA Tracker', category: 'CLI', badge: 'C++ / Console', description: 'Track grades, goals, and historical performance.', downloads: 89, githubUrl: '#', actionText: 'Open code', icon: 'graduation-cap' },
  { id: 3, title: 'Discord Bot Auto-Notifier', category: 'Automation', badge: 'Python', description: 'Notify channels with automated status and feed updates.', downloads: 215, githubUrl: '#', actionText: 'Get access', icon: 'bot' },
  { id: 4, title: 'Markdown Live Web Previewer', category: 'Web', badge: 'HTML / JS', description: 'Live markdown preview for docs and writing workflows.', downloads: 304, githubUrl: '#', actionText: 'Open tool', icon: 'file-text' },
];

const DEFAULT_COMMENTS = [
  { id: 101, author: 'Marco', tag: 'New Tool Idea', content: 'A tool to monitor CPU and temperature while gaming would be super useful.', upvotes: 12, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, date: '2 days ago', userVoted: false },
  { id: 102, author: 'DevFriend_04', tag: 'Feature Request', content: 'I love the file organizer. I would also like automatic empty-folder cleanup.', upvotes: 8, createdAt: Date.now() - 1000 * 60 * 60 * 24, date: 'Yesterday', userVoted: false },
  { id: 103, author: 'Lina', tag: 'General Feedback', content: 'The community page feels polished. A category filter would make discovery much faster.', upvotes: 16, createdAt: Date.now() - 1000 * 60 * 60 * 12, date: '12 hours ago', userVoted: false },
  { id: 104, author: 'Nico', tag: 'Bug Report', content: 'The dark theme is great, but the vote button needs clearer hover feedback on mobile.', upvotes: 6, createdAt: Date.now() - 1000 * 60 * 60 * 3, date: '3 hours ago', userVoted: false },
];

const SUPABASE_URL = 'https://hbmpqrgeggamwirsxqep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibXBxcmdlZ2dhbXdpcnN4cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDQ1MTIsImV4cCI6MjEwODE4MDUxMn0.8h1YJylkv4l6Dey4A1QzvOwtob2phjbE0cGJE8C6A6g';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentFilter = 'all';
let searchQuery = '';
let comments = loadLocalComments();
let commentFilter = 'all';
let commentSort = 'newest';
let featuredIdeaId = null;

function loadLocalComments() {
  try {
    const saved = localStorage.getItem('nova_nest_comments');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (error) {
    console.warn('Unable to read local comments:', error);
  }
  return [...DEFAULT_COMMENTS];
}

function persistLocalComments() {
  try {
    localStorage.setItem('nova_nest_comments', JSON.stringify(comments));
  } catch (error) {
    console.warn('Unable to save local comments:', error);
  }
}

function escapeHtml(str) {
  if (str == null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return map[char] || char;
  });
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return 'Recently';
  }
}

function normalizeComment(item) {
  return {
    id: item.id || Date.now() + Math.random(),
    author: item.author || 'Anonymous',
    tag: item.tag || 'General Feedback',
    content: item.text || item.content || '',
    upvotes: Number(item.upvotes) || 0,
    createdAt: item.createdAt || item.created_at || Date.now(),
    date: item.date || (item.created_at ? formatDate(item.created_at) : 'Recently'),
    userVoted: Boolean(item.userVoted),
  };
}

async function loadComments() {
  comments = loadLocalComments().map(normalizeComment);
  renderComments();

  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient.from('comments').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    if (Array.isArray(data) && data.length) {
      comments = data.map((item) => normalizeComment({
        ...item,
        content: item.text || item.content || '',
        createdAt: item.created_at || Date.now(),
        date: item.created_at ? formatDate(item.created_at) : 'Recently',
      }));
      persistLocalComments();
    }
  } catch (error) {
    console.warn('Supabase load error, falling back to local data:', error);
    comments = loadLocalComments().map(normalizeComment);
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
    console.warn('Supabase send error:', error);
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
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-gray-500">
        <i data-lucide="package-open" class="w-12 h-12 mx-auto mb-3 opacity-40"></i>
        <p>No tools found for the current filters.</p>
      </div>
    `;
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
        <span class="text-xs text-gray-500 flex items-center gap-1"><i data-lucide="download" class="w-3.5 h-3.5"></i> ${tool.downloads} uses</span>
        <button type="button" data-tool-id="${tool.id}" class="focus-ring px-3 py-1.5 rounded-lg bg-darkbg hover:bg-brand-500 hover:text-white border border-borderbg text-xs font-medium text-gray-300 transition-colors">
          <span>${escapeHtml(tool.actionText)}</span>
          <i data-lucide="external-link" class="w-3 h-3"></i>
        </button>
      </div>
    `;
    card.querySelector('[data-tool-id]').addEventListener('click', () => showToast(`Preparing ${tool.title}...`));
    container.appendChild(card);
  });

  lucide.createIcons();
}

function renderFeaturedIdea() {
  const featuredRoot = document.getElementById('featured-idea');
  if (!featuredRoot) return;

  const current = comments.find((item) => item.id === featuredIdeaId) || comments[0] || null;

  const title = document.getElementById('featured-title');
  const body = document.getElementById('featured-body');
  const author = document.getElementById('featured-author');
  const category = document.getElementById('featured-category');
  const voteCount = document.getElementById('featured-votes');
  const button = document.getElementById('featured-vote-btn');

  if (!current || !title || !body || !author || !category || !voteCount || !button) return;

  title.textContent = current.content.length > 90 ? `${current.content.slice(0, 87)}…` : current.content;
  body.textContent = 'Top-voted by the community and currently highlighted for discussion.';
  author.textContent = `by ${current.author}`;
  category.textContent = current.tag;
  voteCount.textContent = `${current.upvotes}`;
  button.disabled = false;
  button.onclick = () => toggleUpvote(current.id);
}

function getVisibleComments() {
  let visible = comments.filter((comment) => commentFilter === 'all' ? true : comment.tag === commentFilter);

  if (commentSort === 'popular') {
    visible = visible.sort((a, b) => (Number(b.upvotes) || 0) - (Number(a.upvotes) || 0));
  } else if (commentSort === 'oldest') {
    visible = visible.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
  } else {
    visible = visible.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }

  return visible;
}

function renderComments() {
  const container = document.getElementById('comments-container');
  const badge = document.getElementById('comments-total-badge');
  if (!container) return;

  const visible = getVisibleComments();

  if (!visible.length) {
    container.innerHTML = `
      <div class="py-12 text-center text-gray-500 bg-cardbg border border-borderbg rounded-2xl">
        <i data-lucide="message-square-off" class="w-10 h-10 mx-auto mb-2 opacity-40"></i>
        <p>No comments yet for this filter. Be the first to post one.</p>
      </div>
    `;
    if (badge) badge.textContent = '0 posts';
    lucide.createIcons();
    renderFeaturedIdea();
    return;
  }

  if (!featuredIdeaId || !visible.some((item) => item.id === featuredIdeaId)) {
    featuredIdeaId = visible[0].id;
  }

  container.innerHTML = visible.map((comment) => `
    <article class="comment-item bg-cardbg border border-borderbg rounded-2xl p-4 transition-all hover:border-brand-500/40 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.2)] relative">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center flex-wrap gap-2 mb-2">
            <span class="font-bold text-sm text-white">${escapeHtml(comment.author)}</span>
            <span class="text-xs text-gray-600">•</span>
            <span class="text-xs text-gray-500">${escapeHtml(comment.date)}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">${escapeHtml(comment.tag || 'General Feedback')}</span>
          </div>
          <p class="text-sm text-gray-300 leading-relaxed break-words">${escapeHtml(comment.content)}</p>
        </div>
        <div class="flex flex-col items-center gap-2 shrink-0">
          <button type="button" data-comment-id="${comment.id}" class="focus-ring flex flex-col items-center justify-center p-2 min-w-[52px] rounded-lg border ${comment.userVoted ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' : 'bg-darkbg border-borderbg text-gray-400'} hover:border-brand-500/40 transition-colors">
            <i data-lucide="thumbs-up" class="w-4 h-4 mb-1"></i>
            <span class="text-xs font-bold">${Number(comment.upvotes) || 0}</span>
          </button>
          <button type="button" data-feature-id="${comment.id}" class="focus-ring px-2 py-1 rounded-md border ${featuredIdeaId === comment.id ? 'border-brand-500/50 bg-brand-500/10 text-brand-400' : 'border-borderbg bg-darkbg text-gray-400'} text-[10px] font-semibold transition-colors">
            Feature
          </button>
        </div>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-comment-id]').forEach((button) => {
    button.addEventListener('click', () => toggleUpvote(Number(button.dataset.commentId)));
  });

  container.querySelectorAll('[data-feature-id]').forEach((button) => {
    button.addEventListener('click', () => {
      featuredIdeaId = Number(button.dataset.featureId);
      renderFeaturedIdea();
      renderComments();
    });
  });

  if (badge) badge.textContent = `${visible.length} ${visible.length === 1 ? 'post' : 'posts'}`;
  lucide.createIcons();
  renderFeaturedIdea();
}

async function handleCommentSubmit(event) {
  event.preventDefault();
  const author = document.getElementById('author-input')?.value.trim();
  const tag = document.getElementById('tag-input')?.value || 'General Feedback';
  const content = document.getElementById('content-input')?.value.trim();

  if (!author || !content) {
    showToast('Please complete both the name and the message first.');
    return;
  }

  const newComment = {
    id: Date.now(),
    author,
    tag,
    content,
    upvotes: 1,
    createdAt: Date.now(),
    date: 'Now',
    userVoted: true,
  };

  comments = [newComment, ...comments];
  featuredIdeaId = newComment.id;
  persistLocalComments();
  renderComments();
  updateStats();

  const serverSaved = await sendCommentToServer(author, content, tag);
  if (serverSaved) {
    showToast('Idea submitted successfully!');
  } else {
    showToast('Saved locally. Server unavailable.');
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

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('tool-search');
  const commentForm = document.getElementById('comment-form');
  const filterButtons = document.querySelectorAll('[data-comment-filter]');
  const sortButtons = document.querySelectorAll('[data-comment-sort]');

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      searchQuery = event.target.value.trim().toLowerCase();
      renderTools();
    });
  }

  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      commentFilter = button.dataset.commentFilter || 'all';
      filterButtons.forEach((el) => {
        const active = el.dataset.commentFilter === commentFilter;
        el.classList.toggle('bg-brand-500/10', active);
        el.classList.toggle('border-brand-500/30', active);
        el.classList.toggle('text-brand-400', active);
        el.classList.toggle('text-gray-400', !active);
        el.classList.toggle('border-borderbg', !active);
      });
      renderComments();
    });
  });

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      commentSort = button.dataset.commentSort || 'newest';
      sortButtons.forEach((el) => {
        const active = el.dataset.commentSort === commentSort;
        el.classList.toggle('bg-brand-500/10', active);
        el.classList.toggle('border-brand-500/30', active);
        el.classList.toggle('text-brand-400', active);
        el.classList.toggle('text-gray-400', !active);
      });
      renderComments();
    });
  });

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

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  renderTools();
  renderComments();
  updateStats();
  loadComments();
  lucide.createIcons();
});
