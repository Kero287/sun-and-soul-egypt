import './load-env.mjs';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHmac, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const seed = JSON.parse(await readFile(new URL('../data/trips.json', import.meta.url), 'utf8'));
const dataDir = resolve(process.env.DATA_DIR || '.data');
const uploadsDir = resolve(process.env.UPLOAD_DIR || 'uploads');
const cloud = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const hosted = Boolean(process.env.VERCEL);
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'trip-images';
const sessionSeconds = 8 * 60 * 60;
const loginAttempts = new Map();
let writeQueue = Promise.resolve();
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

async function config() {
  if (hosted && !cloud) {
    fail(503, 'Supabase storage is not configured on this deployment.');
  }
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.SESSION_SECRET;
  if (!passwordHash || !secret) fail(503, 'ADMIN_PASSWORD_HASH and SESSION_SECRET must be configured.');
  if (secret.length < 32) fail(503, 'SESSION_SECRET must contain at least 32 characters.');
  if (!/^[A-Za-z0-9_-]{16,64}:[a-f0-9]{128}$/i.test(passwordHash)) fail(503, 'ADMIN_PASSWORD_HASH has an invalid format.');
  return { passwordHash, secret };
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

async function body(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) fail(415, 'Invalid request format.');
  let raw = '';
  if (req.body !== undefined) raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  else {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4200000) fail(413, 'The image payload is too large. Choose a smaller image.');
      chunks.push(chunk);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  }
  if (Buffer.byteLength(raw) > 4200000) fail(413, 'The request payload is too large.');
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch { fail(400, 'Invalid request data.'); }
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) fail(403, 'Request origin is not allowed.');
  try {
    if (new URL(origin).host !== req.headers.host) fail(403, 'Request origin is not allowed.');
  } catch { fail(403, 'Request origin is not allowed.'); }
}

function verifyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 256 || !hash) return false;
  const [salt, expected] = hash.split(':');
  const value = scryptSync(password, salt, 64);
  const stored = Buffer.from(expected, 'hex');
  return stored.length === value.length && timingSafeEqual(value, stored);
}

function authenticated(req, settings) {
  const token = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('sun_soul_admin='))?.slice(15);
  if (!token || !settings.passwordHash) return false;
  const [expires, signature, extra] = token.split('.');
  if (extra || !/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac('sha256', settings.secret).update(`${expires}:${settings.passwordHash}`).digest('hex');
  if (!signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

function cookie(req, res, settings, clear = false) {
  const expires = Math.floor(Date.now() / 1000) + sessionSeconds;
  const signature = createHmac('sha256', settings.secret).update(`${expires}:${settings.passwordHash}`).digest('hex');
  const secure = hosted || req.headers['x-forwarded-proto'] === 'https' || req.socket?.encrypted;
  res.setHeader('Set-Cookie', `sun_soul_admin=${clear ? '' : `${expires}.${signature}`}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : sessionSeconds}${secure ? '; Secure' : ''}`);
}

function rateLimit(req) {
  const ip = hosted ? String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0] : req.socket?.remoteAddress || 'local';
  const now = Date.now();
  for (const [key, item] of loginAttempts) if (item.until < now) loginAttempts.delete(key);
  const item = loginAttempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };
  item.count++;
  loginAttempts.set(ip, item);
  if (item.count > 10) fail(429, 'Too many attempts. Try again in 15 minutes.');
}

async function supabase(path, init = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers }
  });
  if (!response.ok) {
    console.error('Storage request failed with status', response.status);
    fail(503, 'Storage is unavailable. Check Supabase configuration and run schema.sql.');
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function translateWithGoogle(text) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx'); url.searchParams.set('sl', 'en'); url.searchParams.set('tl', 'ar'); url.searchParams.set('dt', 't'); url.searchParams.set('q', text);
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
  if (!response.ok) fail(503, 'The translation service is unavailable. Try again.');
  const data = await response.json();
  const translated = Array.isArray(data?.[0]) ? data[0].map(part => part?.[0] || '').join('') : '';
  if (!translated) fail(503, 'The translation response was empty. Try again.');
  return translated;
}

async function readCatalog() {
  if (hosted && !cloud) fail(503, 'Journey storage is not configured on this deployment.');
  if (cloud) {
    const rows = await supabase('/rest/v1/sun_soul_catalog?id=eq.main&select=trips,revision');
    return rows[0] || { trips: structuredClone(seed), revision: 0 };
  }
  try { return JSON.parse(await readFile(join(dataDir, 'catalog.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return { trips: structuredClone(seed), revision: 0 }; }
}

async function mutateCatalog(revision, change) {
  const operation = async () => {
    if (cloud) {
      await supabase('/rest/v1/sun_soul_catalog?on_conflict=id', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ id: 'main', trips: seed, revision: 0 })
      });
    }
    const current = await readCatalog();
    if (!Number.isInteger(revision) || current.revision !== revision) fail(409, 'The journeys changed in another window. Refresh the list and try again.');
    change(current.trips);
    const next = { trips: current.trips, revision: current.revision + 1 };
    if (cloud) {
      const result = await supabase(`/rest/v1/sun_soul_catalog?id=eq.main&revision=eq.${revision}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ ...next, updated_at: new Date().toISOString() })
      });
      if (!result.length) fail(409, 'The journeys changed in another window. Refresh the list and try again.');
    } else {
      await mkdir(dataDir, { recursive: true });
      const temp = join(dataDir, `${randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(next, null, 2), { mode: 0o600 });
      await rename(temp, join(dataDir, 'catalog.json'));
    }
    return next;
  };
  const task = writeQueue.then(operation);
  writeQueue = task.catch(() => {});
  return task;
}

function textField(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, 'Complete the journey details correctly.');
  return value.trim();
}

function imagePath(value) {
  if (typeof value !== 'string' || value.length > 1500 || /[<>"'\\\x00-\x1f]/.test(value) || value.split('/').includes('..')) fail(400, 'Invalid image URL.');
  if (/^images\/[^?#]+\.(webp|png|jpe?g)$/i.test(value) || /^\/uploads\/[a-f0-9-]+(?:-thumb)?\.(webp|png|jpg)$/.test(value)) return value;
  if (cloud && value.startsWith(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/`) && /\.(webp|png|jpg)$/.test(value)) return value;
  fail(400, 'Choose an image using the upload button.');
}

async function validateTrip(input) {
  if (!input || typeof input !== 'object' || typeof input.published !== 'boolean') fail(400, 'Invalid journey data.');
  const result = { published: input.published, cover: imagePath(input.cover), photos: [], thumbnails: {} };
  for (const lang of ['en', 'ar']) {
    const copy = input[lang] || {};
    if (typeof copy !== 'object' || Array.isArray(copy)) fail(400, 'Invalid language data.');
    result[lang] = {
      name: textField(copy.name, 200, lang === 'en'), location: textField(copy.location, 150, lang === 'en'),
      price: textField(copy.price, 150, lang === 'en'), description: textField(copy.description, 3000, lang === 'en'), details: []
    };
    const details = Array.isArray(copy.details) ? copy.details : [];
    if (details.length > 40) fail(400, 'Journey details cannot contain more than 40 items.');
    result[lang].details = details.map(item => textField(item, 1000, true));
  }
  // Arabic is optional in the admin form. Translate missing copy on the server
  // as a second line of defence, so a direct API client cannot accidentally
  // publish an English-only Arabic view.
  for (const field of ['name', 'location', 'price', 'description']) {
    if (!result.ar[field] && result.en[field]) {
      try { result.ar[field] = await translateWithGoogle(result.en[field]); }
      catch { result.ar[field] = result.en[field]; }
    }
  }
  if (!result.ar.details.length && result.en.details.length) {
    try {
      result.ar.details = [];
      for (const detail of result.en.details) result.ar.details.push(await translateWithGoogle(detail));
    } catch { result.ar.details = [...result.en.details]; }
  }
  result.name = result.en.name;
  if (!Array.isArray(input.photos) || input.photos.length > 30) fail(400, 'A journey can contain up to 30 images.');
  result.photos = [...new Set(input.photos.map(imagePath))];
  for (const src of result.photos) {
    if (input.thumbnails && Object.hasOwn(input.thumbnails, src)) result.thumbnails[src] = imagePath(input.thumbnails[src]);
  }
  return result;
}

function decodeImage(value, max = 2900000) {
  const match = typeof value === 'string' && value.match(/^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) fail(400, 'Unsupported image. Use JPG, PNG, or WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > max) fail(413, 'The image is too large.');
  const valid = match[1] === 'webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!valid) fail(400, 'Invalid image file.');
  return { bytes, mime: `image/${match[1]}`, extension: match[1] === 'jpeg' ? 'jpg' : match[1] };
}

async function saveImage(image, basename) {
  const filename = `${basename}.${image.extension}`;
  if (cloud) {
    await supabase(`/storage/v1/object/${bucket}/${filename}`, { method: 'POST', headers: { 'Content-Type': image.mime }, body: image.bytes });
    return `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${filename}`;
  }
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, filename), image.bytes, { flag: 'wx' });
  return `/uploads/${filename}`;
}

export async function handleApi(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/\/$/, '');
    const method = req.method;
    if (path === '/api/trips' && method === 'GET') {
      const catalog = await readCatalog();
      return json(res, 200, { trips: Object.fromEntries(Object.entries(catalog.trips).filter(([, trip]) => trip.published !== false)) });
    }
    if (!path.startsWith('/api/admin/')) fail(404, 'Page not found.');
    const settings = await config();
    if (method !== 'GET') sameOrigin(req);
    if (path === '/api/admin/session' && method === 'GET') {
      return json(res, 200, { authenticated: authenticated(req, settings), needsSetup: !settings.passwordHash, storage: cloud ? 'cloud' : 'local' });
    }
    if (path === '/api/admin/setup' && method === 'POST') {
      fail(403, 'The password is managed through environment variables.');
    }
    if (path === '/api/admin/login' && method === 'POST') {
      rateLimit(req);
      const input = await body(req);
      if (!verifyPassword(input.password, settings.passwordHash)) fail(401, 'Incorrect password.');
      cookie(req, res, settings);
      return json(res, 200, { ok: true });
    }
    if (!authenticated(req, settings)) fail(401, 'Sign in to the admin panel first.');
    if (path === '/api/admin/logout' && method === 'POST') {
      cookie(req, res, settings, true);
      return json(res, 200, { ok: true });
    }
    if (path === '/api/admin/translate' && method === 'POST') {
      const input = await body(req);
      if (!Array.isArray(input.texts) || input.texts.length < 1 || input.texts.length > 40 || input.texts.some(text => typeof text !== 'string' || !text.trim() || text.length > 3000)) fail(400, 'Invalid translation data.');
      const translations = [];
      for (const text of input.texts) translations.push(await translateWithGoogle(text));
      return json(res, 200, { translations });
    }
    if (path === '/api/admin/trips' && method === 'GET') return json(res, 200, await readCatalog());
    if (path === '/api/admin/trips' && ['POST', 'PUT', 'DELETE'].includes(method)) {
      const input = await body(req);
      const id = method === 'POST' ? `journey-${randomUUID()}` : input.id;
      if (typeof id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(id)) fail(400, 'Invalid journey ID.');
      const trip = method === 'DELETE' ? null : await validateTrip(input.trip);
      const next = await mutateCatalog(input.revision, catalog => {
        if (method !== 'POST' && !Object.hasOwn(catalog, id)) fail(404, 'Journey not found.');
        if (method === 'DELETE') delete catalog[id];
        else catalog[id] = trip;
      });
      return json(res, 200, { ...next, id });
    }
    if (path === '/api/admin/upload' && method === 'POST') {
      const input = await body(req);
      const image = decodeImage(input.image);
      const thumbnail = decodeImage(input.thumbnail, 150000);
      const id = randomUUID();
      const src = await saveImage(image, id);
      const thumb = await saveImage(thumbnail, `${id}-thumb`);
      return json(res, 200, { src, thumbnail: thumb });
    }
    fail(404, 'Page not found.');
  } catch (error) {
    if (!error.status) console.error('API error:', error.name);
    json(res, error.status || 500, { error: error.status ? error.message : 'Unable to complete the request. Try again.' });
  }
}
