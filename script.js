let trips = {};

const home = document.querySelector('#home-view');
const detail = document.querySelector('#trip-view');
const booking = document.querySelector('#trip-booking');
const floatingBooking = document.querySelector('.wa');
const adminReturn = document.querySelector('[data-admin-return]');
const contactUrl = 'https://wa.me/201126409162';
function video(src) { const node = document.createElement('video'); node.src = encodeURI(src); node.muted = true; node.loop = true; node.autoplay = true; node.playsInline = true; return node; }
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const translations = {
  en: { nav: ['Journeys', 'Our story', 'Gallery', 'Contact'], heroKicker: 'SPIRITUAL JOURNEYS     MINDFUL EXPERIENCES     EGYPT', heroTitle: 'Reconnect<br>with your soul<br>in Egypt.', heroText: 'Meaningful journeys through nature, stillness and the living soul of Egypt.', explore: 'Explore our journeys', storyTitle: 'Egypt beyond<br>the ordinary.', storyText: 'Sun & Soul Egypt spiritual tours invite you to reconnect with your soul and reveal the metaphysical spirit of Egypt. Our 2026/2027 meditation tours are designed to awaken the full potential of your mind and fill your heart with a sense of divinity. The ancient Egyptians saw their land as a sacred reflection of heaven on earth and the Nile as an earthly mirror of the Milky Way. We are called to sail upon this celestial river, align with the Divine Mother energy, awaken our inner power and experience the higher consciousness of this ancient land. By connecting with the seven chakras of the Nile, we activate the higher chakras within a transformative 10-day spiritual journey through Egypt.', journeyKicker: 'A SLOWER WAY TO TRAVEL', journeyTitle: 'Choose your journey.', exploreCard: 'Explore journey', back: 'Back to journeys', lang: 'العربية', pause: 'Pause.<br>Breathe.<br>Be present.', nature: 'The wisdom of nature.', gallery: 'Scenes to return to.', why: 'Travel inward, too.', cta: 'Your journey<br>begins here.', contact: 'Contact us', book: 'Book this journey' },
  ar: { nav: ['الرحلات', 'قصتنا', 'المعرض', 'تواصل معنا'], heroKicker: 'رحلات روحية     تجارب واعية     مصر', heroTitle: 'أعد الاتصال<br>بروحك<br>في مصر.', heroText: 'رحلات ذات معنى وسط الطبيعة والسكينة وروح مصر الحية.', explore: 'اكتشف رحلاتنا', storyTitle: 'مصر تتجاوز<br>المعتاد.', storyText: 'تصمم Sun & Soul Egypt رحلات ذات معنى للمسافرين الذين يرغبون في اكتشاف مصر بعيداً عن السياحة التقليدية، من خلال الطبيعة والتأمل والثقافة واللحظات المحلية الأصيلة.', journeyKicker: 'طريقة أبطأ للسفر', journeyTitle: 'اختر رحلتك.', exploreCard: 'اكتشف الرحلة', back: 'العودة إلى الرحلات', lang: 'English', pause: 'توقّف.<br>تنفّس.<br>عِش اللحظة.', nature: 'حكمة الطبيعة.', gallery: 'مشاهد تستحق العودة إليها.', why: 'سافر إلى داخلك أيضاً.', cta: 'رحلتك<br>تبدأ من هنا.', contact: 'تواصل معنا', book: 'احجز هذه الرحلة' }
};

function renderCards(lang) {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  document.querySelector('.cards').innerHTML = Object.entries(trips).map(([key, trip]) => {
    const copy = trip[lang];
    const cover = trip.coverType === 'video'
      ? `<video src="${escape(encodeURI(trip.cover))}" autoplay muted loop playsinline aria-label="${escape(copy.name)}"></video>`
      : `<img src="${escape(encodeURI(trip.cover))}" alt="${escape(copy.name)}" loading="lazy" decoding="async">`;
    return `<a class="journey-card" href="#trip/${key}"><article>
      <div class="photo">${cover}</div>
      <h3>${escape(copy.name)}</h3><label>${escape(copy.location)} · ${escape(copy.price)}</label><p>${escape(copy.description)}</p>
      <span class="explore-label">${translations[lang].exploreCard} <span aria-hidden="true">${lang === 'ar' ? '←' : '→'}</span></span>
    </article></a>`;
  }).join('');
}

function applyLanguage(lang) {
  lang = lang === 'ar' ? 'ar' : 'en';
  const t = translations[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('#site-menu a').forEach((el, i) => { el.textContent = t.nav[i]; });
  document.querySelector('.hero small').textContent = t.heroKicker;
  document.querySelector('.hero h1').innerHTML = t.heroTitle;
  document.querySelector('.hero p').textContent = t.heroText;
  document.querySelector('.hero .btn').textContent = t.explore;
  document.querySelector('.intro h2').innerHTML = t.storyTitle;
  document.querySelector('.intro p').textContent = t.storyText;
  document.querySelector('.journeys > small').textContent = t.journeyKicker;
  document.querySelector('.journeys > h2').textContent = t.journeyTitle;
  document.querySelectorAll('.explore-label').forEach(el => { el.childNodes[0].textContent = `${t.exploreCard} `; });
  document.querySelector('.back-link').innerHTML = `<span aria-hidden="true">${lang === 'ar' ? '→' : '←'}</span> ${t.back}`;
  document.querySelector('.med h2').innerHTML = t.pause;
  document.querySelector('.nature h2').textContent = t.nature;
  document.querySelector('.gallery h2').textContent = t.gallery;
  document.querySelector('.why h2').textContent = t.why;
  document.querySelector('.cta h2').innerHTML = t.cta;
  document.querySelector('.footer-contact h3').textContent = t.contact;
  document.querySelector('#trip-booking').textContent = t.book;
  document.querySelector('.med p').textContent = lang === 'ar' ? '\u062e\u0630 \u0644\u062d\u0638\u0629 \u0644\u0644\u062a\u0628\u0627\u0637\u0624 \u0648\u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0637\u0628\u064a\u0639\u0629 \u0648\u0627\u062e\u062a\u0628\u0627\u0631 \u0645\u0635\u0631 \u0639\u0644\u0649 \u0625\u064a\u0642\u0627\u0639\u0643 \u0627\u0644\u062e\u0627\u0635.' : 'Take a moment to slow down, reconnect with nature and experience Egypt at your own pace.';
  document.querySelector('.nature p').textContent = lang === 'ar' ? '\u0642\u062f \u062a\u0635\u0628\u062d \u0627\u0644\u062a\u062c\u0627\u0631\u0628 \u0627\u0644\u0639\u0634\u0628\u064a\u0629 \u0648\u0637\u0642\u0648\u0633 \u0627\u0644\u0639\u0627\u0641\u064a\u0629 \u0627\u0644\u0637\u0628\u064a\u0639\u064a\u0629 \u062c\u0632\u0621\u0627\u064b \u0645\u0646 \u0631\u062d\u0644\u062a\u0643.' : 'Traditional herbal experiences and natural wellness rituals may become part of your journey - grounded in local knowledge and the landscapes of Egypt.';
  renderCards(lang);
  document.querySelector('[data-lang-toggle]').textContent = t.lang;
  localStorage.setItem('sun-soul-lang', lang);
  supplementalCopy.forEach(([selector, arabic, english]) => {
    document.querySelectorAll(selector).forEach(el => { el.textContent = lang === 'ar' ? arabic : english; });
  });
  document.querySelector('#social-status').textContent = '';
  if (adminReturn && !adminReturn.hidden) adminReturn.textContent = lang === 'ar' ? 'العودة للوحة الإدارة ↩' : 'Back to admin ↩';
}

const supplementalCopy = [
  ['.med small', 'لحظة لك', 'A MOMENT FOR YOU'],
  ['.nature small', 'الطبيعة دليلك', 'NATURE AS A GUIDE'],
  ['.gallery small', 'لمحة من مصر', 'A GLIMPSE OF EGYPT'],
  ['.why small', 'طريقتنا في السفر', 'THE SUN & SOUL WAY'],
  ['.cta small', 'عندما تكون مستعداً', 'WHEN YOU ARE READY'],
  ['.cta p', 'اكتشف جانباً مختلفاً من مصر مع Sun & Soul Egypt.', 'Discover a different side of Egypt with Sun & Soul Egypt.'],
  ['.cta .btn', 'تواصل معنا', 'Contact us'],
  ['.footer-brand p', 'رحلات ذات معنى عبر روح مصر الحية.', 'Meaningful journeys through the living soul of Egypt.'],
  ['.wa', 'احجز عبر واتساب', 'Book on WhatsApp'],
  ['.menu-toggle b', 'القائمة', 'Menu'],
  ['.whygrid div:nth-child(1) h3', 'تجارب أصيلة', 'Authentic experiences'],
  ['.whygrid div:nth-child(1) p', 'اكتشف مصر بعيداً عن السياحة المعتادة.', 'Experience Egypt beyond ordinary tourism.'],
  ['.whygrid div:nth-child(2) h3', 'الطبيعة والعافية', 'Nature & wellness'],
  ['.whygrid div:nth-child(2) p', 'تمهّل واستعد تواصلك مع الطبيعة.', 'Slow down and reconnect with nature.'],
  ['.whygrid div:nth-child(3) h3', 'رحلات شخصية', 'Personal journeys'],
  ['.whygrid div:nth-child(3) p', 'تجارب ذات معنى مصممة حول المسافر.', 'Meaningful experiences shaped around the traveler.'],
  ['.whygrid div:nth-child(4) h3', 'تواصل محلي', 'Local connection'],
  ['.whygrid div:nth-child(4) p', 'تعرّف على مصر من خلال لحظات محلية أصيلة.', 'Meet Egypt through authentic local moments.']
];

function renderRoute() {
  const key = location.hash.startsWith('#trip/') ? location.hash.slice(6) : '';
  const trip = Object.hasOwn(trips, key) ? trips[key] : null;
  home.hidden = Boolean(trip);
  detail.hidden = !trip;
  document.body.classList.toggle('showing-trip', Boolean(trip));
  document.title = trip ? `${trip.name} | Sun & Soul Egypt` : 'Sun & Soul Egypt';
  floatingBooking.href = contactUrl;

  if (trip) {
    const lang = document.documentElement.lang;
    const copy = trip[lang];
    document.querySelector('#trip-title').textContent = copy.name;
    document.title = `${copy.name} | Sun & Soul Egypt`;
    document.querySelector('#trip-location').textContent = copy.location;
    document.querySelector('#trip-description').textContent = copy.description;
    document.querySelector('#trip-price').textContent = copy.price;
    document.querySelector('.trip-page h2').textContent = lang === 'ar' ? 'تفاصيل الرحلة' : 'Journey details';
    document.querySelector('#trip-details').replaceChildren(...copy.details.map(text => {
      const item = document.createElement('li'); item.textContent = text; return item;
    }));
    const oldCover = document.querySelector('.trip-cover');
    const cover = trip.coverType === 'video' ? document.createElement('video') : document.createElement('img');
    cover.className = 'trip-cover';
    if (trip.coverType === 'video') { cover.autoplay = true; cover.muted = true; cover.loop = true; cover.playsInline = true; cover.setAttribute('aria-label', copy.name); }
    else cover.alt = copy.name;
    cover.src = encodeURI(trip.cover);
    oldCover.replaceWith(cover);
    const gallery = document.querySelector('#trip-gallery');
    const media = [...(trip.photos || []).map(src => ({ src, type: 'image' })), ...(trip.videos || []).map(src => ({ src, type: 'video' }))];
    gallery.hidden = media.length === 0;
    let mainImage = gallery.querySelector('.gallery-main');
    const thumbs = gallery.querySelector('.gallery-thumbs');
    let currentPhoto = 0;
    let photoRequest = 0;
    const preloadPhoto = (index) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = encodeURI(media[(index + media.length) % media.length].src);
    };
    const showPhoto = (index) => {
      currentPhoto = (index + media.length) % media.length;
      const photoIndex = currentPhoto;
      const item = media[photoIndex];
      const src = item.src;
      const request = ++photoRequest;
      const replacement = item.type === 'video' ? document.createElement('video') : document.createElement('img');
      replacement.className = 'gallery-main';
      replacement.src = encodeURI(src);
      if (item.type === 'video') { replacement.autoplay = true; replacement.muted = true; replacement.loop = true; replacement.playsInline = true; replacement.setAttribute('aria-label', `${copy.name} — ${photoIndex + 1}`); }
      else { replacement.alt = `${copy.name} — ${photoIndex + 1}`; replacement.loading = 'eager'; replacement.decoding = 'async'; replacement.fetchPriority = 'high'; }
      mainImage.replaceWith(replacement);
      mainImage = replacement;
      mainImage.onload = mainImage.onloadeddata = () => { if (request !== photoRequest) return; mainImage.classList.add('is-loaded'); preloadPhoto(currentPhoto + 1); };
      gallery.querySelector('.gallery-count').textContent = `${currentPhoto + 1} / ${media.length}`;
      thumbs.querySelectorAll('button').forEach((button, i) => button.classList.toggle('active', i === currentPhoto));
    };
    thumbs.replaceChildren(...media.map(({ src, type }, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', `View photo ${index + 1}`);
      const thumbnailSrc = trip.thumbnails?.[src] || (src.startsWith('images/') ? src.replace(/\.webp$/i, '-thumb.webp') : src);
      const img = type === 'video' ? video(src) : document.createElement('img'); img.src = encodeURI(type === 'video' ? src : thumbnailSrc); img.alt = ''; img.loading = 'eager'; img.decoding = 'async'; img.fetchPriority = 'low'; button.append(img);
      if (type === 'image') img.onerror = () => { img.onerror = null; img.src = encodeURI(src); };
      button.addEventListener('click', () => showPhoto(index)); return button;
    }));
    gallery.querySelector('.gallery-prev').onclick = () => showPhoto(currentPhoto - 1);
    gallery.querySelector('.gallery-next').onclick = () => showPhoto(currentPhoto + 1);
    if (media.length) showPhoto(0);
    const message = lang === 'ar' ? `مرحبًا، أود حجز رحلة ${copy.name}. أرجو إرسال المواعيد المتاحة.` : `Hello, I would like to book ${copy.name}. Please send me the available dates.`;
    booking.href = `${contactUrl}?text=${encodeURIComponent(message)}`;
    floatingBooking.href = booking.href;
    window.scrollTo(0, 0);
    document.querySelector('#trip-title').focus({ preventScroll: true });
  } else if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  } else {
    window.scrollTo(0, 0);
  }
}

document.querySelectorAll('[data-social-placeholder]').forEach(button => {
  button.addEventListener('click', () => {
    const socialName = button.getAttribute('aria-label') || 'Social media';
    document.querySelector('#social-status').textContent = document.documentElement.lang === 'ar' ? `رابط ${socialName} قريباً. تواصل معنا عبر واتساب حالياً.` : `${socialName} link coming soon. Contact us on WhatsApp for now.`;
  });
});

document.querySelector('[data-lang-toggle]').addEventListener('click', () => {
  applyLanguage(document.documentElement.lang === 'ar' ? 'en' : 'ar');
  renderRoute();
});

document.querySelector('.menu-toggle').addEventListener('click', (event) => {
  const open = document.body.classList.toggle('menu-open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('#site-menu a').forEach(link => link.addEventListener('click', () => document.body.classList.remove('menu-open')));

window.addEventListener('hashchange', renderRoute);
applyLanguage(localStorage.getItem('sun-soul-lang') || 'en');
async function loadTrips() {
  const status = document.querySelector('#journeys-status');
  status.hidden = false;
  status.textContent = document.documentElement.lang === 'ar' ? 'جارٍ تحميل الرحلات…' : 'Loading journeys…';
  try {
    let response = await fetch('/api/trips', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    let catalog;
    if (response.status === 404) {
      response = await fetch('data/trips.json', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      catalog = await response.json();
    } else {
      if (!response.ok) throw new Error();
      catalog = (await response.json()).trips;
    }
    trips = catalog;
    renderCards(document.documentElement.lang);
    status.hidden = Object.keys(trips).length > 0;
    status.textContent = document.documentElement.lang === 'ar' ? 'رحلات جديدة قريبًا.' : 'New journeys coming soon.';
    renderRoute();
  } catch {
    status.textContent = document.documentElement.lang === 'ar' ? 'تعذر تحميل الرحلات. ' : 'Unable to load journeys. ';
    const retry = document.createElement('button');
    retry.type = 'button'; retry.textContent = document.documentElement.lang === 'ar' ? 'حاول مرة أخرى' : 'Try again';
    retry.addEventListener('click', loadTrips);
    status.append(retry);
  }
}
loadTrips();
async function revealAdminReturn() {
  if (!adminReturn) return;
  try {
    const response = await fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) return;
    const session = await response.json();
    if (session.authenticated) {
      adminReturn.hidden = false;
      adminReturn.textContent = document.documentElement.lang === 'ar' ? 'العودة للوحة الإدارة ↩' : 'Back to admin ↩';
    }
  } catch { /* The public site stays unchanged for visitors and static previews. */ }
}
revealAdminReturn();
if (!location.hash && !location.hash.startsWith('#trip/')) {
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
}

const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
  });
}, { threshold: 0.12 }) : null;
document.querySelectorAll('section, footer').forEach(element => revealObserver ? revealObserver.observe(element) : element.classList.add('is-visible'));
