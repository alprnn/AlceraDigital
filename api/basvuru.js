import { put } from '@vercel/blob';
import { randomUUID, createHash } from 'node:crypto';

const SERVICES = ['Meta Reklam', 'Web Sitesi', 'Meta Reklam + Web Sitesi'];
const BUDGETS = ['5-15 bin TL', '15-25 bin TL', '25-35 bin TL', '35-50+ bin TL'];
const SLOTS = ['10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00'];

// Görüşme günü: YYYY-MM-DD, (İstanbul saatiyle) dünden önce ve 62 günden sonra olamaz
const dayOffset = n => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
const validDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s)
  && !isNaN(new Date(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().startsWith(s)
  && s >= dayOffset(-1) && s <= dayOffset(62);

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
    gun: clean(b.gun, 10),
    saat: clean(b.saat, 20),
    butce: meta ? clean(b.butce, 30) : '',
    proje: web ? clean(b.proje, 3000) : '',
    durum: 'Yeni'
  };

  const missing = !item.adSoyad || !item.isletme || !item.sektor
    || item.telefon.replace(/\D/g, '').length < 10
    || !validDay(item.gun)
    || !SLOTS.includes(item.saat)
    || (meta && !BUDGETS.includes(item.butce))
    || (web && !item.proje);
  if (missing) return reply(400, { ok: false, error: 'missing_fields' });

  await put(`basvurular/${Date.now()}-${id}.json`, JSON.stringify(item), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false
  });
  await sendMetaLead(item, request);
  return reply(200, { ok: true, id });
}

/* ---------- Meta Conversions API: başvuru = "Lead" olayı ---------- */

const sha256 = s => createHash('sha256').update(s).digest('hex');

// Türkiye numarasını Meta'nın istediği biçime getir: 05xx... -> 905xx...
function normalizePhone(s) {
  let d = s.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '90' + d.slice(1);
  else if (d.length === 10) d = '90' + d;
  return d;
}

function cookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

// META_PIXEL_ID ve META_ACCESS_TOKEN Vercel'de tanımlı değilse hiçbir şey yapmaz.
// Meta'ya ulaşılamazsa başvuru yine kaydedilmiş olur; hata yalnızca loglanır.
export async function sendMetaLead(item, request) {
  const pixel = process.env.META_PIXEL_ID;
  const token = process.env.META_ACCESS_TOKEN;
  if (!pixel || !token) return;

  const names = item.adSoyad.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean);
  const userData = {
    ph: [sha256(normalizePhone(item.telefon))],
    fn: names.length ? [sha256(names[0])] : undefined,
    ln: names.length > 1 ? [sha256(names[names.length - 1])] : undefined,
    country: [sha256('tr')],
    external_id: [sha256(item.id)],
    client_ip_address: (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || undefined,
    client_user_agent: request.headers.get('user-agent') || undefined,
    fbp: cookie(request, '_fbp'),
    fbc: cookie(request, '_fbc')
  };

  const body = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: item.id,
      action_source: 'website',
      event_source_url: request.headers.get('referer') || 'https://www.alceradigital.com/',
      user_data: userData,
      custom_data: { content_name: item.hizmet, content_category: item.sektor }
    }],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {})
  };

  const version = process.env.META_API_VERSION || 'v23.0';
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) console.error('Meta CAPI hatası', res.status, await res.text());
  } catch (err) {
    console.error('Meta CAPI ulaşılamadı', err.message);
  }
}
