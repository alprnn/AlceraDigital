/* Başvuru formu */
(() => {
  const form = document.getElementById('apForm');
  const err = document.getElementById('apErr');
  const btn = document.getElementById('apBtn');
  const done = document.getElementById('apDone');
  const opts = document.querySelectorAll('input[name="hizmet"]');
  const btnHTML = btn.innerHTML;

  const select = value => {
    const meta = value !== 'Web Sitesi', web = value !== 'Meta Reklam';
    form.querySelectorAll('[data-only]').forEach(el => {
      const on = el.dataset.only === 'meta' ? meta : web;
      el.hidden = !on;
      el.querySelectorAll('input, textarea').forEach(i => i.disabled = !on);
    });
    err.hidden = true;
  };
  const current = () => (form.querySelector('input[name="hizmet"]:checked') || opts[0]).value;
  opts.forEach(o => o.addEventListener('change', () => select(o.value)));
  select(current());

  const showErr = msg => {
    err.innerHTML = msg + ' Dilerseniz <a href="https://wa.me/905300119472" target="_blank" rel="noopener">WhatsApp\'tan</a> da yazabilirsiniz.';
    err.hidden = false;
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (String(data.telefon || '').replace(/\D/g, '').length < 10) {
      form.telefon.setCustomValidity('Lütfen geçerli bir telefon numarası girin.');
      form.telefon.reportValidity();
      return;
    }
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Gönderiliyor…';
    try {
      const res = await fetch('/api/basvuru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || res.status);
      // Meta Pixel: sunucudaki Lead olayıyla aynı event_id, böylece iki kez sayılmaz
      if (window.fbq && out.id) fbq('track', 'Lead', { content_name: data.hizmet, content_category: data.sektor }, { eventID: out.id });
      form.reset();
      form.hidden = true;
      done.hidden = false;
      done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (x) {
      showErr(x.message === 'missing_fields' ? 'Lütfen tüm alanları eksiksiz doldurun.' : 'Başvurunuz gönderilemedi, lütfen tekrar deneyin.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = btnHTML;
    }
  });
  form.telefon.addEventListener('input', () => form.telefon.setCustomValidity(''));

  /* Görüşme günü: bugünden itibaren 60 gün; bugün seçilirse geçmiş saatler kapanır */
  const gun = document.getElementById('apGun');
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const setRange = () => {
    const now = new Date();
    gun.min = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + (now.getHours() >= 20 ? 1 : 0)));
    gun.max = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60));
  };
  const syncSlots = () => {
    const today = gun.value === ymd(new Date());
    const hour = new Date().getHours();
    const saat = document.getElementById('apSaat');
    [...saat.options].forEach(o => { if (o.value) o.disabled = today && parseInt(o.value, 10) <= hour; });
    if (saat.selectedOptions[0] && saat.selectedOptions[0].disabled) saat.value = '';
  };
  setRange();
  gun.addEventListener('focus', setRange);
  gun.addEventListener('change', syncSlots);
  gun.addEventListener('click', () => { try { gun.showPicker(); } catch {} });
  form.addEventListener('reset', () => setTimeout(() => { syncSlots(); select(current()); }));
})();
