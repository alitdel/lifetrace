/**
 * LifeTrace Global Frontend Coordinator
 * Manages Dynamic Role-Based Navigation, Authentication State, and Notifications
 */

let currentUser = null;

const CATEGORY_IMAGES = {
  'basket-making': '/assets/images/category-basket.svg',
  'mat-making': '/assets/images/category-mat.svg',
  'pottery-clay-work': '/assets/images/category-pottery.svg',
  'traditional-weaving': '/assets/images/category-weaving.svg',
  'woodcraft-carving': '/assets/images/category-woodcraft.svg',
  beadwork: '/assets/images/category-beadwork.svg',
  'traditional-textiles': '/assets/images/category-textiles.svg',
  'handmade-household-products': '/assets/images/category-household.svg',
  'traditional-food-processing': '/assets/images/category-food.svg',
  'other-local-skills': '/assets/images/category-other.svg'
};

const DEMO_VIDEO_LIBRARY = [
  {
    id: 'basket-making-demo',
    category: 'Basket Making',
    categorySlug: 'basket-making',
    stage: 'Learning Stage 1 • Basket foundation',
    title: 'Basket Making Demonstration',
    description: 'Learn the coil and stitch rhythm used to build a durable woven form.',
    videoUrl: 'https://www.youtube.com/embed/tYLV3uw7nNk',
    thumbnail: 'https://img.youtube.com/vi/tYLV3uw7nNk/hqdefault.jpg',
    source: 'SPECIAL ART & CRAFT GALLERY🧿',
    sourceType: 'YouTube publisher',
    badge: 'Video'
  },
  {
    id: 'mat-weaving-demo',
    category: 'Mat Weaving',
    categorySlug: 'mat-making',
    stage: 'Learning Stage 2 • Mat weaving technique',
    title: 'Traditional Mat Weaving Demo',
    description: 'Explore a rhythmic strip-to-strip method for weaving mats with natural fibres.',
    videoUrl: 'https://www.youtube.com/embed/ay5CTMe3uiw',
    thumbnail: 'https://img.youtube.com/vi/ay5CTMe3uiw/hqdefault.jpg',
    source: 'luaaa666',
    sourceType: 'YouTube publisher',
    badge: 'Video'
  },
  {
    id: 'pottery-demo',
    category: 'Pottery',
    categorySlug: 'pottery-clay-work',
    stage: 'Learning Stage 3 • Wheel and hand-building basics',
    title: 'Pottery Making Demonstration',
    description: 'Learn pottery shaping, wall thickness control, and finishing techniques.',
    videoUrl: 'https://www.youtube.com/embed/OPVp_FDEkdA',
    thumbnail: 'https://img.youtube.com/vi/OPVp_FDEkdA/hqdefault.jpg',
    source: 'Saramics Pottery',
    sourceType: 'YouTube publisher',
    badge: 'Video'
  },
  {
    id: 'barkcloth-demo',
    category: 'Bark Cloth Making',
    categorySlug: 'traditional-textiles',
    stage: 'Learning Stage 4 • Bark preparation and beating',
    title: 'Ugandan Bark Cloth Making Demo',
    description: 'Explore the preparation, steaming, and rhythmic beating process used in Uganda.',
    videoUrl: 'https://www.youtube.com/embed/uhznFtHhkBo',
    thumbnail: 'https://img.youtube.com/vi/uhznFtHhkBo/hqdefault.jpg',
    source: 'UNESCO',
    sourceType: 'YouTube publisher',
    badge: 'Video'
  },
  {
    id: 'beadwork-demo',
    category: 'Beadwork',
    categorySlug: 'beadwork',
    stage: 'Learning Stage 5 • Bead pattern and finishing',
    title: 'Beadwork Demonstration',
    description: 'Learn step-by-step stringing, pattern planning, and finishing for a wearable craft.',
    videoUrl: 'https://www.youtube.com/embed/fpel-7JWxKg',
    thumbnail: 'https://img.youtube.com/vi/fpel-7JWxKg/hqdefault.jpg',
    source: 'Bead Centric',
    sourceType: 'YouTube publisher',
    badge: 'Video'
  }
];

function categoryImageFor(category) {
  return CATEGORY_IMAGES[category.slug] || '/assets/images/category-other.svg';
}

function normalizeVideoUrl(rawUrl) {
  if (!rawUrl) return '';
  const url = String(rawUrl).trim();
  if (url.includes('youtube.com/embed/')) return url;
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = new URL(url).searchParams.get('v');
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }
  if (url.includes('youtu.be/')) {
    const match = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  }
  return url;
}

function getDemoVideoInfo(rawUrl) {
  const normalized = normalizeVideoUrl(rawUrl);
  if (!normalized) return null;
  const match = normalized.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  const videoId = match ? match[1] : null;
  if (!videoId) return null;
  return DEMO_VIDEO_LIBRARY.find(item => item.videoUrl.includes(videoId)) || null;
}

window.categoryImageFor = categoryImageFor;
window.DEMO_VIDEO_LIBRARY = DEMO_VIDEO_LIBRARY;
window.normalizeVideoUrl = normalizeVideoUrl;
window.getDemoVideoInfo = getDemoVideoInfo;

document.addEventListener('DOMContentLoaded', async () => {
  await initSession();
  initNavbar();
  initNotificationBadge();
});

/**
 * Fetch Current User Session
 */
async function initSession() {
  try {
    const res = await api.get('/auth/me');
    if (res.authenticated && res.user) {
      currentUser = res.user;
    } else {
      currentUser = null;
    }
  } catch {
    currentUser = null;
  }
}

/**
 * Dynamically Render Navigation Bar
 */
function initNavbar() {
  const navContainer = document.getElementById('navbar-placeholder');
  if (!navContainer) return;

  const currentPath = window.location.pathname;

  let roleNavLinks = '';
  let authActions = '';

  if (!currentUser) {
    // Guest Links
    roleNavLinks = `
      <li><a href="/index.html" class="nav-link ${currentPath.endsWith('index.html') || currentPath === '/' ? 'active' : ''}">Home</a></li>
      <li><a href="/categories.html" class="nav-link ${currentPath.includes('categories') ? 'active' : ''}">Craft Categories</a></li>
      <li><a href="/knowledge-library.html" class="nav-link ${currentPath.includes('library') ? 'active' : ''}">Knowledge Library</a></li>
      <li><a href="/about.html" class="nav-link ${currentPath.includes('about') ? 'active' : ''}">About LifeTrace</a></li>
      <li><a href="/certificate.html" class="nav-link ${currentPath.includes('certificate') ? 'active' : ''}">Verify Certificate</a></li>
    `;

    authActions = `
      <a href="/login.html" class="btn btn-outline-white btn-sm">Sign In</a>
      <a href="/register.html" class="btn btn-gold btn-sm"><i class="fas fa-user-plus"></i> Register</a>
    `;
  } else {
    // Authenticated Links by Role
    if (currentUser.role === 'learner') {
      roleNavLinks = `
        <li><a href="/dashboard.html" class="nav-link ${currentPath.includes('dashboard') ? 'active' : ''}"><i class="fas fa-th-large"></i> Learner Hub</a></li>
        <li><a href="/knowledge-library.html" class="nav-link ${currentPath.includes('library') ? 'active' : ''}"><i class="fas fa-book-open"></i> Explore Library</a></li>
        <li><a href="/learning-progress.html" class="nav-link ${currentPath.includes('progress') ? 'active' : ''}"><i class="fas fa-tasks"></i> My Learning</a></li>
        <li><a href="/certificate.html" class="nav-link ${currentPath.includes('certificate') ? 'active' : ''}"><i class="fas fa-award"></i> Certificates</a></li>
      `;
    } else if (currentUser.role === 'expert') {
      roleNavLinks = `
        <li><a href="/dashboard.html" class="nav-link ${currentPath.includes('dashboard') ? 'active' : ''}"><i class="fas fa-tachometer-alt"></i> Expert Studio</a></li>
        <li><a href="/create-knowledge.html" class="nav-link ${currentPath.includes('create') ? 'active' : ''}"><i class="fas fa-plus-circle"></i> Document Knowledge</a></li>
        <li><a href="/knowledge-library.html" class="nav-link ${currentPath.includes('library') ? 'active' : ''}"><i class="fas fa-book-open"></i> Library</a></li>
        <li><a href="/practical-submission.html" class="nav-link ${currentPath.includes('practical') ? 'active' : ''}"><i class="fas fa-user-check"></i> Learner Submissions</a></li>
      `;
    } else if (currentUser.role === 'reviewer') {
      roleNavLinks = `
        <li><a href="/dashboard.html" class="nav-link ${currentPath.includes('dashboard') ? 'active' : ''}"><i class="fas fa-clipboard-check"></i> Reviewer Desk</a></li>
        <li><a href="/review-management.html" class="nav-link ${currentPath.includes('review') ? 'active' : ''}"><i class="fas fa-tasks"></i> Pending Submissions</a></li>
        <li><a href="/knowledge-library.html" class="nav-link ${currentPath.includes('library') ? 'active' : ''}"><i class="fas fa-book-open"></i> Library</a></li>
        <li><a href="/practical-submission.html" class="nav-link ${currentPath.includes('practical') ? 'active' : ''}"><i class="fas fa-vial"></i> Practical Evaluations</a></li>
      `;
    } else if (currentUser.role === 'admin') {
      roleNavLinks = `
        <li><a href="/dashboard.html" class="nav-link ${currentPath.includes('dashboard') ? 'active' : ''}"><i class="fas fa-chart-pie"></i> Admin Console</a></li>
        <li><a href="/user-management.html" class="nav-link ${currentPath.includes('user') ? 'active' : ''}"><i class="fas fa-users-cog"></i> Users</a></li>
        <li><a href="/category-management.html" class="nav-link ${currentPath.includes('category') ? 'active' : ''}"><i class="fas fa-tags"></i> Categories</a></li>
        <li><a href="/reports-analytics.html" class="nav-link ${currentPath.includes('reports') ? 'active' : ''}"><i class="fas fa-chart-line"></i> Analytics</a></li>
        <li><a href="/audit-logs.html" class="nav-link ${currentPath.includes('audit') ? 'active' : ''}"><i class="fas fa-shield-alt"></i> Audit Logs</a></li>
      `;
    }

    authActions = `
      <div style="position:relative;">
        <button class="notif-btn" id="notif-bell-btn" title="Notifications" onclick="toggleNotificationDropdown()">
          <i class="far fa-bell"></i>
          <span class="notif-badge" id="nav-notif-count" style="display:none;">0</span>
        </button>
        <div id="notif-dropdown" class="dropdown-menu" style="width:320px;right:0;">
          <div style="padding:12px 16px;font-weight:700;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">
            <span>Notifications</span>
            <a href="/notifications.html" style="font-size:0.75rem;color:var(--teal-600);">View All</a>
          </div>
          <div id="notif-dropdown-list" style="max-height:280px;overflow-y:auto;padding:8px 0;">
            <div style="padding:16px;text-align:center;color:#64748b;font-size:0.85rem;">No new notifications</div>
          </div>
        </div>
      </div>

      <div class="user-dropdown">
        <div class="user-menu-pill" onclick="toggleUserDropdown()">
          <img src="${currentUser.avatar_url || '/assets/avatars/admin.png'}" alt="Avatar" class="user-avatar-sm" onerror="this.src='/assets/avatars/admin.png'">
          <div class="user-menu-text">
            <div class="user-menu-name">${currentUser.full_name.split(' ')[0]}</div>
            <div class="user-menu-role">${currentUser.role}</div>
          </div>
          <i class="fas fa-chevron-down" style="font-size:0.7rem;color:var(--slate-400);"></i>
        </div>

        <div class="dropdown-menu" id="user-dropdown-menu">
          <div style="padding:14px 16px;background:var(--slate-50);border-bottom:1px solid var(--slate-200);">
            <div style="font-weight:700;color:var(--navy-900);">${currentUser.full_name}</div>
            <div style="font-size:0.75rem;color:var(--slate-500);">${currentUser.email}</div>
          </div>
          <a href="/dashboard.html" class="dropdown-item"><i class="fas fa-th-large"></i> Dashboard</a>
          <a href="/profile.html" class="dropdown-item"><i class="fas fa-user-circle"></i> My Profile</a>
          ${currentUser.role === 'admin' ? '<a href="/settings.html" class="dropdown-item"><i class="fas fa-sliders-h"></i> Platform Settings</a>' : ''}
          <div class="dropdown-divider"></div>
          <button type="button" onclick="handleLogout()" class="dropdown-item" style="color:var(--rose-600);"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </div>
      </div>
    `;
  }

  navContainer.innerHTML = `
    <nav class="navbar">
      <div class="container navbar-inner">
        <a href="/index.html" class="brand-logo">
          <div class="brand-icon"><i class="fas fa-compass"></i></div>
          <span>Life<span class="brand-gold">Trace</span></span>
        </a>

        <button type="button" class="nav-toggle" aria-label="Open navigation menu" aria-controls="main-nav-links" aria-expanded="false">
          <i class="fas fa-bars" aria-hidden="true"></i>
        </button>

        <ul class="nav-links" id="main-nav-links">
          ${roleNavLinks}
        </ul>

        <div class="nav-actions">
          ${authActions}
        </div>
      </div>
    </nav>
  `;

  const navToggle = navContainer.querySelector('.nav-toggle');
  navToggle.addEventListener('click', () => toggleMobileNav(navToggle));
}

function toggleMobileNav(button) {
  const links = document.getElementById('main-nav-links');
  if (!links) return;
  const isOpen = links.classList.toggle('mobile-open');
  button.setAttribute('aria-expanded', String(isOpen));
  button.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  button.innerHTML = `<i class="fas fa-${isOpen ? 'times' : 'bars'}" aria-hidden="true"></i>`;
}

window.toggleMobileNav = toggleMobileNav;

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const links = document.getElementById('main-nav-links');
  const button = document.querySelector('.nav-toggle');
  if (links && button) {
    links.classList.remove('mobile-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation menu');
    button.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
  }
});

/**
 * Toggle Dropdowns
 */
function toggleUserDropdown() {
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) menu.classList.toggle('show');
}

function toggleNotificationDropdown() {
  const menu = document.getElementById('notif-dropdown');
  if (menu) {
    menu.classList.toggle('show');
    if (menu.classList.contains('show')) {
      loadDropdownNotifications();
    }
  }
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-dropdown')) {
    const menu = document.getElementById('user-dropdown-menu');
    if (menu) menu.classList.remove('show');
  }
  if (!e.target.closest('#notif-bell-btn') && !e.target.closest('#notif-dropdown')) {
    const notifMenu = document.getElementById('notif-dropdown');
    if (notifMenu) notifMenu.classList.remove('show');
  }
});

/**
 * Handle Logout
 */
async function handleLogout() {
  try {
    await api.post('/auth/logout');
    currentUser = null;
    window.location.href = '/index.html';
  } catch (err) {
    console.error('Logout error:', err);
    api.toast(err.message || 'Could not log out. Please try again.', 'error');
  }
}

/**
 * Load Notifications Count
 */
async function initNotificationBadge() {
  if (!currentUser) return;
  try {
    const res = await api.get('/notifications');
    const badge = document.getElementById('nav-notif-count');
    if (badge && res.unreadCount > 0) {
      badge.textContent = res.unreadCount;
      badge.style.display = 'flex';
    }
  } catch {}
}

async function loadDropdownNotifications() {
  const list = document.getElementById('notif-dropdown-list');
  if (!list) return;

  try {
    const res = await api.get('/notifications');
    if (!res.notifications || res.notifications.length === 0) {
      list.innerHTML = `<div style="padding:16px;text-align:center;color:#64748b;font-size:0.85rem;">No notifications found.</div>`;
      return;
    }

    list.innerHTML = res.notifications.slice(0, 5).map(n => `
      <a href="${n.link || '/notifications.html'}" style="display:block;padding:10px 16px;border-bottom:1px solid #f1f5f9;text-decoration:none;color:inherit;background:${n.is_read ? 'white' : '#f0fdfa'};">
        <div style="font-size:0.85rem;font-weight:600;color:#0f172a;">${n.title}</div>
        <div style="font-size:0.75rem;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${n.message}</div>
      </a>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div style="padding:16px;text-align:center;color:#e11d48;font-size:0.8rem;">Failed to load</div>`;
  }
}

/**
 * Global Footer Renderer
 */
function renderFooter() {
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (!footerPlaceholder) return;

  footerPlaceholder.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <div class="brand-logo" style="margin-bottom:14px;">
              <div class="brand-icon"><i class="fas fa-compass"></i></div>
              <span>Life<span class="brand-gold">Trace</span></span>
            </div>
            <p style="font-size:0.9rem;line-height:1.6;color:var(--slate-400);margin-bottom:16px;">
              A welcoming place to discover, document and learn local skills and traditional craftsmanship in Uganda.
            </p>
            <div style="display:flex;gap:12px;color:var(--teal-400);font-size:1.1rem;">
              <i class="fab fa-twitter"></i>
              <i class="fab fa-linkedin"></i>
              <i class="fab fa-youtube"></i>
              <i class="fab fa-github"></i>
            </div>
          </div>

          <div class="footer-col">
            <h4>Traditional Crafts</h4>
            <ul>
              <li><a href="/knowledge-library.html?category=basket-making">Basket Making (Ebibbo)</a></li>
              <li><a href="/knowledge-library.html?category=mat-making">Mat Making (Emikeeka)</a></li>
              <li><a href="/knowledge-library.html?category=pottery-clay-work">Pottery & Clay Work</a></li>
              <li><a href="/knowledge-library.html?category=traditional-textiles">Bark Cloth (Olubugo)</a></li>
              <li><a href="/knowledge-library.html?category=woodcraft-carving">Woodcraft & Carving</a></li>
              <li><a href="/categories.html">View All 10 Categories &rarr;</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Platform & Verification</h4>
            <ul>
              <li><a href="/categories.html">Craft Categories</a></li>
              <li><a href="/knowledge-library.html">Knowledge Library</a></li>
              <li><a href="/about.html">About LifeTrace</a></li>
              <li><a href="/certificate.html">Certificate Registry</a></li>
              <li><a href="/login.html">Sign In Portal</a></li>
              <li><a href="/register.html">Become a Contributor</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Cultural Attribution & Ethics</h4>
            <p style="font-size:0.85rem;color:var(--slate-400);margin-bottom:10px;">
              Contributors are encouraged to provide attribution and sharing notes. Sensitive cultural knowledge should only be shared with appropriate permission.
            </p>
            <div style="font-size:0.8rem;color:var(--gold-400);margin-top:10px;">
              <i class="fas fa-check-shield"></i> Knowledge review workflow
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          &copy; ${new Date().getFullYear()} LifeTrace – Preserving traditional craftsmanship and local skills in Uganda.
        </div>
      </div>
    </footer>
  `;
}

// Auto-run footer render
window.addEventListener('load', renderFooter);

