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

function mostrarDetalleEnPanel(inc) {
  incidenteSeleccionado = inc;
  document.getElementById('formulario').hidden = true;
  const contenedor = document.getElementById('detalle');
  contenedor.hidden = false;

  const rutaFoto = inc.foto && inc.foto.startsWith('data:image')
    ? inc.foto
    : `datos/${inc.foto}`;

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