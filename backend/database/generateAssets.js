const fs = require('fs');
const path = require('path');

const imgDir = path.resolve(__dirname, '../../frontend/assets/images');
const avatarDir = path.resolve(__dirname, '../../frontend/assets/avatars');

if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

function createSvg(width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${content}
</svg>`;
}

// 1. Category 1: Basket Making
const basketCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350F" />
      <stop offset="50%" stop-color="#92400E" />
      <stop offset="100%" stop-color="#451A03" />
    </linearGradient>
    <radialGradient id="coilGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF3C7" />
      <stop offset="40%" stop-color="#F59E0B" />
      <stop offset="80%" stop-color="#B45309" />
      <stop offset="100%" stop-color="#78350F" />
    </radialGradient>
    <pattern id="weave" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 0 10 L 20 10 M 10 0 L 10 20" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <rect width="800" height="500" fill="url(#weave)"/>
  
  <!-- Handwoven Coil Basket Illustration -->
  <g transform="translate(400, 250)">
    <!-- Base Shadow -->
    <ellipse cx="0" cy="140" rx="260" ry="40" fill="rgba(0,0,0,0.4)" />
    
    <!-- Outer Rim -->
    <ellipse cx="0" cy="-20" rx="230" ry="90" fill="#92400E" stroke="#FEF3C7" stroke-width="6"/>
    <!-- Outer Body -->
    <path d="M -230 -20 C -230 110, -140 140, 0 140 C 140 140, 230 110, 230 -20 Z" fill="url(#coilGrad)" stroke="#B45309" stroke-width="4"/>
    
    <!-- Inner Bowl Depth -->
    <ellipse cx="0" cy="-20" rx="210" ry="75" fill="#78350F"/>
    
    <!-- Concentric Coiled Pattern in Center -->
    <ellipse cx="0" cy="-20" rx="170" ry="60" fill="#B45309" stroke="#FEF3C7" stroke-width="3" stroke-dasharray="8,4"/>
    <ellipse cx="0" cy="-20" rx="130" ry="45" fill="#D97706" stroke="#92400E" stroke-width="3" stroke-dasharray="6,3"/>
    <ellipse cx="0" cy="-20" rx="90" ry="32" fill="#F59E0B" stroke="#FEF3C7" stroke-width="4" stroke-dasharray="5,3"/>
    <ellipse cx="0" cy="-20" rx="50" ry="18" fill="#B91C1C" stroke="#FEF3C7" stroke-width="3"/>
    <ellipse cx="0" cy="-20" rx="20" ry="8" fill="#FEF3C7"/>

    <!-- Geometric Woven Star Rays -->
    <path d="M -170 -20 L 170 -20 M 0 -80 L 0 40 M -120 -60 L 120 20 M -120 20 L 120 -60" stroke="#FEF3C7" stroke-width="4" stroke-linecap="round" opacity="0.85"/>

    <!-- Braided Edge Highlights -->
    <ellipse cx="0" cy="-20" rx="234" ry="92" fill="none" stroke="#FDE68A" stroke-width="4" stroke-dasharray="10,6"/>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="360" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(245,158,11,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#FBBF24" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">UGANDAN INDIGENOUS CRAFTS</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Basket Making (Ebibbo)</text>
`);

// 2. Category 2: Mat Making
const matCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="matBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064E3B" />
      <stop offset="50%" stop-color="#0F766E" />
      <stop offset="100%" stop-color="#042F2E" />
    </linearGradient>
    <pattern id="herringbone" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0 0 L 20 20 L 40 0 M 0 20 L 20 40 L 40 20" stroke="#FCD34D" stroke-width="2.5" fill="none" opacity="0.35"/>
      <path d="M 0 40 L 20 20 L 40 40" stroke="#FBBF24" stroke-width="1.5" fill="none" opacity="0.25"/>
    </pattern>
  </defs>
  <rect width="800" height="500" fill="url(#matBg)"/>
  <rect width="800" height="500" fill="url(#herringbone)"/>

  <!-- Unrolled Handwoven Mat Graphic -->
  <g transform="translate(140, 60)">
    <rect x="0" y="0" width="520" height="340" rx="8" fill="#D97706" stroke="#FEF3C7" stroke-width="5" transform="rotate(-3 260 170)"/>
    <!-- Diagonal dyed woven stripes -->
    <g transform="rotate(-3 260 170)" opacity="0.9">
      <rect x="0" y="30" width="520" height="24" fill="#B91C1C" />
      <rect x="0" y="70" width="520" height="18" fill="#047857" />
      <rect x="0" y="110" width="520" height="30" fill="#78350F" />
      <rect x="0" y="160" width="520" height="24" fill="#B91C1C" />
      <rect x="0" y="200" width="520" height="18" fill="#047857" />
      <rect x="0" y="240" width="520" height="30" fill="#78350F" />
      <rect x="0" y="290" width="520" height="20" fill="#B91C1C" />
      <!-- Reed Twill lines -->
      <path d="M 0 0 L 520 340 M 100 0 L 520 280 M 0 100 L 360 340 M 200 0 L 520 210 M 0 200 L 210 340" stroke="#FEF3C7" stroke-width="1.5" opacity="0.4"/>
      <!-- Folded bound fringes -->
      <line x1="0" y1="0" x2="0" y2="340" stroke="#FEF3C7" stroke-width="8" stroke-dasharray="6,4"/>
      <line x1="520" y1="0" x2="520" y2="340" stroke="#FEF3C7" stroke-width="8" stroke-dasharray="6,4"/>
    </g>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="370" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(20,184,166,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#2DD4BF" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">PALM REED WEAVING</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Mat Making (Emikeeka)</text>
`);

// 3. Category 3: Pottery and Clay Work
const potteryCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="potteryBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#431407" />
      <stop offset="60%" stop-color="#7C2D12" />
      <stop offset="100%" stop-color="#9A3412" />
    </linearGradient>
    <radialGradient id="clayPotGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FB923C" />
      <stop offset="40%" stop-color="#C2410C" />
      <stop offset="85%" stop-color="#7C2D12" />
      <stop offset="100%" stop-color="#431407" />
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#potteryBg)"/>
  
  <!-- Pit kiln background glow & clay pot -->
  <ellipse cx="400" cy="420" rx="300" ry="60" fill="rgba(0,0,0,0.5)"/>
  
  <!-- Hand-Coiled Traditional Water Pot (Ensumbi) -->
  <g transform="translate(400, 240)">
    <!-- Main Pot Body -->
    <path d="M 0 -130 
             C 40 -130, 50 -100, 45 -70
             C 130 -40, 160 40, 130 110
             C 100 160, 40 180, 0 180
             C -40 180, -100 160, -130 110
             C -160 40, -130 -40, -45 -70
             C -50 -100, -40 -130, 0 -130 Z" fill="url(#clayPotGrad)" stroke="#431407" stroke-width="4"/>
             
    <!-- Flared Rim -->
    <ellipse cx="0" cy="-130" rx="55" ry="16" fill="#EA580C" stroke="#7C2D12" stroke-width="4"/>
    <ellipse cx="0" cy="-130" rx="42" ry="10" fill="#431407"/>

    <!-- Traditional Incised Chevron Pattern Around Shoulder -->
    <path d="M -110 0 L -90 20 L -70 0 L -50 20 L -30 0 L -10 20 L 10 0 L 30 20 L 50 0 L 70 20 L 90 0 L 110 20" stroke="#FED7AA" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85"/>
    <path d="M -110 24 L -90 44 L -70 24 L -50 44 L -30 24 L -10 44 L 10 24 L 30 44 L 50 24 L 70 44 L 90 24 L 110 44" stroke="#FED7AA" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>

    <!-- Burnished Clay Highlights -->
    <path d="M -70 -20 C -90 30, -80 80, -40 130" stroke="rgba(255,255,255,0.25)" stroke-width="8" stroke-linecap="round" fill="none"/>
  </g>

  <!-- Traditional Serving Bowl (Ekibya) Beside It -->
  <g transform="translate(610, 310)">
    <ellipse cx="0" cy="50" rx="90" ry="25" fill="rgba(0,0,0,0.3)"/>
    <path d="M -85 0 C -85 60, -40 70, 0 70 C 40 70, 85 60, 85 0 Z" fill="url(#clayPotGrad)" stroke="#431407" stroke-width="3"/>
    <ellipse cx="0" cy="0" rx="85" ry="26" fill="#9A3412" stroke="#431407" stroke-width="2"/>
    <ellipse cx="0" cy="0" rx="72" ry="18" fill="#431407"/>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="410" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(249,115,22,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#FB923C" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">PIT-FIRED CERAMICS</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Pottery and Clay Work (Ebbumba)</text>
`);

// 4. Category 4: Traditional Bark Cloth (Traditional Textiles)
const barkClothCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="barkBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#451A03" />
      <stop offset="50%" stop-color="#78350F" />
      <stop offset="100%" stop-color="#9A3412" />
    </linearGradient>
    <radialGradient id="terracottaCloth" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#EA580C" />
      <stop offset="50%" stop-color="#C2410C" />
      <stop offset="100%" stop-color="#7C2D12" />
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#barkBg)"/>
  
  <!-- Large draped royal Bark Cloth (Olubugo) -->
  <g transform="translate(400, 230)">
    <!-- Terracotta Bark Cloth draped folds -->
    <path d="M -300 -160 C -180 -120, -100 -180, 0 -140 C 120 -180, 200 -110, 300 -160 L 260 180 C 160 210, 60 170, 0 200 C -80 170, -180 220, -260 170 Z" fill="url(#terracottaCloth)" stroke="#451A03" stroke-width="4"/>
    
    <!-- Fine Grooved Mallet Rib Texture (Ensaamu marks) -->
    <g stroke="rgba(69,26,3,0.35)" stroke-width="2">
      <line x1="-240" y1="-120" x2="-220" y2="160" />
      <line x1="-200" y1="-130" x2="-180" y2="170" />
      <line x1="-160" y1="-140" x2="-140" y2="180" />
      <line x1="-120" y1="-145" x2="-100" y2="185" />
      <line x1="-80" y1="-150" x2="-60" y2="190" />
      <line x1="-40" y1="-145" x2="-20" y2="192" />
      <line x1="0" y1="-140" x2="20" y2="198" />
      <line x1="40" y1="-145" x2="60" y2="190" />
      <line x1="80" y1="-150" x2="100" y2="185" />
      <line x1="120" y1="-140" x2="140" y2="180" />
      <line x1="160" y1="-130" x2="180" y2="170" />
      <line x1="200" y1="-120" x2="220" y2="160" />
    </g>

    <!-- Traditional UNESCO Heritage Stamp Motif -->
    <circle cx="0" cy="10" r="55" fill="none" stroke="#FEF3C7" stroke-width="4" stroke-dasharray="8,4"/>
    <text x="0" y="16" fill="#FEF3C7" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="800" text-anchor="middle">OLUBUGO</text>
    
    <!-- Grooved Wooden Mallet (Ensaamu) lying across bottom corner -->
    <g transform="translate(160, 60) rotate(-35)">
      <rect x="-15" y="-90" width="30" height="180" rx="8" fill="#D97706" stroke="#451A03" stroke-width="3"/>
      <!-- Grooves -->
      <line x1="-15" y1="-70" x2="15" y2="-70" stroke="#78350F" stroke-width="2"/>
      <line x1="-15" y1="-50" x2="15" y2="-50" stroke="#78350F" stroke-width="2"/>
      <line x1="-15" y1="-30" x2="15" y2="-30" stroke="#78350F" stroke-width="2"/>
      <line x1="-15" y1="-10" x2="15" y2="-10" stroke="#78350F" stroke-width="2"/>
    </g>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="410" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(234,88,12,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#FB923C" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">UNESCO INTANGIBLE HERITAGE</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Traditional Textiles (Olubugo)</text>
`);

// 5. Category 5: Woodcraft and Carving
const woodcraftCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="woodBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1C1917" />
      <stop offset="50%" stop-color="#292524" />
      <stop offset="100%" stop-color="#44403C" />
    </linearGradient>
    <radialGradient id="stoolGrad" cx="40%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#D97706" />
      <stop offset="50%" stop-color="#92400E" />
      <stop offset="100%" stop-color="#451A03" />
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#woodBg)"/>

  <!-- Three-Legged Royal Wooden Stool (Entebe y'Ekiganda) -->
  <g transform="translate(400, 220)">
    <ellipse cx="0" cy="180" rx="200" ry="35" fill="rgba(0,0,0,0.5)"/>
    
    <!-- Three Legs Carved from Solid Log -->
    <path d="M -120 0 L -150 160 L -110 160 L -70 0 Z" fill="#78350F" stroke="#292524" stroke-width="3"/>
    <path d="M 70 0 L 110 160 L 150 160 L 120 0 Z" fill="#78350F" stroke="#292524" stroke-width="3"/>
    <path d="M -25 0 L -30 170 L 30 170 L 25 0 Z" fill="url(#stoolGrad)" stroke="#292524" stroke-width="3"/>

    <!-- Round Concave Seat -->
    <ellipse cx="0" cy="0" rx="160" ry="55" fill="url(#stoolGrad)" stroke="#FDE68A" stroke-width="4"/>
    <ellipse cx="0" cy="-6" rx="140" ry="42" fill="#78350F"/>
    
    <!-- Concentric Carved Rings -->
    <ellipse cx="0" cy="-6" rx="100" ry="30" fill="none" stroke="#FDE68A" stroke-width="3" opacity="0.7"/>
    <ellipse cx="0" cy="-6" rx="60" ry="18" fill="none" stroke="#FDE68A" stroke-width="2" opacity="0.7"/>

    <!-- Wood Adze (Empewo) Carver's Tool Beside Stool -->
    <g transform="translate(-180, 50) rotate(25)">
      <rect x="-8" y="-70" width="16" height="140" rx="6" fill="#F59E0B" stroke="#451A03" stroke-width="2"/>
      <path d="M -30 -70 L 30 -70 L 20 -95 L -20 -95 Z" fill="#94A3B8" stroke="#0F172A" stroke-width="3"/>
    </g>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="420" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(217,119,6,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#FBBF24" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">INDIGENOUS TIMBER CARVING</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Woodcraft and Carving (Okubajja)</text>
`);

// 6. Category 6: Beadwork
const beadworkCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="beadBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312E81" />
      <stop offset="50%" stop-color="#4C1D95" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#beadBg)"/>

  <!-- Swirling Ugandan Recycled Paper Bead & Cowrie Shell Necklace -->
  <g transform="translate(400, 240)">
    <!-- Shadow -->
    <ellipse cx="0" cy="140" rx="220" ry="35" fill="rgba(0,0,0,0.45)"/>
    
    <!-- Outer string loop -->
    <path d="M -180 -120 C -220 80, -140 140, 0 140 C 140 140, 220 80, 180 -120" fill="none" stroke="#E2E8F0" stroke-width="3"/>

    <!-- Multicolored Spiraled Paper Beads -->
    <!-- Bead helper loop -->
    ${(() => {
      let beads = '';
      const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#F97316'];
      for (let i = -10; i <= 10; i++) {
        const angle = (i * 8) * (Math.PI / 180);
        const x = Math.sin(angle) * 170;
        const y = Math.cos(angle) * 120;
        const c = colors[Math.abs(i) % colors.length];
        // Bead ellipse
        beads += `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${-(i*8)})">
          <ellipse cx="0" cy="0" rx="14" ry="9" fill="${c}" stroke="#FFFFFF" stroke-width="2"/>
          <line x1="-12" y1="0" x2="12" y2="0" stroke="rgba(0,0,0,0.3)" stroke-width="1.5"/>
        </g>`;
      }
      return beads;
    })()}

    <!-- Center Cowrie Shell (Ensimbi) Pendant -->
    <g transform="translate(0, 120)">
      <ellipse cx="0" cy="20" rx="22" ry="32" fill="#FEF3C7" stroke="#92400E" stroke-width="3"/>
      <ellipse cx="0" cy="20" rx="5" ry="20" fill="#78350F"/>
      <!-- Serrated ridges -->
      <line x1="-8" y1="12" x2="-2" y2="12" stroke="#78350F" stroke-width="2"/>
      <line x1="2" y1="12" x2="8" y2="12" stroke="#78350F" stroke-width="2"/>
      <line x1="-8" y1="20" x2="-2" y2="20" stroke="#78350F" stroke-width="2"/>
      <line x1="2" y1="20" x2="8" y2="20" stroke="#78350F" stroke-width="2"/>
      <line x1="-8" y1="28" x2="-2" y2="28" stroke="#78350F" stroke-width="2"/>
      <line x1="2" y1="28" x2="8" y2="28" stroke="#78350F" stroke-width="2"/>
    </g>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="370" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(168,85,247,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#C084FC" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">ORNAMENTAL ARTISANRY</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Beadwork (Enkwanzi)</text>
`);

// 7. Category 7: Handmade Household Products (Brooms & Rope)
const broomCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="broomBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064E3B" />
      <stop offset="50%" stop-color="#14532D" />
      <stop offset="100%" stop-color="#022C22" />
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#broomBg)"/>

  <!-- Traditional Palm Frond Sweeping Broom (Olweyo) -->
  <g transform="translate(400, 230) rotate(-25)">
    <!-- Palm Ribs Fanning Out -->
    <path d="M 0 -130 L -90 160 L 90 160 Z" fill="#D97706" opacity="0.3"/>
    ${(() => {
      let ribs = '';
      for (let i = -25; i <= 25; i++) {
        const spread = i * 4.5;
        ribs += `<line x1="0" y1="-80" x2="${spread.toFixed(1)}" y2="170" stroke="#FDE68A" stroke-width="2" opacity="0.85"/>`;
      }
      return ribs;
    })()}

    <!-- Tightly Bound Sisal Cord Handle (Cross-knotted) -->
    <rect x="-24" y="-140" width="48" height="110" rx="14" fill="#B45309" stroke="#78350F" stroke-width="4"/>
    <line x1="-24" y1="-120" x2="24" y2="-120" stroke="#FEF3C7" stroke-width="4"/>
    <line x1="-24" y1="-100" x2="24" y2="-100" stroke="#FEF3C7" stroke-width="4"/>
    <line x1="-24" y1="-80" x2="24" y2="-80" stroke="#FEF3C7" stroke-width="4"/>
    <line x1="-24" y1="-60" x2="24" y2="-60" stroke="#FEF3C7" stroke-width="4"/>
    <line x1="-24" y1="-40" x2="24" y2="-40" stroke="#FEF3C7" stroke-width="4"/>
    
    <!-- Cross decorative binding cord -->
    <line x1="-20" y1="-130" x2="20" y2="-50" stroke="#EF4444" stroke-width="3"/>
    <line x1="20" y1="-130" x2="-20" y2="-50" stroke="#EF4444" stroke-width="3"/>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="430" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(34,197,94,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#4ADE80" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">HOUSEHOLD ESSENTIALS</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Handmade Products (Olweyo)</text>
`);

// 8. Category 8: Traditional Weaving
const weavingCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="weaveBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#weaveBg)"/>
  
  <!-- Weaving Loom and Interlaced Reeds -->
  <g transform="translate(400, 220)">
    <rect x="-240" y="-120" width="480" height="240" rx="12" fill="#78350F" stroke="#FDE68A" stroke-width="4"/>
    <!-- Warp and Weft Lines -->
    ${(() => {
      let lines = '';
      for (let x = -200; x <= 200; x += 20) {
        lines += `<line x1="${x}" y1="-100" x2="${x}" y2="100" stroke="#FEF3C7" stroke-width="2.5" opacity="0.75"/>`;
      }
      for (let y = -80; y <= 80; y += 20) {
        lines += `<line x1="-220" y1="${y}" x2="220" y2="${y}" stroke="#F59E0B" stroke-width="3" opacity="0.85"/>`;
      }
      return lines;
    })()}
    <!-- Weaving shuttle -->
    <path d="M -120 -30 C -80 -45, 80 -45, 120 -30 C 80 -15, -80 -15, -120 -30 Z" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
    <circle cx="0" cy="-30" r="6" fill="#FFFFFF"/>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="390" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(20,184,166,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#2DD4BF" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">SISAL & FIBRE CRAFT</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Traditional Weaving (Okuluka)</text>
`);

// 9. Category 9: Traditional Food Processing
const foodCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="foodBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#713F12" />
      <stop offset="50%" stop-color="#854D0E" />
      <stop offset="100%" stop-color="#422006" />
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#foodBg)"/>

  <!-- Wooden Mortar & Pestle (Esekulo n'Ekinu) with Sun-Dried Indigenous Grain -->
  <g transform="translate(400, 240)">
    <!-- Mortar Shadow -->
    <ellipse cx="0" cy="140" rx="130" ry="30" fill="rgba(0,0,0,0.5)"/>
    
    <!-- Wooden Mortar (Ekinu) -->
    <path d="M -90 -40 C -80 40, -40 120, -50 140 L 50 140 C 40 120, 80 40, 90 -40 Z" fill="#92400E" stroke="#FEF3C7" stroke-width="4"/>
    <ellipse cx="0" cy="-40" rx="90" ry="32" fill="#78350F" stroke="#FEF3C7" stroke-width="3"/>
    <ellipse cx="0" cy="-40" rx="72" ry="22" fill="#451A03"/>

    <!-- Wooden Pestle (Esekulo) resting diagonally inside -->
    <g transform="translate(20, -30) rotate(-35)">
      <rect x="-16" y="-120" width="32" height="200" rx="12" fill="#D97706" stroke="#451A03" stroke-width="3"/>
    </g>

    <!-- Golden Millet Grains -->
    <circle cx="-15" cy="-40" r="4" fill="#FDE68A"/>
    <circle cx="5" cy="-36" r="3" fill="#FDE68A"/>
    <circle cx="-5" cy="-44" r="3.5" fill="#FDE68A"/>
    <circle cx="20" cy="-42" r="3" fill="#FDE68A"/>
  </g>

  <!-- Title Badge Overlay -->
  <rect x="40" y="380" width="440" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(234,179,8,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#FACC15" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">INDIGENOUS PRESERVATION</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Traditional Food Processing</text>
`);

// 10. Category 10: Other Local Skills
const otherCategory = createSvg(800, 500, `
  <defs>
    <linearGradient id="otherBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="50%" stop-color="#334155" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#otherBg)"/>
  
  <g transform="translate(400, 220)">
    <circle cx="0" cy="0" r="120" fill="rgba(255,255,255,0.06)" stroke="#F59E0B" stroke-width="3" stroke-dasharray="8,6"/>
    <circle cx="0" cy="0" r="80" fill="rgba(255,255,255,0.08)" stroke="#14B8A6" stroke-width="3"/>
    <path d="M -30 -30 L 30 30 M 30 -30 L -30 30" stroke="#FEF3C7" stroke-width="8" stroke-linecap="round"/>
  </g>

  <rect x="40" y="380" width="370" height="80" rx="12" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.5)" stroke-width="1.5"/>
  <text x="60" y="414" fill="#94A3B8" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="700" letter-spacing="1">COMMUNITY VOCATIONAL</text>
  <text x="60" y="442" fill="#FFFFFF" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800">Other Local Skills</text>
`);

// Step-by-Step Images Generator
function createStepIllustration(title, stepNum, color1, color2, detailText) {
  return createSvg(600, 400, `
    <defs>
      <linearGradient id="stepBg_${stepNum}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}" />
        <stop offset="100%" stop-color="${color2}" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#stepBg_${stepNum})"/>
    <rect x="20" y="20" width="560" height="360" rx="16" fill="rgba(15,23,42,0.6)" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
    
    <!-- Step Badge -->
    <circle cx="80" cy="80" r="36" fill="#F59E0B" stroke="#FFFFFF" stroke-width="4"/>
    <text x="80" y="92" font-family="'Segoe UI', sans-serif" font-size="28" font-weight="900" fill="#0F172A" text-anchor="middle">${stepNum}</text>
    
    <text x="140" y="74" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="700" fill="#FBBF24" letter-spacing="1.5">PRACTICAL STEP PROCEDURE</text>
    <text x="140" y="100" font-family="'Segoe UI', sans-serif" font-size="22" font-weight="800" fill="#FFFFFF">${title}</text>
    
    <!-- Central Diagrammatic Visualization -->
    <g transform="translate(300, 230)">
      <rect x="-180" y="-70" width="360" height="140" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      <text x="0" y="-15" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="700" fill="#FDE68A" text-anchor="middle">Detailed Artisan Execution</text>
      <text x="0" y="20" font-family="'Segoe UI', sans-serif" font-size="14" fill="#FFFFFF" text-anchor="middle">${detailText}</text>
      <circle cx="0" cy="50" r="6" fill="#10B981"/>
      <text x="16" y="54" font-family="'Segoe UI', sans-serif" font-size="12" fill="#A7F3D0">Step Checkpoint Verified</text>
    </g>
  `);
}

// Avatar Generator
function createAvatar(name, role, bg1, bg2, initials) {
  return createSvg(200, 200, `
    <defs>
      <linearGradient id="avBg_${initials}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
    </defs>
    <circle cx="100" cy="100" r="98" fill="url(#avBg_${initials})" stroke="#FFFFFF" stroke-width="4"/>
    <circle cx="100" cy="80" r="38" fill="rgba(255,255,255,0.2)"/>
    <path d="M 40 170 C 40 130, 70 120, 100 120 C 130 120, 160 130, 160 170 Z" fill="rgba(255,255,255,0.2)"/>
    <text x="100" y="105" font-family="'Segoe UI', sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle">${initials}</text>
  `);
}

// Write Category Images
fs.writeFileSync(path.join(imgDir, 'category-basket.svg'), basketCategory);
fs.writeFileSync(path.join(imgDir, 'category-mat.svg'), matCategory);
fs.writeFileSync(path.join(imgDir, 'category-pottery.svg'), potteryCategory);
fs.writeFileSync(path.join(imgDir, 'category-textiles.svg'), barkClothCategory);
fs.writeFileSync(path.join(imgDir, 'category-woodcraft.svg'), woodcraftCategory);
fs.writeFileSync(path.join(imgDir, 'category-beadwork.svg'), beadworkCategory);
fs.writeFileSync(path.join(imgDir, 'category-household.svg'), broomCategory);
fs.writeFileSync(path.join(imgDir, 'category-weaving.svg'), weavingCategory);
fs.writeFileSync(path.join(imgDir, 'category-food.svg'), foodCategory);
fs.writeFileSync(path.join(imgDir, 'category-other.svg'), otherCategory);

// Write Featured Craft Covers
fs.writeFileSync(path.join(imgDir, 'basket-coiling-cover.svg'), basketCategory);
fs.writeFileSync(path.join(imgDir, 'palm-mat-cover.svg'), matCategory);
fs.writeFileSync(path.join(imgDir, 'clay-pot-cover.svg'), potteryCategory);
fs.writeFileSync(path.join(imgDir, 'bark-cloth-cover.svg'), barkClothCategory);
fs.writeFileSync(path.join(imgDir, 'handmade-broom-cover.svg'), broomCategory);
fs.writeFileSync(path.join(imgDir, 'paper-bead-cover.svg'), beadworkCategory);
fs.writeFileSync(path.join(imgDir, 'wooden-stool-cover.svg'), woodcraftCategory);

// Write Step-by-Step Stage Images for Basket Making (1 to 6)
fs.writeFileSync(path.join(imgDir, 'basket-step-1.svg'), createStepIllustration('Harvesting & Stripping Fibers', 1, '#78350F', '#B45309', 'Select dried banana pseudostem sheath (Ebyai)'));
fs.writeFileSync(path.join(imgDir, 'basket-step-2.svg'), createStepIllustration('Natural Dye Preparation', 2, '#92400E', '#D97706', 'Boil raffia in hibiscus and marigold extracts'));
fs.writeFileSync(path.join(imgDir, 'basket-step-3.svg'), createStepIllustration('Starting the Coiled Center Knot', 3, '#B45309', '#F59E0B', 'Tight spiral core knot using weaving awl (Empiso)'));
fs.writeFileSync(path.join(imgDir, 'basket-step-4.svg'), createStepIllustration('Radial Interlocking Stitches', 4, '#78350F', '#92400E', 'Figure-eight binding around core sweetgrass strands'));
fs.writeFileSync(path.join(imgDir, 'basket-step-5.svg'), createStepIllustration('Flaring Bowl Walls Upward', 5, '#92400E', '#B45309', 'Angle coils at 45 degrees to establish depth'));
fs.writeFileSync(path.join(imgDir, 'basket-step-6.svg'), createStepIllustration('Braided Edge Binding (Omugugunjo)', 6, '#451A03', '#78350F', 'Reinforced decorative rim with concealed finish knot'));

// Write Step-by-Step Stage Images for Mat Making (1 to 5)
fs.writeFileSync(path.join(imgDir, 'mat-step-1.svg'), createStepIllustration('Palm Frond Splitting', 1, '#064E3B', '#0F766E', 'Split fresh date palm fronds into 2mm uniform reeds'));
fs.writeFileSync(path.join(imgDir, 'mat-step-2.svg'), createStepIllustration('Sun Bleaching & Dyeing', 2, '#0F766E', '#14B8A6', 'Air-dry reeds for 48 hours and dye accent strands'));
fs.writeFileSync(path.join(imgDir, 'mat-step-3.svg'), createStepIllustration('Corner Base Intertwining', 3, '#064E3B', '#0F766E', 'Anchor the 90-degree corner with heavy twine'));
fs.writeFileSync(path.join(imgDir, 'mat-step-4.svg'), createStepIllustration('Diagonal Twill Pattern Weave', 4, '#042F2E', '#064E3B', 'Two-over-two herringbone pass (amabaati pattern)'));
fs.writeFileSync(path.join(imgDir, 'mat-step-5.svg'), createStepIllustration('Double-Folded Border Binding', 5, '#0F766E', '#14B8A6', 'Lock edge fringes inside double fold for durability'));

// Write Step-by-Step Stage Images for Pottery (1 to 5)
fs.writeFileSync(path.join(imgDir, 'pottery-step-1.svg'), createStepIllustration('Clay Kneading & Tempering', 1, '#431407', '#7C2D12', 'Mix anthill clay with fine crushed grog temper'));
fs.writeFileSync(path.join(imgDir, 'pottery-step-2.svg'), createStepIllustration('Pinch-Base & Coil Elevation', 2, '#7C2D12', '#C2410C', 'Roll uniform 2cm clay snakes and layer upward'));
fs.writeFileSync(path.join(imgDir, 'pottery-step-3.svg'), createStepIllustration('Wall Thinning & Rib Shaping', 3, '#9A3412', '#EA580C', 'Scrape walls with calabash rib for smooth symmetry'));
fs.writeFileSync(path.join(imgDir, 'pottery-step-4.svg'), createStepIllustration('Pebble Burnishing & Carving', 4, '#7C2D12', '#9A3412', 'Burnish semi-dry leather clay with river pebble'));
fs.writeFileSync(path.join(imgDir, 'pottery-step-5.svg'), createStepIllustration('Open-Pit Grass Firing', 5, '#431407', '#7C2D12', 'Slow bake in dried grass pit until glowing orange'));

// Write Step-by-Step Stage Images for Bark Cloth (1 to 5)
fs.writeFileSync(path.join(imgDir, 'bark-step-1.svg'), createStepIllustration('Harvesting Mutuba Tree Bark', 1, '#451A03', '#78350F', 'Make circular cuts around mature Mutuba trunk'));
fs.writeFileSync(path.join(imgDir, 'bark-step-2.svg'), createStepIllustration('Peeling the Cylinder Intact', 2, '#78350F', '#9A3412', 'Carefully detach strip without tearing inner bark'));
fs.writeFileSync(path.join(imgDir, 'bark-step-3.svg'), createStepIllustration('Banana Leaf Wrapping & Steaming', 3, '#451A03', '#78350F', 'Steam bark strip to soften woody cellulose fibers'));
fs.writeFileSync(path.join(imgDir, 'bark-step-4.svg'), createStepIllustration('Rhythmic Mallet Beating (Ensaamu)', 4, '#78350F', '#C2410C', 'Beat across log with grooved wooden mallets'));
fs.writeFileSync(path.join(imgDir, 'bark-step-5.svg'), createStepIllustration('Sun Drying & Color Fixing', 5, '#451A03', '#78350F', 'Sun cure to achieve deep terracotta rust hue'));

// Write Step-by-Step Stage Images for Handmade Broom (1 to 4)
fs.writeFileSync(path.join(imgDir, 'broom-step-1.svg'), createStepIllustration('Harvesting Palm Frond Ribs', 1, '#064E3B', '#14532D', 'Strip stiff dry frond midribs (emikindo)'));
fs.writeFileSync(path.join(imgDir, 'broom-step-2.svg'), createStepIllustration('Bundle Sizing & Tensioning', 2, '#14532D', '#15803D', 'Sort 250 uniform spines into balanced cylindrical core'));
fs.writeFileSync(path.join(imgDir, 'broom-step-3.svg'), createStepIllustration('Sisal Cord Cross-Knotted Binding', 3, '#064E3B', '#14532D', 'Tight diagonal cross-weave around handle top'));
fs.writeFileSync(path.join(imgDir, 'broom-step-4.svg'), createStepIllustration('Bevel Trimming the Sweeping Base', 4, '#022C22', '#064E3B', 'Angle shear bottom edge for clean level contact'));

// Write Step-by-Step Stage Images for Beadwork (1 to 4)
fs.writeFileSync(path.join(imgDir, 'bead-step-1.svg'), createStepIllustration('Tapered Paper Strip Cutting', 1, '#312E81', '#4C1D95', 'Cut triangular strips from colorful recycled paper'));
fs.writeFileSync(path.join(imgDir, 'bead-step-2.svg'), createStepIllustration('Needle Rolling & Glue Lock', 2, '#4C1D95', '#7C3AED', 'Tightly wind paper around rolling needle and glue tip'));
fs.writeFileSync(path.join(imgDir, 'bead-step-3.svg'), createStepIllustration('Triple Waterproof Glazing', 3, '#312E81', '#4C1D95', 'Dip beads in clear protective lacquer and dry on rack'));
fs.writeFileSync(path.join(imgDir, 'bead-step-4.svg'), createStepIllustration('Stringing with Cowrie Shells', 4, '#1E1B4B', '#312E81', 'Thread beads on strong nylon with authentic cowries'));

// Avatars
fs.writeFileSync(path.join(avatarDir, 'joyce-nakato.svg'), createAvatar('Joyce Nakato', 'expert', '#92400E', '#D97706', 'JN'));
fs.writeFileSync(path.join(avatarDir, 'isabirye-daudi.svg'), createAvatar('Isabirye Daudi', 'expert', '#065F46', '#059669', 'ID'));
fs.writeFileSync(path.join(avatarDir, 'florence-namagembe.svg'), createAvatar('Florence Namagembe', 'expert', '#7C2D12', '#C2410C', 'FN'));
fs.writeFileSync(path.join(avatarDir, 'aloysius-ssemwogerere.svg'), createAvatar('Aloysius Ssemwogerere', 'expert', '#451A03', '#78350F', 'AS'));
fs.writeFileSync(path.join(avatarDir, 'betty-auma.svg'), createAvatar('Betty Auma', 'expert', '#4C1D95', '#7C3AED', 'BA'));
fs.writeFileSync(path.join(avatarDir, 'kezekia-tumusiime.svg'), createAvatar('Kezekia Tumusiime', 'expert', '#14532D', '#16A34A', 'KT'));
fs.writeFileSync(path.join(avatarDir, 'paulo-sserwadda.svg'), createAvatar('Paulo Sserwadda', 'expert', '#78350F', '#B45309', 'PS'));
fs.writeFileSync(path.join(avatarDir, 'reviewer-florence.svg'), createAvatar('Florence Nalubega', 'reviewer', '#0F766E', '#14B8A6', 'FN'));
fs.writeFileSync(path.join(avatarDir, 'reviewer-samuel.svg'), createAvatar('Samuel Okello', 'reviewer', '#1E3A8A', '#3B82F6', 'SO'));
fs.writeFileSync(path.join(avatarDir, 'learner-denis.svg'), createAvatar('Denis Kato', 'learner', '#15803D', '#22C55E', 'DK'));
fs.writeFileSync(path.join(avatarDir, 'learner-christine.svg'), createAvatar('Christine Amuge', 'learner', '#B91C1C', '#EF4444', 'CA'));
fs.writeFileSync(path.join(avatarDir, 'admin.svg'), createAvatar('Admin', 'admin', '#0F172A', '#334155', 'LT'));

console.log('Successfully generated authentic Ugandan craft vector assets!');
