import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';

const app = express();
const port = Number(process.env.API_PORT || 3001);
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const placeholderPassword = 'replace-this-with-a-unique-password-of-at-least-12-characters';
const cookieName = 'simplex_admin';
const sessionLifetimeMs = 12 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const allowedDepartments = new Set([
  'Programming',
  'Cybersecurity',
  'Academic',
  'Social Media',
  'HR',
  'Public Relations',
  'Organization',
]);
const allowedSponsorLevels = new Map([
  ['bronze', 'Bronze Sponsor (دعم الفعاليات والأنشطة)'],
  ['silver', 'Silver Sponsor (دعم المشاريع والورش التقنية)'],
  ['gold', 'Gold Sponsor (شراكة ودعم استراتيجي للتيم)'],
]);

const adminCredentialsConfigured = Boolean(
  adminUsername
  && adminPassword
  && adminPassword.length >= 8
  && adminPassword !== placeholderPassword,
);

if (process.env.NODE_ENV === 'production' && !adminCredentialsConfigured) {
  console.error('Set ADMIN_USERNAME and a unique ADMIN_PASSWORD of at least 8 characters before starting the server.');
  process.exit(1);
}
if (!adminCredentialsConfigured) {
  console.warn('Admin login is disabled until ADMIN_USERNAME and ADMIN_PASSWORD are configured.');
}

const databasePath = process.env.DB_PATH || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'simplex.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    department TEXT NOT NULL,
    track TEXT NOT NULL,
    portfolio_url TEXT NOT NULL,
    special_answer TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending'
  );
  CREATE TABLE IF NOT EXISTS sponsors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    email TEXT NOT NULL,
    level TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending'
  );
`);

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function applicationRecord(row) {
  return {
    id: `SMP-${String(row.id).padStart(6, '0')}`,
    name: row.name,
    email: row.email,
    phone: row.phone,
    dept: row.department,
    track: row.track,
    portfolioUrl: row.portfolio_url,
    specialAnswer: row.special_answer,
    date: row.created_at,
    status: row.status,
  };
}

function sponsorRecord(row) {
  return {
    id: row.id,
    company: row.company,
    email: row.email,
    level: row.level,
    date: row.created_at,
    status: row.status,
  };
}

function sessionToken(request) {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : '';
}

function requireAdmin(request, response, next) {
  const token = sessionToken(request);
  const expiresAt = sessions.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(token);
    return response.status(401).json({ error: 'سجّل الدخول إلى لوحة الإدارة أولاً.' });
  }
  sessions.set(token, Date.now() + sessionLifetimeMs);
  return next();
}

function constantTimeCredentialMatch(candidate, expectedValue) {
  const supplied = Buffer.from(candidate);
  const expected = Buffer.from(expectedValue);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function sessionCookie(value, maxAge) {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  return `${cookieName}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

app.get('/api/stats', (_request, response) => {
  const applications = database.prepare('SELECT COUNT(*) AS count FROM applications').get().count;
  const sponsors = database.prepare('SELECT COUNT(*) AS count FROM sponsors').get().count;
  response.json({ applications, sponsors });
});

app.post('/api/applications', (request, response, next) => {
  try {
    const body = request.body || {};
    const name = clean(body.fullName, 120);
    const email = clean(body.email, 254).toLowerCase();
    const phone = clean(body.phone, 40);
    const department = clean(body.department, 40);
    const track = clean(body.track, 20);
    const portfolioUrl = clean(body.portfolioUrl, 2048);
    const specialAnswer = clean(body.specialAnswer, 4000);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone
      || !allowedDepartments.has(department)
      || !['beginner', 'experienced'].includes(track)
      || !/^https?:\/\/\S+$/i.test(portfolioUrl)) {
      return response.status(400).json({ error: 'راجع البيانات المطلوبة وتأكد من صحة البريد والرابط.' });
    }

    const result = database.prepare(`
      INSERT INTO applications (name, email, phone, department, track, portfolio_url, special_answer, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, email, phone, department, track, portfolioUrl, specialAnswer, new Date().toISOString());
    const row = database.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
    return response.status(201).json(applicationRecord(row));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/sponsors', (request, response, next) => {
  try {
    const company = clean(request.body?.company, 160);
    const email = clean(request.body?.email, 254).toLowerCase();
    const level = allowedSponsorLevels.get(clean(request.body?.level, 10));
    if (!company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !level) {
      return response.status(400).json({ error: 'راجع اسم الشركة والبريد الإلكتروني ومستوى الرعاية.' });
    }

    const result = database.prepare(`
      INSERT INTO sponsors (company, email, level, created_at)
      VALUES (?, ?, ?, ?)
    `).run(company, email, level, new Date().toISOString());
    const row = database.prepare('SELECT * FROM sponsors WHERE id = ?').get(result.lastInsertRowid);
    return response.status(201).json(sponsorRecord(row));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/login', (request, response) => {
  if (!adminCredentialsConfigured) {
    return response.status(503).json({ error: 'ضبط اسم المستخدم وكلمة المرور في ملف .env أولاً.' });
  }
  const now = Date.now();
  const key = request.ip;
  const attempts = loginAttempts.get(key);
  if (attempts && attempts.expiresAt > now && attempts.count >= 5) {
    return response.status(429).json({ error: 'محاولات كثيرة. حاول مرة أخرى بعد 15 دقيقة.' });
  }

  const username = typeof request.body?.username === 'string' ? request.body.username : '';
  const password = typeof request.body?.password === 'string' ? request.body.password : '';
  if (!constantTimeCredentialMatch(username, adminUsername)
    || !constantTimeCredentialMatch(password, adminPassword)) {
    const current = attempts && attempts.expiresAt > now ? attempts : { count: 0, expiresAt: now + 15 * 60 * 1000 };
    current.count += 1;
    loginAttempts.set(key, current);
    return response.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
  }

  loginAttempts.delete(key);
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, now + sessionLifetimeMs);
  response.setHeader('Set-Cookie', sessionCookie(token, sessionLifetimeMs / 1000));
  return response.json({ authenticated: true });
});

app.get('/api/admin/session', (request, response) => {
  const token = sessionToken(request);
  const expiresAt = sessions.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    sessions.delete(token);
    return response.json({ authenticated: false });
  }
  sessions.set(token, Date.now() + sessionLifetimeMs);
  return response.json({ authenticated: true });
});

app.post('/api/admin/logout', (request, response) => {
  sessions.delete(sessionToken(request));
  response.setHeader('Set-Cookie', sessionCookie('', 0));
  return response.json({ authenticated: false });
});

app.get('/api/admin/applications', requireAdmin, (_request, response) => {
  const rows = database.prepare('SELECT * FROM applications ORDER BY id DESC').all();
  response.json(rows.map(applicationRecord));
});

app.get('/api/admin/sponsors', requireAdmin, (_request, response) => {
  const rows = database.prepare('SELECT * FROM sponsors ORDER BY id DESC').all();
  response.json(rows.map(sponsorRecord));
});

if (process.env.NODE_ENV === 'production') {
  const frontendDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  app.use(express.static(frontendDirectory));
  app.use((request, response, next) => {
    if (request.path.startsWith('/api/')) {
      return response.status(404).json({ error: 'المسار المطلوب غير موجود.' });
    }
    if (request.method === 'GET') {
      return response.sendFile(join(frontendDirectory, 'index.html'));
    }
    return next();
  });
}

app.use((error, _request, response, _next) => {
  console.error('API request failed:', error);
  response.status(500).json({ error: 'تعذر حفظ البيانات حالياً. حاول مرة أخرى.' });
});

const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
app.listen(port, host, () => {
  console.log(`SIMPLEX API listening on port ${port}; database: ${databasePath}`);
});
