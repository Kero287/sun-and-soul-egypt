const $ = selector => document.querySelector(selector);
const state = { trips: {}, revision: 0, id: null, cover: '', coverType: 'image', photos: [], videos: [], thumbnails: {}, dirty: false, busy: false, loaded: false };
let noticeTimeout;

function notify(message, error = false) {
  clearTimeout(noticeTimeout); $('#notice').textContent = message;
  $('#notice').classList.toggle('error', error); $('#notice').hidden = false;
  noticeTimeout = setTimeout(() => { $('#notice').hidden = true; }, error ? 8000 : 4500);
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch('/api/' + path, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(30000) });
  } catch { throw new Error('Unable to connect to the website. Check your connection and try again.'); }
  const result = await response.json().catch(() => ({ error: 'Unable to complete the request. Start the site with npm start.' }));
  if (!response.ok) {
    if (response.status === 401 && !path.endsWith('/login')) { $('#dashboard').hidden = true; $('#login-view').hidden = false; $('#login-error').textContent = 'Your session expired. Sign in again.'; }
    const error = new Error(result.error || 'Unable to complete the request.'); error.status = response.status; throw error;
  }
  return result;
}
function element(tag, className, value) { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; }
function image(src, alt = '') { const node = element('img'); node.src = encodeURI(src); node.alt = alt; node.loading = 'lazy'; node.decoding = 'async'; return node; }
function video(src, className = '') { const node = document.createElement('video'); node.className = className; node.src = encodeURI(src); node.muted = true; node.loop = true; node.autoplay = true; node.playsInline = true; node.setAttribute('aria-label', 'Journey video'); return node; }
function mediaNode(src, type, alt = '') { return type === 'video' ? video(src) : image(src, alt); }
function mediaType(src, fallback = 'image') { return /\.(mp4|webm)(?:[?#].*)?$/i.test(src || '') ? 'video' : fallback; }
function button(label, className, action, ariaLabel) { const node = element('button', className, label); node.type = 'button'; if (ariaLabel) node.setAttribute('aria-label', ariaLabel); node.addEventListener('click', action); return node; }
function markDirty() { state.dirty = true; $('#save-state').textContent = 'Unsaved changes'; }
function setBusy(value) { state.busy = value; document.querySelectorAll('#editor-view button, #editor-view input[type=file]').forEach(node => { node.disabled = value; }); $('#save-trip').textContent = value ? 'Working…' : 'Save journey'; if (!value) renderPhotos(); }
function ask(title, text, action = 'Confirm') { $('#confirm-title').textContent = title; $('#confirm-text').textContent = text; $('#confirm-action').textContent = action; const dialog = $('#confirm-dialog'); dialog.returnValue = 'cancel'; dialog.showModal(); return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true })); }
async function canLeave() { if (state.busy) { notify('Wait for the upload or save to finish.'); return false; } return !state.dirty || await ask('Leave without saving?', 'Your changes will not appear until you save.', 'Leave without saving'); }

function renderList() {
  const all = Object.entries(state.trips), published = all.filter(([, trip]) => trip.published !== false).length;
  $('#total-count').textContent = all.length; $('#sidebar-count').textContent = all.length; $('#published-count').textContent = published; $('#draft-count').textContent = all.length - published;
  const query = $('#search').value.trim().toLocaleLowerCase(), filter = $('#filter').value;
  const visible = all.filter(([, trip]) => {
    const en = trip.en || {}, ar = trip.ar || en;
    const match = [en.name, ar.name, en.location, ar.location].filter(Boolean).some(value => value.toLocaleLowerCase().includes(query));
    return match && (filter === 'all' || (filter === 'published' ? trip.published !== false : trip.published === false));
  });
  $('#list-status').textContent = visible.length + ' journey' + (visible.length === 1 ? '' : 's') + (query ? ' matching your search' : '');
  const cards = visible.map(([id, trip]) => {
    const en = trip.en || {}, ar = trip.ar || en, card = element('article', 'trip-card'), photo = element('div', 'trip-card-photo');
    photo.append(mediaNode(trip.cover, mediaType(trip.cover, trip.coverType), en.name || 'Journey'), element('span', 'badge' + (trip.published === false ? ' draft' : ''), trip.published === false ? 'Draft' : 'Published'));
    const content = element('div', 'trip-card-content'); content.append(element('h3', '', en.name), element('div', 'trip-card-meta', en.location + ' · ' + en.price), element('p', '', en.description));
    const actions = element('div', 'trip-card-actions'); actions.append(button('Edit journey ↗', '', () => openEditor(id), 'Edit ' + en.name));
    if (trip.published !== false) { const link = element('a', '', 'Preview'); link.href = '/#trip/' + id; link.target = '_blank'; link.rel = 'noopener'; actions.append(link); }
    actions.append(button('Delete', 'delete', () => deleteTrip(id), 'Delete ' + en.name)); card.append(photo, content, actions); return card;
  });
  $('#trip-list').replaceChildren(...(cards.length ? cards : [element('div', 'empty-list', all.length ? 'No journeys match your search.' : 'No journeys yet. Click “Add journey” to begin.')]));
}
async function loadCatalog() {
  $('#refresh').disabled = true; $('#add-trip').disabled = true; $('#list-status').textContent = 'Loading journeys…';
  try { const result = await api('admin/trips'); state.trips = result.trips; state.revision = result.revision; state.loaded = true; renderList(); }
  catch (error) { $('#list-status').textContent = error.message; notify(error.message, true); }
  finally { $('#refresh').disabled = false; $('#add-trip').disabled = !state.loaded; }
}
async function enterDashboard() { $('#login-view').hidden = true; $('#dashboard').hidden = false; $('#password').value = ''; await loadCatalog(); }
function showList() { state.dirty = false; $('#editor-view').hidden = true; $('#list-view').hidden = false; renderList(); window.scrollTo(0, 0); }
function openEditor(id = null) {
  state.id = id; state.dirty = false; const trip = id ? state.trips[id] : null; $('#trip-form').reset();
  state.cover = trip?.cover || ''; state.coverType = mediaType(state.cover, trip?.coverType || 'image'); state.photos = [...(trip?.photos || [])]; state.videos = [...(trip?.videos || [])]; state.thumbnails = { ...(trip?.thumbnails || {}) };
  const english = { ...(trip || {}), ...(trip?.en || {}) };
  for (const field of ['name', 'location', 'price', 'description', 'details']) { const value = english[field] || ''; $('[name="en-' + field + '"]').value = field === 'details' && Array.isArray(value) ? value.join('\n') : value; }
  $('#published').checked = trip?.published !== false; $('#editor-title').textContent = trip ? 'Edit journey' : 'Add a new journey'; $('#save-state').textContent = trip ? 'All changes saved' : 'No changes saved';
  $('#editor-error').textContent = ''; $('#upload-status').textContent = ''; renderMedia(); updatePreview(); $('#list-view').hidden = true; $('#editor-view').hidden = false; window.scrollTo(0, 0);
}
function renderMedia() { $('#cover-preview').replaceChildren(state.cover ? mediaNode(state.cover, state.coverType, 'Journey cover') : element('span', '', 'Choose the first journey media')); renderPhotos(); updatePreview(); }
function renderPhotos() {
  const items = [...state.photos.map(src => ({ src, type: 'image' })), ...state.videos.map(src => ({ src, type: 'video' }))];
  $('#photo-count').textContent = items.length + ' / 30';
  $('#photo-grid').replaceChildren(...items.map(({ src, type }, index) => {
    const card = element('div', 'photo-item'); card.append(type === 'video' ? video(src) : image(state.thumbnails[src] || src, 'Journey photo ' + (index + 1)));
    const controls = element('div', 'photo-controls');
    const cover = button(src === state.cover ? '✓ Cover' : 'Set as cover', '', () => { state.cover = src; state.coverType = type; markDirty(); renderMedia(); }, 'Set media ' + (index + 1) + ' as cover');
    const remove = button('×', 'remove-photo', () => { const list = type === 'video' ? state.videos : state.photos; list.splice(list.indexOf(src), 1); delete state.thumbnails[src]; if (src === state.cover) { state.cover = ''; state.coverType = 'image'; } markDirty(); renderPhotos(); }, 'Remove media ' + (index + 1));
    cover.disabled = state.busy; remove.disabled = state.busy; controls.append(cover, remove); card.append(controls); return card;
  }));
}
function updatePreview() { const field = name => $('[name="en-' + name + '"]').value.trim(); $('#live-preview .preview-photo').replaceChildren(...(state.cover ? [mediaNode(state.cover, state.coverType)] : [])); $('#live-preview h3').textContent = field('name') || 'Journey name'; $('#live-preview .preview-meta').textContent = (field('location') || 'Location') + ' · ' + (field('price') || 'Price'); $('#live-preview p').textContent = field('description') || 'Your journey description appears here.'; }
async function prepareImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG, or WebP image.');
  if (file.size > 50 * 1024 * 1024) throw new Error('The image is larger than 50 MB. Choose a smaller file.');
  let bitmap; try { bitmap = await createImageBitmap(file); } catch { throw new Error('Unable to read the image. Choose a valid image file.'); }
  const canvas = document.createElement('canvas'), render = async (size, quality) => { const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height)); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to process the image.')), 'image/webp', quality)); };
  try { let large = await render(2400, .88); if (large.size > 2800000) large = await render(2000, .75); if (large.size > 2800000) throw new Error('The processed image is too large. Choose a smaller image.'); let thumb = await render(480, .78); if (thumb.size > 150000) thumb = await render(360, .65); const toDataURL = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Unable to read the image.')); reader.readAsDataURL(blob); }); return { image: await toDataURL(large), thumbnail: await toDataURL(thumb) }; }
  finally { bitmap.close(); canvas.width = 0; canvas.height = 0; }
}
async function prepareVideo(file) {
  if (!['video/mp4', 'video/webm'].includes(file.type)) throw new Error('Use an MP4 or WebM video.');
  if (file.size > 50 * 1024 * 1024) throw new Error('The video is larger than 50 MB. Choose a smaller file.');
  const toDataURL = new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Unable to read the video.')); reader.readAsDataURL(file); });
  return { video: await toDataURL };
}
async function uploadFiles(files, asCover = false) {
  if (state.busy || !files.length) return; const selected = [...files];
  if (asCover && selected.length !== 1) { notify('Choose one image or video for the cover.', true); return; }
  if (!asCover && state.photos.length + state.videos.length + selected.length > 30) { notify('You can add up to 30 media files per journey.', true); return; }
  setBusy(true); markDirty(); let successful = 0;
  try { for (let index = 0; index < selected.length; index++) { const file = selected[index], type = file.type.startsWith('video/') ? 'video' : 'image'; $('#upload-status').textContent = 'Preparing and uploading ' + type + ' ' + (index + 1) + ' of ' + selected.length + '…'; const result = await api('admin/upload', { method: 'POST', body: JSON.stringify(type === 'video' ? await prepareVideo(file) : await prepareImage(file)) }); if (asCover) { state.cover = result.src; state.coverType = type; } else { (type === 'video' ? state.videos : state.photos).push(result.src); if (result.thumbnail) state.thumbnails[result.src] = result.thumbnail; if (!state.cover) { state.cover = result.src; state.coverType = type; } } successful++; renderMedia(); } notify('Media uploaded. Save the journey to publish the changes.'); }
  catch (error) { notify(error.message, true); } finally { setBusy(false); $('#cover-input').value = ''; $('#gallery-input').value = ''; $('#upload-status').textContent = successful ? successful + ' media file' + (successful === 1 ? '' : 's') + ' uploaded. Click “Save journey” to confirm.' : 'No media uploaded. Try again.'; }
}
$('#trip-form').noValidate = true;
$('#trip-form').addEventListener('submit', async event => {
  event.preventDefault(); if (state.busy) return; $('#editor-error').textContent = '';
  if (!$('#trip-form').checkValidity()) { $('#trip-form').reportValidity(); return; }
  if (!state.cover) { $('#editor-error').textContent = 'Choose a cover image or video first.'; $('#cover-input').focus(); return; }
  const trip = { cover: state.cover, coverType: state.coverType, photos: state.photos, videos: state.videos, thumbnails: state.thumbnails, published: $('#published').checked, en: {} };
  for (const field of ['name', 'location', 'price', 'description']) trip.en[field] = $('[name=en-' + field + ']').value.trim();
  trip.en.details = $('[name=en-details]').value.split('\n').map(value => value.trim()).filter(Boolean); setBusy(true);
  try { const result = await api('admin/trips', { method: state.id ? 'PUT' : 'POST', body: JSON.stringify({ id: state.id, trip, revision: state.revision }) }); state.trips = result.trips; state.revision = result.revision; state.dirty = false; showList(); notify(trip.published ? 'Journey saved and published.' : 'Journey saved as a draft.'); }
  catch (error) { $('#editor-error').textContent = error.message; notify(error.message, true); } finally { setBusy(false); }
});
async function deleteTrip(id) { const trip = state.trips[id], name = trip?.en?.name || 'this journey'; if (state.busy || !await ask('Delete journey?', '“' + name + '” will be removed from the website.', 'Delete journey')) return; try { const result = await api('admin/trips', { method: 'DELETE', body: JSON.stringify({ id, revision: state.revision }) }); state.trips = result.trips; state.revision = result.revision; renderList(); notify('Journey deleted.'); } catch (error) { notify(error.message, true); } }
$('#login-form').addEventListener('submit', async event => { event.preventDefault(); $('#login-error').textContent = ''; $('#login-submit').disabled = true; try { await api('admin/login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) }); await enterDashboard(); } catch (error) { $('#login-error').textContent = error.message; } finally { $('#login-submit').disabled = false; } });
$('#show-password').addEventListener('click', () => { const showing = $('#password').type === 'password'; $('#password').type = showing ? 'text' : 'password'; $('#show-password').textContent = showing ? 'Hide' : 'Show'; $('#show-password').setAttribute('aria-label', showing ? 'Hide password' : 'Show password'); });
$('#logout').addEventListener('click', async () => { if (!await canLeave()) return; try { await api('admin/logout', { method: 'POST', body: '{}' }); state.dirty = false; state.loaded = false; location.reload(); } catch (error) { notify(error.message, true); } });
$('#add-trip').addEventListener('click', () => openEditor()); $('#nav-trips').addEventListener('click', async () => { if (await canLeave()) showList(); }); $('#back-to-list').addEventListener('click', async () => { if (await canLeave()) showList(); }); $('#refresh').addEventListener('click', loadCatalog); $('#search').addEventListener('input', renderList); $('#filter').addEventListener('change', renderList);
$('#trip-form').addEventListener('input', event => { if (event.target.type !== 'file') { markDirty(); updatePreview(); } }); $('#cover-input').addEventListener('change', event => uploadFiles(event.target.files, true)); $('#gallery-input').addEventListener('change', event => uploadFiles(event.target.files)); $('#gallery-drop').addEventListener('dragover', event => { event.preventDefault(); $('#gallery-drop').classList.add('dragging'); }); $('#gallery-drop').addEventListener('dragleave', () => $('#gallery-drop').classList.remove('dragging')); $('#gallery-drop').addEventListener('drop', event => { event.preventDefault(); $('#gallery-drop').classList.remove('dragging'); uploadFiles(event.dataTransfer.files); }); $('#preview-trip').addEventListener('click', () => { updatePreview(); $('#live-preview').scrollIntoView({ block: 'center', behavior: 'smooth' }); }); window.addEventListener('beforeunload', event => { if (state.dirty || state.busy) { event.preventDefault(); event.returnValue = ''; } });
async function boot() { try { const session = await api('admin/session'); if (session.authenticated) await enterDashboard(); } catch (error) { $('#login-error').textContent = error.message; } finally { $('#login-submit').disabled = false; $('#login-submit').textContent = 'Sign in'; } }
boot();
