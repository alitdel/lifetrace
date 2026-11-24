const fs = require('fs');
const path = require('path');

const avatarsDir = path.resolve(__dirname, '../../frontend/assets/avatars');
const imagesDir = path.resolve(__dirname, '../../frontend/assets/images');

[avatarsDir, imagesDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function createSvgAvatar(initials, bg = '#0D9488') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" rx="60" fill="${bg}"/>
    <text x="50%" y="54%" font-family="Arial, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
}

function createSvgCover(title, category, icon = 'fas fa-tools', bg1 = '#0F172A', bg2 = '#0D9488') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="360" fill="url(#g)"/>
    <circle cx="520" cy="80" r="140" fill="rgba(255,255,255,0.06)"/>
    <circle cx="80" cy="300" r="100" fill="rgba(255,255,255,0.04)"/>
    <rect x="40" y="40" width="160" height="28" rx="14" fill="rgba(255,255,255,0.2)"/>
    <text x="120" y="58" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${category}</text>
    <text x="40" y="160" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">${title.substring(0, 32)}</text>
    <text x="40" y="195" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#F59E0B">${title.substring(32, 64)}</text>
    <text x="40" y="300" font-family="Arial, sans-serif" font-size="14" fill="#CBD5E1">LifeTrace Verified Practical Module • Uganda</text>
  </svg>`;
}

// Generate Avatars
const avatars = {
  'admin.png': createSvgAvatar('AD', '#E11D48'),
  'sarah.png': createSvgAvatar('SN', '#0D9488'),
  'david.png': createSvgAvatar('DM', '#F59E0B'),
  'grace.png': createSvgAvatar('GA', '#059669'),
  'florence.png': createSvgAvatar('FN', '#4F46E5'),
  'samuel.png': createSvgAvatar('SO', '#334155'),
  'denis.png': createSvgAvatar('DK', '#0284C7'),
  'christine.png': createSvgAvatar('CA', '#D97706')
};

Object.entries(avatars).forEach(([filename, svg]) => {
  fs.writeFileSync(path.join(avatarsDir, filename), svg);
});

// Generate Covers
const covers = {
  'drip-irrigation-cover.jpg': createSvgCover('Low-Cost Gravity Drip Irrigation', 'AGRICULTURE', '', '#0F172A', '#0D9488'),
  'consumer-unit-cover.jpg': createSvgCover('Single-Phase Consumer Unit Wiring', 'ELECTRICAL', '', '#0F172A', '#B45309'),
  'artemisia-cover.jpg': createSvgCover('Standardized Artemisia Infusion', 'HEALTHCARE', '', '#0F172A', '#059669'),
  'issb-blocks-cover.jpg': createSvgCover('Interlocking Stabilized Soil Blocks', 'CONSTRUCTION', '', '#0F172A', '#475569'),
  'mortise-tenon-cover.jpg': createSvgCover('Mortise & Tenon Wood Joinery', 'CARPENTRY', '', '#0F172A', '#78350F')
};

Object.entries(covers).forEach(([filename, svg]) => {
  fs.writeFileSync(path.join(imagesDir, filename), svg);
});

console.log('Asset generation complete.');

