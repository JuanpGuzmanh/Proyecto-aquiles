// ---------- Configuración (ajusten con su corredor) ----------
const CENTRO = [11.2212, -74.1774];
const SECTOR = L.latLngBounds([11.212, -74.188], [11.230, -74.167]);
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
function esc(texto) {
  const d = document.createElement('div');
  d.textContent = texto ?? '';
  return d.innerHTML;
}

const NOMBRE_SEVERIDAD = { roja: 'Cierre total', naranja: 'Un carril', amarilla: 'Deterioro de la vía' };

function fichaHTML(inc) {
  const verificado = inc.verificado
    ? `Verificado: ${esc(inc.verificado)}`
    : (inc.fecha_reporte ? `Reportado: ${esc(inc.fecha_reporte)}` : '<em>Sin verificar</em>');

  const rutaFoto = inc.foto
    ? (inc.foto.startsWith('data:image') || inc.foto.startsWith('datos/') ? inc.foto : `datos/${inc.foto}`)
    : '';

  return `
    <div class="ficha">
      <span class="chip chip-${esc(inc.severidad)}">${NOMBRE_SEVERIDAD[inc.severidad] || ''}</span>
      <strong class="ficha-via">${esc(inc.via)}</strong>
      <span class="ficha-dato">Sentido: ${esc(inc.sentido_afectado)}</span>
      ${inc.horario_critico ? `<span class="ficha-dato">Horario crítico: ${esc(inc.horario_critico)}</span>` : ''}
      ${inc.impacto ? `<span class="ficha-dato">Impacto: ${esc(inc.impacto)}</span>` : ''}
      <span class="ficha-dato">${esc(inc.descripcion)}</span>
      <span class="ficha-dato">${verificado}</span>
      ${rutaFoto ? `<img src="${esc(rutaFoto)}" alt="Foto del punto" onerror="this.style.display='none'">` : ''}
    </div>`;
}

// ---------- Marcadores ----------
function dibujarIncidente(inc) {
  const marcador = L.circleMarker([inc.lat, inc.lng], {
    radius: 11,
    color: '#fff',
    weight: 3,
    fillColor: COLORES[inc.severidad] || '#64748b',
    fillOpacity: 0.95,
    className: 'marcador',
    bubblingMouseEvents: false
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
  mapa.setView([inc.lat, inc.lng], Math.max(mapa.getZoom(), 16));
  let html = fichaHTML(inc);

  if (inc.severidad === 'amarilla') {
    html += '<p>Este punto no requiere desvío.</p>';
  } else if (inc.origen === 'ciudadano') {
    html += '<p class="aviso">⚠️ Desvío sin verificar</p>';
  } else {
    const vehiculo = document.getElementById('filtro-vehiculo').value;
    const aptos = desviosPara(inc.id, vehiculo);

    if (aptos.length === 0) {
      const restricciones = typeof restriccionesDesvioPara === 'function'
        ? restriccionesDesvioPara(inc.id, vehiculo)
        : [];
      const mensaje = restricciones.length
        ? restricciones.map(d => esc(d.properties.observaciones)).join(' ')
        : 'No hay desvío verificado apto para este tipo de vehículo.';
      html += `<p class="aviso">${mensaje}</p>`;
    } else {
      capaDesvio = L.geoJSON(aptos, { style: { color: '#1976d2', weight: 5 } }).addTo(mapa);
      mapa.fitBounds(capaDesvio.getBounds(), { padding: [40, 40] });
      html += aptos.map(d =>
        `<p>🛣️ Desvío: +${d.properties.distancia_adicional_m} m<br>
         Verificado: ${esc(d.properties.verificado)}</p>`).join('');
    }
  }

  const contenedorDetalle = document.getElementById('detalle');
  contenedorDetalle.innerHTML = html;

  if (inc.origen === 'ciudadano') {
    const btnEliminar = document.createElement('button');
    btnEliminar.type = 'button';
    btnEliminar.className = 'btn-eliminar';
    btnEliminar.textContent = 'Eliminar reporte';
    btnEliminar.addEventListener('click', () => {
      if (eliminarReporteCiudadano(inc.id)) {
        window.incidenteActual = null;
        contenedorDetalle.innerHTML = '<p>Haz clic en un punto del mapa para ver su detalle.</p>';
        refrescar();
      }
    });
    contenedorDetalle.appendChild(btnEliminar);
  }

  window.incidenteActual = inc;
}

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
let fotoPendiente = '';

function mostrarErrorFoto(mensaje) {
  const el = document.getElementById('error-foto');
  if (!el) return;
  if (!mensaje) {
    el.textContent = '';
    el.hidden = true;
    return;
  }
  el.textContent = mensaje;
  el.hidden = false;
}

function limpiarFotoFormulario() {
  fotoPendiente = '';
  const inCam = document.getElementById('input-camara');
  const inGal = document.getElementById('input-galeria');
  const imgPrev = document.getElementById('img-preview');
  const contPrev = document.getElementById('contenedor-preview');
  if (inCam) inCam.value = '';
  if (inGal) inGal.value = '';
  if (imgPrev) imgPrev.src = '';
  if (contPrev) contPrev.hidden = true;
  mostrarErrorFoto('');
}

const btnCamara = document.getElementById('btn-camara');
const btnGaleria = document.getElementById('btn-galeria');
const btnQuitarFoto = document.getElementById('btn-quitar-foto');
const inputCamara = document.getElementById('input-camara');
const inputGaleria = document.getElementById('input-galeria');

if (btnCamara && inputCamara) {
  btnCamara.addEventListener('click', () => inputCamara.click());
  inputCamara.addEventListener('change', procesarArchivoFoto);
}

if (btnGaleria && inputGaleria) {
  btnGaleria.addEventListener('click', () => inputGaleria.click());
  inputGaleria.addEventListener('change', procesarArchivoFoto);
}

if (btnQuitarFoto) {
  btnQuitarFoto.addEventListener('click', limpiarFotoFormulario);
}

async function procesarArchivoFoto(e) {
  const archivo = e.target.files[0];
  if (!archivo) return;

  mostrarErrorFoto('');

  if (!archivo.type.startsWith('image/')) {
    limpiarFotoFormulario();
    mostrarErrorFoto('El archivo seleccionado no es una imagen válida.');
    return;
  }

  const MAX_MB = 15;
  if (archivo.size > MAX_MB * 1024 * 1024) {
    limpiarFotoFormulario();
    mostrarErrorFoto(`La imagen supera los ${MAX_MB} MB permitidos.`);
    return;
  }

  try {
    fotoPendiente = await comprimirImagen(archivo, 720, 0.7);
    document.getElementById('img-preview').src = fotoPendiente;
    document.getElementById('contenedor-preview').hidden = false;
  } catch (err) {
    console.error(err);
    limpiarFotoFormulario();
    mostrarErrorFoto('No se pudo procesar la foto. Intenta con otra imagen.');
  }
}

mapa.on('click', (e) => {
  if (!SECTOR.contains(e.latlng)) {
    alert('Ese punto está fuera del sector.');
    return;
  }
  puntoPendiente = { lat: e.latlng.lat, lng: e.latlng.lng };
  document.getElementById('coord').textContent =
    puntoPendiente.lat.toFixed(5) + ', ' + puntoPendiente.lng.toFixed(5);
  limpiarFotoFormulario();
  document.getElementById('formulario').hidden = false;
});

document.getElementById('form-reporte').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!puntoPendiente) return;
  const f = e.target.elements;
  const error = guardarReporte({
    tipo: f.tipo.value,
    sentido: f.sentido.value,
    impacto: f.impacto.value,
    descripcion: f.descripcion.value,
    lat: puntoPendiente.lat,
    lng: puntoPendiente.lng,
    foto: fotoPendiente
  });
  if (error) {
    alert(error);
    return;
  }
  e.target.reset();
  limpiarFotoFormulario();
  document.getElementById('formulario').hidden = true;
  refrescar();
});

document.getElementById('btn-cancelar').addEventListener('click', () => {
  document.getElementById('form-reporte').reset();
  limpiarFotoFormulario();
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