const mapa = L.map('mapa').setView([11.2268, -74.1871], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

const capaMarcadores = L.layerGroup().addTo(mapa);
const capaDesvios = L.layerGroup().addTo(mapa);
let incidenteSeleccionado = null;

function obtenerColorSeveridad(severidad) {
  const colores = {
    roja: '#dc2626',
    naranja: '#f97316',
    amarilla: '#eab308'
  };
  return colores[severidad] || '#64748b';
}

function dibujarIncidentes(incidentes) {
  capaMarcadores.clearLayers();
  document.getElementById('contador').textContent = incidentes.length;

  incidentes.forEach((inc) => {
    const color = obtenerColorSeveridad(inc.severidad);

    const marcador = L.circleMarker([inc.lat, inc.lng], {
      radius: 10,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
      bubblingMouseEvents: false
    });

    marcador.on('click', () => {
      mostrarDetalleEnPanel(inc);
    });

    marcador.addTo(capaMarcadores);
  });
}

function dibujarDesvio(featureGeoJSON) {
  capaDesvios.clearLayers();
  if (!featureGeoJSON) return;

  const desvios = Array.isArray(featureGeoJSON) ? featureGeoJSON : [featureGeoJSON];
  desvios.forEach((desvio) => {
    L.geoJSON(desvio, {
      style: {
        color: '#0284c7',
        weight: 5,
        dashArray: '8, 6'
      }
    }).addTo(capaDesvios);
  });

  const limites = capaDesvios.getBounds();
  if (limites.isValid()) {
    mapa.fitBounds(limites, { padding: [30, 30], maxZoom: 16 });
  }
}

function actualizarDesvioSeleccionado() {
  const aviso = document.getElementById('aviso-desvio');
  if (!incidenteSeleccionado || incidenteSeleccionado.origen === 'ciudadano') {
    dibujarDesvio(null);
    if (aviso && incidenteSeleccionado) {
      aviso.textContent = 'Este reporte ciudadano no tiene un desvío asociado.';
    }
    return;
  }

  const vehiculo = document.getElementById('filtro-vehiculo').value;
  const desvios = desviosPara(incidenteSeleccionado.id, vehiculo);
  dibujarDesvio(desvios);
  if (aviso) {
    if (desvios.length) {
      aviso.textContent = 'Desvío disponible marcado en azul.';
    } else {
      const restricciones = restriccionesDesvioPara(incidenteSeleccionado.id, vehiculo);
      aviso.textContent = restricciones.length
        ? restricciones.map(desvio => desvio.properties.observaciones).join(' ')
        : 'No hay un desvío cargado para este incidente y vehículo.';
    }
  }
}

document.getElementById('filtro-vehiculo').addEventListener('change', actualizarDesvioSeleccionado);

mapa.on('click', () => {
  incidenteSeleccionado = null;
  dibujarDesvio(null);
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
  document.getElementById('input-camara').value = '';
  document.getElementById('input-galeria').value = '';
  document.getElementById('img-preview').src = '';
  document.getElementById('contenedor-preview').hidden = true;
  mostrarErrorFoto('');
}

document.getElementById('btn-camara').addEventListener('click', () => {
  document.getElementById('input-camara').click();
});

document.getElementById('btn-galeria').addEventListener('click', () => {
  document.getElementById('input-galeria').click();
});

document.getElementById('btn-quitar-foto').addEventListener('click', limpiarFotoFormulario);

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

document.getElementById('input-camara').addEventListener('change', procesarArchivoFoto);
document.getElementById('input-galeria').addEventListener('change', procesarArchivoFoto);

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
  const contenedor = document.getElementById('detalle');
  contenedor.hidden = false;

document.getElementById('btn-cancelar').addEventListener('click', () => {
  document.getElementById('form-reporte').reset();
  limpiarFotoFormulario();
  document.getElementById('formulario').hidden = true;
});

document.getElementById('btn-cancelar').addEventListener('click', () => {
  document.getElementById('form-reporte').reset();
  document.getElementById('formulario').hidden = true;
});

  contenedor.innerHTML = `
    <h3>${inc.via || 'Reporte ciudadano'} (${inc.severidad.toUpperCase()})</h3>
    <p><strong>Tipo:</strong> ${inc.tipo}</p>
    <p><strong>Sentido afectado:</strong> ${inc.sentido_afectado}</p>
    <p><strong>Horario crítico:</strong> ${inc.horario_critico || 'No especificado'}</p>
    <p><strong>Verificado:</strong> ${inc.verificado || 'Reporte ciudadano'}</p>
    <p>${inc.descripcion}</p>
    ${inc.foto ? `<img src="${rutaFoto}" alt="Evidencia" style="width:100%; margin-top:8px; border-radius:6px;">` : ''}
    <hr style="margin: 10px 0;">
    <p id="aviso-desvio"></p>
  `;

  actualizarDesvioSeleccionado();

  if (inc.origen === 'ciudadano') {
    const botonEliminar = document.createElement('button');
    botonEliminar.type = 'button';
    botonEliminar.className = 'btn-eliminar';
    botonEliminar.textContent = 'Eliminar reporte';
    botonEliminar.addEventListener('click', () => eliminarReporteCiudadano(inc.id));
    contenedor.appendChild(botonEliminar);
  }
}