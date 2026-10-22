import { list, get, put, del } from '@vercel/blob';
import { createHash, timingSafeEqual } from 'node:crypto';

const STATUSES = ['Yeni', 'Arandı', 'Anlaşıldı', 'Olumsuz'];
const KEY_RE = /^basvurular\/\d+-[0-9a-f-]{36}\.json$/;

const reply = (status, data) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const sha = s => createHash('sha256').update(String(s)).digest();
const sleep = ms => new Promise(r => setTimeout(r, ms));

function authorized(request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(sha(request.headers.get('x-admin-password') || ''), sha(expected));
}

async function read(pathname) {
  const r = await get(pathname, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

async function all() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: 'basvurular/', cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const items = [];
  for (let i = 0; i < blobs.length; i += 25) {
    const chunk = await Promise.all(blobs.slice(i, i + 25).map(async b => {
      const it = await read(b.pathname);
      return it && { ...it, key: b.pathname };
    }));
    items.push(...chunk.filter(Boolean));
  }
  return items.sort((a, b) => b.tarih.localeCompare(a.tarih));
}

export async function POST(request) {
  if (!authorized(request)) {
    await sleep(800); // kaba kuvvet denemelerini yavaşlat
    return reply(401, { ok: false, error: 'unauthorized' });
  }

  let b;
  try {
    b = await request.json();
  } catch {
    return reply(400, { ok: false, error: 'bad_request' });
  }

  if (b.action === 'login') return reply(200, { ok: true });
  if (b.action === 'list') return reply(200, { ok: true, items: await all() });

  if (!KEY_RE.test(b.key || '')) return reply(400, { ok: false, error: 'invalid_key' });

  if (b.action === 'status') {
    if (!STATUSES.includes(b.status)) return reply(400, { ok: false, error: 'invalid_status' });
    const item = await read(b.key);
    if (!item) return reply(404, { ok: false, error: 'not_found' });
    item.durum = b.status;
    await put(b.key, JSON.stringify(item), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    });
    return reply(200, { ok: true });
  }

  if (b.action === 'delete') {
    await del(b.key);
    return reply(200, { ok: true });
  }

  return reply(400, { ok: false, error: 'unknown_action' });
}
