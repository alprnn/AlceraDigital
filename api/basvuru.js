import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const SERVICES = ['Meta Reklam', 'Web Sitesi', 'Meta Reklam + Web Sitesi'];
const BUDGETS = ['15-25 bin TL', '25-35 bin TL', '35-50+ bin TL'];
const SLOTS = ['10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00'];

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const reply = (status, data) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request) {
  let b;
  try {
    const text = await request.text();
    if (text.length > 20000) return reply(413, { ok: false, error: 'too_large' });
    b = JSON.parse(text);
  } catch {
    return reply(400, { ok: false, error: 'bad_request' });
  }

  if (b.website) return reply(200, { ok: true }); // bot tuzağı: gizli alan doldurulmuş

  const hizmet = clean(b.hizmet, 40);
  if (!SERVICES.includes(hizmet)) return reply(400, { ok: false, error: 'invalid_service' });
  const meta = hizmet !== 'Web Sitesi';
  const web = hizmet !== 'Meta Reklam';

  const id = randomUUID();
  const item = {
    id,
    tarih: new Date().toISOString(),
    hizmet,
    adSoyad: clean(b.adSoyad, 120),
    telefon: clean(b.telefon, 30),
    isletme: clean(b.isletme, 160),
    sektor: clean(b.sektor, 120),
    saat: clean(b.saat, 20),
    butce: meta ? clean(b.butce, 30) : '',
    proje: web ? clean(b.proje, 3000) : '',
    durum: 'Yeni'
  };

  const missing = !item.adSoyad || !item.isletme || !item.sektor
    || item.telefon.replace(/\D/g, '').length < 10
    || !SLOTS.includes(item.saat)
    || (meta && !BUDGETS.includes(item.butce))
    || (web && !item.proje);
  if (missing) return reply(400, { ok: false, error: 'missing_fields' });

  await put(`basvurular/${Date.now()}-${id}.json`, JSON.stringify(item), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false
  });
  return reply(200, { ok: true });
}
