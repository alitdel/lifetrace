const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

require('dotenv').config({
  path: path.join(__dirname, '../.env')
});

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
const PORT = process.env.PORT || 8080;

// Production security and environment validation
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'lifetrace_local_development_only') {
    throw new Error(
      '[LifeTrace Security] SESSION_SECRET must be configured with a secure random secret in production.'
    );
  }

  const engine = (process.env.DB_ENGINE || 'mysql').toLowerCase();
  if (engine !== 'sqlite') {
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      throw new Error(
        '[LifeTrace Database] DB_HOST, DB_USER, and DB_PASSWORD must be configured for TiDB/MySQL production deployment.'
      );
    }
  }
}

// Protected frontend pages and permitted roles
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

// 1. Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https:'
        ],
        connectSrc: ["'self'"],
        frameSrc: [
          "'self'",
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com',
          'https://player.vimeo.com'
        ],
        childSrc: [
          "'self'",
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com',
          'https://player.vimeo.com'
        ]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS configuration
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || ''
)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (same-origin, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      if (
        process.env.NODE_ENV !== 'production' ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error('Origin not allowed by CORS policy.')
      );
    },
    credentials: true
  })
);

// 3. General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  }
});

app.use('/api/', generalLimiter);

// Authentication rate limiting
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 10 minutes.'
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Request parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));
app.use(cookieParser());

// 5. Session configuration
app.set('trust proxy', 1);

app.use(
  session({
    name: 'lifetrace.sid',
    secret:
      process.env.SESSION_SECRET ||
      'lifetrace_local_development_only',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge:
        parseInt(
          process.env.SESSION_LIFETIME_HOURS || '24',
          10
        ) * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  })
);

// 6. Permission-checked uploaded media
app.get(
  '/uploads/:type/:filename',
  MediaController.serveUpload
);

// Protect restricted frontend pages
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const allowedRoles =
    protectedPages[req.path.toLowerCase()];

  if (!allowedRoles) {
    return next();
  }

  const user = req.session && req.session.user;

  if (!user) {
    return res.redirect('/login.html');
  }

  if (!allowedRoles.includes(user.role)) {
    return res
      .status(403)
      .type('text')
      .send('You do not have permission to view this page.');
  }

  return next();
});

// Serve frontend static assets
app.use(
  express.static(path.join(__dirname, '../frontend'))
);

// 7. API routes
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

// 8. Health check endpoints (root /health for cloud orchestrators & /api/health)
const getHealthStatus = () => ({
  status: 'healthy',
  system: 'LifeTrace Uganda',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  databaseEngine: db.getEngine()
});

app.get('/health', (req, res) => {
  res.json(getHealthStatus());
});

app.get('/api/health', (req, res) => {
  res.json(getHealthStatus());
});

// 9. Error handling middleware
app.use(errorHandler);

// Graceful shutdown handling
function setupGracefulShutdown(server) {
  const shutdown = async (signal) => {
    console.log(`\n[LifeTrace] Received ${signal}. Starting graceful shutdown...`);
    if (server) {
      server.close(async () => {
        console.log('[LifeTrace] HTTP server closed.');
        try {
          await db.close();
          console.log('[LifeTrace] Database connections closed safely.');
          process.exit(0);
        } catch (err) {
          console.error('[LifeTrace] Error closing database connections:', err.message);
          process.exit(1);
        }
      });

      // Force exit after 10 seconds timeout
      setTimeout(() => {
        console.error('[LifeTrace] Graceful shutdown timeout exceeded. Terminating process.');
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// 10. Server initialization
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('   LifeTrace: Practical Knowledge Preservation LMS   ');
    console.log('----------------------------------------------------');

    // Connect to the configured database
    await db.initializeDatabase();

    console.log(
      `[LifeTrace] Database engine: ${db.getEngine().toUpperCase()}`
    );

    // Verify that the database schema exists.
    // Never automatically initialize or seed the database here.
    try {
      await db.query(
        'SELECT COUNT(*) AS count FROM users'
      );

      console.log(
        '[LifeTrace] Database schema verified successfully.'
      );
    } catch (error) {
      throw new Error(
        `Database schema is not ready. Run the database setup first (npm run db:setup). Details: ${error.message}`
      );
    }

    // Start the web server only after database verification
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[LifeTrace] Server running on port ${PORT}`
      );
      console.log(
        `[LifeTrace] Frontend: http://localhost:${PORT}/index.html`
      );
      console.log(
        `[LifeTrace] Knowledge Library: http://localhost:${PORT}/knowledge-library.html`
      );
      console.log(
        `[LifeTrace] Health Check: http://localhost:${PORT}/health`
      );
      console.log('----------------------------------------------------');
    });

    setupGracefulShutdown(server);

    return {
      app,
      server
    };

  } catch (error) {
    console.error(
      '[LifeTrace] Fatal initialization failure:',
      error.message
    );

    process.exit(1);
  }
}

// Start server when executed directly
if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
