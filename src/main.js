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
  Maximize2,
  FileText,
  ShieldCheck,
  Award,
  TrendingUp,
  Map,
  Compass,
  Gift,
  HelpCircle,
  Briefcase
} from 'lucide';

/* ==========================================================================
   STATE MANAGEMENT & PERSISTENCE
   ========================================================================== */

const STORAGE_KEY = 'addesso_posts_v4';
const LANG_STORAGE_KEY = 'addesso_lang_v1';

function getStoredPosts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading posts from localStorage', e);
  }
  return [...postsSeed];
}

function saveStoredPosts(posts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error('Error saving posts to localStorage', e);
  }
}

function getStoredLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch (e) {}
  return 'pt';
}

const state = {
  posts: getStoredPosts(),
  lang: getStoredLang(),
  isLangMenuOpen: false,
  currentRoute: window.location.hash || '#home',
  searchQuery: '',
  selectedCategory: 'all',
  selectedYear: 'all',
  sortOrder: 'desc', // 'desc' (recent) or 'asc' (oldest)
  viewMode: 'grid', // 'grid' or 'timeline'
  activeLightbox: {
    isOpen: false,
    images: [],
    currentIndex: 0
  },
  adminTab: 'posts', // 'posts' or 'create'
  adminEditingPost: null,
  newPostDraft: {
    title: '',
    date: new Date().toISOString().split('T')[0],
    categories: ['Juventude & Liderança'],
    content: '',
    images: [],
    cover_image: '',
    featured: false
  },
  draggedPostIndex: null
};

// Helper for i18n
function t() {
  return translations[state.lang] || translations.pt;
}

/* ==========================================================================
   ROUTING & NAVIGATION
   ========================================================================== */

function navigateTo(hash) {
  window.location.hash = hash;
}

function initRouter() {
  window.addEventListener('hashchange', () => {
    state.currentRoute = window.location.hash || '#home';
    state.isLangMenuOpen = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    renderApp();
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check' : 'sparkles'}" style="width:16px;height:16px;"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

const CATEGORIES = [
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
              <button class="btn btn-sm ${state.lang === l.code ? 'btn-primary' : 'btn-outline'}" style="padding:0.3rem 0.5rem;font-size:0.78rem;justify-content:center;" onclick="window.changeLanguage('${l.code}')">
                ${l.flag} ${l.short}
              </button>
            `).join('')}
          </div>
        </div>

        <ul style="list-style:none;display:flex;flex-direction:column;gap:0.4rem;">
          <li><a href="#home" class="mobile-link ${route === 'home' ? 'active' : ''}"><span>${tr.nav.home}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#sobre" class="mobile-link ${route === 'sobre' ? 'active' : ''}"><span>${tr.nav.about}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#programas" class="mobile-link ${route === 'programas' || route === 'projectos' ? 'active' : ''}"><span>${tr.nav.programs}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#cba" class="mobile-link ${route === 'cba' ? 'active' : ''}"><span>${tr.nav.cba}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#delegacoes" class="mobile-link ${route === 'delegacoes' ? 'active' : ''}"><span>${tr.nav.delegations}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
          <li><a href="#transparencia" class="mobile-link ${route === 'transparencia' ? 'active' : ''}"><span>${tr.nav.transparency}</span> <i data-lucide="chevron-right" style="width:16px;height:16px;"></i></a></li>
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
      Globe, ChevronLeft, Maximize2, FileText, ShieldCheck, Award, TrendingUp,
      Map, Compass, Gift, HelpCircle, Briefcase
    }
  });
}

/* ==========================================================================
   COMPONENTS: HEADER & FOOTER
   ========================================================================== */

function renderHeader(route, currentLangObj, tr) {
  const navQuemSomos = tr.nav.about;
  const navOQueFazemos = tr.nav.programs;
  const navCba = tr.nav.cba;
  const navEnvolvase = tr.nav.help || "Envolva-se";
  const navNoticias = tr.nav.blog || "Notícias";

  return `
    <header class="site-header corporate-header">
      <div class="container nav-wrapper corporate-nav-wrapper">
        <a href="#home" class="brand-logo">
          <div class="brand-logo-img-wrapper">
            <img src="./logo_cropped.png" alt="ADDESSO Logo" />
          </div>
          <div class="brand-text">
            <span class="brand-name">ADDESSO</span>
            <span class="brand-slogan">Moçambique</span>
          </div>
        </a>

        <nav class="nav-center-container corporate-nav">
          <ul class="nav-links">
            <li class="nav-item"><a href="#sobre" class="nav-link ${route === 'sobre' ? 'active' : ''}">${navQuemSomos}</a></li>
            <li class="nav-item"><a href="#programas" class="nav-link ${route === 'programas' ? 'active' : ''}">${navOQueFazemos}</a></li>
            <li class="nav-item"><a href="#cba" class="nav-link ${route === 'cba' ? 'active' : ''}">${navCba}</a></li>
            <li class="nav-item"><a href="#envolva-se" class="nav-link ${route === 'envolva-se' ? 'active' : ''}">${navEnvolvase}</a></li>
            <li class="nav-item"><a href="#blog" class="nav-link ${route === 'blog' ? 'active' : ''}">${navNoticias}</a></li>
          </ul>
        </nav>

        <div class="nav-actions">
          <div class="lang-selector-wrapper">
            <button id="lang-menu-btn" class="lang-btn ${state.isLangMenuOpen ? 'active' : ''}" title="Mudar Idioma">
              <span>${currentLangObj.flag}</span>
              <span style="font-size:0.8rem;font-weight:700;margin-left:0.25rem;">${currentLangObj.short}</span>
              <i data-lucide="chevron-down" style="width:14px;height:14px;margin-left:0.25rem;"></i>
            </button>
            <div id="lang-menu" class="lang-menu ${state.isLangMenuOpen ? 'open' : ''}">
              ${LANGUAGES.map(l => `
                <div class="lang-option-item ${state.lang === l.code ? 'active' : ''}" onclick="window.changeLanguage('${l.code}')">
                  <span style="display:flex;align-items:center;gap:0.5rem;">
                    <span>${l.flag}</span>
                    <span>${l.label}</span>
                  </span>
                  ${state.lang === l.code ? '<i data-lucide="check" style="width:14px;height:14px;color:var(--primary-600);"></i>' : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <a href="#participar" class="btn btn-donate">Doar</a>
          <button id="mobile-menu-btn" class="mobile-toggle">
            <i data-lucide="menu" style="width:24px;height:24px;"></i>
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
          <!-- Brand & Mission Column -->
          <div class="footer-brand">
            <div class="footer-brand-logo-row">
              <div class="footer-logo-box">
                <img src="./logo_cropped.png" alt="ADDESSO Logótipo Oficial" />
              </div>
              <div class="footer-brand-meta">
                <span class="footer-title">ADDESSO</span>
                <span class="footer-subtitle">Moçambique • Desde 2009</span>
              </div>
            </div>
            <p class="footer-desc">
              ${orgInfo.mission}
            </p>
            <div class="footer-badges">
              <span class="footer-badge-pill">
                <i data-lucide="shield-check" style="width:13px;height:13px;color:var(--primary-400);"></i>
                <span>ONG Registada • NUIT: ${orgInfo.transparency.nuit}</span>
              </span>
              <span class="footer-badge-pill">
                <i data-lucide="map-pin" style="width:13px;height:13px;color:var(--accent-400);"></i>
                <span>Sede: Polana Caniço "A", Maputo</span>
              </span>
            </div>
          </div>

          <!-- Quick Navigation Column -->
          <div class="footer-col">
            <h4 class="footer-heading">
              <span class="footer-heading-dot"></span>
              <span>Organização</span>
            </h4>
            <ul class="footer-links">
              <li><a href="#home"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.home}</a></li>
              <li><a href="#sobre"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.about}</a></li>
              <li><a href="#programas"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.programs}</a></li>
              <li><a href="#cba"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.cba}</a></li>
              <li><a href="#delegacoes"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.delegations}</a></li>
              <li><a href="#transparencia"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.transparency}</a></li>
            </ul>
          </div>

          <!-- Community Actions Column -->
          <div class="footer-col">
            <h4 class="footer-heading">
              <span class="footer-heading-dot" style="background:var(--primary-400);"></span>
              <span>Acção Social</span>
            </h4>
            <ul class="footer-links">
              <li><a href="#blog"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.blog} (${state.posts.length})</a></li>
              <li><a href="#participar"><i data-lucide="chevron-right" class="footer-link-arrow"></i> Doações M-Pesa / e-Mola / BCI</a></li>
              <li><a href="#participar"><i data-lucide="chevron-right" class="footer-link-arrow"></i> Voluntariado Comunitário</a></li>
              <li><a href="#participar"><i data-lucide="chevron-right" class="footer-link-arrow"></i> Campanha Semeando Sorrisos</a></li>
              <li><a href="#contactos"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.contact}</a></li>
              <li><a href="#admin"><i data-lucide="chevron-right" class="footer-link-arrow"></i> ${tr.nav.admin}</a></li>
            </ul>
          </div>

          <!-- Direct Contacts Column -->
          <div class="footer-col">
            <h4 class="footer-heading">
              <span class="footer-heading-dot" style="background:var(--green-400);"></span>
              <span>Contactos Directos</span>
            </h4>
            <div class="footer-contact-info">
              <div class="footer-contact-item">
                <div class="footer-contact-icon">
                  <i data-lucide="map-pin" style="width:14px;height:14px;"></i>
                </div>
                <span>${orgInfo.headquarters.address}</span>
              </div>
              <div class="footer-contact-item">
                <div class="footer-contact-icon">
                  <i data-lucide="phone" style="width:14px;height:14px;"></i>
                </div>
                <a href="tel:${orgInfo.contacts.phones[0].replace(/[^0-9+]/g, '')}" style="color:var(--slate-300);">${orgInfo.contacts.phones[0]}</a>
              </div>
              <div class="footer-contact-item">
                <div class="footer-contact-icon">
                  <i data-lucide="mail" style="width:14px;height:14px;"></i>
                </div>
                <a href="mailto:${orgInfo.contacts.emails[0]}" style="color:var(--slate-300);">${orgInfo.contacts.emails[0]}</a>
              </div>
            </div>

            <div class="footer-social-row">
              <a href="${orgInfo.contacts.facebook}" target="_blank" rel="noopener noreferrer" class="footer-social-btn" title="Facebook ADDESSO"><i data-lucide="globe" style="width:16px;height:16px;"></i></a>
              <a href="${orgInfo.contacts.instagram}" target="_blank" rel="noopener noreferrer" class="footer-social-btn" title="Instagram ADDESSO"><i data-lucide="sparkles" style="width:16px;height:16px;"></i></a>
              <a href="https://wa.me/${orgInfo.contacts.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" class="footer-social-btn" title="WhatsApp Directo"><i data-lucide="phone" style="width:16px;height:16px;"></i></a>
              <a href="${orgInfo.contacts.linkedin}" target="_blank" rel="noopener noreferrer" class="footer-social-btn" title="LinkedIn ADDESSO"><i data-lucide="landmark" style="width:16px;height:16px;"></i></a>
            </div>
          </div>
        </div>

        <!-- Centered Bottom Bar -->
        <div class="footer-bottom-centered">
          <div class="footer-slogan-pill">
            <i data-lucide="heart" style="width:13px;height:13px;color:var(--accent-400);"></i>
            <span>"${orgInfo.cbaSlogan || 'Pequenas Acções, Grandes Mudanças'}"</span>
          </div>
          <div class="footer-copyright-text">
            &copy; ${new Date().getFullYear()} ADDESSO — Associação para a Defesa e Desenvolvimento da Sociedade. ${tr.footer.rights}
          </div>
          <div class="footer-legal-links">
            <a href="#transparencia">Transparência & Estatutos</a>
            <span class="footer-legal-dot">•</span>
            <a href="#sobre">Governação & Órgãos Sociais</a>
            <span class="footer-legal-dot">•</span>
            <a href="#cba">Centro de Boas Acções</a>
            <span class="footer-legal-dot">•</span>
            <a href="#contactos">Polana Caniço "A", Maputo</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}

/* ==========================================================================
   LIGHTBOX FULLSCREEN MODAL
   ========================================================================== */

function renderLightboxContent() {
  const { images, currentIndex } = state.activeLightbox;
  if (!images || images.length === 0) return '';
  const currentImg = images[currentIndex] || '';
  const total = images.length;

  return `
    <div class="lightbox-header">
      <div class="lightbox-counter-badge">
        <i data-lucide="image" style="width:16px;height:16px;"></i>
        <span>Fotografia ${currentIndex + 1} de ${total}</span>
      </div>
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <button id="close-lightbox" class="lightbox-btn-circle close-btn" title="Fechar Visualizador (ESC)">
          <i data-lucide="x" style="width:22px;height:22px;"></i>
        </button>
      </div>
    </div>

    <div class="lightbox-main-stage" onclick="event.stopPropagation()">
      ${total > 1 ? `
        <button class="lightbox-nav-btn prev" onclick="window.prevLightboxImage(); event.stopPropagation();" title="Fotografia Anterior (Seta Esquerda)">
          <i data-lucide="arrow-left" style="width:24px;height:24px;"></i>
        </button>
      ` : ''}

      <div class="lightbox-img-wrapper">
        <img src="${currentImg}" alt="Visualização em ecrã inteiro" class="lightbox-img" onerror="this.src='./default_cover.png'" />
      </div>

      ${total > 1 ? `
        <button class="lightbox-nav-btn next" onclick="window.nextLightboxImage(); event.stopPropagation();" title="Próxima Fotografia (Seta Direita)">
          <i data-lucide="arrow-right" style="width:24px;height:24px;"></i>
        </button>
      ` : ''}
    </div>

    ${total > 1 ? `
      <div class="lightbox-thumbnails-carousel" onclick="event.stopPropagation()">
        ${images.map((img, idx) => `
          <div class="lightbox-thumb-item ${idx === currentIndex ? 'active' : ''}" onclick="window.setLightboxIndex(${idx})">
            <img src="${img}" alt="Miniatura ${idx + 1}" onerror="this.src='./default_cover.png'" />
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

/* ==========================================================================
   ROUTE SWITCHER
   ========================================================================== */

function renderRouteContent(route, tr) {
  switch (route) {
    case 'sobre':
      return renderSobrePage(tr);
    case 'programas':
    case 'projectos':
      return renderProjectosPage(tr);
    case 'cba':
      return renderCbaPage(tr);
    case 'delegacoes':
    case 'presenca':
      return renderDelegacoesPage(tr);
    case 'transparencia':
      return renderTransparenciaPage(tr);
    case 'blog':
      return renderBlogPage(tr);
    case 'participar':
    case 'doar':
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

/* ==========================================================================
   PAGES: HOME PAGE
   ========================================================================== */

function renderHomePage(tr) {
  const recentPosts = [...state.posts].reverse().slice(0, 3);

  return `
    <!-- IAVE Style Hero Section -->
    <section class="iave-hero" style="background-image: url('./images/cba/cba_community_center.jpg');">
      <div class="iave-hero-overlay"></div>
      <div class="iave-hero-content container">
        <div class="iave-hero-badge">Empoderar Comunidades Desde 2009</div>
        <h1>Transformando Vidas e Lideranças em Moçambique</h1>
        <p>Pequenas acções geram grandes mudanças. Junte-se à ADDESSO na construção de um futuro comunitário sustentável através da educação infantil, capacitação juvenil e segurança alimentar.</p>
        <div class="iave-hero-actions">
          <a href="#cba" class="btn btn-primary btn-lg">Conheça o CBA</a>
          <a href="#sobre" class="btn btn-outline-light btn-lg">Quem Somos</a>
        </div>
      </div>
    </section>

    <!-- IAVE Style Intro Strip -->
    <section class="iave-intro container section-padding">
      <h2 class="iave-intro-heading">Todos os anos, a ADDESSO ajuda centenas de famílias a encontrarem a sua autonomia nas comunidades moçambicanas.</h2>
      <p class="iave-intro-text">Promovemos o desenvolvimento comunitário integrado desde a primeira infância, literacia tecnológica para jovens, até à nutrição e assistência geriátrica na comunidade da Polana Caniço.</p>
      <a href="#sobre" class="iave-text-link">Conheça a nossa história <i data-lucide="arrow-right" style="width:18px;height:18px;"></i></a>
    </section>

    <!-- IAVE Style Our Work (Pillars) -->
    <section class="iave-pillars-section">
      <div class="container section-padding">
        <h2 class="iave-section-title">Os Nossos Programas Estruturantes</h2>
        <div class="iave-pillars-grid">
          <div class="iave-pillar-card">
            <h3>Desenvolvimento da Primeira Infância</h3>
            <p>A Creche Familiar no CBA garante estimulação psicomotora, educação e nutrição diária a crianças carenciadas, permitindo que as mães estudem ou trabalhem com tranquilidade.</p>
            <a href="#programas" class="iave-text-link">Explorar Programa <i data-lucide="arrow-right" style="width:16px;height:16px;margin-left:0.2rem;"></i></a>
          </div>
          <div class="iave-pillar-card">
            <h3>Capacitação & Liderança Juvenil</h3>
            <p>Através do Hub Digital de Informática e das Feiras da Juventude, ensinamos programação, línguas e liderança para reduzir o fosso digital e promover a empregabilidade.</p>
            <a href="#programas" class="iave-text-link">Explorar Programa <i data-lucide="arrow-right" style="width:16px;height:16px;margin-left:0.2rem;"></i></a>
          </div>
          <div class="iave-pillar-card">
            <h3>Segurança Alimentar & Solidariedade</h3>
            <p>A iniciativa Horta no Quintal e a Sopa Solidária combatem a desnutrição na Polana Caniço, enquanto a nossa Fisioterapia apoia a terceira idade e acamados.</p>
            <a href="#programas" class="iave-text-link">Explorar Programa <i data-lucide="arrow-right" style="width:16px;height:16px;margin-left:0.2rem;"></i></a>
          </div>
        </div>
      </div>
    </section>

    <!-- IAVE Style Get Involved -->
    <section class="iave-get-involved section-padding">
      <div class="container">
        <div class="iave-get-involved-header">
          <h2>Envolva-se</h2>
          <p>A ADDESSO trabalha de braços dados com a sociedade civil. Descubra como pode colaborar connosco para expandir o impacto comunitário.</p>
        </div>
        <div class="iave-get-involved-grid">
          <div class="iave-involved-item">
            <h3 style="color:var(--primary-700);">Indivíduos & Voluntários</h3>
            <p>Faça parte das nossas missões de campo. Doe o seu tempo, as suas competências e a sua energia para transformar realidades em Maputo.</p>
            <a href="#participar" class="btn btn-outline" style="border-color:var(--primary-600);color:var(--primary-700);">Inscrever-se</a>
          </div>
          <div class="iave-involved-item">
            <h3 style="color:var(--accent-700);">Empresas & Organizações</h3>
            <p>Alinhe os seus Objectivos de Desenvolvimento Sustentável connosco através de parcerias estratégicas, responsabilidade social e patrocínios.</p>
            <a href="#participar" class="btn btn-outline" style="border-color:var(--accent-600);color:var(--accent-700);">Ser Parceiro</a>
          </div>
          <div class="iave-involved-item">
            <h3 style="color:var(--green-700);">Apoio Financeiro Directo</h3>
            <p>Cada contribuição ajuda a manter a Creche Familiar e o Hub Digital abertos. Doe com segurança via M-Pesa, e-Mola ou Transferência Bancária.</p>
            <a href="#participar" class="btn btn-outline" style="border-color:var(--green-600);color:var(--green-700);">Fazer Doação</a>
          </div>
        </div>
      </div>
    </section>

    <!-- IAVE Style Recent News (Compact Grid) -->
    <section class="iave-news section-padding bg-subtle">
      <div class="container">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--slate-200);padding-bottom:1rem;margin-bottom:2rem;">
          <h2 class="iave-section-title" style="margin-bottom:0;">Notícias Recentes</h2>
          <a href="#blog" class="iave-text-link">Ver Arquivo Completo <i data-lucide="arrow-right" style="width:16px;height:16px;margin-left:0.2rem;"></i></a>
        </div>
        
        <div class="home-compact-news-grid">
          ${recentPosts.map(post => {
            const firstImg = post.images && post.images.length > 0 ? post.images[0] : './default_cover.png';
            const cat = post.categories && post.categories.length > 0 ? post.categories[0] : 'Geral';
            return `
              <div class="compact-news-card" onclick="window.location.hash='post/${post.id}'">
                <div class="compact-news-thumb">
                  <img src="${firstImg}" alt="${escapeHtml(post.title)}" onerror="this.src='./default_cover.png'" />
                  <div class="compact-news-cat">${escapeHtml(cat)}</div>
                  ${post.images && post.images.length > 1 ? `<div class="compact-news-photos"><i data-lucide="image" style="width:12px;height:12px;"></i> ${post.images.length} Fotos</div>` : ''}
                </div>
                <div class="compact-news-body">
                  <div class="compact-news-date">
                    <i data-lucide="calendar" style="width:13px;height:13px;"></i>
                    ${formatDatePT(post.date)}
                  </div>
                  <h3 class="compact-news-title">${escapeHtml(post.title)}</h3>
                  <p class="compact-news-excerpt">${escapeHtml(post.content.replace(/<[^>]+>/g, '').substring(0, 100))}...</p>
                  <div class="compact-news-footer">
                    <span class="compact-read-btn">Ler Publicação <i data-lucide="arrow-right" style="width:14px;height:14px;"></i></span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </section>
  `;
}


function renderSobrePage(tr) {
  return `
    <div class="page-hero-banner">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          Conheça a Nossa História
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          Quem Somos & A Nossa Missão
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:720px;line-height:1.7;">
          Fundada em 2009, a ADDESSO é uma organização moçambicana sem fins lucrativos dedicada à transformação social comunitária e empoderamento das famílias.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <!-- Missão, Visão e Historial -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:2.5rem;margin-bottom:5rem;">
          <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:2.5rem;">
            <div style="width:48px;height:48px;border-radius:var(--radius-lg);background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;">
              <i data-lucide="compass" style="width:26px;height:26px;"></i>
            </div>
            <h3 style="font-size:1.5rem;margin-bottom:1rem;color:var(--slate-900);">A Nossa Missão</h3>
            <p style="color:var(--slate-600);line-height:1.75;font-size:1.05rem;">
              "${orgInfo.mission}"
            </p>
          </div>

          <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:2.5rem;">
            <div style="width:48px;height:48px;border-radius:var(--radius-lg);background:rgba(245,158,11,0.15);color:var(--accent-600);display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;">
              <i data-lucide="eye" style="width:26px;height:26px;"></i>
            </div>
            <h3 style="font-size:1.5rem;margin-bottom:1rem;color:var(--slate-900);">A Nossa Visão</h3>
            <p style="color:var(--slate-600);line-height:1.75;font-size:1.05rem;">
              "${orgInfo.vision}"
            </p>
          </div>
        </div>

        <!-- Valores Fundamentais -->
        <div style="margin-bottom:5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Princípios Éticos</div>
            <h2 class="section-title">Valores Fundamentais</h2>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.75rem;">
            ${orgInfo.values.map(val => `
              <div style="background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.75rem;box-shadow:var(--shadow-sm);">
                <h4 style="font-size:1.15rem;margin-bottom:0.5rem;color:var(--slate-900);">${val.name}</h4>
                <p style="font-size:0.92rem;color:var(--slate-600);line-height:1.6;">${val.description}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Estrutura e Governação -->
        <div style="margin-bottom:5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Governação & Transparência</div>
            <h2 class="section-title">Estrutura e Órgãos Sociais</h2>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:1.5rem;margin-bottom:3rem;">
            ${orgInfo.governance.socialOrgans.map(org => `
              <div style="background:var(--slate-900);color:#ffffff;border-radius:var(--radius-xl);padding:2rem;">
                <div style="color:var(--accent-400);font-size:0.8rem;font-weight:700;text-transform:uppercase;margin-bottom:0.5rem;">Órgão Estatutário</div>
                <h3 style="font-size:1.35rem;color:#ffffff;margin-bottom:0.5rem;">${org.organ}</h3>
                <p style="color:var(--slate-300);font-size:0.92rem;line-height:1.6;">${org.role}</p>
              </div>
            `).join('')}
          </div>

          <!-- Direcção Executiva -->
          <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:2.5rem;">
            <h3 style="font-size:1.4rem;color:var(--slate-900);margin-bottom:1.5rem;display:flex;align-items:center;gap:0.6rem;">
              <i data-lucide="briefcase" style="width:22px;height:22px;color:var(--primary-600);"></i>
              Direcção Executiva & Equipa de Gestão
            </h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1.25rem;">
              ${orgInfo.governance.executiveTeam.map(exec => `
                <div style="background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.25rem;">
                  <strong style="font-size:1.05rem;color:var(--slate-900);display:block;margin-bottom:0.25rem;">${exec.role}</strong>
                  <span style="font-size:0.85rem;color:var(--slate-600);">${exec.area}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Redes e Alianças -->
        <div style="margin-bottom:5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Filiações & Redes</div>
            <h2 class="section-title">Redes Nacionais e Internacionais</h2>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.5rem;">
            ${orgInfo.networks.map(net => `
              <div style="background:var(--slate-50);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.75rem;display:flex;align-items:center;gap:1.25rem;">
                <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i data-lucide="${net.icon}" style="width:24px;height:24px;"></i>
                </div>
                <div>
                  <h4 style="font-size:1.05rem;color:var(--slate-900);margin-bottom:0.25rem;">${net.name}</h4>
                  <span style="font-size:0.85rem;color:var(--primary-700);font-weight:700;">${net.role}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Parceiros Oficiais com Logótipos -->
        <div style="margin-top: 5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Rede de Cooperação</div>
            <h2 class="section-title">Parceiros Institucionais</h2>
            <p style="color:var(--slate-600);font-size:1.05rem;margin-top:0.5rem;">
              Entidades públicas, académicas, cívicas e internacionais que apoiam e cooperam activamente com as iniciativas da ADDESSO.
            </p>
          </div>
          <div class="partners-grid">
            ${orgInfo.partners.map(p => `
              <div class="partner-card">
                <div class="partner-logo-box">
                  <img src="${p.logo}" alt="Logotipo ${p.name}" loading="lazy" onerror="this.src='./logo_cropped.png'" />
                </div>
                <div class="partner-card-content">
                  <span class="badge badge-purple" style="margin-bottom:0.6rem;font-size:0.75rem;">${p.type}</span>
                  <h4 style="font-size:1.1rem;font-weight:800;margin-bottom:0.4rem;color:var(--slate-900);line-height:1.3;">${p.name}</h4>
                  <p style="font-size:0.86rem;color:var(--slate-600);line-height:1.55;">${p.description}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Aliados de Cooperação -->
        <div style="margin-top: 4rem;background:var(--slate-900);border-radius:var(--radius-2xl);padding:clamp(2rem,4vw,3.5rem);color:#ffffff;">
          <div style="text-align:center;max-width:650px;margin:0 auto 2.5rem;">
            <span class="badge badge-gold" style="margin-bottom:0.75rem;">Cooperação Alargada</span>
            <h3 style="font-size:1.75rem;color:#ffffff;margin-bottom:0.5rem;">Governo, ONGs Globais & Parceiros Corporativos</h3>
            <p style="color:var(--slate-300);font-size:0.95rem;">Organizações e empresas com as quais a ADDESSO desenvolve programas conjuntos:</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center;">
            ${orgInfo.cooperationAllies.map(ally => `
              <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-full);padding:0.5rem 1.25rem;font-size:0.88rem;color:#ffffff;display:flex;align-items:center;gap:0.5rem;">
                <div style="width:6px;height:6px;border-radius:50%;background:var(--accent-400);"></div>
                <span>${ally.name}</span>
                <span style="font-size:0.75rem;color:var(--slate-400);font-style:italic;">(${ally.category})</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ==========================================================================
   PAGES: PROGRAMAS & PROJECTOS
   ========================================================================== */

function renderProjectosPage(tr) {
  return `
    <div class="page-hero-banner" style="background:linear-gradient(135deg, #0369a1, #0f172a);">
      <div class="container">
        <div class="section-tag" style="background:rgba(245,158,11,0.2);color:var(--accent-300);border-color:rgba(245,158,11,0.4);">
          Áreas de Intervenção Estruturantes
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          Os 3 Grandes Programas de Impacto
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:750px;line-height:1.7;">
          Conheça em detalhe a arquitectura programática da ADDESSO e do Centro de Boas Acções, concebida para criar autonomia sustentável nas comunidades.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <!-- The 3 Detailed Programs -->
        <div style="display:flex;flex-direction:column;gap:4.5rem;">
          ${orgInfo.structuredPrograms.map((prog, idx) => `
            <div id="${prog.id}" class="detailed-program-card" style="border-top: 4px solid ${prog.color};">
              <div class="detailed-prog-header">
                <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.75rem;">
                  <span class="program-number-badge" style="background:${prog.color};color:#fff;width:38px;height:38px;font-size:1rem;">${prog.number}</span>
                  <span class="badge ${prog.id === 'programa-1' ? 'badge-blue' : prog.id === 'programa-2' ? 'badge-gold' : 'badge-emerald'}">
                    ${prog.badge}
                  </span>
                </div>
                <h2 style="font-size:clamp(1.75rem,2.8vw,2.4rem);color:var(--slate-900);margin-bottom:0.5rem;font-weight:800;">
                  Programa ${prog.title}
                </h2>
                <h4 style="font-size:1.15rem;color:var(--slate-500);font-weight:500;margin-bottom:1rem;">
                  ${prog.subtitle}
                </h4>
                <p style="font-size:1.05rem;color:var(--slate-700);line-height:1.75;max-width:850px;margin-bottom:1.5rem;">
                  ${prog.description}
                </p>
                <div style="background:var(--slate-50);border-left:3px solid ${prog.color};padding:0.75rem 1.25rem;border-radius:0 var(--radius-md) var(--radius-md) 0;font-size:0.9rem;color:var(--slate-600);margin-bottom:2rem;">
                  <strong>Público-Alvo:</strong> ${prog.target}
                </div>
              </div>

              <!-- Detailed Sub-projects Grid -->
              <h3 style="font-size:1.35rem;color:var(--slate-900);margin-bottom:1.5rem;display:flex;align-items:center;gap:0.6rem;">
                <i data-lucide="layers" style="width:20px;height:20px;color:${prog.color};"></i>
                Projectos Operacionais Integrados
              </h3>

              <div class="subprojects-detailed-grid">
                ${prog.projects.map(proj => `
                  <div class="subproject-detail-item">
                    <div class="subproject-icon-box" style="background:${prog.color}15;color:${prog.color};">
                      <i data-lucide="${proj.icon}" style="width:22px;height:22px;"></i>
                    </div>
                    <div>
                      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">
                        <h4 style="font-size:1.1rem;color:var(--slate-900);font-weight:700;">${proj.name}</h4>
                        <span class="badge badge-outline" style="font-size:0.7rem;padding:0.15rem 0.45rem;">${proj.tag}</span>
                      </div>
                      <p style="font-size:0.9rem;color:var(--slate-600);line-height:1.6;">${proj.desc}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Eventos Comunitários de Impacto -->
        <div style="margin-top:5.5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Eventos Transversais</div>
            <h2 class="section-title">Grandes Iniciativas Comunitárias</h2>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:2rem;">
            ${orgInfo.transversalEvents.map(evt => `
              <div style="background:var(--slate-900);color:#ffffff;border-radius:var(--radius-2xl);padding:2.5rem;border:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                  <span class="badge badge-gold">${evt.badge}</span>
                  <span style="font-size:0.8rem;color:var(--slate-400);font-weight:700;text-transform:uppercase;">Periodicidade: ${evt.frequency}</span>
                </div>
                <h3 style="font-size:1.6rem;color:#ffffff;margin-bottom:1rem;">${evt.title}</h3>
                <p style="color:var(--slate-300);line-height:1.7;font-size:0.98rem;margin-bottom:1.5rem;">
                  ${evt.description}
                </p>
                <a href="#blog" class="btn btn-outline-white btn-sm">
                  <span>Ver Notícias Deste Evento</span>
                  <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ==========================================================================
   PAGES: CENTRO DE BOAS ACÇÕES (CBA)
   ========================================================================== */

function renderCbaPage(tr) {
  return `
    <div class="page-hero-banner" style="background:linear-gradient(135deg, #0f766e, #0f172a);">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          Polo Central da ADDESSO
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          Centro de Boas Acções (CBA)
        </h1>
        <div style="font-size:1.35rem;color:var(--accent-300);font-style:italic;margin-bottom:1rem;">
          "${orgInfo.cba.slogan}"
        </div>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:720px;line-height:1.7;">
          Um espaço diário de esperança, educação, tecnologia, saúde preventiva e solidariedade para crianças, jovens e famílias.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <!-- História e Evolução -->
        <div style="display:grid;grid-template-columns:1.1fr 0.9fr;gap:3.5rem;align-items:center;margin-bottom:5rem;">
          <div>
            <div class="section-tag">Génese & Expansão</div>
            <h2 class="section-title">A História e Evolução do Centro</h2>
            <p style="font-size:1.05rem;color:var(--slate-700);line-height:1.8;margin-bottom:1.25rem;">
              ${orgInfo.cba.history}
            </p>
            <p style="font-size:1.05rem;color:var(--slate-700);line-height:1.8;margin-bottom:2rem;">
              Hoje, o CBA não é apenas um edifício, mas um modelo comunitário de referência que integra a primeira infância com a terceira idade, o desporto com a tecnologia e a agricultura familiar com a sustentabilidade económica.
            </p>
            <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
              <div style="background:var(--bg-subtle);border-radius:var(--radius-lg);padding:1rem 1.5rem;">
                <div style="font-size:1.8rem;font-weight:800;color:var(--primary-700);">3 Polos</div>
                <span style="font-size:0.85rem;color:var(--slate-600);">Polana Caniço, Nkobe & Maulana</span>
              </div>
              <div style="background:var(--bg-subtle);border-radius:var(--radius-lg);padding:1rem 1.5rem;">
                <div style="font-size:1.8rem;font-weight:800;color:var(--accent-600);">8 Serviços</div>
                <span style="font-size:0.85rem;color:var(--slate-600);">Diários e Gratuitos</span>
              </div>
            </div>
          </div>

          <div style="border-radius:var(--radius-2xl);overflow:hidden;box-shadow:var(--shadow-xl);border:1px solid var(--slate-200);aspect-ratio:4/3;background:var(--slate-900);">
            <img src="./images/cba/cba_community_center.jpg" alt="Centro de Boas Acções Polana Caniço" style="width:100%;height:100%;object-fit:cover;" />
          </div>
        </div>

        <!-- Os 8 Serviços do CBA -->
        <div style="margin-bottom:5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Serviços Comunitários</div>
            <h2 class="section-title">O Que Oferecemos Diariamente no CBA</h2>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.75rem;">
            ${orgInfo.cba.services.map(s => `
              <div style="background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.75rem;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;">
                <div style="width:48px;height:48px;border-radius:var(--radius-lg);background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;">
                  <i data-lucide="${s.icon}" style="width:24px;height:24px;"></i>
                </div>
                <h4 style="font-size:1.15rem;margin-bottom:0.5rem;color:var(--slate-900);">${s.title}</h4>
                <p style="font-size:0.9rem;color:var(--slate-600);line-height:1.6;">${s.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Os 3 Polos Comunitários -->
        <div style="background:var(--slate-900);border-radius:var(--radius-2xl);padding:clamp(2rem,4vw,3.5rem);color:#ffffff;margin-bottom:5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <span class="badge badge-gold" style="margin-bottom:0.75rem;">Polos de Impacto</span>
            <h2 style="font-size:2rem;color:#ffffff;margin-bottom:0.5rem;">Os 3 Centros de Boas Acções</h2>
            <p style="color:var(--slate-300);">Locais de acolhimento e desenvolvimento da ADDESSO:</p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:2rem;">
            ${orgInfo.presence.centralHubs.map(hub => `
              <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:var(--radius-xl);padding:2rem;">
                <div style="display:flex;align-items:center;gap:0.5rem;color:var(--accent-400);font-size:0.85rem;font-weight:700;margin-bottom:0.5rem;">
                  <i data-lucide="map-pin" style="width:16px;height:16px;"></i>
                  ${hub.city}
                </div>
                <h3 style="font-size:1.35rem;color:#ffffff;margin-bottom:0.5rem;">${hub.role}</h3>
                <span style="display:block;font-size:0.9rem;color:var(--slate-400);margin-bottom:1rem;">${hub.location}</span>
                <p style="font-size:0.92rem;color:var(--slate-300);line-height:1.6;">${hub.highlight}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Horários e Localização -->
        <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:2.5rem;display:flex;align-items:center;justify-content:space-between;gap:2rem;flex-wrap:wrap;">
          <div>
            <h3 style="font-size:1.4rem;color:var(--slate-900);margin-bottom:0.5rem;">Visite o Centro de Boas Acções</h3>
            <div style="display:flex;flex-direction:column;gap:0.4rem;font-size:0.95rem;color:var(--slate-600);">
              <div><strong style="color:var(--slate-800);">Localização:</strong> ${orgInfo.cba.location}</div>
              <div><strong style="color:var(--slate-800);">Horário:</strong> ${orgInfo.cba.schedule}</div>
            </div>
          </div>
          <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            <a href="#contactos" class="btn btn-primary">
              <i data-lucide="map-pin" style="width:16px;height:16px;"></i>
              <span>Como Chegar</span>
            </a>
            <a href="#participar" class="btn btn-accent">
              <i data-lucide="heart" style="width:16px;height:16px;"></i>
              <span>Apoiar o CBA</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ==========================================================================
   PAGES: PRESENÇA NACIONAL & DELEGAÇÕES
   ========================================================================== */

function renderDelegacoesPage(tr) {
  return `
    <div class="page-hero-banner" style="background:linear-gradient(135deg, #0c4a6e, #0f172a);">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          Cobertura em Todo Moçambique
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          Presença Nacional & Delegações Provinciais
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:720px;line-height:1.7;">
          Com sede em Maputo e representações activas em 8 províncias, a ADDESSO mobiliza comunidades de norte a sul do país.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <!-- Polos Centrais de Maputo -->
        <div style="margin-bottom:4rem;">
          <div class="section-tag">Sede & Polos Centrais</div>
          <h2 class="section-title">Maputo (Cidade e Província)</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:2rem;margin-top:2rem;">
            ${orgInfo.presence.centralHubs.map(hub => `
              <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:2rem;">
                <span class="badge badge-blue" style="margin-bottom:0.75rem;">${hub.city}</span>
                <h3 style="font-size:1.35rem;color:var(--slate-900);margin-bottom:0.5rem;">${hub.role}</h3>
                <div style="font-size:0.88rem;color:var(--slate-500);margin-bottom:1rem;">
                  <i data-lucide="map-pin" style="width:14px;height:14px;display:inline;"></i> ${hub.location}
                </div>
                <p style="font-size:0.92rem;color:var(--slate-700);line-height:1.6;">${hub.highlight}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Delegações Provinciais de Moçambique -->
        <div>
          <div class="section-tag">Delegações Provinciais</div>
          <h2 class="section-title">Cobertura Nacional em 8 Províncias</h2>
          <p style="color:var(--slate-600);font-size:1.05rem;margin-bottom:2.5rem;">
            Cada delegação actua em coordenação com os líderes comunitários, municípios e parceiros locais:
          </p>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.75rem;">
            ${orgInfo.presence.provincialDelegations.map(del => `
              <div class="provincial-card">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                  <h3 style="font-size:1.35rem;color:var(--slate-900);font-weight:800;">Província de ${del.province}</h3>
                  <span class="badge badge-outline">${del.capital}</span>
                </div>
                <div style="margin-bottom:0.75rem;font-size:0.82rem;font-weight:700;color:var(--primary-700);text-transform:uppercase;">
                  Foco de Intervenção Local:
                </div>
                <p style="font-size:0.9rem;color:var(--slate-600);line-height:1.6;">
                  ${del.focus}
                </p>
                <div style="margin-top:auto;padding-top:1.25rem;border-top:1px solid var(--slate-100);display:flex;align-items:center;justify-content:space-between;">
                  <span style="font-size:0.8rem;color:var(--slate-500);">Delegação Activa</span>
                  <a href="#contactos" class="btn btn-sm btn-outline">Contactar</a>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ==========================================================================
   PAGES: TRANSPARÊNCIA & PRESTAÇÃO DE CONTAS
   ========================================================================== */

function renderTransparenciaPage(tr) {
  return `
    <div class="page-hero-banner" style="background:linear-gradient(135deg, #1e293b, #0f172a);">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          Rigor Ético & Boa Governação
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          Transparência & Prestação de Contas
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:720px;line-height:1.7;">
          O compromisso inegociável da ADDESSO com a prestação de contas, auditoria, transparência orçamental e proteção dos beneficiários.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <!-- Estatuto Legal -->
        <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:2.5rem;margin-bottom:4rem;">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;">
              <i data-lucide="shield-check" style="width:26px;height:26px;"></i>
            </div>
            <div>
              <h2 style="font-size:1.4rem;color:var(--slate-900);margin:0;">Enquadramento Legal & Estatutos Oficiais</h2>
              <span style="font-size:0.88rem;color:var(--slate-500);">Entidade Jurídica de Direito Moçambicano</span>
            </div>
          </div>
          <p style="font-size:1.02rem;color:var(--slate-700);line-height:1.75;margin-bottom:1.5rem;">
            ${orgInfo.transparency.legalStatus}
          </p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1rem;">
            <div style="background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1rem;">
              <span style="font-size:0.75rem;color:var(--slate-500);text-transform:uppercase;font-weight:700;display:block;">Publicação Oficial</span>
              <strong style="color:var(--slate-900);font-size:0.95rem;">${orgInfo.transparency.bulletinNumber}</strong>
            </div>
            <div style="background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1rem;">
              <span style="font-size:0.75rem;color:var(--slate-500);text-transform:uppercase;font-weight:700;display:block;">Número de Identificação Tributária</span>
              <strong style="color:var(--slate-900);font-size:0.95rem;">NUIT: ${orgInfo.transparency.nuit}</strong>
            </div>
          </div>
        </div>

        <!-- Relatórios Anuais de Actividades -->
        <div style="margin-bottom:4.5rem;">
          <div class="section-tag">Relatórios de Actividades</div>
          <h2 class="section-title">Relatórios Anuais e Auditorias (2022 - 2025)</h2>
          <p style="color:var(--slate-600);font-size:1.05rem;margin-bottom:2.5rem;">
            Consulte os relatórios consolidados de actividades e prestação de contas dos últimos anos:
          </p>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1.5rem;">
            ${orgInfo.transparency.annualReports.map(rep => `
              <div class="report-download-card">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                  <span class="badge badge-gold">Ano ${rep.year}</span>
                  <span style="font-size:0.8rem;color:var(--green-700);font-weight:700;">● ${rep.status}</span>
                </div>
                <h3 style="font-size:1.15rem;color:var(--slate-900);margin-bottom:0.75rem;font-weight:700;">${rep.title}</h3>
                <div style="font-size:0.85rem;color:var(--slate-600);margin-bottom:1.5rem;">
                  Beneficiários Documentados: <strong>${rep.beneficiaries}</strong>
                </div>
                <button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;" onclick="window.showToast('Download do Relatório ${rep.year} iniciado!', 'success')">
                  <i data-lucide="download" style="width:15px;height:15px;"></i>
                  <span>Descarregar Relatório (PDF)</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Políticas Institucionais e Salvaguardas -->
        <div>
          <div class="section-tag">Políticas & Regulamentos</div>
          <h2 class="section-title">Códigos de Conduta e Salvaguarda</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:1.75rem;margin-top:2rem;">
            ${orgInfo.transparency.policies.map(pol => `
              <div style="background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.75rem;box-shadow:var(--shadow-sm);">
                <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-50);color:var(--primary-600);display:flex;align-items:center;justify-content:center;margin-bottom:1rem;">
                  <i data-lucide="shield-check" style="width:20px;height:20px;"></i>
                </div>
                <h4 style="font-size:1.1rem;color:var(--slate-900);margin-bottom:0.5rem;font-weight:700;">${pol.name}</h4>
                <p style="font-size:0.9rem;color:var(--slate-600);line-height:1.6;">${pol.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ==========================================================================
   PAGES: COMO APOIAR / PARTICIPAR
   ========================================================================== */

function renderParticiparPage(tr) {
  return `
    <div class="page-hero-banner" style="background:linear-gradient(135deg, #b45309, #0f172a);">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          Solidariedade & Transformação
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          Como Apoiar & Fazer Parte
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:720px;line-height:1.7;">
          Seja através de contribuições financeiras, doações de materiais, voluntariado comunitário ou parcerias empresariais.
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

              <!-- Vodacom M-Pesa -->
              <div class="payment-channel-card mpesa-card">
                <div class="payment-channel-left">
                  <div class="payment-logo-badge">
                    <img src="./images/payments/mpesa_logo.png" alt="Vodacom M-Pesa" onerror="this.src='./logo_cropped.png'" />
                  </div>
                  <div class="payment-channel-info">
                    <span class="payment-channel-tag mpesa-tag">Vodacom M-Pesa (Moçambique)</span>
                    <strong class="payment-channel-number">${orgInfo.donationInfo.mpesa}</strong>
                    <span class="payment-channel-name">${orgInfo.donationInfo.mpesaName}</span>
                  </div>
                </div>
                <button class="btn btn-accent btn-sm" onclick="window.copyToClipboard('${orgInfo.donationInfo.mpesa}', 'Número M-Pesa copiado com sucesso!')">
                  <i data-lucide="copy" style="width:14px;height:14px;"></i> Copiar
                </button>
              </div>

              <!-- Movitel e-Mola -->
              <div class="payment-channel-card emola-card">
                <div class="payment-channel-left">
                  <div class="payment-logo-badge">
                    <img src="./images/payments/emola_logo.png" alt="Movitel e-Mola" onerror="this.src='./logo_cropped.png'" />
                  </div>
                  <div class="payment-channel-info">
                    <span class="payment-channel-tag emola-tag">Movitel e-Mola</span>
                    <strong class="payment-channel-number">${orgInfo.donationInfo.emola}</strong>
                    <span class="payment-channel-name">${orgInfo.donationInfo.mpesaName}</span>
                  </div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="window.copyToClipboard('${orgInfo.donationInfo.emola}', 'Número e-Mola copiado com sucesso!')">
                  <i data-lucide="copy" style="width:14px;height:14px;"></i> Copiar
                </button>
              </div>

              <!-- Transferência Bancária (BCI) -->
              <div class="payment-channel-card bci-card">
                <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
                  <div class="payment-logo-badge">
                    <img src="./images/payments/bci_logo.png" alt="Banco BCI" onerror="this.src='./logo_cropped.png'" />
                  </div>
                  <div>
                    <h4 style="font-size:1.1rem;font-weight:800;color:var(--slate-900);margin:0;">Transferência Bancária (BCI)</h4>
                    <span style="font-size:0.8rem;color:var(--slate-500);">${orgInfo.donationInfo.bank}</span>
                  </div>
                </div>

                <div class="bci-details-grid">
                  <div class="bci-detail-item">
                    <span class="bci-label">Titular:</span>
                    <strong class="bci-val">${orgInfo.donationInfo.mpesaName}</strong>
                  </div>
                  <div class="bci-detail-item">
                    <span class="bci-label">Conta:</span>
                    <strong class="bci-val">${orgInfo.donationInfo.accountNumber}</strong>
                  </div>
                  <div class="bci-detail-item">
                    <span class="bci-label">NIB:</span>
                    <strong class="bci-val">${orgInfo.donationInfo.nib}</strong>
                  </div>
                  <div class="bci-detail-item">
                    <span class="bci-label">IBAN:</span>
                    <strong class="bci-val">${orgInfo.donationInfo.iban}</strong>
                  </div>
                  <div class="bci-detail-item">
                    <span class="bci-label">SWIFT:</span>
                    <strong class="bci-val">${orgInfo.donationInfo.swift}</strong>
                  </div>
                </div>

                <button class="btn btn-outline btn-sm bci-copy-btn" onclick="window.copyToClipboard('${orgInfo.donationInfo.iban}', 'IBAN do BCI copiado!')">
                  <i data-lucide="copy" style="width:14px;height:14px;"></i> Copiar Dados Bancários
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Doações em Espécie (Lista de Necessidades) -->
        <div style="margin-bottom:5rem;">
          <div style="text-align:center;max-width:650px;margin:0 auto 3rem;">
            <div class="section-tag">Doações em Espécie</div>
            <h2 class="section-title">Lista de Necessidades Comunitárias</h2>
            <p style="color:var(--slate-600);font-size:1.05rem;">Aceitamos doações de materiais para entrega directa às crianças e famílias:</p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1.75rem;">
            ${orgInfo.materialNeeds.map(need => `
              <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.75rem;">
                <span class="badge badge-emerald" style="margin-bottom:0.75rem;">${need.category}</span>
                <p style="font-size:0.95rem;color:var(--slate-700);line-height:1.6;font-weight:500;">
                  ${need.items}
                </p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Volunteer Form & Corporate Partnerships -->
        <div style="max-width:850px;margin:0 auto;background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:clamp(2rem,4vw,3.5rem);">
          <div style="text-align:center;margin-bottom:2.5rem;">
            <div class="section-tag">Junte-se à Nossa Missão</div>
            <h2 class="section-title">Inscrição para Voluntariado & Parcerias</h2>
            <p style="color:var(--slate-600);">Preencha o formulário para se tornar voluntário comunitário, universitário ou parceiro corporativo da ADDESSO.</p>
          </div>

          <form id="volunteer-form" onsubmit="handleVolunteerSubmit(event)" style="display:flex;flex-direction:column;gap:1.25rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Nome Completo *</label>
                <input type="text" required placeholder="Seu nome" class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" />
              </div>
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Telefone / WhatsApp *</label>
                <input type="tel" required placeholder="+258 84 000 0000" class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">E-mail</label>
                <input type="email" placeholder="seuemail@exemplo.com" class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" />
              </div>
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Modalidade de Participação *</label>
                <select required class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);">
                  <option value="">Seleccione a modalidade...</option>
                  <option value="voluntario_individual">Voluntariado Comunitário / Universitário</option>
                  <option value="primeira_infancia">Apoio à Primeira Infância e Creches</option>
                  <option value="hub_digital">Formador de Informática / Hub Digital</option>
                  <option value="idosos">Apoio a Idosos & Fisioterapia</option>
                  <option value="hortas">Hortas Familiares & Agricultura</option>
                  <option value="parceiro_empresa">Parceria Empresarial / Voluntariado Corporativo</option>
                  <option value="doador_recorrente">Doador Regular / Patrocinador</option>
                </select>
              </div>
            </div>

            <div>
              <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Mensagem / Disponibilidade</label>
              <textarea rows="3" placeholder="Conte-nos como gostaria de colaborar ou a disponibilidade de horários..." class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);"></textarea>
            </div>

            <button type="submit" class="btn btn-accent btn-lg" style="width:100%;justify-content:center;margin-top:0.5rem;">
              <i data-lucide="heart" style="width:18px;height:18px;"></i>
              <span>Enviar Candidatura / Contacto</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  `;
}

/* ==========================================================================
   PAGES: BLOG & NOTÍCIAS (169 POSTS)
   ========================================================================== */

function renderBlogPage(tr) {
  let filtered = [...state.posts];

  // Category filter
  if (state.selectedCategory !== 'all') {
    filtered = filtered.filter(p => 
      p.primary_category === state.selectedCategory || 
      (p.categories && p.categories.includes(state.selectedCategory))
    );
  }

  // Year filter
  if (state.selectedYear !== 'all') {
    filtered = filtered.filter(p => p.date && p.date.startsWith(state.selectedYear));
  }

  // Search filter
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.content && p.content.toLowerCase().includes(q)) ||
      (p.primary_category && p.primary_category.toLowerCase().includes(q))
    );
  }

  // Sort order
  if (state.sortOrder === 'asc') {
    filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  } else {
    filtered.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  // Extract unique years
  const years = Array.from(new Set(state.posts.map(p => p.date ? p.date.slice(0, 4) : null).filter(Boolean))).sort().reverse();

  return `
    <div class="page-hero-banner">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          Diário de Campo • 2017 a 2026
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          Arquivo Completo de Acções & Notícias
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:720px;line-height:1.7;">
          Mais de 169 acções comunitárias documentadas em fotografias e relatos de campo pelo povo moçambicano.
        </p>
      </div>
    </div>

    <section class="section-padding blog-section">
      <div class="container">
        <!-- Controls Card -->
        <div class="blog-controls-card">
          <div class="blog-search-row">
            <div class="search-input-box">
              <i data-lucide="search" class="search-icon"></i>
              <input 
                type="text" 
                id="blog-search" 
                class="blog-search-input" 
                placeholder="${tr.blog.searchPlaceholder}" 
                value="${escapeHtml(state.searchQuery)}" 
              />
              ${state.searchQuery ? `
                <button class="clear-search-btn" onclick="window.resetBlogFilters()" title="Limpar pesquisa">×</button>
              ` : ''}
            </div>

            <div class="blog-view-buttons">
              <button id="sort-desc-btn" class="btn btn-sm ${state.sortOrder === 'desc' ? 'btn-primary' : 'btn-outline'}" title="${tr.blog.orderDesc}">
                <i data-lucide="calendar" style="width:14px;height:14px;"></i>
                <span class="hide-on-mobile">${tr.blog.orderDesc}</span>
              </button>
              <button id="sort-asc-btn" class="btn btn-sm ${state.sortOrder === 'asc' ? 'btn-primary' : 'btn-outline'}" title="${tr.blog.orderAsc}">
                <i data-lucide="calendar" style="width:14px;height:14px;"></i>
                <span class="hide-on-mobile">${tr.blog.orderAsc}</span>
              </button>
              <button id="view-grid-btn" class="btn btn-sm ${state.viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}" title="Ver em Grade">
                <i data-lucide="layers" style="width:14px;height:14px;"></i>
              </button>
              <button id="view-timeline-btn" class="btn btn-sm ${state.viewMode === 'timeline' ? 'btn-primary' : 'btn-outline'}" title="Ver em Linha do Tempo">
                <i data-lucide="clock" style="width:14px;height:14px;"></i>
              </button>
            </div>
          </div>

          <!-- Category Pills -->
          <div class="category-pills-row">
            <span class="filter-label">${tr.blog.filterCat}</span>
            <div class="pills-scroll-wrapper">
              <button class="pill-btn ${state.selectedCategory === 'all' ? 'active' : ''}" onclick="window.setBlogCategory('all')">
                ${tr.blog.allCats} (${state.posts.length})
              </button>
              ${CATEGORIES.map(cat => {
                const count = state.posts.filter(p => p.primary_category === cat || (p.categories && p.categories.includes(cat))).length;
                return `
                  <button class="pill-btn ${state.selectedCategory === cat ? 'active' : ''}" onclick="window.setBlogCategory('${escapeHtml(cat)}')">
                    ${cat} (${count})
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Year Filter Pills -->
          <div class="year-pills-row">
            <span class="filter-label">${tr.blog.filterYear}</span>
            <div class="pills-scroll-wrapper">
              <button class="pill-btn-sm ${state.selectedYear === 'all' ? 'active' : ''}" onclick="window.setBlogYear('all')">
                ${tr.blog.allYears}
              </button>
              ${years.map(yr => {
                const count = state.posts.filter(p => p.date && p.date.startsWith(yr)).length;
                return `
                  <button class="pill-btn-sm ${state.selectedYear === yr ? 'active' : ''}" onclick="window.setBlogYear('${yr}')">
                    ${yr} (${count})
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Filter Results Status -->
        <div class="results-status-bar">
          <div>
            ${tr.blog.showing} <strong>${filtered.length}</strong> ${tr.blog.of} <strong>${state.posts.length}</strong> ${tr.blog.posts}
            ${state.selectedCategory !== 'all' ? ` em <em>"${state.selectedCategory}"</em>` : ''}
            ${state.selectedYear !== 'all' ? ` no ano <em>${state.selectedYear}</em>` : ''}
          </div>
          ${(state.selectedCategory !== 'all' || state.selectedYear !== 'all' || state.searchQuery) ? `
            <button class="btn btn-outline btn-sm" onclick="window.resetBlogFilters()">Limpar Filtros</button>
          ` : ''}
        </div>

        <!-- Posts Listing (Grid or Timeline) -->
        ${filtered.length === 0 ? `
          <div class="empty-state-card">
            <i data-lucide="search" style="width:48px;height:48px;color:var(--slate-400);margin-bottom:1rem;"></i>
            <h3>Nenhuma publicação encontrada</h3>
            <p>Tente ajustar os termos de pesquisa ou remover os filtros activos.</p>
            <button class="btn btn-primary" onclick="window.resetBlogFilters()" style="margin-top:1rem;">Ver Todos os Posts</button>
          </div>
        ` : state.viewMode === 'grid' ? `
          <div class="blog-grid">
            ${filtered.map(post => `
              <article class="post-card" onclick="window.location.hash = '#post/${post.id}'" style="cursor:pointer;">
                <div class="post-card-img-wrapper">
                  <img src="${post.cover_image || './default_cover.png'}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.src='./default_cover.png'" />
                  <span class="post-cat-badge ${getCategoryColor(post.primary_category)}">${post.primary_category}</span>
                  <span class="post-count-badge">
                    <i data-lucide="image" style="width:13px;height:13px;"></i>
                    ${post.image_count || (post.images ? post.images.length : 1)}
                  </span>
                </div>
                <div class="post-card-body">
                  <div class="post-card-meta">
                    <span><i data-lucide="calendar" style="width:13px;height:13px;"></i> ${formatDatePT(post.date)}</span>
                    <span><i data-lucide="clock" style="width:13px;height:13px;"></i> ${post.read_time_min} ${tr.blog.readTime}</span>
                  </div>
                  <h3 class="post-card-title">${post.title}</h3>
                  <p class="post-card-excerpt">${post.excerpt}</p>
                  <div class="post-card-footer">
                    <span class="post-read-more">
                      ${tr.blog.readStory}
                      <i data-lucide="arrow-right" style="width:15px;height:15px;"></i>
                    </span>
                  </div>
                </div>
              </article>
            `).join('')}
          </div>
        ` : `
          <div class="timeline-container">
            ${filtered.map(post => `
              <div class="timeline-item" onclick="window.location.hash = '#post/${post.id}'" style="cursor:pointer;">
                <div class="timeline-dot"></div>
                <div class="timeline-card">
                  <div class="timeline-img-box">
                    <img src="${post.cover_image || './default_cover.png'}" alt="${escapeHtml(post.title)}" loading="lazy" onerror="this.src='./default_cover.png'" />
                  </div>
                  <div class="timeline-content">
                    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.4rem;">
                      <span class="badge ${getCategoryColor(post.primary_category)}">${post.primary_category}</span>
                      <span style="font-size:0.8rem;color:var(--slate-500);"><i data-lucide="calendar" style="width:13px;height:13px;display:inline;"></i> ${formatDatePT(post.date)}</span>
                    </div>
                    <h3 style="font-size:1.15rem;font-weight:700;color:var(--slate-900);margin-bottom:0.5rem;">${post.title}</h3>
                    <p style="font-size:0.88rem;color:var(--slate-600);line-height:1.6;margin-bottom:0.75rem;">${post.excerpt}</p>
                    <span class="post-read-more" style="font-size:0.82rem;">${tr.blog.readStory} →</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </section>
  `;
}

/* ==========================================================================
   PAGES: DEDICATED POST PAGE (WITH FEATURED IMAGE & MASONRY GALLERY)
   ========================================================================== */

function renderDedicatedPostPage(postId, tr) {
  const post = state.posts.find(p => p.id === postId);
  if (!post) {
    return `
      <div class="container section-padding" style="text-align:center;">
        <h2>Publicação não encontrada</h2>
        <a href="#blog" class="btn btn-primary" style="margin-top:1.5rem;">Voltar ao Blog</a>
      </div>
    `;
  }

  const currentIndex = state.posts.findIndex(p => p.id === postId);
  const prevPost = currentIndex > 0 ? state.posts[currentIndex - 1] : null;
  const nextPost = currentIndex < state.posts.length - 1 ? state.posts[currentIndex + 1] : null;

  // Prepare images list
  const featuredImage = post.cover_image && post.cover_image !== './default_cover.png' ? post.cover_image : null;
  const galleryImages = (post.images && post.images.length > 0) ? post.images : (featuredImage ? [featuredImage] : []);

  return `
    <article class="single-post-article">
      <!-- Breadcrumb & Back button -->
      <div style="background:var(--slate-900);color:#ffffff;padding:1.5rem 0;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div class="container">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
            <a href="#blog" class="btn btn-outline-white btn-sm">
              <i data-lucide="arrow-left" style="width:16px;height:16px;"></i>
              <span>${tr.blog.backToBlog}</span>
            </a>
            <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:var(--slate-300);">
              <span>Blog</span>
              <span>/</span>
              <span class="badge ${getCategoryColor(post.primary_category)}">${post.primary_category}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="container" style="max-width:960px;padding-top:3.5rem;padding-bottom:5rem;">
        <!-- Post Header -->
        <header class="single-post-header" style="margin-bottom:2.5rem;">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap;">
            <span class="badge ${getCategoryColor(post.primary_category)}" style="font-size:0.85rem;padding:0.4rem 0.9rem;">
              ${post.primary_category}
            </span>
            <span style="color:var(--slate-500);font-size:0.9rem;display:flex;align-items:center;gap:0.4rem;">
              <i data-lucide="calendar" style="width:15px;height:15px;"></i>
              ${formatDatePT(post.date)}
            </span>
            <span style="color:var(--slate-500);font-size:0.9rem;display:flex;align-items:center;gap:0.4rem;">
              <i data-lucide="clock" style="width:15px;height:15px;"></i>
              ${post.read_time_min} ${tr.blog.readTime}
            </span>
          </div>

          <h1 style="font-size:clamp(2rem,3.5vw,2.8rem);line-height:1.25;color:var(--slate-900);font-weight:800;margin-bottom:1.5rem;">
            ${post.title}
          </h1>

          <!-- Social Share Bar -->
          <div class="single-post-share-bar">
            <span style="font-size:0.85rem;font-weight:700;color:var(--slate-600);">${tr.blog.shareText}</span>
            <div style="display:flex;gap:0.5rem;">
              <button class="share-icon-btn whatsapp" onclick="window.sharePostWhatsApp('${escapeHtml(post.title)}', ${post.id})" title="Partilhar no WhatsApp">
                <i data-lucide="phone" style="width:15px;height:15px;"></i>
                <span>WhatsApp</span>
              </button>
              <button class="share-icon-btn facebook" onclick="window.sharePostFacebook(${post.id})" title="Partilhar no Facebook">
                <i data-lucide="globe" style="width:15px;height:15px;"></i>
                <span>Facebook</span>
              </button>
              <button class="share-icon-btn link" onclick="window.copyPostLink(${post.id})" title="Copiar Link">
                <i data-lucide="copy" style="width:15px;height:15px;"></i>
                <span>Copiar Link</span>
              </button>
            </div>
          </div>
        </header>

        <!-- 1. FEATURED IMAGE (IMAGEM DE DESTAQUE) -->
        ${featuredImage ? `
          <div class="post-featured-image-frame" onclick="window.openLightbox(${post.id}, 0)">
            <img src="${featuredImage}" alt="${escapeHtml(post.title)}" onerror="this.src='./default_cover.png'" />
            <div class="featured-image-zoom-badge">
              <i data-lucide="maximize-2" style="width:16px;height:16px;"></i>
              <span>Ampliar Imagem</span>
            </div>
          </div>
        ` : ''}

        <!-- 2. POST BODY TEXT -->
        <div class="single-post-content" style="font-size:1.12rem;line-height:1.85;color:var(--slate-700);margin-bottom:3.5rem;">
          ${(post.content || '').split('\n\n').map(par => `<p style="margin-bottom:1.25rem;">${escapeHtml(par)}</p>`).join('')}
        </div>

        <!-- 3. MASONRY GALLERY (GALERIA DE FOTOGRAFIAS DO ARTIGO) -->
        ${galleryImages.length > 0 ? `
          <div class="post-masonry-section" style="margin-top:3.5rem;padding-top:2.5rem;border-top:1px solid var(--slate-200);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
              <div>
                <span class="badge badge-gold" style="margin-bottom:0.35rem;">Galeria de Campo</span>
                <h3 style="font-size:1.6rem;color:var(--slate-900);font-weight:800;">
                  Fotografias Desta Acção (${galleryImages.length})
                </h3>
              </div>
              <span style="font-size:0.85rem;color:var(--slate-500);">Clique para ver em ecrã inteiro</span>
            </div>

            <div class="masonry-gallery-container">
              ${galleryImages.map((img, idx) => `
                <div class="masonry-gallery-item" onclick="window.openLightbox(${post.id}, ${idx})">
                  <img src="${img}" alt="Registo fotográfico ${idx + 1}" loading="lazy" onerror="this.src='./default_cover.png'" />
                  <div class="masonry-item-overlay">
                    <div class="masonry-overlay-badge">
                      <i data-lucide="maximize-2" style="width:16px;height:16px;"></i>
                      <span>Ver Foto ${idx + 1}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Post Pagination (Prev / Next) -->
        <div class="post-nav-pagination" style="margin-top:4rem;padding-top:2rem;border-top:1px solid var(--slate-200);display:flex;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;">
          ${prevPost ? `
            <a href="#post/${prevPost.id}" class="post-nav-btn prev">
              <i data-lucide="arrow-left" style="width:18px;height:18px;"></i>
              <div>
                <span style="font-size:0.75rem;text-transform:uppercase;color:var(--slate-400);display:block;">${tr.blog.prevPost}</span>
                <strong style="color:var(--slate-800);font-size:0.95rem;">${prevPost.title.slice(0, 45)}...</strong>
              </div>
            </a>
          ` : '<div></div>'}

          ${nextPost ? `
            <a href="#post/${nextPost.id}" class="post-nav-btn next">
              <div style="text-align:right;">
                <span style="font-size:0.75rem;text-transform:uppercase;color:var(--slate-400);display:block;">${tr.blog.nextPost}</span>
                <strong style="color:var(--slate-800);font-size:0.95rem;">${nextPost.title.slice(0, 45)}...</strong>
              </div>
              <i data-lucide="arrow-right" style="width:18px;height:18px;"></i>
            </a>
          ` : '<div></div>'}
        </div>
      </div>
    </article>
  `;
}

/* ==========================================================================
   PAGES: CONTACTOS
   ========================================================================== */

function renderContactosPage(tr) {
  return `
    <div class="page-hero-banner" style="background:linear-gradient(135deg, #0f172a, #1e293b);">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          ${tr.contact.tag}
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          ${tr.contact.title}
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:720px;line-height:1.7;">
          ${tr.contact.subtitle}
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <div style="display:grid;grid-template-columns:1fr 1.1fr;gap:3.5rem;">
          <!-- Contact Info Cards -->
          <div>
            <h2 style="font-size:1.75rem;color:var(--slate-900);margin-bottom:1.5rem;font-weight:800;">
              Sede Central & Polos Comunitários
            </h2>

            <div style="display:flex;flex-direction:column;gap:1.5rem;margin-bottom:2.5rem;">
              <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.5rem;">
                <span class="badge badge-blue" style="margin-bottom:0.5rem;">Sede Nacional & Polo Central CBA</span>
                <strong style="display:block;font-size:1.05rem;color:var(--slate-900);margin-bottom:0.25rem;">Polana Caniço "A", Cidade de Maputo</strong>
                <p style="font-size:0.88rem;color:var(--slate-600);line-height:1.5;">${orgInfo.headquarters.address}</p>
              </div>

              <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.5rem;">
                <span class="badge badge-gold" style="margin-bottom:0.5rem;">Telefones & WhatsApp Directo</span>
                <div style="display:flex;flex-direction:column;gap:0.4rem;font-size:0.95rem;color:var(--slate-800);margin-top:0.25rem;">
                  ${orgInfo.contacts.phones.map(phone => `
                    <div><strong>${phone}</strong></div>
                  `).join('')}
                </div>
              </div>

              <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.5rem;">
                <span class="badge badge-emerald" style="margin-bottom:0.5rem;">Endereços Electrónicos</span>
                <div style="display:flex;flex-direction:column;gap:0.4rem;font-size:0.95rem;color:var(--slate-800);margin-top:0.25rem;">
                  ${orgInfo.contacts.emails.map(email => `
                    <div><strong>${email}</strong></div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- WhatsApp Quick Connect Button -->
            <a href="https://wa.me/${orgInfo.contacts.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" class="btn btn-accent btn-lg" style="width:100%;justify-content:center;">
              <i data-lucide="phone" style="width:18px;height:18px;"></i>
              <span>Falar Directamente via WhatsApp</span>
            </a>
          </div>

          <!-- Contact Form -->
          <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-2xl);padding:clamp(2rem,4vw,3rem);">
            <h3 style="font-size:1.5rem;color:var(--slate-900);margin-bottom:0.5rem;font-weight:800;">
              Envie-nos uma Mensagem Directa
            </h3>
            <p style="color:var(--slate-600);font-size:0.95rem;margin-bottom:2rem;">
              Responderemos ao seu pedido de informação ou proposta no prazo de 24 a 48 horas úteis.
            </p>

            <form id="contact-form" onsubmit="handleContactSubmit(event)" style="display:flex;flex-direction:column;gap:1.25rem;">
              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Nome Completo *</label>
                <input type="text" required placeholder="Seu nome" class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" />
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">E-mail *</label>
                  <input type="email" required placeholder="seuemail@exemplo.com" class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" />
                </div>
                <div>
                  <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Telefone</label>
                  <input type="tel" placeholder="+258 84 000 0000" class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" />
                </div>
              </div>

              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Assunto *</label>
                <input type="text" required placeholder="Ex: Parceria institucional, Doação de livros, Visita ao CBA..." class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" />
              </div>

              <div>
                <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Mensagem Detalhada *</label>
                <textarea rows="4" required placeholder="Escreva aqui a sua mensagem..." class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);"></textarea>
              </div>

              <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;margin-top:0.5rem;">
                <i data-lucide="mail" style="width:18px;height:18px;"></i>
                <span>${tr.contact.sendBtn}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ==========================================================================
   PAGES: ADMIN STUDIO
   ========================================================================== */

function renderAdminPage(tr) {
  return `
    <div class="page-hero-banner" style="background:linear-gradient(135deg, #0f172a, #334155);">
      <div class="container">
        <div class="section-tag" style="background:rgba(255,255,255,0.15);color:#ffffff;border-color:rgba(255,255,255,0.3);">
          Painel de Gestão & Edição de Publicações
        </div>
        <h1 style="font-size:clamp(2.4rem,4vw,3.5rem);color:#ffffff;margin-bottom:1rem;font-weight:800;">
          Admin Studio ADDESSO
        </h1>
        <p style="font-size:1.15rem;color:var(--slate-200);max-width:720px;line-height:1.7;">
          Gerencie todas as publicações do arquivo histórico, crie novas acções de campo com upload de fotos e ordene por arrastamento.
        </p>
      </div>
    </div>

    <section class="section-padding" style="background-color:#ffffff;">
      <div class="container">
        <!-- Admin Navigation Tabs -->
        <div class="admin-tabs-bar">
          <button class="admin-tab-btn ${state.adminTab === 'posts' ? 'active' : ''}" onclick="setAdminTab('posts')">
            <i data-lucide="layers" style="width:16px;height:16px;"></i>
            <span>Publicações Catalogadas (${state.posts.length})</span>
          </button>
          <button class="admin-tab-btn ${state.adminTab === 'create' ? 'active' : ''}" onclick="setAdminTab('create')">
            <i data-lucide="plus" style="width:16px;height:16px;"></i>
            <span>${state.adminEditingPost ? 'Editar Publicação #' + state.adminEditingPost.id : 'Criar Nova Publicação'}</span>
          </button>
          <div style="margin-left:auto;display:flex;gap:0.5rem;">
            <button class="btn btn-outline btn-sm" onclick="exportPostsJSON()" title="Descarregar JSON">
              <i data-lucide="download" style="width:14px;height:14px;"></i> Exportar JSON
            </button>
            <button class="btn btn-outline btn-sm" onclick="resetToFactoryPosts()" title="Restaurar Originais">
              <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i> Restaurar Fábrica
            </button>
          </div>
        </div>

        <!-- Admin Content -->
        ${state.adminTab === 'posts' ? renderAdminPostsList() : renderAdminPostForm()}
      </div>
    </section>
  `;
}

function renderAdminPostsList() {
  return `
    <div style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:1.5rem;box-shadow:var(--shadow-sm);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
        <div>
          <h3 style="font-size:1.3rem;font-weight:700;color:var(--slate-900);">Lista Completa de Publicações</h3>
          <p style="font-size:0.85rem;color:var(--slate-500);">Arraste pelo ícone para reordenar ou utilize os botões de acção.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="setAdminTab('create')">
          <i data-lucide="plus" style="width:14px;height:14px;"></i> Nova Publicação
        </button>
      </div>

      <div id="sortable-posts-list" class="sortable-posts-container">
        ${state.posts.map((post, idx) => `
          <div class="sortable-post-row" draggable="true" data-index="${idx}">
            <div class="drag-handle" title="Arrastar para reordenar">
              <i data-lucide="grip-vertical" style="width:18px;height:18px;color:var(--slate-400);"></i>
            </div>
            <div class="post-row-thumb">
              <img src="${post.cover_image || './default_cover.png'}" alt="Thumb" onerror="this.src='./default_cover.png'" />
            </div>
            <div class="post-row-info">
              <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
                <span class="badge ${getCategoryColor(post.primary_category)}" style="font-size:0.7rem;padding:0.1rem 0.4rem;">${post.primary_category}</span>
                <span style="font-size:0.75rem;color:var(--slate-400);">${post.date}</span>
                <span style="font-size:0.75rem;color:var(--slate-400);">• ${post.image_count || 1} fotos</span>
              </div>
              <strong style="font-size:0.95rem;color:var(--slate-900);display:block;line-height:1.3;">#${post.id} — ${post.title}</strong>
            </div>
            <div class="post-row-actions">
              <button class="row-action-btn view" onclick="window.location.hash = '#post/${post.id}'" title="Ver no site">
                <i data-lucide="eye" style="width:15px;height:15px;"></i>
              </button>
              <button class="row-action-btn edit" onclick="editPostInAdmin(${post.id})" title="Editar">
                <i data-lucide="layers" style="width:15px;height:15px;"></i>
              </button>
              <button class="row-action-btn delete" onclick="deletePostInAdmin(${post.id})" title="Eliminar">
                <i data-lucide="trash-2" style="width:15px;height:15px;"></i>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAdminPostForm() {
  const isEditing = !!state.adminEditingPost;
  const draft = isEditing ? state.adminEditingPost : state.newPostDraft;

  return `
    <form id="post-editor-form" onsubmit="handleSavePost(event)" style="background:var(--bg-subtle);border:1px solid var(--slate-200);border-radius:var(--radius-xl);padding:2rem;box-shadow:var(--shadow-sm);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.75rem;border-bottom:1px solid var(--slate-200);padding-bottom:1rem;">
        <h3 style="font-size:1.4rem;font-weight:800;color:var(--slate-900);">
          ${isEditing ? `Editar Publicação #${draft.id}` : 'Criar Nova Publicação para o Blog'}
        </h3>
        ${isEditing ? `
          <button type="button" class="btn btn-outline btn-sm" onclick="cancelEditingPost()">Cancelar Edição</button>
        ` : ''}
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
        <div>
          <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Título da Publicação *</label>
          <input type="text" id="post-title" required value="${escapeHtml(draft.title)}" class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" placeholder="Ex: Inauguração do Centro de Boas Acções na Polana Caniço" />
        </div>
        <div>
          <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Data da Acção *</label>
          <input type="date" id="post-date" required value="${draft.date}" class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);" />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
        <div>
          <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Categoria Temática *</label>
          <select id="post-category" required class="form-input" style="width:100%;padding:0.75rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);">
            ${CATEGORIES.map(cat => `
              <option value="${cat}" ${draft.primary_category === cat ? 'selected' : ''}>${cat}</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">
            Imagem de Destaque (Featured Image)
          </label>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <input type="file" id="featured-image-input" accept="image/*" style="display:none;" onchange="window.handleFeaturedImageFile(this.files)" />
            <button type="button" class="btn btn-outline btn-sm" onclick="window.triggerFeaturedImageInput()">
              <i data-lucide="upload" style="width:14px;height:14px;"></i> Carregar Destaque
            </button>
            ${draft.cover_image && draft.cover_image !== './default_cover.png' ? `
              <button type="button" class="btn btn-outline btn-sm" style="color:var(--red-600);border-color:var(--red-300);" onclick="window.removeFeaturedImage()">
                <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Remover
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Featured Image Preview Card -->
      ${draft.cover_image && draft.cover_image !== './default_cover.png' ? `
        <div style="margin-bottom:1.5rem;background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1rem;display:flex;align-items:center;gap:1rem;">
          <img src="${draft.cover_image}" alt="Destaque" style="width:90px;height:65px;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--slate-200);" />
          <div>
            <span class="badge badge-gold" style="margin-bottom:0.25rem;">Imagem de Destaque Definida</span>
            <span style="display:block;font-size:0.8rem;color:var(--slate-500);">Esta fotografia aparecerá no topo do artigo e nas pré-visualizações.</span>
          </div>
        </div>
      ` : ''}

      <div style="margin-bottom:1.5rem;">
        <label style="display:block;font-size:0.85rem;font-weight:700;color:var(--slate-700);margin-bottom:0.4rem;">Texto Completo da Acção *</label>
        <textarea id="post-content" rows="7" required class="form-input" style="width:100%;padding:0.85rem 1rem;border:1px solid var(--slate-200);border-radius:var(--radius-md);line-height:1.6;" placeholder="Descreva os detalhes da actividade comunitária...">${escapeHtml(draft.content || '')}</textarea>
      </div>

      <!-- Multi-Image Masonry Gallery Upload Area -->
      <div style="background:#ffffff;border:1px solid var(--slate-200);border-radius:var(--radius-lg);padding:1.5rem;margin-bottom:1.5rem;">
        <label style="display:block;font-size:0.95rem;font-weight:700;color:var(--slate-900);margin-bottom:0.5rem;">
          Galeria de Fotos da Acção (Formato Masonry)
        </label>
        <div id="image-dropzone" class="image-dropzone-box" onclick="window.triggerFileInput()">
          <i data-lucide="upload" style="width:36px;height:36px;color:var(--primary-600);margin-bottom:0.75rem;"></i>
          <h4 style="font-size:1.05rem;color:var(--slate-800);margin-bottom:0.25rem;">
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
  if (mobileNav) {
    mobileNav.onclick = (e) => {
      if (e.target === mobileNav) mobileNav.classList.remove('open');
    };
    const navLinks = mobileNav.querySelectorAll('.mobile-link, a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
      });
    });
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
  showToast('Muito obrigado! A sua candidatura foi enviada com sucesso.', 'success');
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
