const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('./config/db');
const MediaController = require('./controllers/mediaController');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const learningRoutes = require('./routes/learningRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditRoutes = require('./routes/auditRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const protectedPages = {
  '/dashboard.html': ['learner', 'expert', 'reviewer', 'admin'],
  '/profile.html': ['learner', 'expert', 'reviewer', 'admin'],
  '/notifications.html': ['learner', 'expert', 'reviewer', 'admin'],
  '/learning-progress.html': ['learner'],
  '/assessment.html': ['learner'],
  '/create-knowledge.html': ['expert', 'admin'],
  '/media-upload.html': ['expert', 'admin'],
  '/practical-submission.html': ['learner', 'expert', 'reviewer', 'admin'],
  '/reviewer.html': ['reviewer', 'admin'],
  '/review-management.html': ['reviewer', 'admin'],
  '/admin.html': ['admin'],
  '/user-management.html': ['admin'],
  '/category-management.html': ['admin'],
  '/reports-analytics.html': ['admin'],
  '/audit-logs.html': ['admin'],
  '/settings.html': ['admin']
};

// 1. Security Headers (Helmet) with permissive directives for CDN icons and Chart.js
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://player.vimeo.com"],
        childSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://player.vimeo.com"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS configuration
app.use(cors({
  origin: true,
  credentials: true
}));

// 3. Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this client. Please slow down.' }
});
app.use('/api/', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // 30 login/register attempts
  message: { success: false, message: 'Too many authentication attempts. Please wait 10 minutes before retrying.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'lifetrace_secret_key_uganda_2025_session_token',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: parseInt(process.env.SESSION_LIFETIME_HOURS || '24', 10) * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  })
);

// 6. Permission-checked uploaded media and public frontend assets
app.get('/uploads/:type/:filename', MediaController.serveUpload);
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();

  const allowedRoles = protectedPages[req.path.toLowerCase()];
  if (!allowedRoles) return next();

  const user = req.session && req.session.user;
  if (!user) return res.redirect('/login.html');
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).type('text').send('You do not have permission to view this page.');
  }
  return next();
});
app.use(express.static(path.join(__dirname, '../frontend')));

// 7. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'LifeTrace Uganda',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    databaseEngine: db.getEngine()
  });
});

// 8. Error Handling Middleware
app.use(errorHandler);

// 9. Server Initialization
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('   LifeTrace: Practical Knowledge Preservation LMS   ');
    console.log('----------------------------------------------------');
    
    // Connect to database
    await db.initializeDatabase();
    console.log(`[LifeTrace] Database Active Engine: ${db.getEngine().toUpperCase()}`);

    // Verify or seed initial tables
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users').catch(() => [[{ count: 0 }]]);
    if (!userCount[0] || userCount[0].count === 0) {
      console.log('[LifeTrace] Database empty. Running initial schema and seeds...');
      const runInit = require('./database/init');
      const runSeed = require('./database/seed');
      await runInit();
      await runSeed();
    }

    const server = app.listen(PORT, () => {
      console.log(`[LifeTrace] Server successfully running at http://localhost:${PORT}`);
      console.log(`[LifeTrace] Frontend Portal: http://localhost:${PORT}/index.html`);
      console.log(`[LifeTrace] Knowledge Library: http://localhost:${PORT}/knowledge-library.html`);
      console.log(`[LifeTrace] System Health: http://localhost:${PORT}/api/health`);
      console.log('----------------------------------------------------');
    });

    return { app, server };
  } catch (err) {
    console.error('[LifeTrace] Fatal initialization failure:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };

