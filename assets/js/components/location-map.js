// Location map ([data-project-component="location-map"]).
// With data-maps-key: loads the Google Maps JavaScript API and draws a
// styled map in the brand palette (travertin ground, muted roads, soft green
// parks, one Örökzöld marker). Coordinates come from data-lat / data-lng,
// or are geocoded from data-address.
// Without a key (static demo): the keyless Google embed for data-address,
// toned down in CSS, with the brand marker on top.
// In production the map must load only after map cookies are accepted
// (Crown / cookie consent side); call initLocationMap() again after consent.
// Idempotent.

const COLORS = {
  ground: '#F2EDE4',   // travertin
  groundDeep: '#E6E0D4',
  line: '#CFC7B8',
  road: '#FAF8F3',     // paper
  text: '#5E5A52',     // muted
  park: '#D9DDC8',     // Páfránylevél, very light
  water: '#C9D2CF',
  accent: '#246649',   // Örökzöld
  gold: '#C4AB7A',     // Pezsgő arany
};

const STYLE = [
  { elementType: 'geometry', stylers: [{ color: COLORS.ground }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: COLORS.text }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: COLORS.ground }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  // neighbourhood names off (the site is communicated as Páfrány út / Apáthy-szikla)
  { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: COLORS.park }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: COLORS.groundDeep }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: COLORS.road }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: COLORS.line }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#EDE3CF' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: COLORS.water }] },
];

const PIN_SVG = `<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false">
  <path d="M22 43c-1-6-12-14-12-24a12 12 0 0 1 24 0c0 10-11 18-12 24z" fill="${COLORS.accent}"/>
  <circle cx="22" cy="19" r="4.5" fill="${COLORS.gold}"/>
</svg>`;

let apiPromise = null;

function loadApi(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  apiPromise ??= new Promise((resolve, reject) => {
    const cb = '__pbrMapsReady';
    window[cb] = () => resolve(window.google.maps);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${cb}&loading=async`;
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return apiPromise;
}

async function drawStyled(root, canvas) {
  const maps = await loadApi(root.dataset.mapsKey);
  let position = null;
  const lat = parseFloat(root.dataset.lat);
  const lng = parseFloat(root.dataset.lng);
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) position = { lat, lng };
  else {
    const geocoder = new maps.Geocoder();
    const { results } = await geocoder.geocode({ address: root.dataset.address });
    position = results[0]?.geometry.location;
  }
  if (!position) return;
  const map = new maps.Map(canvas, {
    center: position,
    zoom: parseInt(root.dataset.zoom, 10) || 15,
    styles: STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'cooperative',
    backgroundColor: COLORS.ground,
  });
  new maps.Marker({
    map,
    position,
    title: 'Páfrány Boutique Residences',
    icon: {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(PIN_SVG.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" ')),
      scaledSize: new maps.Size(44, 44),
      anchor: new maps.Point(22, 43),
    },
  });
}

function drawEmbed(root, canvas) {
  const q = encodeURIComponent(root.dataset.address || 'Páfrány út 17/b, Budapest');
  const z = parseInt(root.dataset.zoom, 10) || 15;
  const frame = document.createElement('iframe');
  frame.src = `https://maps.google.com/maps?q=${q}&z=${z}&output=embed`;
  frame.loading = 'lazy';
  frame.referrerPolicy = 'no-referrer-when-downgrade';
  frame.title = canvas.getAttribute('aria-label') || 'Map';
  canvas.appendChild(frame);
  const pin = document.createElement('span');
  pin.className = 'location-map__pin';
  pin.innerHTML = PIN_SVG;
  canvas.appendChild(pin);
}

export function initLocationMap(root = document) {
  root.querySelectorAll('[data-project-component="location-map"]').forEach((el) => {
    if (el.dataset.mapInit) return;
    const canvas = el.querySelector('[data-map-canvas]');
    if (!canvas) return;
    el.dataset.mapInit = 'true';
    if (el.dataset.mapsKey) drawStyled(el, canvas).catch(() => drawEmbed(el, canvas));
    else drawEmbed(el, canvas);
  });
}
