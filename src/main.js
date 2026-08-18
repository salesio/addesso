import './style.css';
import postsSeed from './data/posts.json';
import orgInfo from './data/organization_info.json';
import { LANGUAGES, translations } from './data/i18n.js';
import confetti from 'canvas-confetti';
import { 
  createIcons, 
  Heart, 
  Share2, 
  Search, 
  Calendar, 
  Clock, 
  Image as ImageIcon, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Menu, 
  Check, 
  ChevronRight, 
  Sparkles, 
  Upload, 
  Trash2, 
  GripVertical, 
  Plus, 
  Download, 
  RefreshCw, 
  BookOpen, 
  Users, 
  Sprout, 
  HeartHandshake, 
  Landmark, 
  MapPin, 
  Phone, 
  Mail, 
  ExternalLink, 
  Copy,
  Layers,
  ListFilter,
  Eye,
  Globe,
  ChevronLeft,
  Maximize2
} from 'lucide';

/* ==========================================================================
   APPLICATION STATE & PERSISTENCE
   ========================================================================== */

const STORAGE_KEY = 'addesso_posts_v1';
const LANG_STORAGE_KEY = 'addesso_lang_v1';

export function assetUrl(path) {
  if (!path) return './default_cover.png';
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) return path;
  const clean = path.replace(/^\.?\/+/, '');
  return `./${clean}`;
}

function getStoredPosts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(p => ({
          ...p,
          cover_image: assetUrl(p.cover_image),
          images: (p.images || []).map(img => assetUrl(img))
        }));
      }
    }
  } catch (e) {
    console.error('Error loading stored posts:', e);
  }
  return postsSeed.map(p => ({
    ...p,
    cover_image: assetUrl(p.cover_image),
    images: (p.images || []).map(img => assetUrl(img))
  }));
}

function saveStoredPosts(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error('Error saving posts:', e);
  }
}

function getStoredLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && translations[saved]) {
    return saved;
  }
  return 'pt'; // Portuguese is default
}

// App State
const state = {
  posts: getStoredPosts(),
  lang: getStoredLang(),
  currentRoute: window.location.hash || '#home',
  sortOrder: 'asc', // 'asc' = 2017 -> 2026, 'desc' = 2026 -> 2017
  selectedCategory: 'all',
  selectedYear: 'all',
  searchQuery: '',
  viewMode: 'grid', // 'grid' | 'timeline'
  isLangMenuOpen: false,
  activeLightbox: { isOpen: false, images: [], currentIndex: 0 },
  adminTab: 'posts', // 'posts' | 'create'
  adminEditingPost: null,
  draggedPostIndex: null,
  newPostDraft: {
    title: '',
    date: new Date().toISOString().split('T')[0],
    categories: ['Juventude & Liderança'],
    content: '',
    images: [],
    cover_image: '',
    featured: false
  }
};

function t() {
  return translations[state.lang] || translations.pt;
}

/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="display:flex;align-items:center;gap:0.5rem;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      ${message}
    </span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ==========================================================================
   ROUTING & SCROLL MANAGEMENT
   ========================================================================== */

function initRouter() {
  window.addEventListener('hashchange', () => {
    state.currentRoute = window.location.hash || '#home';
    state.isLangMenuOpen = false;
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Reading progress bar for full post page
  window.addEventListener('scroll', () => {
    const bar = document.getElementById('reading-progress');
    if (bar) {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      bar.style.width = scrolled + '%';
    }
  });
}

export function navigateTo(hash) {
  if (window.location.hash === hash) {
    state.currentRoute = hash;
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    window.location.hash = hash;
  }
}
window.navigateTo = navigateTo;

/* ==========================================================================
   HELPERS & CATEGORIES
   ========================================================================== */

const ALL_CATEGORIES = [
  "Educação & Primeira Infância",
  "Juventude & Liderança",
  "Centro de Boas Acções",
  "Agricultura & Nutrição",
  "Ajuda Humanitária & Saúde",
  "Capacitação & Empreendedorismo",
  "Parcerias Institucionais",
  "Desenvolvimento Comunitário"
];

function getCategoryColor(cat) {
  switch (cat) {
    case 'Educação & Primeira Infância': return 'badge-blue';
    case 'Juventude & Liderança': return 'badge-gold';
    case 'Centro de Boas Acções': return 'badge-blue';
    case 'Agricultura & Nutrição': return 'badge-emerald';
    case 'Ajuda Humanitária & Saúde': return 'badge-terracotta';
    case 'Capacitação & Empreendedorismo': return 'badge-gold';
    case 'Parcerias Institucionais': return 'badge-purple';
    default: return 'badge-blue';
  }
}

function formatDatePT(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(state.lang === 'pt' ? 'pt-PT' : state.lang, { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return dateStr;
}

/* ==========================================================================
   MAIN RENDER PIPELINE
   ========================================================================== */

function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const route = state.currentRoute.replace('#', '') || 'home';
  const currentLangObj = LANGUAGES.find(l => l.code === state.lang) || LANGUAGES[0];
  const tr = t();

  // Check if route is a dedicated post page: post/<id>
  const isPostPage = route.startsWith('post/') || route.startsWith('blog/');
  let postId = null;
  if (isPostPage) {
    const parts = route.split('/');
    postId = parseInt(parts[1]) || null;
  }

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader(route, currentLangObj, tr)}

    <!-- Mobile Drawer -->
    <div id="mobile-nav" class="mobile-nav-overlay">
      <div class="mobile-nav-drawer">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid var(--slate-100);">
          <div class="brand-logo">
            <div class="brand-logo-img-wrapper">
              <img src="./logo_cropped.png" alt="ADDESSO Logo" />
            </div>
            <div class="brand-text">
              <span class="brand-name">ADDESSO</span>
              <span class="brand-slogan">Moçambique</span>
            </div>
          </div>
          <button id="close-mobile-nav" style="padding:0.4rem;color:var(--slate-500);"><i data-lucide="x"></i></button>
        </div>

        <!-- Mobile Language Selector -->
        <div style="margin-bottom:1.25rem;background:var(--slate-50);border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:0.75rem;">
          <span style="font-size:0.75rem;font-weight:700;color:var(--slate-500);text-transform:uppercase;display:block;margin-bottom:0.5rem;">
            Idioma / Language:
          </span>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:0.4rem;">
            ${LANGUAGES.map(l => `
              <button class="btn btn-sm ${state.lang === l.code ? 'btn-primary' : 'btn-outline'}" style="padding:0.3rem 0.5rem;font-size:0.78rem;justify-content:center;" onclick="changeLanguage('${l.code}')">
                ${l.flag} ${l.short}
              </button>
            `).join('')}
          </div>
        </div>

        <ul style="list-style:none;display:flex;flex-direction:column;gap:0.4rem;">
          <li><a href="#home" class="mobile-link ${route === 'home' ? 'active' : ''}"><span>${tr.nav.home}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#sobre" class="mobile-link ${route === 'sobre' ? 'active' : ''}"><span>${tr.nav.about}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#projectos" class="mobile-link ${route === 'projectos' ? 'active' : ''}"><span>${tr.nav.projects}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#cba" class="mobile-link ${route === 'cba' ? 'active' : ''}"><span>${tr.nav.cba}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#blog" class="mobile-link ${route === 'blog' ? 'active' : ''}"><span>${tr.nav.blog} (${state.posts.length})</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#contactos" class="mobile-link ${route === 'contactos' ? 'active' : ''}"><span>${tr.nav.contact}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
        </ul>

        <div style="margin-top:auto;padding-top:1.5rem;display:flex;flex-direction:column;gap:0.75rem;">
          <a href="#participar" class="btn btn-accent" style="width:100%;">
            <i data-lucide="heart" style="width:18px;height:18px;"></i>
            <span>${tr.nav.help}</span>
          </a>
          <a href="#admin" class="btn btn-outline" style="width:100%;font-size:0.85rem;">
            <i data-lucide="layers" style="width:16px;height:16px;"></i>
            <span>${tr.nav.admin}</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main>
      ${isPostPage && postId ? renderDedicatedPostPage(postId, tr) : renderRouteContent(route, tr)}
    </main>

    <!-- Footer -->
    ${renderFooter(tr)}

    <!-- Lightbox Fullscreen -->
    <div id="lightbox-modal" class="lightbox-modal ${state.activeLightbox.isOpen ? 'open' : ''}">
      ${state.activeLightbox.isOpen ? renderLightboxContent() : ''}
    </div>
  `;

  // Attach interactive listeners
  attachAppEvents();
  createIcons({
    icons: {
      Heart, Share2, Search, Calendar, Clock, image: ImageIcon, ArrowRight, ArrowLeft, 
      X, Menu, Check, ChevronRight, Sparkles, Upload, Trash2, GripVertical, 
      Plus, Download, RefreshCw, BookOpen, Users, Sprout, HeartHandshake, 
      Landmark, MapPin, Phone, Mail, ExternalLink, Copy, Layers, ListFilter, Eye,
      Globe, ChevronLeft, Maximize2
    }
  });
}

/* ==========================================================================
   COMPONENTS: HEADER & FOOTER
   ========================================================================== */

function renderHeader(route, currentLangObj, tr) {
  return `
    <header class="site-header">
      <div class="container nav-wrapper">
        <!-- Official Brand Logo -->
        <a href="#home" class="brand-logo">
          <div class="brand-logo-img-wrapper">
            <img src="./logo_cropped.png" alt="ADDESSO Logotipo Oficial" />
          </div>
          <div class="brand-text">
            <span class="brand-name">ADDESSO</span>
            <span class="brand-slogan">Moçambique • Desde 2009</span>
          </div>
        </a>

        <!-- Streamlined Clean Desktop Navigation -->
        <ul class="nav-links">
          <li><a href="#home" class="nav-link ${route === 'home' ? 'active' : ''}">${tr.nav.home}</a></li>
          <li><a href="#sobre" class="nav-link ${route === 'sobre' ? 'active' : ''}">${tr.nav.about}</a></li>
          <li><a href="#projectos" class="nav-link ${route === 'projectos' ? 'active' : ''}">${tr.nav.projects}</a></li>
          <li><a href="#cba" class="nav-link ${route === 'cba' ? 'active' : ''}">${tr.nav.cba}</a></li>
          <li>
            <a href="#blog" class="nav-link ${route === 'blog' ? 'active' : ''}">
              <span>${tr.nav.blog}</span>
              <span class="nav-counter-pill">${state.posts.length}</span>
            </a>
          </li>
          <li><a href="#contactos" class="nav-link ${route === 'contactos' ? 'active' : ''}">${tr.nav.contact}</a></li>
        </ul>

        <!-- Action CTAs & Language Switcher -->
        <div class="nav-actions">
          <!-- International Language Switcher Dropdown -->
          <div class="lang-selector-wrapper">
            <button id="lang-menu-btn" class="lang-btn ${state.isLangMenuOpen ? 'active' : ''}" title="Mudar Idioma / Change Language">
              <span>${currentLangObj.flag}</span>
              <span style="font-size:0.8rem;font-weight:700;">${currentLangObj.short}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div id="lang-dropdown" class="lang-dropdown-menu ${state.isLangMenuOpen ? 'open' : ''}">
              <div style="padding:0.4rem 0.85rem;font-size:0.72rem;font-weight:700;color:var(--slate-400);text-transform:uppercase;border-bottom:1px solid var(--slate-100);margin-bottom:0.25rem;">
                Select Language
              </div>
              ${LANGUAGES.map(l => `
                <div class="lang-option-item ${state.lang === l.code ? 'active' : ''}" onclick="changeLanguage('${l.code}')">
                  <span style="display:flex;align-items:center;gap:0.5rem;">
                    <span>${l.flag}</span>
                    <span>${l.label}</span>
                  </span>
                  ${state.lang === l.code ? '<i data-lucide="check" style="width:14px;height:14px;color:var(--primary-600);"></i>' : ''}
                </div>
              `).join('')}
            </div>
          </div>

          <a href="#participar" class="btn btn-accent btn-sm" title="Apoiar e Fazer Parte">
            <i data-lucide="heart" style="width:15px;height:15px;"></i>
            <span>${tr.nav.help}</span>
          </a>
          <a href="#admin" class="nav-admin-btn ${route === 'admin' ? 'active' : ''}" title="${tr.nav.admin}">
            <i data-lucide="layers" style="width:18px;height:18px;"></i>
          </a>
          <button id="open-mobile-nav" class="mobile-menu-btn" aria-label="Abrir Menu">
            <i data-lucide="menu" style="width:22px;height:22px;"></i>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderFooter(tr) {
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <!-- Col 1: About -->
          <div>
            <div class="brand-logo" style="margin-bottom:1.25rem;">
              <div class="brand-logo-img-wrapper" style="width:48px;height:48px;">
                <img src="./logo_cropped.png" alt="ADDESSO" />
              </div>
              <div class="brand-text">
                <span class="brand-name" style="color:#ffffff;">ADDESSO</span>
                <span class="brand-slogan" style="color:var(--primary-300);">${tr.footer.slogan}</span>
              </div>
            </div>
            <p style="font-size:0.92rem;color:var(--slate-400);line-height:1.6;margin-bottom:1.5rem;">
              Associação para a Defesa e Desenvolvimento da Sociedade. Organização Moçambicana sem fins lucrativos focada na infância, juventude, segurança alimentar e transformação comunitária.
            </p>
            <div style="display:flex;gap:0.75rem;">
              <a href="https://web.facebook.com/addesso2009" target="_blank" class="btn btn-outline-white btn-sm" style="padding:0.4rem 0.8rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                Página Oficial no Facebook
              </a>
            </div>
          </div>

          <!-- Col 2: Navigation -->
          <div>
            <h4 class="footer-heading">Navegação</h4>
            <ul class="footer-links">
              <li><a href="#home">${tr.nav.home}</a></li>
              <li><a href="#sobre">${tr.nav.about}</a></li>
              <li><a href="#projectos">${tr.nav.projects}</a></li>
              <li><a href="#cba">${tr.nav.cba}</a></li>
              <li><a href="#blog">${tr.nav.blog} (${state.posts.length})</a></li>
              <li><a href="#participar">${tr.nav.help}</a></li>
            </ul>
          </div>

          <!-- Col 3: Pillars -->
          <div>
            <h4 class="footer-heading">Áreas de Actuação</h4>
            <ul class="footer-links">
              <li><a href="#projectos">Educação Pré-Escolar</a></li>
              <li><a href="#cba">Centro CBA Polana Caniço</a></li>
              <li><a href="#projectos">Horta no Quintal & AgriUrb</a></li>
              <li><a href="#projectos">Kits de Dignidade & Cheias</a></li>
              <li><a href="#projectos">Mini-Semana da Juventude</a></li>
              <li><a href="#sobre">Parceria Estratégica UEM</a></li>
            </ul>
          </div>

          <!-- Col 4: Contact -->
          <div>
            <h4 class="footer-heading">${tr.nav.contact}</h4>
            <p style="font-size:0.88rem;color:var(--slate-400);margin-bottom:0.75rem;display:flex;align-items:flex-start;gap:0.5rem;">
              <i data-lucide="map-pin" style="width:18px;height:18px;flex-shrink:0;color:var(--primary-300);margin-top:2px;"></i>
              Bairro Polana Caniço "A", Q.18, Casa 56, Maputo, Moçambique
            </p>
            <p style="font-size:0.88rem;color:var(--slate-400);margin-bottom:0.75rem;display:flex;align-items:center;gap:0.5rem;">
              <i data-lucide="phone" style="width:18px;height:18px;color:var(--primary-300);"></i>
              +258 84 635 7890 / 87 652 5150
            </p>
            <p style="font-size:0.88rem;color:var(--slate-400);margin-bottom:1.25rem;display:flex;align-items:center;gap:0.5rem;">
              <i data-lucide="mail" style="width:18px;height:18px;color:var(--primary-300);"></i>
              info@addesso.org.mz / addesso.org@gmail.com
            </p>
            <a href="#admin" style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.8rem;color:var(--slate-400);text-decoration:underline;">
              <i data-lucide="layers" style="width:14px;height:14px;"></i> ${tr.nav.admin}
            </a>
          </div>
        </div>

        <div class="footer-bottom-bar">
          <div>
            &copy; 2009–2026 <strong>ADDESSO</strong> (Associação para a Defesa e Desenvolvimento da Sociedade). ${tr.footer.rights}
          </div>
          <div style="display:flex;gap:1.5rem;">
            <span>Moçambique • Maputo</span>
            <span>Registo Oficial ONG Sem Fins Lucrativos</span>
          </div>
        </div>
      </div>
    </footer>
  `;
}

/* ==========================================================================
   DEDICATED FULL POST PAGE COMPONENT
   ========================================================================== */

function renderDedicatedPostPage(id, tr) {
  const post = state.posts.find(p => p.id === id);
  if (!post) {
    return `
      <div class="container section-padding" style="text-align:center;">
        <h2 style="font-size:2rem;margin-bottom:1rem;">Publicação não encontrada</h2>
        <p style="color:var(--slate-600);margin-bottom:2rem;">O registo solicitado não existe ou foi removido.</p>
        <a href="#blog" class="btn btn-primary">${tr.blog.backToBlog}</a>
      </div>
    `;
  }

  const catBadge = getCategoryColor(post.primary_category);

  // Prev and Next posts
  const currentIndex = state.posts.findIndex(p => p.id === id);
  const prevPost = currentIndex > 0 ? state.posts[currentIndex - 1] : null;
  const nextPost = currentIndex < state.posts.length - 1 ? state.posts[currentIndex + 1] : null;

  // Related posts (from same category, excluding current)
  const related = state.posts
    .filter(p => p.id !== post.id && p.primary_category === post.primary_category)
    .slice(0, 3);

  // Update dynamic page title for browser tab
  document.title = `${post.title} | ADDESSO Moçambique`;

  const featuredImg = (post.cover_image && post.cover_image !== './default_cover.png') 
    ? post.cover_image 
    : (post.images && post.images.length > 0 ? post.images[0] : null);

  return `
    <!-- Reading Progress Bar -->
    <div id="reading-progress" class="reading-progress-bar"></div>

    <article class="post-page-wrapper">
      <!-- Hero Header of the Article -->
      <div class="post-page-hero">
        <div class="container">
          <!-- Breadcrumbs -->
          <nav class="post-breadcrumbs">
            <a href="#home" style="color:var(--slate-300);">${tr.nav.home}</a>
            <span style="color:var(--slate-500);"><i data-lucide="chevron-right" style="width:14px;height:14px;"></i></span>
            <a href="#blog" style="color:var(--slate-300);">${tr.nav.blog}</a>
            <span style="color:var(--slate-500);"><i data-lucide="chevron-right" style="width:14px;height:14px;"></i></span>
            <span style="color:var(--primary-300);">${post.primary_category}</span>
          </nav>

          <div style="margin-bottom:1rem;">
            <span class="badge ${catBadge}" style="font-size:0.82rem;padding:0.35rem 0.85rem;">
              ${post.primary_category}
            </span>
          </div>

          <h1 class="post-hero-title">${post.title}</h1>

          <div class="post-meta-strip">
            <span style="display:flex;align-items:center;gap:0.4rem;">
              <i data-lucide="calendar" style="width:16px;height:16px;color:var(--accent-400);"></i>
              <strong>${formatDatePT(post.date)}</strong>
            </span>
            <span style="display:flex;align-items:center;gap:0.4rem;">
              <i data-lucide="clock" style="width:16px;height:16px;color:var(--accent-400);"></i>
              <span>${post.read_time_min || 1} ${tr.blog.readTime}</span>
            </span>
            <span style="display:flex;align-items:center;gap:0.4rem;">
              <i data-lucide="image" style="width:16px;height:16px;color:var(--accent-400);"></i>
              <span>${post.image_count || (post.images ? post.images.length : 0)} fotos</span>
            </span>
            <span style="display:flex;align-items:center;gap:0.4rem;">
              <span class="badge badge-blue" style="font-size:0.75rem;">Registo #${post.id}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Main Article Body -->
      <div class="container">
        <div class="post-content-container">
          <!-- Back Link -->
          <div style="margin-bottom:1.75rem;">
            <a href="#blog" class="btn btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:0.4rem;">
              <i data-lucide="arrow-left" style="width:15px;height:15px;"></i>
              <span>${tr.blog.backToBlog}</span>
            </a>
          </div>

          <!-- Featured Image (Imagem de Destaque) -->
          ${featuredImg ? `
            <div class="post-featured-image-wrapper" onclick="window.openLightbox(${post.id}, 0)" title="Clique para ver em ecrã completo">
              <img src="${featuredImg}" alt="${post.title}" loading="eager" onerror="this.parentElement.style.display='none'" />
              <div class="featured-image-badge">
                <i data-lucide="sparkles" style="width:14px;height:14px;color:var(--accent-400);"></i>
                <span>Imagem de Destaque</span>
              </div>
              <div class="featured-image-expand-hint">
                <i data-lucide="maximize-2" style="width:15px;height:15px;"></i>
                <span>Ver em ecrã completo</span>
              </div>
            </div>
          ` : ''}

          <!-- Post Main Text (Conteúdo do Artigo) -->
          <div class="post-main-text">${post.content}</div>

          <!-- Masonry Photo Gallery -->
          ${post.images && post.images.length > 0 ? `
            <div class="masonry-gallery-wrapper">
              <div class="masonry-gallery-header">
                <div>
                  <h3 class="masonry-gallery-title">
                    <i data-lucide="image" style="width:24px;height:24px;color:var(--primary-600);"></i>
                    Galeria Fotográfica de Campo (${post.images.length} fotos)
                  </h3>
                  <p style="color:var(--slate-500);font-size:0.9rem;margin-top:0.35rem;">
                    Registos documentados das actividades e impacto da ADDESSO na comunidade
                  </p>
                </div>
                <span class="gallery-hint-pill">
                  <i data-lucide="maximize-2" style="width:14px;height:14px;"></i> Clique em qualquer foto para ampliar
                </span>
              </div>

              <div class="masonry-gallery-grid">
                ${post.images.map((img, idx) => `
                  <div class="masonry-gallery-item" onclick="window.openLightbox(${post.id}, ${idx})" title="Foto ${idx + 1} de ${post.images.length}">
                    <img src="${img}" alt="Registo de Campo ${idx + 1}" loading="lazy" onerror="this.src='./default_cover.png'" />
                    <div class="masonry-item-overlay">
                      <span class="masonry-photo-number">#${idx + 1}</span>
                      <span class="masonry-zoom-btn">
                        <i data-lucide="maximize-2" style="width:15px;height:15px;"></i>
                        Ampliar
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Social Sharing & WhatsApp Preview Bar -->
          <div style="margin-top:3.5rem;background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.75rem;">
            <strong style="display:block;font-size:1.05rem;color:var(--slate-900);margin-bottom:0.5rem;">
              ${tr.blog.shareText}
            </strong>
            <p style="font-size:0.88rem;color:var(--slate-500);margin-bottom:1.25rem;">
              Ajude a amplificar a voz das comunidades apoiadas pela ADDESSO em Moçambique.
            </p>
            <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
              <button class="btn btn-accent btn-sm" onclick="window.sharePostWhatsApp('${escapeHtml(post.title)}', ${post.id})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                Partilhar no WhatsApp
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.sharePostFacebook(${post.id})">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.sharePostTwitter('${escapeHtml(post.title)}', ${post.id})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X / Twitter
              </button>
              <button class="btn btn-outline btn-sm" onclick="window.copyPostLink(${post.id})">
                <i data-lucide="copy" style="width:15px;height:15px;"></i> Copiar Link
              </button>
            </div>
          </div>

          <!-- Adjacent Next / Previous Post Navigation -->
          <div class="post-adjacent-nav">
            ${prevPost ? `
              <div class="adjacent-post-card" onclick="window.navigateTo('#post/${prevPost.id}')">
                <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--slate-400);margin-bottom:0.25rem;display:flex;align-items:center;gap:0.35rem;">
                  <i data-lucide="arrow-left" style="width:13px;height:13px;"></i> ${tr.blog.prevPost}
                </span>
                <strong style="font-size:0.95rem;color:var(--slate-900);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                  ${prevPost.title}
                </strong>
              </div>
            ` : '<div></div>'}

            ${nextPost ? `
              <div class="adjacent-post-card" style="text-align:right;" onclick="window.navigateTo('#post/${nextPost.id}')">
                <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--slate-400);margin-bottom:0.25rem;display:inline-flex;align-items:center;gap:0.35rem;justify-content:flex-end;">
                  ${tr.blog.nextPost} <i data-lucide="arrow-right" style="width:13px;height:13px;"></i>
                </span>
                <strong style="font-size:0.95rem;color:var(--slate-900);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                  ${nextPost.title}
                </strong>
              </div>
            ` : '<div></div>'}
          </div>
        </div>
      </div>

      <!-- Related Posts from same category -->
      ${related.length > 0 ? `
        <div class="related-posts-section">
          <div class="container">
            <h3 style="font-size:1.5rem;color:var(--slate-900);margin-bottom:2rem;text-align:center;">
              ${tr.blog.relatedPosts}
            </h3>
            <div class="posts-grid">
              ${related.map(p => renderPostCard(p, tr)).join('')}
            </div>
          </div>
        </div>
      ` : ''}
    </article>
  `;
}

/* ==========================================================================
   ROUTE PAGES
   ========================================================================== */

function renderRouteContent(route, tr) {
  switch (route) {
    case 'sobre':
      return renderSobrePage(tr);
    case 'projectos':
      return renderProjectosPage(tr);
    case 'cba':
      return renderCbaPage(tr);
    case 'blog':
      return renderBlogPage(tr);
    case 'participar':
      return renderParticiparPage(tr);
    case 'contactos':
      return renderContactosPage(tr);
    case 'admin':
      return renderAdminPage(tr);
    case 'home':
    default:
      return renderHomePage(tr);
  }
}

function renderHomePage(tr) {
  const recentPosts = [...state.posts].reverse().slice(0, 3);
  const totalPosts = state.posts.length;

  return `
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container">
        <div class="hero-grid">
          <div>
            <div class="section-tag">
              <i data-lucide="sparkles" style="width:14px;height:14px;"></i>
              ${tr.hero.badge}
            </div>
            <h1 class="hero-headline">
              Unidos pela <span class="text-brand">Transformação Social</span> e <span class="text-amber">Cidadania Activa</span>
            </h1>
            <p class="hero-description">
              ${tr.hero.subtitle}
            </p>
            <div class="hero-ctas">
              <a href="#blog" class="btn btn-primary btn-lg">
                <i data-lucide="book-open" style="width:18px;height:18px;"></i>
                ${tr.hero.exploreBtn} (${totalPosts})
              </a>
              <a href="#cba" class="btn btn-outline btn-lg">
                <i data-lucide="landmark" style="width:18px;height:18px;"></i>
                ${tr.hero.cbaBtn}
              </a>
            </div>
            <div class="hero-badges-strip">
              <div class="hero-badge-item">
                <div style="width:9px;height:9px;border-radius:50%;background:var(--primary-500);"></div>
                <span>${tr.hero.yearsBadge}</span>
              </div>
              <div class="hero-badge-item">
                <div style="width:9px;height:9px;border-radius:50%;background:var(--accent-500);"></div>
                <span>${tr.hero.photosBadge}</span>
              </div>
              <div class="hero-badge-item">
                <div style="width:9px;height:9px;border-radius:50%;background:var(--green-500);"></div>
                <span>${tr.hero.partnersBadge}</span>
              </div>
            </div>
          </div>

          <!-- Hero Visual Frame with Real Archive Photo -->
          <div class="hero-visual-card">
            <div class="hero-main-photo-frame">
              <img src="./archive_images/2025-06-17_01/image_01.jpg" alt="Centro de Boas Acções ADDESSO Inauguração" onerror="this.src='./logo_cropped.png'" />
            </div>
            <div class="hero-float-card hero-float-1">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;">
                <i data-lucide="users" style="width:20px;height:20px;"></i>
              </div>
              <div>
                <strong style="display:block;font-size:0.95rem;color:var(--slate-900);">Polana Caniço "A"</strong>
                <span style="font-size:0.78rem;color:var(--slate-500);">Centro Comunitário Activo</span>
              </div>
            </div>
            <div class="hero-float-card hero-float-2">
              <div style="width:40px;height:40px;border-radius:50%;background:rgba(245,158,11,0.2);color:var(--accent-400);display:flex;align-items:center;justify-content:center;">
                <i data-lucide="sprout" style="width:20px;height:20px;"></i>
              </div>
              <div>
                <strong style="display:block;font-size:0.95rem;">Horta no Quintal</strong>
                <span style="font-size:0.78rem;color:var(--slate-300);">Segurança Alimentar</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Impact Metrics Bar -->
    <div class="impact-bar-wrapper">
      <div class="container">
        <div class="impact-grid">
          <div class="impact-item">
            <div class="impact-number">${orgInfo.stats.yearsOfImpact}</div>
            <div class="impact-label">${tr.stats.years}</div>
          </div>
          <div class="impact-item">
            <div class="impact-number">${totalPosts}+</div>
            <div class="impact-label">${tr.stats.actions}</div>
          </div>
          <div class="impact-item">
            <div class="impact-number">${orgInfo.stats.catalogedPhotos}</div>
            <div class="impact-label">${tr.stats.photos}</div>
          </div>
          <div class="impact-item">
            <div class="impact-number">${orgInfo.stats.directBeneficiaries}</div>
            <div class="impact-label">${tr.stats.beneficiaries}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5 Pilares de Acção -->
    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <div style="text-align:center;max-width:720px;margin:0 auto 3.5rem;">
          <div class="section-tag">${tr.pillars.tag}</div>
          <h2 class="section-title">${tr.pillars.title}</h2>
          <p class="section-subtitle" style="margin:0 auto;">
            ${tr.pillars.subtitle}
          </p>
        </div>

        <div class="pillars-grid">
          ${orgInfo.pillars.map(pillar => `
            <div class="pillar-card" style="--pillar-color: ${pillar.color};">
              <div class="pillar-icon-box">
                <i data-lucide="${pillar.icon}" style="width:26px;height:26px;"></i>
              </div>
              <span class="badge ${pillar.badge === 'Educação' ? 'badge-blue' : pillar.badge === 'Juventude' ? 'badge-gold' : pillar.badge === 'Agricultura' ? 'badge-emerald' : 'badge-terracotta'}" style="align-self:flex-start;margin-bottom:0.75rem;">
                ${pillar.badge}
              </span>
              <h3 class="pillar-title">${pillar.title}</h3>
              <p class="pillar-summary">${pillar.summary}</p>
              <ul class="pillar-list">
                ${pillar.initiatives.map(item => `
                  <li>
                    <i data-lucide="check" style="width:16px;height:16px;"></i>
                    <span>${item}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Centro de Boas Acções Spotlight Section -->
    <section class="section-padding" style="background-color:var(--bg-subtle);">
      <div class="container">
        <div class="cba-spotlight">
          <div class="cba-grid">
            <div>
              <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
                ${tr.cba.tag}
              </div>
              <h2 style="font-size:clamp(2rem,3.5vw,2.8rem);color:#ffffff;margin-bottom:1.25rem;">
                ${tr.cba.title}
              </h2>
              <p style="font-size:1.05rem;color:rgba(255,255,255,0.9);line-height:1.7;margin-bottom:2rem;">
                ${tr.cba.subtitle}
              </p>
              <div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:2rem;">
                <div class="cba-feature-pill">
                  <i data-lucide="book-open" style="width:20px;height:20px;color:var(--primary-200);"></i>
                  <span>${tr.cba.f1}</span>
                </div>
                <div class="cba-feature-pill">
                  <i data-lucide="users" style="width:20px;height:20px;color:var(--accent-300);"></i>
                  <span>${tr.cba.f2}</span>
                </div>
                <div class="cba-feature-pill">
                  <i data-lucide="sprout" style="width:20px;height:20px;color:var(--green-100);"></i>
                  <span>${tr.cba.f3}</span>
                </div>
              </div>
              <a href="#cba" class="btn btn-accent btn-lg">
                <span>${tr.cba.detailsBtn}</span>
                <i data-lucide="arrow-right" style="width:18px;height:18px;"></i>
              </a>
            </div>

            <!-- Gallery Grid with Real Photos -->
            <div class="cba-gallery-preview">
              <div class="cba-photo-card">
                <img src="./archive_images/2025-06-17_01/image_02.jpg" alt="Inauguração do CBA" onerror="this.src='./logo_cropped.png'" />
              </div>
              <div class="cba-photo-card">
                <img src="./archive_images/2026-07-26_01/image_01.jpg" alt="Capacitação de Jovens" onerror="this.src='./logo_cropped.png'" />
              </div>
              <div class="cba-photo-card">
                <img src="./archive_images/2026-08-14_01/image_01.jpg" alt="Mini Semana da Juventude" onerror="this.src='./logo_cropped.png'" />
              </div>
              <div class="cba-photo-card">
                <img src="./archive_images/2021-10-16_01/image_01.jpg" alt="Crianças e Cultura" onerror="this.src='./logo_cropped.png'" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Latest From Field (Blog Highlights) -->
    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:3rem;flex-wrap:wrap;gap:1.5rem;">
          <div>
            <div class="section-tag">${tr.blog.tag}</div>
            <h2 class="section-title">Últimos Registos Comunitários</h2>
            <p class="section-subtitle" style="margin-bottom:0;">
              Todas as acções da ADDESSO desde os primeiros passos em 2017 até aos dias actuais.
            </p>
          </div>
          <a href="#blog" class="btn btn-primary">
            <span>Ver Todos os ${totalPosts} Registos</span>
            <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
          </a>
        </div>

        <div class="posts-grid">
          ${recentPosts.map(post => renderPostCard(post, tr)).join('')}
        </div>
      </div>
    </section>

    <!-- Interactive Donation & CTA Banner -->
    <section class="section-padding" style="background:linear-gradient(135deg, #0c4a6e, #082f49);color:#ffffff;">
      <div class="container">
        <div style="text-align:center;max-width:760px;margin:0 auto 3rem;">
          <div class="section-tag" style="background:rgba(245,158,11,0.2);color:var(--accent-300);border-color:rgba(245,158,11,0.4);">
            ${tr.donation.tag}
          </div>
          <h2 style="font-size:clamp(2.2rem,4vw,3.2rem);color:#ffffff;margin-bottom:1.25rem;">
            ${tr.donation.title}
          </h2>
          <p style="font-size:1.1rem;color:var(--slate-300);line-height:1.7;">
            ${tr.donation.subtitle}
          </p>
        </div>

        <div style="display:flex;justify-content:center;gap:1.25rem;flex-wrap:wrap;">
          <a href="#participar" class="btn btn-accent btn-lg">
            <i data-lucide="heart" style="width:20px;height:20px;"></i>
            <span>${tr.donation.mpesaBtn}</span>
          </a>
          <a href="#participar" class="btn btn-outline-white btn-lg">
            <i data-lucide="users" style="width:20px;height:20px;"></i>
            <span>${tr.donation.volunteerBtn}</span>
          </a>
        </div>
      </div>
    </section>
  `;
}

function renderSobrePage(tr) {
  return `
    <div style="background:linear-gradient(135deg, #0c4a6e, #0f172a);color:#ffffff;padding:4.5rem 0 3.5rem;">
      <div class="container">
        <div class="section-tag" style="background:rgba(14,165,233,0.2);color:var(--primary-300);border-color:rgba(14,165,233,0.4);">
          Sobre a Nossa Organização
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;">
          Quem Somos & O Que Nos Move
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-300);max-width:720px;line-height:1.7;">
          A ADDESSO – Associação para a Defesa e Desenvolvimento da Sociedade – nasceu em 2009 com a convicção de que o desenvolvimento comunitário se constrói com as pessoas e para as pessoas.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3.5rem;align-items:center;margin-bottom:5rem;">
          <div>
            <div class="section-tag">A Nossa Origem</div>
            <h2 class="section-title">Mais de 17 Anos no Terreno</h2>
            <p style="color:var(--slate-600);font-size:1.05rem;line-height:1.75;margin-bottom:1.5rem;">
              Desde a sua formalização em 2009, a ADDESSO tem trabalhado incansavelmente nos bairros periféricos de Maputo e províncias vizinhas. Desde intervenções pioneiras no povoado de Djabula (Matutuíne), até à criação do Projecto Creche Familiar e à consolidação do Centro de Boas Acções na Polana Caniço "A".
            </p>
            <p style="color:var(--slate-600);font-size:1.05rem;line-height:1.75;">
              A organização actua como uma ponte sólida entre a comunidade local, o meio académico (Universidade Eduardo Mondlane), a sociedade civil e os parceiros de cooperação internacional, sempre com foco em resultados tangíveis e sustentáveis.
            </p>
          </div>
          <div style="position:relative;border-radius:var(--radius-2xl);overflow:hidden;box-shadow:var(--shadow-xl);border:4px solid #ffffff;">
            <img src="./archive_images/2021-09-05_01/image_01.jpg" alt="Acção Comunitária Histórica ADDESSO" onerror="this.src='./logo_cropped.png'" />
          </div>
        </div>

        <!-- Missão e Visão -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:2rem;margin-bottom:5rem;">
          <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:2.25rem;">
            <div style="width:48px;height:48px;border-radius:var(--radius-md);background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;">
              <i data-lucide="sparkles"></i>
            </div>
            <h3 style="font-size:1.4rem;margin-bottom:0.75rem;">A Nossa Missão</h3>
            <p style="color:var(--slate-600);line-height:1.7;font-size:0.95rem;">${orgInfo.mission}</p>
          </div>

          <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:2.25rem;">
            <div style="width:48px;height:48px;border-radius:var(--radius-md);background:var(--accent-100);color:var(--accent-700);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;">
              <i data-lucide="eye"></i>
            </div>
            <h3 style="font-size:1.4rem;margin-bottom:0.75rem;">A Nossa Visão</h3>
            <p style="color:var(--slate-600);line-height:1.7;font-size:0.95rem;">${orgInfo.vision}</p>
          </div>
        </div>

        <!-- Valores Fundamentais -->
        <div style="margin-bottom:5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Princípios Éticos</div>
            <h2 class="section-title">Os Nossos Valores</h2>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:1.5rem;">
            ${orgInfo.values.map(val => `
              <div style="background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.5rem;box-shadow:var(--shadow-xs);">
                <h4 style="font-size:1.1rem;color:var(--primary-800);margin-bottom:0.5rem;">${val.name}</h4>
                <p style="font-size:0.9rem;color:var(--slate-600);line-height:1.6;">${val.description}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Parceiros Oficiais -->
        <div>
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Rede de Cooperação</div>
            <h2 class="section-title">Parceiros Institucionais</h2>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.75rem;">
            ${orgInfo.partners.map(p => `
              <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.5rem;">
                <span class="badge badge-purple" style="margin-bottom:0.75rem;">${p.type}</span>
                <h4 style="font-size:1.15rem;margin-bottom:0.5rem;color:var(--slate-900);">${p.name}</h4>
                <p style="font-size:0.88rem;color:var(--slate-600);line-height:1.6;">${p.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderProjectosPage(tr) {
  return `
    <div style="background:linear-gradient(135deg, #0c4a6e, #0f172a);color:#ffffff;padding:4.5rem 0 3.5rem;">
      <div class="container">
        <div class="section-tag" style="background:rgba(245,158,11,0.2);color:var(--accent-300);border-color:rgba(245,158,11,0.4);">
          Áreas de Intervenção
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;">
          Projectos & Programas de Impacto
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-300);max-width:720px;line-height:1.7;">
          Conheça em detalhe os programas que transformam diariamente a vida de milhares de famílias e jovens moçambicanos.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <div style="display:flex;flex-direction:column;gap:4rem;">
          ${orgInfo.pillars.map((pillar, idx) => `
            <div style="display:grid;grid-template-columns:${idx % 2 === 0 ? '1.1fr 0.9fr' : '0.9fr 1.1fr'};gap:3rem;align-items:center;background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:clamp(1.5rem,3vw,3rem);">
              <div style="order:${idx % 2 === 0 ? 1 : 2};">
                <span class="badge ${pillar.badge === 'Educação' ? 'badge-blue' : pillar.badge === 'Juventude' ? 'badge-gold' : pillar.badge === 'Agricultura' ? 'badge-emerald' : 'badge-terracotta'}" style="margin-bottom:1rem;">
                  ${pillar.badge}
                </span>
                <h2 style="font-size:clamp(1.75rem,2.8vw,2.4rem);margin-bottom:1rem;color:var(--slate-900);">
                  ${pillar.title}
                </h2>
                <p style="font-size:1.05rem;color:var(--slate-600);line-height:1.7;margin-bottom:1.5rem;">
                  ${pillar.summary}
                </p>
                <h4 style="font-size:1rem;font-weight:700;color:var(--slate-800);margin-bottom:0.75rem;">Principais Iniciativas:</h4>
                <ul style="list-style:none;display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1.75rem;">
                  ${pillar.initiatives.map(item => `
                    <li style="display:flex;align-items:flex-start;gap:0.5rem;font-size:0.95rem;color:var(--slate-700);">
                      <i data-lucide="check" style="width:16px;height:16px;color:var(--primary-600);flex-shrink:0;margin-top:2px;"></i>
                      <span>${item}</span>
                    </li>
                  `).join('')}
                </ul>
                <a href="#blog" class="btn btn-outline btn-sm" onclick="filterBlogByCategory('${pillar.title}')">
                  <span>${tr.pillars.viewPosts}</span>
                  <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
                </a>
              </div>
              <div style="order:${idx % 2 === 0 ? 2 : 1};border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-lg);border:3px solid #ffffff;aspect-ratio:4/3;background:#000;">
                <img src="./archive_images/${idx === 0 ? '2021-10-16_01/image_01.jpg' : idx === 1 ? '2026-08-14_01/image_01.jpg' : idx === 2 ? '2020-09-13_01/image_01.jpg' : idx === 3 ? '2026-01-21_01/image_01.jpg' : '2021-09-05_01/image_01.jpg'}" alt="${pillar.title}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='./logo_cropped.png'" />
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function renderCbaPage(tr) {
  return `
    <div style="background:linear-gradient(135deg, #0c4a6e, #0369a1);color:#ffffff;padding:5rem 0 4rem;">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          ${tr.cba.tag}
        </div>
        <h1 style="font-size:clamp(2.4rem,4.5vw,3.6rem);color:#ffffff;margin-bottom:1rem;">
          ${tr.cba.title}
        </h1>
        <p style="font-size:1.2rem;color:rgba(255,255,255,0.9);max-width:760px;line-height:1.7;">
          O coração das actividades da ADDESSO no Bairro da Polana Caniço "A", em Maputo. Um centro vibrante de oportunidade, aprendizagem, liderança e cidadania.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:3.5rem;align-items:center;margin-bottom:4rem;">
          <div>
            <div class="section-tag">Espaço Comunitário Aberto</div>
            <h2 class="section-title">A Nossa Casa Comunitária</h2>
            <p style="color:var(--slate-600);font-size:1.05rem;line-height:1.75;margin-bottom:1.5rem;">
              ${orgInfo.cba.description}
            </p>
            <div style="background:var(--primary-50);border:1px solid var(--primary-200);border-radius:var(--radius-lg);padding:1.25rem;margin-bottom:1.5rem;">
              <strong style="color:var(--primary-900);display:block;margin-bottom:0.35rem;">Horário de Funcionamento:</strong>
              <p style="color:var(--primary-800);font-size:0.95rem;margin:0;">${orgInfo.cba.schedule}</p>
            </div>
            <div style="background:var(--slate-50);border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.25rem;">
              <strong style="color:var(--slate-900);display:block;margin-bottom:0.35rem;">Localização:</strong>
              <p style="color:var(--slate-700);font-size:0.95rem;margin:0;">${orgInfo.cba.location} (Distrito Municipal KaMavota / KaMaxaquene)</p>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:1rem;">
            <div style="border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-lg);aspect-ratio:16/10;">
              <img src="./archive_images/2025-06-17_01/image_01.jpg" alt="Inauguração do CBA" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='./logo_cropped.png'" />
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div style="border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-md);aspect-ratio:4/3;">
                <img src="./archive_images/2026-07-26_01/image_01.jpg" alt="Capacitação no CBA" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='./logo_cropped.png'" />
              </div>
              <div style="border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-md);aspect-ratio:4/3;">
                <img src="./archive_images/2026-08-14_01/image_01.jpg" alt="Mini Semana da Juventude" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='./logo_cropped.png'" />
              </div>
            </div>
          </div>
        </div>

        <div style="margin-bottom:4rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Instalações & Serviços</div>
            <h2 class="section-title">O Que Acontece no Centro</h2>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.75rem;">
            ${orgInfo.cba.features.map(feat => `
              <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.75rem;display:flex;align-items:flex-start;gap:1rem;">
                <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i data-lucide="check" style="width:20px;height:20px;"></i>
                </div>
                <div>
                  <h4 style="font-size:1.1rem;color:var(--slate-900);margin-bottom:0.25rem;">${feat}</h4>
                  <p style="font-size:0.88rem;color:var(--slate-600);">Espaço comunitário aberto à juventude, infância e idosos do bairro.</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background:linear-gradient(135deg, #0c4a6e, #082f49);color:#ffffff;border-radius:var(--radius-2xl);padding:3rem;text-align:center;">
          <h3 style="font-size:1.8rem;margin-bottom:1rem;color:#ffffff;">Quer Visitar ou Ser Voluntário no Centro de Boas Acções?</h3>
          <p style="color:var(--slate-300);max-width:600px;margin:0 auto 2rem;font-size:1.05rem;">
            Venha conhecer de perto as nossas actividades pedagógicas e oficinas de liderança com os jovens da Polana Caniço.
          </p>
          <div style="display:flex;justify-content:center;gap:1rem;flex-wrap:wrap;">
            <a href="#participar" class="btn btn-primary btn-lg">Inscrever-se como Voluntário</a>
            <a href="#contactos" class="btn btn-outline-white btn-lg">Agendar Visita</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderBlogPage(tr) {
  let filtered = [...state.posts];

  if (state.selectedCategory !== 'all') {
    filtered = filtered.filter(p => p.categories && p.categories.includes(state.selectedCategory));
  }

  if (state.selectedYear !== 'all') {
    filtered = filtered.filter(p => p.date && p.date.startsWith(state.selectedYear));
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      (p.title && p.title.toLowerCase().includes(q)) || 
      (p.content && p.content.toLowerCase().includes(q)) ||
      (p.date && p.date.includes(q))
    );
  }

  if (state.sortOrder === 'asc') {
    filtered.sort((a, b) => a.id - b.id);
  } else {
    filtered.sort((a, b) => b.id - a.id);
  }

  const years = ['all', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

  return `
    <div style="background:linear-gradient(135deg, #0c4a6e, #0f172a);color:#ffffff;padding:4.5rem 0 3rem;">
      <div class="container">
        <div class="section-tag" style="background:rgba(14,165,233,0.2);color:var(--primary-300);border-color:rgba(14,165,233,0.4);">
          ${tr.blog.tag}
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;">
          ${tr.blog.title}
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-300);max-width:720px;line-height:1.7;">
          ${tr.blog.subtitle} Repositório vivo de <strong>${state.posts.length} publicações</strong> e mais de <strong>700 fotografias</strong> documentando a transformação social.
        </p>
      </div>
    </div>

    <section class="blog-section section-padding">
      <div class="container">
        <!-- Filter Controls Box -->
        <div class="blog-controls-card">
          <!-- Row 1: Search & Sorting Order -->
          <div class="blog-search-row">
            <div class="search-input-box">
              <i data-lucide="search" class="search-icon" style="width:18px;height:18px;"></i>
              <input type="text" id="blog-search" placeholder="${tr.blog.searchPlaceholder}" value="${state.searchQuery}" />
            </div>

            <!-- Sort Direction Toggle -->
            <div class="sort-order-toggle">
              <button id="sort-asc-btn" class="sort-order-btn ${state.sortOrder === 'asc' ? 'active' : ''}">
                <i data-lucide="arrow-right" style="width:14px;height:14px;display:inline;margin-right:3px;"></i>
                ${tr.blog.orderAsc}
              </button>
              <button id="sort-desc-btn" class="sort-order-btn ${state.sortOrder === 'desc' ? 'active' : ''}">
                <i data-lucide="arrow-left" style="width:14px;height:14px;display:inline;margin-right:3px;"></i>
                ${tr.blog.orderDesc}
              </button>
            </div>

            <!-- View Switcher -->
            <div class="sort-order-toggle">
              <button id="view-grid-btn" class="sort-order-btn ${state.viewMode === 'grid' ? 'active' : ''}">
                <i data-lucide="layers" style="width:14px;height:14px;display:inline;margin-right:3px;"></i>
                ${tr.blog.viewGrid}
              </button>
              <button id="view-timeline-btn" class="sort-order-btn ${state.viewMode === 'timeline' ? 'active' : ''}">
                <i data-lucide="list-filter" style="width:14px;height:14px;display:inline;margin-right:3px;"></i>
                ${tr.blog.viewTimeline}
              </button>
            </div>
          </div>

          <!-- Row 2: Category Filter Pills -->
          <div style="margin-bottom:1rem;">
            <strong style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--slate-500);display:block;margin-bottom:0.5rem;">
              ${tr.blog.filterCat}
            </strong>
            <div class="filter-pills-row">
              <button class="filter-pill ${state.selectedCategory === 'all' ? 'active' : ''}" onclick="setBlogCategory('all')">
                ${tr.blog.allCats} <span class="count">${state.posts.length}</span>
              </button>
              ${ALL_CATEGORIES.map(cat => {
                const count = state.posts.filter(p => p.categories && p.categories.includes(cat)).length;
                return `
                  <button class="filter-pill ${state.selectedCategory === cat ? 'active' : ''}" onclick="setBlogCategory('${cat}')">
                    ${cat} <span class="count">${count}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Row 3: Year Filter Pills -->
          <div>
            <strong style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--slate-500);display:block;margin-bottom:0.5rem;">
              ${tr.blog.filterYear}
            </strong>
            <div class="filter-pills-row">
              ${years.map(yr => {
                const count = yr === 'all' ? state.posts.length : state.posts.filter(p => p.date && p.date.startsWith(yr)).length;
                return `
                  <button class="filter-pill ${state.selectedYear === yr ? 'active' : ''}" onclick="setBlogYear('${yr}')">
                    ${yr === 'all' ? tr.blog.allYears : yr} <span class="count">${count}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Showing Result Counter -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;color:var(--slate-600);font-size:0.95rem;flex-wrap:wrap;gap:0.75rem;">
          <div>
            ${tr.blog.showing} <strong>${filtered.length}</strong> ${tr.blog.of} <strong>${state.posts.length}</strong> ${tr.blog.posts}
          </div>
          ${(state.selectedCategory !== 'all' || state.selectedYear !== 'all' || state.searchQuery) ? `
            <button class="btn btn-outline btn-sm" onclick="resetBlogFilters()">
              <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i>
              Limpar Filtros
            </button>
          ` : ''}
        </div>

        <!-- Render Posts by Layout View -->
        ${filtered.length === 0 ? `
          <div style="text-align:center;padding:4rem 2rem;background:#ffffff;border-radius:var(--radius-xl);border:1px solid var(--slate-200);">
            <div style="width:64px;height:64px;border-radius:50%;background:var(--slate-100);color:var(--slate-400);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;">
              <i data-lucide="search" style="width:28px;height:28px;"></i>
            </div>
            <h3 style="font-size:1.4rem;color:var(--slate-800);margin-bottom:0.5rem;">Nenhuma publicação encontrada</h3>
            <button class="btn btn-primary" onclick="resetBlogFilters()">Ver Todas as Publicações</button>
          </div>
        ` : state.viewMode === 'grid' ? `
          <div class="posts-grid">
            ${filtered.map(post => renderPostCard(post, tr)).join('')}
          </div>
        ` : `
          <div class="posts-timeline">
            ${filtered.map(post => renderTimelinePostCard(post, tr)).join('')}
          </div>
        `}
      </div>
    </section>
  `;
}

function renderPostCard(post, tr) {
  const catBadge = getCategoryColor(post.primary_category);
  const cover = post.cover_image && post.cover_image !== '/logo.svg' ? post.cover_image : './default_cover.png';
  return `
    <article class="post-card" onclick="window.navigateTo('#post/${post.id}')" style="cursor:pointer;" tabindex="0" role="link">
      <div class="post-card-thumb">
        <img src="${cover}" alt="${post.title}" loading="lazy" onerror="this.src='./default_cover.png'" />
        ${post.image_count > 0 ? `
          <div class="post-img-count-badge">
            <i data-lucide="image" style="width:12px;height:12px;"></i>
            <span>${post.image_count} fotos</span>
          </div>
        ` : ''}
      </div>
      <div class="post-card-body">
        <div class="post-meta-row">
          <span class="badge ${catBadge}">${post.primary_category}</span>
          <span style="display:flex;align-items:center;gap:0.3rem;">
            <i data-lucide="calendar" style="width:13px;height:13px;"></i>
            ${formatDatePT(post.date)}
          </span>
        </div>
        <h3 class="post-card-title">
          <a href="#post/${post.id}" onclick="event.stopPropagation(); window.navigateTo('#post/${post.id}');" style="color:inherit;text-decoration:none;">${post.title}</a>
        </h3>
        <p class="post-card-excerpt">${post.excerpt || post.content.substring(0, 140) + '...'}</p>
        <div class="post-card-footer">
          <span style="display:flex;align-items:center;gap:0.35rem;font-size:0.82rem;color:var(--slate-500);">
            <i data-lucide="clock" style="width:13px;height:13px;"></i>
            ${post.read_time_min || 1} ${tr.blog.readTime}
          </span>
          <a href="#post/${post.id}" onclick="event.stopPropagation(); window.navigateTo('#post/${post.id}');" style="display:inline-flex;align-items:center;gap:0.35rem;color:var(--primary-600);font-weight:700;text-decoration:none;">
            ${tr.blog.readStory}
            <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
          </a>
        </div>
      </div>
    </article>
  `;
}

function renderTimelinePostCard(post, tr) {
  const catBadge = getCategoryColor(post.primary_category);
  return `
    <div class="timeline-post-card" onclick="window.navigateTo('#post/${post.id}')" style="cursor:pointer;" tabindex="0" role="link">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
        <span class="badge ${catBadge}">${post.primary_category}</span>
        <strong style="color:var(--primary-700);font-size:0.9rem;display:flex;align-items:center;gap:0.35rem;">
          <i data-lucide="calendar" style="width:14px;height:14px;"></i>
          ${formatDatePT(post.date)} (#${post.id})
        </strong>
      </div>
      <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:0.5rem;color:var(--slate-900);">
        <a href="#post/${post.id}" onclick="event.stopPropagation(); window.navigateTo('#post/${post.id}');" style="color:inherit;text-decoration:none;">${post.title}</a>
      </h3>
      <p style="color:var(--slate-600);font-size:0.95rem;line-height:1.6;margin-bottom:1rem;">${post.excerpt || post.content.substring(0, 180) + '...'}</p>
      
      ${post.images && post.images.length > 0 ? `
        <div style="display:flex;gap:0.5rem;overflow-x:auto;margin-bottom:1rem;">
          ${post.images.slice(0, 4).map(img => `
            <img src="${img}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;" onerror="this.src='./logo_cropped.png'" />
          `).join('')}
          ${post.images.length > 4 ? `
            <div style="width:80px;height:80px;border-radius:8px;background:var(--slate-800);color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;">
              +${post.images.length - 4}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div style="display:flex;align-items:center;gap:0.4rem;color:var(--primary-700);font-weight:600;font-size:0.9rem;">
        <a href="#post/${post.id}" onclick="event.stopPropagation(); window.navigateTo('#post/${post.id}');" style="display:inline-flex;align-items:center;gap:0.35rem;color:var(--primary-600);font-weight:700;text-decoration:none;">
          <span>${tr.blog.readStory}</span>
          <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
        </a>
      </div>
    </div>
  `;
}

function renderLightboxContent() {
  const { images, currentIndex } = state.activeLightbox;
  if (!images || images.length === 0) return '';
  const currentImg = images[currentIndex] || images[0];

  return `
    <div class="lightbox-modal-content" onclick="event.stopPropagation()">
      <!-- Top Header Bar -->
      <div class="lightbox-header">
        <div class="lightbox-counter-badge">
          <i data-lucide="image" style="width:16px;height:16px;color:var(--accent-400);"></i>
          <span>Fotografia <strong>${currentIndex + 1}</strong> de <strong>${images.length}</strong></span>
        </div>
        <button class="lightbox-close-btn" onclick="window.closeLightbox()" title="Fechar visualização (Esc)">
          <i data-lucide="x" style="width:24px;height:24px;"></i>
        </button>
      </div>

      <!-- Center Main Stage -->
      <div class="lightbox-main-view">
        ${images.length > 1 ? `
          <button class="lightbox-nav-btn prev" onclick="window.prevLightboxImage(); event.stopPropagation();" title="Fotografia Anterior (←)">
            <i data-lucide="chevron-left" style="width:28px;height:28px;"></i>
          </button>
        ` : ''}

        <div class="lightbox-image-container" onclick="event.stopPropagation()">
          <img src="${currentImg}" alt="Fotografia em alta resolução ${currentIndex + 1}" />
        </div>

        ${images.length > 1 ? `
          <button class="lightbox-nav-btn next" onclick="window.nextLightboxImage(); event.stopPropagation();" title="Próxima Fotografia (→)">
            <i data-lucide="chevron-right" style="width:28px;height:28px;"></i>
          </button>
        ` : ''}
      </div>

      <!-- Bottom Thumbnail Carousel -->
      ${images.length > 1 ? `
        <div class="lightbox-thumbs-bar" onclick="event.stopPropagation()">
          ${images.map((img, idx) => `
            <div class="lightbox-thumb-item ${currentIndex === idx ? 'active' : ''}" onclick="window.setLightboxIndex(${idx}); event.stopPropagation();" title="Ver foto ${idx + 1}">
              <img src="${img}" alt="Miniatura ${idx + 1}" onerror="this.src='./default_cover.png'" />
            </div>
          `).join('')}
        </div>
      ` : '<div></div>'}
    </div>
  `;
}

function renderParticiparPage(tr) {
  return `
    <div style="background:linear-gradient(135deg, #0c4a6e, #0f172a);color:#ffffff;padding:4.5rem 0 3.5rem;">
      <div class="container">
        <div class="section-tag" style="background:rgba(245,158,11,0.2);color:var(--accent-300);border-color:rgba(245,158,11,0.4);">
          ${tr.donation.tag}
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;">
          ${tr.donation.title}
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-300);max-width:720px;line-height:1.7;">
          ${tr.donation.subtitle}
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <!-- Donation Hub Card -->
        <div class="donation-hub-card" style="margin-bottom:5rem;">
          <div class="donation-grid">
            <div class="donation-left-pane">
              <div>
                <span class="badge badge-gold" style="margin-bottom:1rem;">Doação Directa Moçambique</span>
                <h2 style="font-size:2rem;color:#ffffff;margin-bottom:1rem;">Apoie os Nossos Projectos</h2>
                <p style="color:var(--slate-300);line-height:1.7;font-size:0.98rem;margin-bottom:2rem;">
                  Todas as contribuições financiam directamente o reforço escolar infantil, alimentação comunitária e kits de emergência.
                </p>

                <div style="display:flex;flex-direction:column;gap:1rem;">
                  ${orgInfo.donationInfo.donationPillars.map(p => `
                    <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:var(--radius-md);padding:1rem;">
                      <strong style="color:var(--accent-300);font-size:1.1rem;display:block;margin-bottom:0.25rem;">${p.amount}</strong>
                      <span style="font-size:0.85rem;color:var(--slate-300);">${p.impact}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <div class="donation-right-pane">
              <h3 style="font-size:1.5rem;color:var(--slate-900);margin-bottom:1.5rem;">${tr.donation.channelsTitle}</h3>

              <!-- M-Pesa -->
              <div class="mpesa-highlight-box">
                <div>
                  <span style="font-weight:700;font-size:0.8rem;text-transform:uppercase;color:var(--accent-700);display:block;">Vodacom M-Pesa (Moçambique)</span>
                  <strong style="font-size:1.35rem;color:var(--slate-900);">${orgInfo.donationInfo.mpesa}</strong>
                  <span style="display:block;font-size:0.8rem;color:var(--slate-500);">${orgInfo.donationInfo.mpesaName}</span>
                </div>
                <button class="btn btn-accent btn-sm" onclick="copyToClipboard('${orgInfo.donationInfo.mpesa}', 'Número M-Pesa copiado com sucesso!')">
                  <i data-lucide="copy" style="width:14px;height:14px;"></i> Copiar
                </button>
              </div>

              <!-- e-Mola -->
              <div class="mpesa-highlight-box" style="border-color:var(--primary-500);background:rgba(14,165,233,0.08);margin-top:1rem;">
                <div>
                  <span style="font-weight:700;font-size:0.8rem;text-transform:uppercase;color:var(--primary-700);display:block;">Movitel e-Mola</span>
                  <strong style="font-size:1.35rem;color:var(--slate-900);">${orgInfo.donationInfo.emola}</strong>
                  <span style="display:block;font-size:0.8rem;color:var(--slate-500);">${orgInfo.donationInfo.mpesaName}</span>
                </div>
                <button class="btn btn-outline btn-sm" onclick="copyToClipboard('${orgInfo.donationInfo.emola}', 'Número e-Mola copiado com sucesso!')">
                  <i data-lucide="copy" style="width:14px;height:14px;"></i> Copiar
                </button>
              </div>

              <!-- Bank Transfer -->
              <div style="background:var(--slate-50);border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.25rem;margin-top:1.5rem;">
                <h4 style="font-size:1.05rem;color:var(--slate-900);margin-bottom:0.75rem;">Transferência Bancária (BCI)</h4>
                <div style="display:flex;flex-direction:column;gap:0.4rem;font-size:0.88rem;color:var(--slate-700);">
                  <div><strong>Banco:</strong> ${orgInfo.donationInfo.bank}</div>
                  <div><strong>Conta:</strong> ${orgInfo.donationInfo.accountNumber}</div>
                  <div><strong>NIB:</strong> ${orgInfo.donationInfo.nib}</div>
                  <div><strong>IBAN:</strong> ${orgInfo.donationInfo.iban}</div>
                  <div><strong>SWIFT:</strong> ${orgInfo.donationInfo.swift}</div>
                </div>
                <button class="btn btn-outline btn-sm" style="margin-top:1rem;width:100%;" onclick="copyToClipboard('${orgInfo.donationInfo.iban}', 'IBAN do BCI copiado!')">
                  <i data-lucide="copy" style="width:14px;height:14px;"></i> Copiar Dados Bancários
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Volunteer Form -->
        <div style="max-width:800px;margin:0 auto;background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:clamp(2rem,4vw,3.5rem);">
          <div style="text-align:center;margin-bottom:2.5rem;">
            <div class="section-tag">Junte-se à Equipa</div>
            <h2 class="section-title">Inscrição para Voluntariado</h2>
            <p style="color:var(--slate-600);">Preencha o formulário para se tornar voluntário comunitário ou universitário na ADDESSO.</p>
          </div>

          <form id="volunteer-form" onsubmit="handleVolunteerSubmit(event)" style="display:flex;flex-direction:column;gap:1.25rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Nome Completo *</label>
                <input type="text" required placeholder="Seu nome" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);" />
              </div>
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Contacto Telefónico / WhatsApp *</label>
                <input type="tel" required placeholder="+258 84 000 0000" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);" />
              </div>
            </div>

            <div>
              <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Endereço de E-mail</label>
              <input type="email" placeholder="seuemail@exemplo.com" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);" />
            </div>

            <div>
              <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Área de Interesse de Voluntariado *</label>
              <select required style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);background:#ffffff;">
                <option value="Apoio Pedagógico & Reforço Escolar (CBA Polana Caniço)">Apoio Pedagógico & Reforço Escolar (CBA Polana Caniço)</option>
                <option value="Oficinas de Liderança Juvenil, Artes e Informática">Oficinas de Liderança Juvenil, Artes e Informática</option>
                <option value="Projecto Horta no Quintal & Agricultura Urbana">Projecto Horta no Quintal & Agricultura Urbana</option>
                <option value="Resposta Humanitária, Saúde & Calamidades">Resposta Humanitária, Saúde & Calamidades</option>
                <option value="Comunicação, Redes Sociais e Fotografia">Comunicação, Redes Sociais e Fotografia</option>
              </select>
            </div>

            <div>
              <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Mensagem / Disponibilidade</label>
              <textarea rows="4" placeholder="Conte-nos um pouco sobre a sua motivação e horários disponíveis..." style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);"></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="margin-top:0.5rem;">
              <i data-lucide="heart" style="width:18px;height:18px;"></i>
              Submeter Candidatura de Voluntariado
            </button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderContactosPage(tr) {
  return `
    <div style="background:linear-gradient(135deg, #0c4a6e, #0f172a);color:#ffffff;padding:4.5rem 0 3.5rem;">
      <div class="container">
        <div class="section-tag" style="background:rgba(14,165,233,0.2);color:var(--primary-300);border-color:rgba(14,165,233,0.4);">
          ${tr.contact.tag}
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;">
          ${tr.contact.title}
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-300);max-width:720px;line-height:1.7;">
          ${tr.contact.subtitle}
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4rem;">
          <div>
            <h2 class="section-title" style="margin-bottom:2rem;">Canais Oficiais</h2>
            
            <div style="display:flex;flex-direction:column;gap:1.5rem;">
              <div style="display:flex;align-items:flex-start;gap:1rem;background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.5rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i data-lucide="map-pin"></i>
                </div>
                <div>
                  <strong style="display:block;font-size:1.1rem;color:var(--slate-900);margin-bottom:0.25rem;">Sede & Centro de Boas Acções</strong>
                  <p style="color:var(--slate-600);font-size:0.95rem;margin:0;">${orgInfo.headquarters.address}</p>
                </div>
              </div>

              <div style="display:flex;align-items:flex-start;gap:1rem;background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.5rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-100);color:var(--accent-700);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i data-lucide="phone"></i>
                </div>
                <div>
                  <strong style="display:block;font-size:1.1rem;color:var(--slate-900);margin-bottom:0.25rem;">Telefones / WhatsApp Directo</strong>
                  <p style="color:var(--slate-600);font-size:0.95rem;margin:0;">+258 84 635 7890 / +258 87 652 5150</p>
                </div>
              </div>

              <div style="display:flex;align-items:flex-start;gap:1rem;background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.5rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i data-lucide="mail"></i>
                </div>
                <div>
                  <strong style="display:block;font-size:1.1rem;color:var(--slate-900);margin-bottom:0.25rem;">Correio Electrónico</strong>
                  <p style="color:var(--slate-600);font-size:0.95rem;margin:0;">info@addesso.org.mz / addesso.org@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:2.5rem;">
            <h3 style="font-size:1.5rem;color:var(--slate-900);margin-bottom:1.5rem;">Envie-nos uma Mensagem Directa</h3>
            <form onsubmit="handleContactSubmit(event)" style="display:flex;flex-direction:column;gap:1.25rem;">
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Seu Nome *</label>
                <input type="text" required placeholder="Nome e Apelido" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);background:#ffffff;" />
              </div>
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">E-mail ou WhatsApp *</label>
                <input type="text" required placeholder="Contacto directo" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);background:#ffffff;" />
              </div>
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Assunto</label>
                <input type="text" placeholder="Ex: Proposta de Parceria, Visita, Informação" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);background:#ffffff;" />
              </div>
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Mensagem *</label>
                <textarea required rows="4" placeholder="Escreva a sua mensagem aqui..." style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-300);border-radius:var(--radius-md);background:#ffffff;"></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-lg">
                <i data-lucide="mail" style="width:18px;height:18px;"></i>
                ${tr.contact.sendBtn}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAdminPage(tr) {
  const totalPosts = state.posts.length;
  const totalImages = state.posts.reduce((sum, p) => sum + (p.image_count || 0), 0);

  return `
    <div style="background:linear-gradient(135deg, #0c4a6e, #0f172a);color:#ffffff;padding:3.5rem 0 2.5rem;">
      <div class="container">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
          <div>
            <div class="section-tag" style="background:rgba(245,158,11,0.25);color:var(--accent-400);border-color:rgba(245,158,11,0.4);">
              Área Administrativa & Construtor de Conteúdos
            </div>
            <h1 style="font-size:clamp(2rem,3.5vw,2.8rem);color:#ffffff;margin-bottom:0.5rem;">
              Painel de Gestão do Blog ADDESSO
            </h1>
            <p style="color:var(--slate-300);font-size:1rem;">
              Criar novos posts com Drag & Drop de imagens, reordenar a sequência cronológica e exportar backups.
            </p>
          </div>

          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button class="btn btn-outline-white btn-sm" onclick="exportPostsJSON()">
              <i data-lucide="download" style="width:16px;height:16px;"></i>
              Exportar Base JSON
            </button>
            <button class="btn btn-outline-white btn-sm" onclick="resetToFactoryPosts()">
              <i data-lucide="refresh-cw" style="width:16px;height:16px;"></i>
              Restaurar 169 Originais
            </button>
            <a href="#blog" class="btn btn-primary btn-sm">
              <i data-lucide="eye" style="width:16px;height:16px;"></i>
              Ver Blog ao Vivo
            </a>
          </div>
        </div>
      </div>
    </div>

    <section class="section-padding" style="background-color:var(--bg-subtle);">
      <div class="container">
        <div class="admin-studio-wrapper">
          <div class="admin-header-bar">
            <div style="display:flex;gap:2rem;align-items:center;flex-wrap:wrap;">
              <div>
                <span style="font-size:0.75rem;color:var(--slate-400);text-transform:uppercase;">Total de Publicações:</span>
                <strong style="display:block;font-size:1.4rem;color:var(--primary-300);">${totalPosts}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem;color:var(--slate-400);text-transform:uppercase;">Fotografias Catalogadas:</span>
                <strong style="display:block;font-size:1.4rem;color:var(--accent-300);">${totalImages}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem;color:var(--slate-400);text-transform:uppercase;">Estado da Memória:</span>
                <strong style="display:block;font-size:0.95rem;color:var(--green-500);">Sincronizado Localmente</strong>
              </div>
            </div>
            <button class="btn btn-accent btn-sm" onclick="setAdminTab('create')">
              <i data-lucide="plus" style="width:16px;height:16px;"></i>
              Novo Artigo / Publicação
            </button>
          </div>

          <div class="admin-tabs">
            <button class="admin-tab-btn ${state.adminTab === 'posts' ? 'active' : ''}" onclick="setAdminTab('posts')">
              <i data-lucide="layers" style="width:16px;height:16px;"></i>
              Gerir & Reordenar Posts (${totalPosts})
            </button>
            <button class="admin-tab-btn ${state.adminTab === 'create' ? 'active' : ''}" onclick="setAdminTab('create')">
              <i data-lucide="plus" style="width:16px;height:16px;"></i>
              ${state.adminEditingPost ? 'Editar Publicação' : 'Criar Nova Publicação (Drag & Drop)'}
            </button>
          </div>

          <div style="padding:2rem;">
            ${state.adminTab === 'posts' ? renderAdminPostsList() : renderAdminPostForm()}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAdminPostsList() {
  return `
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h3 style="font-size:1.3rem;color:var(--slate-900);margin-bottom:0.25rem;">Reorganização Visual com Drag & Drop</h3>
          <p style="font-size:0.9rem;color:var(--slate-500);">
            Arraste os itens para cima ou para baixo para redefinir a sequência dos artigos no blog.
          </p>
        </div>
        <button class="btn btn-accent btn-sm" onclick="setAdminTab('create')">
          <i data-lucide="plus" style="width:16px;height:16px;"></i>
          Criar Nova Publicação
        </button>
      </div>

      <div id="sortable-posts-list" style="max-height:650px;overflow-y:auto;padding-right:0.5rem;">
        ${state.posts.map((post, index) => {
          const cover = post.cover_image && post.cover_image !== '/logo.svg' ? post.cover_image : './default_cover.png';
          return `
            <div class="sortable-post-row" draggable="true" data-index="${index}">
              <div style="display:flex;align-items:center;gap:1rem;flex-grow:1;overflow:hidden;">
                <span class="drag-handle"><i data-lucide="grip-vertical"></i></span>
                <img src="${cover}" alt="thumb" style="width:48px;height:48px;border-radius:6px;object-fit:cover;flex-shrink:0;" onerror="this.src='./default_cover.png'" />
                <div style="overflow:hidden;">
                  <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.2rem;">
                    <span class="badge badge-blue" style="font-size:0.7rem;">#${post.id}</span>
                    <span style="font-size:0.8rem;color:var(--slate-500);">${post.date}</span>
                    <span class="badge badge-gold" style="font-size:0.7rem;">${post.primary_category}</span>
                  </div>
                  <strong style="display:block;font-size:0.95rem;color:var(--slate-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${post.title}
                  </strong>
                </div>
              </div>

              <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0;margin-left:1rem;">
                <span style="font-size:0.8rem;color:var(--slate-500);margin-right:0.5rem;">
                  <i data-lucide="image" style="width:12px;height:12px;display:inline;"></i> ${post.image_count} fotos
                </span>
                <button class="btn btn-outline btn-sm" style="padding:0.35rem 0.75rem;" onclick="editPostInAdmin(${post.id})">
                  Editar
                </button>
                <button class="btn btn-outline btn-sm" style="padding:0.35rem 0.75rem;color:var(--slate-500);" onclick="navigateTo('#post/${post.id}')">
                  <i data-lucide="eye" style="width:14px;height:14px;"></i>
                </button>
                <button class="btn btn-sm" style="padding:0.35rem 0.5rem;color:#dc2626;" onclick="deletePostInAdmin(${post.id})" title="Eliminar Post">
                  <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderAdminPostForm() {
  const isEditing = !!state.adminEditingPost;
  const draft = isEditing ? state.adminEditingPost : state.newPostDraft;

  return `
    <form id="admin-post-form" onsubmit="handleSavePost(event)" style="max-width:850px;margin:0 auto;display:flex;flex-direction:column;gap:1.5rem;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--slate-200);padding-bottom:1rem;">
        <h3 style="font-size:1.35rem;color:var(--slate-900);">
          ${isEditing ? `A Editar Publicação #${draft.id}` : 'Criar Nova Publicação para o Blog'}
        </h3>
        ${isEditing ? `
          <button type="button" class="btn btn-outline btn-sm" onclick="cancelEditingPost()">
            Cancelar Edição
          </button>
        ` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;">
        <div>
          <label style="display:block;font-size:0.9rem;font-weight:700;color:var(--slate-800);margin-bottom:0.4rem;">Tema / Categoria Principal *</label>
          <select id="post-category" style="width:100%;padding:0.8rem 1rem;border:1.5px solid var(--slate-300);border-radius:var(--radius-md);background:#ffffff;font-size:0.95rem;font-weight:600;">
            ${ALL_CATEGORIES.map(cat => `
              <option value="${cat}" ${draft.primary_category === cat || (draft.categories && draft.categories.includes(cat)) ? 'selected' : ''}>${cat}</option>
            `).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:0.9rem;font-weight:700;color:var(--slate-800);margin-bottom:0.4rem;">Data da Actividade *</label>
          <input type="date" id="post-date" required value="${draft.date || ''}" style="width:100%;padding:0.8rem 1rem;border:1.5px solid var(--slate-300);border-radius:var(--radius-md);background:#ffffff;" />
        </div>
      </div>

      <div>
        <label style="display:block;font-size:0.9rem;font-weight:700;color:var(--slate-800);margin-bottom:0.4rem;">Título da Publicação *</label>
        <input type="text" id="post-title" required value="${escapeHtml(draft.title || '')}" placeholder="Ex: Inauguração do Novo Reforço Escolar no Centro de Boas Acções" style="width:100%;padding:0.85rem 1rem;border:1.5px solid var(--slate-300);border-radius:var(--radius-md);font-size:1rem;font-weight:600;" />
      </div>

      <!-- DEDICATED FEATURED IMAGE SECTION -->
      <div style="background:var(--slate-50);border:1.5px dashed var(--slate-300);border-radius:var(--radius-xl);padding:1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
          <label style="font-size:0.95rem;font-weight:700;color:var(--slate-800);display:flex;align-items:center;gap:0.45rem;">
            <i data-lucide="sparkles" style="width:17px;height:17px;color:var(--accent-500);"></i>
            Imagem de Destaque (Featured Image)
          </label>
          <span style="font-size:0.78rem;color:var(--slate-500);">Aparece no topo do artigo e como capa nos cartões</span>
        </div>
        
        ${draft.cover_image && draft.cover_image !== './default_cover.png' ? `
          <div style="display:flex;align-items:center;gap:1.25rem;background:#ffffff;padding:1rem;border-radius:var(--radius-lg);border:1px solid var(--slate-200);margin-top:0.75rem;flex-wrap:wrap;">
            <img src="${draft.cover_image}" alt="Featured Image Preview" style="width:140px;height:90px;object-fit:cover;border-radius:var(--radius-md);box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="this.src='./default_cover.png'" />
            <div style="display:flex;flex-direction:column;gap:0.4rem;">
              <span style="font-size:0.88rem;font-weight:700;color:var(--slate-800);">Imagem de Destaque Activa</span>
              <span style="font-size:0.78rem;color:var(--slate-500);">Definida para ser o destaque visual principal desta publicação</span>
              <div style="display:flex;gap:0.5rem;margin-top:0.35rem;">
                <button type="button" class="btn btn-outline btn-sm" onclick="window.triggerFeaturedImageInput()">
                  <i data-lucide="upload" style="width:13px;height:13px;"></i> Substituir
                </button>
                <button type="button" class="btn btn-sm" style="color:#dc2626;background:#fee2e2;border:none;padding:0.35rem 0.75rem;" onclick="window.removeFeaturedImage()">
                  <i data-lucide="trash-2" style="width:13px;height:13px;"></i> Remover Destaque
                </button>
              </div>
            </div>
          </div>
        ` : `
          <div onclick="window.triggerFeaturedImageInput()" style="cursor:pointer;background:#ffffff;border:1.5px dashed var(--primary-300);border-radius:var(--radius-lg);padding:1.5rem;text-align:center;transition:all 0.2s ease;margin-top:0.5rem;">
            <i data-lucide="image" style="width:34px;height:34px;color:var(--primary-600);margin-bottom:0.5rem;"></i>
            <strong style="display:block;font-size:0.95rem;color:var(--slate-800);margin-bottom:0.25rem;">Clique para carregar a Imagem de Destaque</strong>
            <span style="font-size:0.82rem;color:var(--slate-500);">Recomendado: 1200 x 600px (JPG, PNG, WebP)</span>
          </div>
        `}
        <input type="file" id="featured-image-input" accept="image/*" style="display:none;" onchange="window.handleFeaturedImageFile(this.files)" />
      </div>

      <!-- POST TEXT CONTENT -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
          <label style="font-size:0.9rem;font-weight:700;color:var(--slate-800);">Conteúdo da Publicação / Relato de Campo *</label>
          <div style="display:flex;gap:0.35rem;">
            <button type="button" class="btn btn-outline btn-sm" style="padding:0.2rem 0.5rem;font-size:0.75rem;" onclick="insertTextFormat('**', '**')">Negrito</button>
            <button type="button" class="btn btn-outline btn-sm" style="padding:0.2rem 0.5rem;font-size:0.75rem;" onclick="insertTextFormat('\n- ', '')">Lista</button>
          </div>
        </div>
        <textarea id="post-content" required rows="7" placeholder="Descreva aqui o acontecimento, participantes, metas e resultados alcançados..." style="width:100%;padding:1rem;border:1.5px solid var(--slate-300);border-radius:var(--radius-md);font-size:0.95rem;line-height:1.6;">${draft.content || ''}</textarea>
      </div>

      <!-- MASONRY GALLERY UPLOADER -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem;">
          <label style="font-size:0.95rem;font-weight:700;color:var(--slate-800);display:flex;align-items:center;gap:0.45rem;">
            <i data-lucide="image" style="width:17px;height:17px;color:var(--primary-600);"></i>
            Galeria Fotográfica de Campo (Formato Masonry)
          </label>
          <span style="font-size:0.8rem;color:var(--slate-500);">Será exibida abaixo do texto em grelha Masonry</span>
        </div>

        <div id="image-dropzone" class="dropzone-container" onclick="window.triggerFileInput()">
          <i data-lucide="upload" class="dropzone-icon"></i>
          <h4 style="font-size:1.1rem;color:var(--slate-800);margin-bottom:0.35rem;">
            Arraste fotografias da galeria para aqui
          </h4>
          <p style="font-size:0.85rem;color:var(--slate-500);margin-bottom:1rem;">
            ou clique para carregar múltiplas fotos de campo (JPG, PNG, WebP)
          </p>
          <input type="file" id="file-input" multiple accept="image/*" style="display:none;" onchange="window.handleImageFiles(this.files)" />
          <button type="button" class="btn btn-outline btn-sm" onclick="window.triggerFileInput(); event.stopPropagation();">
            <i data-lucide="plus" style="width:14px;height:14px;"></i> Seleccionar Fotos
          </button>
        </div>

        <div id="preview-strip" class="image-preview-strip">
          ${(draft.images || []).map((img, idx) => `
            <div class="preview-thumb-card ${draft.cover_image === img ? 'is-cover' : ''}">
              <img src="${img}" alt="Preview ${idx + 1}" onerror="this.src='./default_cover.png'" />
              <button type="button" class="thumb-delete-btn" onclick="window.removeDraftImage(${idx})" title="Remover da galeria">×</button>
              ${draft.cover_image === img ? `<span class="thumb-cover-badge">Destaque</span>` : `
                <button type="button" style="position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.65);color:#fff;font-size:0.65rem;padding:0.2rem 0.4rem;border-radius:4px;border:none;cursor:pointer;" onclick="window.setDraftCoverImage(${idx})">Definir Destaque</button>
              `}
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:flex-end;gap:1rem;margin-top:1rem;border-top:1px solid var(--slate-200);padding-top:1.5rem;">
        <button type="button" class="btn btn-outline" onclick="setAdminTab('posts')">Voltar</button>
        <button type="submit" class="btn btn-accent btn-lg">
          <i data-lucide="check" style="width:18px;height:18px;"></i>
          ${isEditing ? 'Actualizar Publicação' : 'Publicar no Blog Oficial'}
        </button>
      </div>
    </form>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ==========================================================================
   EVENT HANDLERS & GLOBAL FUNCTIONS
   ========================================================================== */

function attachAppEvents() {
  const openMobileBtn = document.getElementById('open-mobile-nav');
  const closeMobileBtn = document.getElementById('close-mobile-nav');
  const mobileNav = document.getElementById('mobile-nav');

  if (openMobileBtn && mobileNav) {
    openMobileBtn.onclick = () => mobileNav.classList.add('open');
  }
  if (closeMobileBtn && mobileNav) {
    closeMobileBtn.onclick = () => mobileNav.classList.remove('open');
  }

  // Language Dropdown
  const langBtn = document.getElementById('lang-menu-btn');
  if (langBtn) {
    langBtn.onclick = (e) => {
      e.stopPropagation();
      state.isLangMenuOpen = !state.isLangMenuOpen;
      renderApp();
    };
  }

  // Close language dropdown on outside click
  document.onclick = (e) => {
    if (state.isLangMenuOpen && !e.target.closest('.lang-selector-wrapper')) {
      state.isLangMenuOpen = false;
      renderApp();
    }
  };

  const lightboxModal = document.getElementById('lightbox-modal');
  if (lightboxModal) {
    lightboxModal.onclick = (e) => {
      if (e.target === lightboxModal) closeLightbox();
    };
  }
  const closeLightboxBtn = document.getElementById('close-lightbox');
  if (closeLightboxBtn) {
    closeLightboxBtn.onclick = closeLightbox;
  }

  const blogSearch = document.getElementById('blog-search');
  if (blogSearch) {
    blogSearch.oninput = (e) => {
      state.searchQuery = e.target.value;
      renderApp();
      const newInput = document.getElementById('blog-search');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    };
  }

  const sortAsc = document.getElementById('sort-asc-btn');
  const sortDesc = document.getElementById('sort-desc-btn');
  if (sortAsc) sortAsc.onclick = () => { state.sortOrder = 'asc'; renderApp(); };
  if (sortDesc) sortDesc.onclick = () => { state.sortOrder = 'desc'; renderApp(); };

  const viewGrid = document.getElementById('view-grid-btn');
  const viewTimeline = document.getElementById('view-timeline-btn');
  if (viewGrid) viewGrid.onclick = () => { state.viewMode = 'grid'; renderApp(); };
  if (viewTimeline) viewTimeline.onclick = () => { state.viewMode = 'timeline'; renderApp(); };

  const sortableList = document.getElementById('sortable-posts-list');
  if (sortableList) {
    const rows = sortableList.querySelectorAll('.sortable-post-row');
    rows.forEach(row => {
      row.addEventListener('dragstart', () => {
        state.draggedPostIndex = parseInt(row.getAttribute('data-index'));
        row.classList.add('dragging');
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetIndex = parseInt(row.getAttribute('data-index'));
        if (state.draggedPostIndex !== null && state.draggedPostIndex !== targetIndex) {
          const itemToMove = state.posts.splice(state.draggedPostIndex, 1)[0];
          state.posts.splice(targetIndex, 0, itemToMove);
          saveStoredPosts(state.posts);
          showToast('Ordem das publicações actualizada!');
          renderApp();
        }
      });
    });
  }

  const dropzone = document.getElementById('image-dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files) {
        handleImageFiles(e.dataTransfer.files);
      }
    });
  }
}

// Global functions exposed to window
window.changeLanguage = (langCode) => {
  if (translations[langCode]) {
    state.lang = langCode;
    localStorage.setItem(LANG_STORAGE_KEY, langCode);
    state.isLangMenuOpen = false;
    const lObj = LANGUAGES.find(l => l.code === langCode);
    showToast(`Idioma alterado para ${lObj ? lObj.label : langCode}!`);
    renderApp();
  }
};

window.setBlogCategory = (cat) => {
  state.selectedCategory = cat;
  renderApp();
};

window.setBlogYear = (yr) => {
  state.selectedYear = yr;
  renderApp();
};

window.resetBlogFilters = () => {
  state.selectedCategory = 'all';
  state.selectedYear = 'all';
  state.searchQuery = '';
  renderApp();
};

window.filterBlogByCategory = (cat) => {
  state.selectedCategory = cat;
  navigateTo('#blog');
};

window.openLightbox = (postId, imageIndex = 0) => {
  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  // Build complete image list for Lightbox (Cover + Gallery images)
  let allImages = [];
  if (post.cover_image && post.cover_image !== './default_cover.png') {
    allImages.push(post.cover_image);
  }
  if (post.images && post.images.length > 0) {
    post.images.forEach(img => {
      if (!allImages.includes(img)) allImages.push(img);
    });
  }
  if (allImages.length === 0 && post.images && post.images.length > 0) {
    allImages = [...post.images];
  }

  if (allImages.length > 0) {
    let targetIndex = imageIndex;
    if (post.images && post.images[imageIndex]) {
      const foundIdx = allImages.indexOf(post.images[imageIndex]);
      if (foundIdx !== -1) targetIndex = foundIdx;
    }
    state.activeLightbox = {
      isOpen: true,
      images: allImages,
      currentIndex: Math.max(0, Math.min(targetIndex, allImages.length - 1))
    };
    renderApp();
  }
};

window.closeLightbox = () => {
  state.activeLightbox.isOpen = false;
  renderApp();
};

window.setLightboxIndex = (index) => {
  if (state.activeLightbox.images && state.activeLightbox.images[index]) {
    state.activeLightbox.currentIndex = index;
    renderApp();
  }
};

window.nextLightboxImage = () => {
  const { images, currentIndex } = state.activeLightbox;
  if (!images || images.length <= 1) return;
  state.activeLightbox.currentIndex = (currentIndex + 1) % images.length;
  renderApp();
};

window.prevLightboxImage = () => {
  const { images, currentIndex } = state.activeLightbox;
  if (!images || images.length <= 1) return;
  state.activeLightbox.currentIndex = (currentIndex - 1 + images.length) % images.length;
  renderApp();
};

window.triggerFeaturedImageInput = () => {
  const fileInput = document.getElementById('featured-image-input');
  if (fileInput) fileInput.click();
};

window.handleFeaturedImageFile = (files) => {
  if (!files || files.length === 0) return;
  const targetDraft = state.adminEditingPost || state.newPostDraft;
  const file = files[0];
  const reader = new FileReader();
  reader.onload = (e) => {
    targetDraft.cover_image = e.target.result;
    renderApp();
    showToast('Imagem de destaque carregada!');
  };
  reader.readAsDataURL(file);
};

window.removeFeaturedImage = () => {
  const targetDraft = state.adminEditingPost || state.newPostDraft;
  targetDraft.cover_image = '';
  renderApp();
  showToast('Imagem de destaque removida.');
};

window.copyToClipboard = (text, successMsg) => {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg || 'Copiado para a área de transferência!');
  });
};

window.sharePostWhatsApp = (title, id) => {
  const url = window.location.href.split('#')[0] + '#post/' + id;
  const text = encodeURIComponent(`*ADDESSO Moçambique:* ${title}\n\nLeia mais e veja as fotos no link:\n${url}`);
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
};

window.sharePostFacebook = (id) => {
  const url = encodeURIComponent(window.location.href.split('#')[0] + '#post/' + id);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
};

window.sharePostTwitter = (title, id) => {
  const url = encodeURIComponent(window.location.href.split('#')[0] + '#post/' + id);
  const text = encodeURIComponent(`ADDESSO Moçambique: ${title}`);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
};

window.copyPostLink = (id) => {
  const url = window.location.href.split('#')[0] + '#post/' + id;
  window.copyToClipboard(url, 'Link directo do artigo copiado com sucesso!');
};

window.handleVolunteerSubmit = (e) => {
  e.preventDefault();
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
  showToast('Muito obrigado! A sua candidatura de voluntariado foi enviada com sucesso.', 'success');
  e.target.reset();
};

window.handleContactSubmit = (e) => {
  e.preventDefault();
  showToast('Mensagem enviada com sucesso! Entraremos em contacto brevemente.', 'success');
  e.target.reset();
};

window.setAdminTab = (tab) => {
  state.adminTab = tab;
  renderApp();
};

window.triggerFileInput = () => {
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.click();
};

window.handleImageFiles = (files) => {
  if (!files || files.length === 0) return;
  const targetDraft = state.adminEditingPost || state.newPostDraft;
  if (!targetDraft.images) targetDraft.images = [];

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      targetDraft.images.push(dataUrl);
      if (!targetDraft.cover_image) targetDraft.cover_image = dataUrl;
      renderApp();
    };
    reader.readAsDataURL(file);
  });
};

window.removeDraftImage = (index) => {
  const targetDraft = state.adminEditingPost || state.newPostDraft;
  if (targetDraft.images) {
    targetDraft.images.splice(index, 1);
    if (!targetDraft.images.includes(targetDraft.cover_image)) {
      targetDraft.cover_image = targetDraft.images[0] || '';
    }
    renderApp();
  }
};

window.setDraftCoverImage = (index) => {
  const targetDraft = state.adminEditingPost || state.newPostDraft;
  if (targetDraft.images && targetDraft.images[index]) {
    targetDraft.cover_image = targetDraft.images[index];
    renderApp();
    showToast('Definida como imagem de destaque!');
  }
};

window.insertTextFormat = (prefix, suffix) => {
  const textarea = document.getElementById('post-content');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);
  textarea.value = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
  textarea.focus();
};

window.handleSavePost = (e) => {
  e.preventDefault();
  const title = document.getElementById('post-title').value.trim();
  const date = document.getElementById('post-date').value;
  const category = document.getElementById('post-category').value;
  const content = document.getElementById('post-content').value.trim();

  const isEditing = !!state.adminEditingPost;
  const currentImages = (isEditing ? state.adminEditingPost.images : state.newPostDraft.images) || [];
  const currentCover = (isEditing ? state.adminEditingPost.cover_image : state.newPostDraft.cover_image) || currentImages[0] || './default_cover.png';

  if (isEditing) {
    const post = state.posts.find(p => p.id === state.adminEditingPost.id);
    if (post) {
      post.title = title;
      post.date = date;
      post.primary_category = category;
      post.categories = [category];
      post.content = content;
      post.excerpt = content.substring(0, 160) + '...';
      post.images = currentImages;
      post.cover_image = currentCover;
      post.image_count = currentImages.length;
    }
    showToast('Publicação actualizada com sucesso!');
    state.adminEditingPost = null;
  } else {
    const newId = Math.max(...state.posts.map(p => p.id), 0) + 1;
    const newPost = {
      id: newId,
      slug: `${date}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`,
      date: date,
      title: title,
      content: content,
      excerpt: content.substring(0, 160) + '...',
      primary_category: category,
      categories: [category],
      image_count: currentImages.length,
      cover_image: currentCover,
      images: currentImages,
      read_time_min: Math.max(1, Math.round(content.split(' ').length / 180))
    };
    state.posts.unshift(newPost);
    showToast('Nova publicação adicionada ao blog com sucesso!');
    state.newPostDraft = {
      title: '',
      date: new Date().toISOString().split('T')[0],
      categories: ['Juventude & Liderança'],
      content: '',
      images: [],
      cover_image: '',
      featured: false
    };
  }

  saveStoredPosts(state.posts);
  state.adminTab = 'posts';
  renderApp();
};

window.editPostInAdmin = (id) => {
  const post = state.posts.find(p => p.id === id);
  if (post) {
    state.adminEditingPost = JSON.parse(JSON.stringify(post));
    state.adminTab = 'create';
    renderApp();
  }
};

window.cancelEditingPost = () => {
  state.adminEditingPost = null;
  state.adminTab = 'posts';
  renderApp();
};

window.deletePostInAdmin = (id) => {
  if (confirm(`Tem a certeza que deseja eliminar a publicação #${id}?`)) {
    state.posts = state.posts.filter(p => p.id !== id);
    saveStoredPosts(state.posts);
    showToast(`Publicação #${id} eliminada!`);
    renderApp();
  }
};

window.exportPostsJSON = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.posts, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `addesso_posts_archive_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Ficheiro JSON exportado com sucesso!');
};

window.resetToFactoryPosts = () => {
  if (confirm('Deseja restaurar as 169 publicações originais do arquivo?')) {
    state.posts = [...postsSeed];
    saveStoredPosts(state.posts);
    showToast('Arquivo original de 169 publicações restaurado!');
    renderApp();
  }
};

window.addEventListener('keydown', (e) => {
  if (state.activeLightbox.isOpen) {
    if (e.key === 'Escape') window.closeLightbox();
    if (e.key === 'ArrowRight') window.nextLightboxImage();
    if (e.key === 'ArrowLeft') window.prevLightboxImage();
  }
});

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

initRouter();
renderApp();
