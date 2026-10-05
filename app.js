const SUPABASE_SETTINGS = window.SUPABASE_SETTINGS ?? { url: '', anonKey: '' };
const venueName = 'قاعة لورينا';
const venueAddress = 'نادي ضباط القوات المسلحة، البيطاش، العجمي، الإسكندرية، مصر';
const mapQuery = `${venueName}، ${venueAddress}`;
const WEDDING = Object.freeze({
  couple: 'عبدالرحمن ومريم',
  eventName: 'حفل زفاف عبدالرحمن ومريم',
  venue: venueName,
  address: venueAddress,
  dateIso: '2026-11-14T20:00:00+02:00',
  dateLabel: '14 نوفمبر 2026',
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`,
  mapEmbedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`,
  inviteText: `فرحتنا تحلى بوجودكم — عبدالرحمن ومريم، 14 نوفمبر 2026 الساعة 8 مساءً، ${mapQuery}.`
});

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
let toastTimer;

function notify(message) {
  const toast = $('[data-toast]');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

function updateCountdown() {
  const eventTime = new Date(WEDDING.dateIso).getTime();
  const remaining = Math.max(0, eventTime - Date.now());
  const units = {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000)
  };
  Object.entries(units).forEach(([name, value]) => {
    const element = $(`[data-unit="${name}"]`);
    if (element) element.textContent = String(value).padStart(2, '0');
  });
  const note = $('[data-countdown-note]');
  if (note && remaining === 0) note.textContent = 'فرحتنا بدأت — أهلًا بكم';
}

function renderCalendar() {
  const calendar = $('[data-calendar]');
  if (!calendar) return;
  const year = 2026;
  const month = 10; // November, zero-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDaySundayBased = new Date(year, month, 1).getDay();
  const offsetFromSaturday = (firstDaySundayBased + 1) % 7;
  const previousMonthDays = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((offsetFromSaturday + daysInMonth) / 7) * 7;

  for (let index = 0; index < totalCells; index += 1) {
    if (index < offsetFromSaturday) {
      const day = previousMonthDays - offsetFromSaturday + index + 1;
      const empty = document.createElement('span');
      empty.className = 'calendar-empty';
      empty.setAttribute('aria-hidden', 'true');
      empty.textContent = day;
      calendar.append(empty);
      continue;
    }

    const day = index - offsetFromSaturday + 1;
    if (day > daysInMonth) {
      const empty = document.createElement('span');
      empty.className = 'calendar-empty';
      empty.setAttribute('aria-hidden', 'true');
      empty.textContent = day - daysInMonth;
      calendar.append(empty);
      continue;
    }

    const cell = document.createElement('span');
    cell.className = `calendar-day${day === 14 ? ' event-day-cell' : ''}`;
    cell.setAttribute('role', 'gridcell');
    cell.textContent = day;
    if (day === 14) {
      cell.setAttribute('aria-label', 'السبت 14 نوفمبر 2026 — موعد الزفاف');
    }
    calendar.append(cell);
  }
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    notify(successMessage);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    notify(copied ? successMessage : 'تعذر النسخ تلقائيًا؛ يمكنكم نسخ الرابط يدويًا.');
    return copied;
  }
}

function downloadCalendar() {
  const start = new Date(WEDDING.dateIso);
  const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escapeIcs = (value) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Invitation//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:wedding-20261114-${Date.now()}@invitation`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `SUMMARY:${escapeIcs(WEDDING.eventName)}`,
    `LOCATION:${escapeIcs(`${WEDDING.venue}، ${WEDDING.address}`)}`, `DESCRIPTION:${escapeIcs('الساعة 8 مساءً. ' + WEDDING.mapUrl)}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'wedding-abdelrahman-mariam.ics';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  notify('تم تنزيل ملف الموعد لإضافته إلى التقويم.');
}

function getWish() {
  const name = $('[name="guestName"]')?.value.trim() ?? '';
  const message = $('[name="guestMessage"]')?.value.trim() ?? '';
  if (name.length < 2 || message.length < 4) return null;
  return { name, message, createdAt: new Date().toISOString() };
}

function makeGreeting({ name, message }) {
  return `تهنئة إلى عبدالرحمن ومريم\nمن: ${name}\n${message}\n\n${WEDDING.inviteText}`;
}

function initShareLinks() {
  const url = window.location.href.split('#')[0];
  const text = encodeURIComponent(WEDDING.inviteText);
  const encodedUrl = encodeURIComponent(url);
  const links = {
    whatsapp: `https://wa.me/?text=${text}%20${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${text}`
  };
  $$('[data-share]').forEach((link) => {
    const target = links[link.dataset.share];
    if (target) {
      link.href = target;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  });
}

function initReveal() {
  const items = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.13 });
  items.forEach((item) => observer.observe(item));
}

function formatWishDate(value) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
  } catch { return ''; }
}
function renderPublicWishes(wishes) {
  const list = $('[data-wishes-list]');
  const loading = $('[data-wishes-loading]');
  if (!list || !loading) return;
  loading.hidden = true;
  list.replaceChildren();
  if (!wishes.length) {
    loading.hidden = false;
    loading.textContent = 'كونوا أول من يترك تهنئة للعروسين.';
    return;
  }
  wishes.forEach(({ name, message, created_at: createdAt }) => {
    const card = document.createElement('article');
    card.className = 'wish-card';
    const head = document.createElement('div');
    head.className = 'wish-card-head';
    const nameElement = document.createElement('strong');
    nameElement.className = 'wish-card-name';
    nameElement.textContent = name;
    const date = document.createElement('time');
    date.className = 'wish-card-date';
    date.dateTime = createdAt || '';
    date.textContent = formatWishDate(createdAt);
    head.append(nameElement, date);
    const messageElement = document.createElement('p');
    messageElement.className = 'wish-card-message';
    messageElement.textContent = message;
    card.append(head, messageElement);
    list.append(card);
  });
}
async function initWishes() {
  const form = $('[data-wish-form]');
  const list = $('[data-wishes-list]');
  const loading = $('[data-wishes-loading]');
  if (!form || !list || !loading) return;
  const configured = SUPABASE_SETTINGS.url && SUPABASE_SETTINGS.anonKey && window.supabase?.createClient;
  if (!configured) {
    loading.textContent = 'سيتم عرض التهاني هنا بعد ربط المشروع ببيانات Supabase.';
    return;
  }
  const client = window.supabase.createClient(SUPABASE_SETTINGS.url, SUPABASE_SETTINGS.anonKey);
  const loadWishes = async () => {
    const { data, error } = await client.from('wedding_wishes').select('name, message, created_at').order('created_at', { ascending: false }).limit(50);
    if (error) {
      loading.textContent = 'تعذر تحميل التهاني حاليًا.';
      return;
    }
    renderPublicWishes(data ?? []);
  };
  await loadWishes();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const wish = getWish();
    if (!wish) return;
    const feedback = $('[data-wish-feedback]');
    const submit = $('button[type="submit"]', form);
    submit.disabled = true;
    feedback.textContent = 'جارٍ نشر التهنئة...';
    const { error } = await client.from('wedding_wishes').insert({ name: wish.name, message: wish.message });
    submit.disabled = false;
    if (error) {
      feedback.textContent = 'تعذر نشر التهنئة حاليًا؛ حاولوا مرة أخرى.';
      return;
    }
    form.reset();
    feedback.textContent = 'تم نشر تهنئتكم، شكرًا لمشاركتكم فرحتنا.';
    await loadWishes();
  });
}
function initActions() {
  const mapLink = $('[data-map-link]');
  if (mapLink) mapLink.href = WEDDING.mapUrl;
  const mapFrame = $('[data-map-frame]');
  if (mapFrame) mapFrame.src = WEDDING.mapEmbedUrl;
  $('[data-action="add-calendar"]')?.addEventListener('click', downloadCalendar);
  $('[data-action="copy-location"]')?.addEventListener('click', () => copyText(WEDDING.mapUrl, 'تم نسخ رابط عنوان القاعة على الخرائط.'));
  $('[data-action="share-location"]')?.addEventListener('click', async () => {
    const shareData = { title: WEDDING.venue, text: `${WEDDING.venue}، ${WEDDING.address}`, url: WEDDING.mapUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await copyText(WEDDING.mapUrl, 'تم نسخ رابط الموقع لمشاركته.');
    } catch (error) {
      if (error?.name !== 'AbortError') await copyText(WEDDING.mapUrl, 'تم نسخ رابط الموقع لمشاركته.');
    }
  });
  $('[data-action="copy-invite-link"]')?.addEventListener('click', () => {
    copyText(window.location.href.split('#')[0], 'تم نسخ رابط الدعوة لمشاركته.');
  });
  $('[data-action="share"]')?.addEventListener('click', async () => {
    const shareData = { title: WEDDING.eventName, text: WEDDING.inviteText, url: window.location.href.split('#')[0] };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await copyText(shareData.url, 'تم نسخ رابط الدعوة.');
    } catch (error) {
      if (error?.name !== 'AbortError') await copyText(shareData.url, 'تم نسخ رابط الدعوة.');
    }
  });
}

function updateMusicButton(isPlaying) {
  const button = $('[data-music-control]');
  const label = $('[data-music-label]');
  if (button) button.setAttribute('aria-pressed', String(isPlaying));
  if (button) button.setAttribute('aria-label', isPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى');
  if (label) label.textContent = isPlaying ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى';
}

function startBackgroundMusic() {
  const audio = $('[data-background-audio]');
  if (!audio) return;
  audio.volume = 0.18;
  const playAttempt = audio.play();
  if (playAttempt && typeof playAttempt.then === 'function') {
    playAttempt.then(() => updateMusicButton(true)).catch(() => {
      updateMusicButton(false);
      const note = $('[data-gate-note]');
      if (note) note.textContent = 'يمكنكم تشغيل الموسيقى من الزر بعد فتح الدعوة';
    });
  }
}

function initMusic() {
  const audio = $('[data-background-audio]');
  const button = $('[data-action="music-toggle"]');
  if (!audio || !button) return;
  audio.addEventListener('play', () => updateMusicButton(true));
  audio.addEventListener('pause', () => updateMusicButton(false));
  button.addEventListener('click', () => {
    if (audio.paused) startBackgroundMusic();
    else audio.pause();
  });
}

function initEnvelope() {
  const gate = $('[data-gate]');
  const opener = $('[data-open-invite]');
  const details = $('[data-details-page]');
  if (!gate || !opener || !details) return;

  opener.addEventListener('click', () => {
    if (opener.disabled) return;
    opener.disabled = true;
    opener.classList.add('is-opening');
    opener.setAttribute('aria-expanded', 'true');
    opener.setAttribute('aria-busy', 'true');
    const label = $('[data-open-label]', opener);
    if (label) label.textContent = 'فتح';

    startBackgroundMusic();

    window.setTimeout(() => {
      gate.classList.add('names-revealed');
      $('[data-gate-names]')?.setAttribute('aria-hidden', 'false');
      const note = $('[data-gate-note]');
      if (note) note.textContent = 'عبدالرحمن & مريم — ننتظركم بكل الحب';
    }, 900);

    window.setTimeout(() => {
      gate.classList.add('is-leaving');
      details.hidden = false;
      details.classList.add('page-entering');
      requestAnimationFrame(() => {
        details.classList.add('page-visible');
        window.setTimeout(() => {
          gate.hidden = true;
          details.classList.remove('page-entering', 'page-visible');
          opener.setAttribute('aria-busy', 'false');
          window.scrollTo(0, 0);
          const musicButton = $('[data-music-control]');
          if (musicButton) musicButton.hidden = false;
        }, 800);
      });
    }, 2500);
  });
}

renderCalendar();
updateCountdown();
window.setInterval(updateCountdown, 1000);
initEnvelope();
initMusic();
initShareLinks();
initReveal();
initWishes();
initActions();
