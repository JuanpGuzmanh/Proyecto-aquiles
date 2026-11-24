// ---------- Configuración (ajusten con su corredor) ----------
const CENTRO = [11.2212, -74.1774];
const SECTOR = L.latLngBounds([11.212, -74.188], [11.230, -74.167]); // suroeste, noreste
const COLORES = { roja: '#d32f2f', naranja: '#f57c00', amarilla: '#fbc02d' };

// ---------- Mapa base con OpenStreetMap ----------
const mapa = L.map('mapa').setView(CENTRO, 16);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; Colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(mapa);

const capaIncidentes = L.layerGroup().addTo(mapa);
let capaDesvio = null;
let puntoPendiente = null;

// ---------- Utilidades ----------
function esc(texto) {            // evita que un reporte inyecte HTML
  const d = document.createElement('div');
  d.textContent = texto ?? '';
  return d.innerHTML;
}

function fichaHTML(inc) {
  const verificado = inc.verificado
    ? `Verificado: ${esc(inc.verificado)}`
    : '<em>Sin verificar</em>';
  return `
    <strong>${esc(inc.via)}</strong><br>
    Tipo: ${esc(inc.tipo)}<br>
    Sentido: ${esc(inc.sentido_afectado)}<br>
    ${inc.horario_critico ? 'Horario crítico: ' + esc(inc.horario_critico) + '<br>' : ''}
    ${inc.impacto ? 'Impacto: ' + esc(inc.impacto) + '<br>' : ''}
    ${esc(inc.descripcion)}<br>
    ${verificado}
    ${inc.foto ? `<br><img src="${esc(inc.foto)}" width="220" alt="Foto del punto">` : ''}`;
}

// ---------- Marcadores ----------
function dibujarIncidente(inc) {
  const marcador = L.circleMarker([inc.lat, inc.lng], {   // Leaflet: [lat, lng]
    radius: 10,
    color: '#333',
    weight: 2,
    fillColor: COLORES[inc.severidad],
    fillOpacity: 0.9,
    bubblingMouseEvents: false   // evita que el clic abra también el formulario
  });
  marcador.bindPopup(fichaHTML(inc));
  marcador.on('click', () => seleccionarIncidente(inc));
  marcador.addTo(capaIncidentes);
}

function refrescar() {
  capaIncidentes.clearLayers();
  const lista = todosLosIncidentes();
  lista.forEach(dibujarIncidente);
  document.getElementById('contador').textContent = lista.length;
}

// ---------- Desvíos ----------
function limpiarDesvio() {
  if (capaDesvio) {
    mapa.removeLayer(capaDesvio);
    capaDesvio = null;
  }
}

function seleccionarIncidente(inc) {
  limpiarDesvio();
  mapa.setView([inc.lat, inc.lng], Math.max(mapa.getZoom(), 16));  // resalta el punto
  let html = fichaHTML(inc);

  if (inc.severidad === 'amarilla') {
    html += '<p>Este punto no requiere desvío.</p>';
  } else if (inc.origen === 'ciudadano') {
    html += '<p class="aviso">⚠️ Desvío sin verificar</p>';
  } else {
    const vehiculo = document.getElementById('filtro-vehiculo').value;
    const aptos = desviosPara(inc.id, vehiculo);

    if (aptos.length === 0) {
      html += '<p class="aviso">No hay desvío verificado apto para este tipo de vehículo.</p>';
    } else {
      // L.geoJSON convierte [lng, lat] a [lat, lng] por su cuenta
      capaDesvio = L.geoJSON(aptos, { style: { color: '#1976d2', weight: 5 } }).addTo(mapa);
      mapa.fitBounds(capaDesvio.getBounds(), { padding: [40, 40] });
      html += aptos.map(d =>
        `<p>🛣️ Desvío: +${d.properties.distancia_adicional_m} m<br>
         Verificado: ${esc(d.properties.verificado)}</p>`).join('');
    }
  }
  document.getElementById('detalle').innerHTML = html;
  window.incidenteActual = inc;
}

// Al cambiar de vehículo, se recalcula el desvío del punto elegido
document.getElementById('filtro-vehiculo').addEventListener('change', () => {
  if (window.incidenteActual) seleccionarIncidente(window.incidenteActual);
});

// ---------- Leyenda ----------
const leyenda = L.control({ position: 'bottomright' });
leyenda.onAdd = function () {
  const div = L.DomUtil.create('div', 'leyenda');
  div.innerHTML = `
    <div><span style="background:#d32f2f"></span>Cierre total / obra activa</div>
    <div><span style="background:#f57c00"></span>Un carril / congestión alta</div>
    <div><span style="background:#fbc02d"></span>Deterioro severo de la vía</div>
    <div><span style="background:#1976d2"></span>Desvío verificado</div>`;
  return div;
};
leyenda.addTo(mapa);

// ---------- Buscador ----------
async function iniciarBuscador() {
  const respuesta = await fetch('datos/lugares.json');
  const lugares = await respuesta.json();
  const lista = document.getElementById('lista-lugares');

  lugares.forEach(l => {
    const opcion = document.createElement('option');
    opcion.value = l.nombre;
    lista.appendChild(opcion);
  });

  document.getElementById('buscador').addEventListener('change', (e) => {
    const lugar = lugares.find(l => l.nombre === e.target.value);
    if (lugar) mapa.flyTo([lugar.lat, lugar.lng], 17);
  });
}

// ---------- Reporte ciudadano ----------
mapa.on('click', (e) => {
  if (!SECTOR.contains(e.latlng)) {
    alert('Ese punto está fuera del sector.');
    return;
  }
  puntoPendiente = { lat: e.latlng.lat, lng: e.latlng.lng };
  document.getElementById('coord').textContent =
    puntoPendiente.lat.toFixed(5) + ', ' + puntoPendiente.lng.toFixed(5);
  document.getElementById('formulario').hidden = false;
});

document.getElementById('form-reporte').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target.elements;
  const error = guardarReporte({
    tipo: f.tipo.value,
    sentido: f.sentido.value,
    impacto: f.impacto.value,
    descripcion: f.descripcion.value,
    lat: puntoPendiente.lat,
    lng: puntoPendiente.lng
  });
  if (error) {
    alert(error);
    return;
  }
  e.target.reset();
  document.getElementById('formulario').hidden = true;
  refrescar();
});

document.getElementById('btn-cancelar').addEventListener('click', () => {
  document.getElementById('form-reporte').reset();
  document.getElementById('formulario').hidden = true;
});

// ---------- Exportar / importar ----------
document.getElementById('btn-exportar').addEventListener('click', exportarReportes);
document.getElementById('btn-importar').addEventListener('click', () =>
  document.getElementById('archivo-importar').click());

document.getElementById('archivo-importar').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;
  importarReportes(archivo, (agregados) => {
    refrescar();
    alert(agregados + ' reporte(s) nuevo(s) importado(s).');
  });
  e.target.value = '';
});

// ---------- Arranque ----------
async function iniciar() {
  try {
    await cargarIncidentesCampo();
    await cargarDesvios();
    await iniciarBuscador();
    refrescar();
  } catch (e) {
    console.error(e);
    alert('No se pudieron cargar los datos. ¿Abriste el proyecto con Live Server?');
  }
}
iniciar();