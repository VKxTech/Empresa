import express from 'express'; // v3 - roadmap update



import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import expressLayouts from 'express-ejs-layouts';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import pino from 'pino';
import { PrismaClient } from '@prisma/client';
import csrf from 'csurf';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const logger = pino(
  process.env.NODE_ENV === 'development' 
    ? { transport: { target: 'pino-pretty' } }
    : {}
);

const PORT = process.env.PORT || 3000;

// Security Middleware
app.use((helmet as any)({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false,
  hsts: false,
}));

const limiter = (rateLimit as any)({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/admin/login', limiter);

// Basic Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((cookieParser as any)());
app.use(session({
  secret: process.env.SESSION_SECRET || 'vkx-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.resolve(process.cwd(), 'views'));
app.use(expressLayouts as any);
app.set('layout', 'layouts/main');

// Static Files
app.use(express.static(path.resolve(process.cwd(), 'public')));

// CSRF Protections (selective)
// CSRF Protections (selective)
const csrfProtection = (csrf as any)({ cookie: true });

// Import Translations
import { translations } from './locales/translations.js';

app.use(async (req, res, next) => {
  // 1. Subdomain Logic: Handled in routes/public.ts for granular control

  // 2. I18n Logic
  const supportedLangs = ['pt', 'en', 'zh'];
  let lang = req.query.lang as string;

  // If lang param is present, save to cookie
  if (lang && supportedLangs.includes(lang)) {
    res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 });
  } else {
    // Try to get from cookie
    lang = req.cookies.lang;
    
    // If no cookie, try header
    if (!lang && req.headers['accept-language']) {
      const headerLang = req.headers['accept-language'].split(',')[0].substring(0, 2);
      if (supportedLangs.includes(headerLang)) lang = headerLang;
      // Map zh-CN to zh
      if (req.headers['accept-language'].includes('zh')) lang = 'zh';
    }
  }

  // Fallback
  if (!supportedLangs.includes(lang)) lang = 'pt';
  
  res.locals.lang = lang;
  res.locals.path = req.path;
  res.locals.siteUrl = process.env.SITE_URL;
  
  // Use Imported Translations
  res.locals.t = (translations as any)[lang] || translations.pt;
  
  next();
});

// Import Routes
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
import { MailService } from './services/mail.js';
if (process.env.NODE_ENV !== 'production') {
  MailService.startCron();
}

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    logger.info(`VKX Technologies running on port ${PORT}`);
  });
}

export { prisma, logger };
export default app;
