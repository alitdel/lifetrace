# LifeTrace – Digital Platform for Preserving, Sharing and Learning Local Skills and Traditional Craftsmanship

[![LifeTrace Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/alitdel/lifetrace)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B-blue.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/TiDB%20Cloud-MySQL%20Port%204000-orange.svg)](https://tidbcloud.com/)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Context](https://img.shields.io/badge/Practical%20Preservation-Ugandan%20Traditional%20Craftsmanship-teal.svg)](#)

---

## 1. Project Overview & Problem Statement

### 1.1 Context & Background
In Uganda and across East Africa, vital practical skills, traditional craftsmanship, and indigenous artisanal knowledge—spanning coiled basketry (*Okuluka Ebibbo*), palm leaf sleeping mats (*Emikeeka*), hand-coiled river clay pottery, royal Mutuba bark cloth beating (*Olubugo*), hand-carved hardwood stools, cowrie beadwork, and handmade wild palm brooms (*Olweyo*)—are passed down largely through oral observation and informal family apprenticeship. As elder master craftspeople age or retire, vast amounts of unrecorded practical knowledge are lost.

Generic video-sharing websites and social media channels do not solve this challenge:
1. **Lack of Procedural Structure:** They deliver passive streaming rather than modular step-by-step procedures with measurable checkpoints and stage photographs.
2. **Missing Local Terminology & Cultural Attribution:** Indigenous names of tools, botanical raw materials, and sacred community traditions are omitted or uncredited.
3. **No Raw Material Harvesting & Safety Guidance:** Exact fiber extraction, natural plant dyeing mordants, awl handling, and adze carving safety rules are absent.
4. **Absence of Peer Review:** Erroneous or culturally inappropriate instructions proliferate without elder or technical verification.
5. **No Verifiable Competency:** Learners cannot demonstrate acquired craftsmanship through photographic practical evidence or earn verifiable certificates.

### 1.2 LifeTrace Purpose
**LifeTrace** is an enterprise-grade digital platform for preserving, sharing, and learning local skills and traditional craftsmanship in Uganda. It bridges indigenous heritage preservation with modern software engineering practices, ensuring that practical crafts are attributable, respectfully documented with community consent, rigorously reviewed, step-by-step verifiable with photographs and videos, and awarded with cryptographically unique certificates of practical mastery.

---

## 2. Key Features & Four-Role Architecture

LifeTrace strictly isolates permissions and workflows across **four distinct user roles**:

| User Role | Primary Purpose | Key Capabilities |
| :--- | :--- | :--- |
| **Expert / Craftsperson** | Traditional Knowledge Author & Evaluator | Profile management with years of practical experience, document craft records with local names, community origin, cultural background, raw material harvesting, preparation, tools/materials with local names, step-by-step instructions with stage photographs, demonstration videos, safety precautions, save drafts, submit for review, evaluate learner practical evidence. |
| **Learner** | Skill Acquisition & Practical Evidence | Search & filter craft library, explore local categories, bookmark crafts, enroll in practical guides, track step completions in real-time, submit multi-angle practical craft photos, complete mastery quizzes, earn and verify certificates. |
| **Reviewer** | Technical Quality & Cultural Attribution Oversight | Inspect pending submissions, evaluate completeness, instruction clarity, occupational safety, and cultural authenticity (1–5 scale), request expert revisions, approve for publication, reject unsafe content with structured reasons. |
| **Administrator** | Governance & Platform Monitoring | User governance (activate/deactivate, role reassignment), manage the 10 traditional craft categories, platform policy settings, immutable security audit inspection, Chart.js analytics dashboard. |

---

## 3. The 10 Traditional Craft Categories

LifeTrace comes pre-seeded with 10 authentic Ugandan practical craftsmanship categories:

1. **Basket Making** (*Okuluka Ebibbo*): Handwoven coiled baskets, storage baskets, market baskets, and traditional bridal baskets.
2. **Mat Making** (*Okuluka Emikeeka*): Sleeping mats, herringbone floor mats, decorative prayer mats, and swamp reed weaving.
3. **Pottery and Clay Work** (*Okubumba Ebibya n'Ensuwa*): Cooking pots, water cooling vessels, decorative pottery, and pit-fired clay.
4. **Traditional Weaving**: Woven household products, traditional fabrics, sisal granaries, and natural fiber decor.
5. **Woodcraft and Carving** (*Okubajja*): Three-legged stools, wooden mortars, cooking ladles, and carved furniture.
6. **Beadwork** (*Enkwanzi*): Paper bead rolling, cowrie shell embroidery, necklaces, bracelets, and ceremonial ornaments.
7. **Traditional Textiles** (*Olubugo*): Royal Mutuba bark cloth beating, vegetable dyeing, and natural textile decoration.
8. **Handmade Household Products**: Wild palm brooms (*Olweyo*), sisal rope making, and household storage containers.
9. **Traditional Food Processing**: Indigenous grain grinding, solar food drying, fermentation, and preservation.
10. **Other Local Skills**: Artisanal metalwork, traditional leather tanning, and community crafts.

---

## 4. Technology Stack

- **Frontend:**
  - Semantic HTML5, CSS3 Custom Properties (Design System), Vanilla JavaScript (ES6+ modular classes).
  - Fully responsive mobile-first layout optimized for mobile (320px+), tablet, and desktop viewports.
  - FontAwesome 6.5.1 for vocational domain iconography.
  - Chart.js for real-time visual analytics.
  - Resilient API Client (`frontend/js/api.js`) automatically adapting to relative cloud paths or local development.
- **Backend:**
  - Node.js (v18.0.0+) and Express.js RESTful API framework.
  - Multi-tier modular architecture: Configuration, Controllers, Middleware, Routes, Services, Database.
- **Database (TiDB Cloud / MySQL):**
  - **TiDB Cloud (Serverless MySQL Compatible)** on port 4000 with mandatory TLS/SSL encryption for production.
  - Connection pooling with keep-alives and reconnection handlers.
  - 29 fully normalized relational tables covering users, craft procedures, media, reviews, learner progress, practical submissions, assessments, certificates, audit logs, and system settings.
  - Local embedded SQLite engine available strictly for offline development/testing (`DB_ENGINE=sqlite`). Zero silent fallback to SQLite in production.
- **Authentication & Security:**
  - Bcrypt password hashing (10 salt rounds).
  - Express sessions with secure HTTP-only cookies (`lifetrace.sid`), sameSite protection, and session fixation protection (`req.session.regenerate()`).
  - Role-Based Access Control (RBAC) middleware guarding all endpoints and protected pages.
  - Helmet HTTP security headers with tailored Content Security Policy (CSP).
  - Express Rate Limiting (general API and authentication brute-force prevention).
  - Multer upload filtering with extension blacklist, MIME inspection, executable blocking, and persistent disk support.
  - Dual health check endpoints (`/health` and `/api/health`) for cloud orchestrators.
  - Immutable audit trail recorded on all state-changing operations.

---

## 5. System Architecture & Workflows

### 5.1 Tiered Architectural Diagram

```
+-----------------------------------------------------------------------------------------+
|                               PRESENTATION LAYER (HTML5 / CSS3 / JS)                    |
|  - Public Landing (index.html)        - Knowledge Library (knowledge-library.html)      |
|  - Knowledge Details (details.html)   - Expert Studio (create-knowledge.html)           |
|  - Learner Hub (progress.html)        - Reviewer Desk (review-management.html)          |
|  - Admin Console (admin.html)         - Certificate Registry (certificate.html)         |
+-------------------------------------------+---------------------------------------------+
                                            | JSON / REST via fetch (Cookie Session)
+-------------------------------------------v---------------------------------------------+
|                               APPLICATION LAYER (Express.js / Node.js)                  |
|  - Security: Helmet | CORS | RateLimiter | Input Sanitization                           |
|  - Session / Auth: bcryptjs | Session Store | RBAC Guard (Learner/Expert/Review/Admin)  |
|  - Media Engine: Multer (MIME whitelist, size limits, safe random filename generator)  |
|  - Domain Services: AuditService | NotificationService | CertificateService             |
+-------------------------------------------+---------------------------------------------+
                                            | mysql2 Connection Pool (SSL / TLS 1.2+)
+-------------------------------------------v---------------------------------------------+
|                               DATABASE LAYER (TiDB Cloud MySQL)                         |
|  - Port: 4000 | SSL: Required | 29 Normalized Relational Tables                         |
|  - Users & Profiles | Knowledge & Procedural Steps | Reviews & Quality Scores           |
|  - Practical Submissions & Assessments | Verifiable Certificates | Immutable Audit Trail|
+-----------------------------------------------------------------------------------------+
```

---

## 6. Database Schema (29 Normalized Tables)

The LifeTrace schema (`backend/database/schema.sql`) implements 29 relational tables:

1. `users`: Master accounts with role, status, and authentication credentials.
2. `expert_profiles`: Artisan biographical and trade verification metadata.
3. `learner_profiles`: Vocational learner educational interests and goals.
4. `reviewer_profiles`: Technical reviewer qualifications and domains.
5. `categories`: The 10 traditional craft domains.
6. `subcategories`: Specialized craft branches under each primary domain.
7. `knowledge_records`: Core craft documentation records.
8. `knowledge_visibility`: Public, registered-learner, or private access policy.
9. `knowledge_steps`: Procedural sequential steps with instructions and photos.
10. `knowledge_tools`: Hand tools with indigenous names and handling instructions.
11. `knowledge_materials`: Botanical/mineral raw materials and sourcing methods.
12. `knowledge_media`: Supporting high-resolution images, videos, and PDFs.
13. `knowledge_safety_items`: Specific occupational health precautions.
14. `knowledge_community_attributions`: Elder craft attribution and consent records.
15. `knowledge_review_assignments`: Direct reviewer assignments.
16. `reviews`: Reviewer assessments, ratings, and approval/revision decisions.
17. `review_history`: Longitudinal revision logs.
18. `learning_enrollments`: Learner craft enrollment records.
19. `learning_progress`: Percentage completions and current step milestones.
20. `learning_step_completions`: Per-step verification timestamps.
21. `learning_bookmarks`: Saved crafts for quick access.
22. `practical_submissions`: Learner practical evidence dossiers.
23. `submission_evidence`: Multi-angle photographic evidence of completed crafts.
24. `assessments`: Theoretical mastery quizzes.
25. `assessment_questions`: Multiple-choice questions.
26. `assessment_results`: Quiz attempts, scores, and pass statuses.
27. `certificates`: Cryptographically unique certificates with public verification codes.
28. `notifications`: Real-time user alert dispatch and read status.
29. `audit_logs`: Immutable security and operation audit trail.
30. `system_settings`: Platform policies and configuration key-values.

---

## 7. Cloud Deployment Guide: TiDB Cloud & Cloud Hosting

### 7.1 TiDB Cloud Database Setup
1. Log in to [TiDB Cloud](https://tidbcloud.com/).
2. Create a free **TiDB Serverless** cluster (e.g. named `lifetrace-cluster`).
3. Under cluster settings, locate your connection parameters:
   - **Host:** e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`
   - **Port:** `4000`
   - **User:** e.g., `<cluster-prefix>.root`
   - **Password:** Generate a strong password.
   - **Database Name:** `lifetrace_db`
   - **SSL/TLS:** Enabled (mandatory).
4. Run the schema creation script on your TiDB cluster or let LifeTrace initialize it:
   ```bash
   # From your local machine or build runner:
   npm run db:setup
   ```
5. Initialize the system administrator account:
   ```bash
   npm run admin:init -- --password="YourSecureProductionPassword123!"
   ```
6. (Optional) Seed the standard Ugandan demonstration catalog:
   ```bash
   npm run db:seed
   ```
   > *Note:* The seed script is fully idempotent (`ON DUPLICATE KEY UPDATE`) and will **never** overwrite existing administrator credentials.

---

### 7.2 Cloud Deployment Options

#### Option A: Render (Web Service or Blueprint)
1. Fork or push your code to your GitHub repository: `https://github.com/alitdel/lifetrace`.
2. On Render Dashboard, click **New +** -> **Blueprint** and select your repository (it automatically detects `render.yaml`).
3. Alternatively, create a **Web Service**:
   - **Environment:** `Node`
   - **Build Command:** `npm ci --only=production`
   - **Start Command:** `npm run db:setup && node backend/server.js`
   - **Health Check Path:** `/health`
4. In **Environment Variables**, set:
   - `NODE_ENV`: `production`
   - `DB_ENGINE`: `mysql`
   - `DB_HOST`: `<your-tidb-host>`
   - `DB_PORT`: `4000`
   - `DB_USER`: `<your-tidb-user>`
   - `DB_PASSWORD`: `<your-tidb-password>`
   - `DB_NAME`: `lifetrace_db`
   - `DB_SSL`: `true`
   - `STRICT_MYSQL`: `true`
   - `SESSION_SECRET`: `<64-character-random-hex>`
   - `ALLOWED_ORIGINS`: `https://your-service.onrender.com`
   - `ADMIN_PASSWORD`: `<your-admin-password>`
5. Attach a Persistent Disk (mount path: `/app/backend/uploads`) to retain uploaded user photos and videos across restarts.

#### Option B: Railway / Fly.io / Heroku
Configure the same environment variables in your provider's dashboard. Set the start command to:
```bash
npm run db:setup && node backend/server.js
```

#### Option C: Docker Containerization
Build and run the production container:
```bash
# Build Docker image
docker build -t lifetrace:latest .

# Run container with persistent uploads volume
docker run -d \
  --name lifetrace-app \
  -p 8080:8080 \
  -v lifetrace_uploads:/app/backend/uploads \
  --env-file .env \
  lifetrace:latest
```

---

## 8. Environment Variables Reference

| Variable | Required in Prod? | Default | Description |
| :--- | :---: | :---: | :--- |
| `NODE_ENV` | Yes | `development` | Set to `production` for security policies, secure cookies, and strict database mode. |
| `PORT` | No | `8080` (or `5000`) | Port on which the HTTP server listens. |
| `DB_ENGINE` | Yes | `mysql` | Set to `mysql` for TiDB Cloud. Set to `sqlite` for local dev. |
| `DB_HOST` | Yes | `127.0.0.1` | TiDB Cloud gateway host. |
| `DB_PORT` | Yes | `4000` | Port for TiDB Cloud (4000) or local MySQL (3306). |
| `DB_USER` | Yes | `root` | Database username. |
| `DB_PASSWORD` | Yes | `""` | Database user password. |
| `DB_NAME` | Yes | `lifetrace_db` | Relational database schema name. |
| `DB_SSL` | Yes | `true` | Must be `true` for TiDB Cloud TLS 1.2+ encryption. |
| `DB_SSL_CA` | No | `""` | Path to custom CA certificate file if needed. |
| `STRICT_MYSQL` | Yes | `true` | When `true`, prevents fallback to SQLite if connection fails. |
| `SESSION_SECRET` | Yes | `""` | High-entropy cryptographic random string for signing session cookies. |
| `SESSION_LIFETIME_HOURS` | No | `24` | Hours before an idle session expires. |
| `ALLOWED_ORIGINS` | In Prod | `""` | Comma-separated list of approved web origins for CORS. |
| `UPLOAD_DIR` | No | `backend/uploads` | Path to persistent storage directory for user uploads. |
| `UPLOAD_MAX_SIZE_MB` | No | `25` | Maximum upload size for knowledge media (MB). |
| `ADMIN_USERNAME` | No | `admin` | Username used when running `npm run admin:init`. |
| `ADMIN_EMAIL` | No | `admin@lifetrace.ug`| Email used when running `npm run admin:init`. |
| `ADMIN_PASSWORD` | In Prod | `""` | Master admin password for `npm run admin:init`. |

---

## 9. Security Implementation Summary

1. **Session Fixation Prevention:** Session IDs are regenerated via `req.session.regenerate()` immediately upon login and registration.
2. **Defensive Parameterized SQL:** 100% of SQL statements utilize prepared statements (`?` parameters) preventing SQL injection.
3. **Role-Based Access Control (RBAC):** Every endpoint strictly checks `req.session.user.role`. Unauthorized requests receive immediate 401 Unauthorized or 403 Forbidden responses.
4. **Restricted Administrator Setup:** The public registration endpoint strictly rejects `role = 'admin'` or `role = 'reviewer'`. Admin creation requires the server-side CLI tool (`npm run admin:init`).
5. **Content Security Policy (CSP) & Helmet:** HTTP response headers secured against cross-site scripting (XSS), clickjacking, and MIME-sniffing.
6. **Rate Limiting:** General API requests are limited, and authentication endpoints are throttled (30 attempts / 10 min) to block brute-force attacks.
7. **Controlled Media Uploads:** Multer rejects executable binaries (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.js`, `.py`). All filenames are sanitized with cryptographic random timestamps.
8. **Immutable Audit Trail:** Sensitive state changes (registrations, logins, submissions, review approvals, role updates) are recorded with actor ID, IP address, and JSON details.
9. **Zero-Knowledge Password Storage:** Passwords hashed with bcrypt using 10 rounds of cryptographic salt. Plain-text passwords are never stored or logged.

---

## 10. Automated Testing & Verification

LifeTrace includes an automated test runner (`backend/tests/api.test.js`) validating 22 comprehensive test suites across authentication, database, authorization, file storage, scoring, and certification:

```bash
# Run test suite:
npm test
```

---

## 11. Project Directory Structure

```
lifetrace/
├── Dockerfile                      # Production multi-stage Docker container
├── .dockerignore                   # Docker build context exclusions
├── .gitignore                      # Git source control exclusions (secrets, uploads, dev db)
├── .env.example                    # Comprehensive production environment template
├── render.yaml                     # Render Cloud Blueprint deployment specification
├── fly.toml                        # Fly.io deployment configuration
├── package.json                    # Node.js project manifest & scripts (engines: >=18.0.0)
├── README.md                       # Complete technical & deployment documentation
├── backend/
│   ├── config/
│   │   └── db.js                   # TiDB Cloud MySQL TLS 1.2+ connection pool & SQLite dev
│   ├── controllers/
│   │   ├── adminController.js      # User governance & policy settings
│   │   ├── assessmentController.js # Quizzes, automatic grading, passing checks
│   │   ├── auditController.js      # Immutable audit log inspection
│   │   ├── authController.js       # Register, login (with fixation defense), logout, password change
│   │   ├── categoryController.js   # Domain categories CRUD
│   │   ├── certificateController.js# Verification registry & issuance
│   │   ├── knowledgeController.js  # Knowledge capture, library, draft management
│   │   ├── learningController.js   # Step completion, practical evidence grading
│   │   ├── mediaController.js      # Permission-checked media uploads and file serving
│   │   ├── notificationController.js# In-app user notifications
│   │   ├── reportController.js     # Platform stats & Chart.js analytics
│   │   ├── reviewController.js     # Peer verification, scoring, decisions
│   │   └── userController.js       # Profile management (atomic cross-engine queries)
│   ├── database/
│   │   ├── init.js                 # Safe idempotent DDL executor for TiDB Cloud
│   │   ├── schema.sql              # Complete normalized schema (29 relational tables)
│   │   ├── seed.js                 # Safe idempotent seeder with ON DUPLICATE KEY UPDATE
│   │   └── seed.sql                # Seed dataset for traditional Ugandan crafts
│   ├── middleware/
│   │   ├── authMiddleware.js       # Session authentication guard
│   │   ├── errorHandler.js         # Centralized error handler
│   │   ├── roleMiddleware.js       # Role-Based Access Control (RBAC)
│   │   ├── uploadMiddleware.js     # Multer safe media storage & persistent UPLOAD_DIR
│   │   └── validationMiddleware.js # Input validation & role boundary checks
│   ├── routes/                     # Express REST route definitions
│   │   ├── adminRoutes.js
│   │   ├── assessmentRoutes.js
│   │   ├── auditRoutes.js
│   │   ├── authRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── certificateRoutes.js
│   │   ├── knowledgeRoutes.js
│   │   ├── learningRoutes.js
│   │   ├── mediaRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── reportRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── userRoutes.js
│   ├── services/
│   │   ├── auditService.js         # Security audit logging
│   │   ├── certificateService.js   # Certificate qualification & verification
│   │   └── notificationService.js  # User notifications
│   ├── tests/
│   │   └── api.test.js             # Automated 22-suite test runner
│   ├── uploads/                    # Controlled media storage directory (.gitkeep preserved)
│   │   ├── avatars/
│   │   ├── media/
│   │   └── submissions/
│   ├── utils/
│   │   ├── generateAssets.js       # Local SVG covers & avatar generator
│   │   └── initAdmin.js            # Secure administrator CLI initializer
│   └── server.js                   # Application entry point & graceful shutdown
└── frontend/
    ├── assets/                     # Local SVG avatar portraits and module covers
    ├── css/
    │   └── style.css               # Unified Design System (Navy, Teal, Gold, White)
    ├── js/
    │   ├── api.js                  # Global API client, error handler, toast engine
    │   └── app.js                  # Navbar coordinator, notifications, session
    ├── index.html                  # 1. Public Landing Portal
    ├── about.html                  # 2. About LifeTrace & Architecture
    ├── register.html               # 3. Registration Portal (Learner & Expert)
    ├── login.html                  # 4. Sign In Portal with Quick Demo Fillers
    ├── dashboard.html              # 5-8. Dynamic Role Dashboard Hub
    ├── profile.html                # 9. Profile & Biographical Management
    ├── create-knowledge.html       # 10. Knowledge Capture & Procedure Studio
    ├── knowledge-library.html      # 11. Searchable Public Knowledge Library
    ├── knowledge-details.html      # 12. Complete Technical Guide & Step Tracker
    ├── review-management.html      # 13. Review & Verification Queue Desk
    ├── learning-progress.html      # 14. Competency Progress Tracking
    ├── practical-submission.html   # 15. Practical Evidence Submission & Grading
    ├── assessment.html             # 16. Mastery Assessment & Quiz Evaluation
    ├── certificate.html            # 17. Certificate Document & Public Registry
    ├── notifications.html          # 18. User Alerts & Notifications
    ├── user-management.html        # 19. Administrator User Accounts
    ├── category-management.html    # 20. Domain Category Registry
    ├── reports-analytics.html      # 21. Chart.js Analytics & Visual Reports
    ├── audit-logs.html             # 22. Immutable Security Audit Trail
    ├── settings.html               # 23. Platform Policies & Configurations
    ├── admin.html                  # Dedicated Administrator Console
    └── reviewer.html               # Dedicated Reviewer Desk
```

---

## 12. License & Attribution
Developed as a Practical Knowledge Preservation and Vocational Learning Management System. Suitable for academic examination, community skill archives, and vocational institutes in Uganda. Licensed under the ISC License.
