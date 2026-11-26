const mapa = L.map('mapa').setView([11.2268, -74.1871], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapa);

const capaMarcadores = L.layerGroup().addTo(mapa);
const capaDesvios = L.layerGroup().addTo(mapa);

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
      fillOpacity: 0.9
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

  L.geoJSON(featureGeoJSON, {
    style: {
      color: '#0284c7',
      weight: 5,
      dashArray: '8, 6'
    }
  }).addTo(capaDesvios);
}

function mostrarDetalleEnPanel(inc) {
  document.getElementById('formulario').hidden = true;
  const contenedor = document.getElementById('detalle');
  contenedor.hidden = false;

  const avisoDesvio = inc.origen === 'ciudadano'
    ? '<p><em>&lt;desvío sin verificar&gt;</em></p>'
    : '<p>Selecciona tu vehículo arriba para ver el desvío recomendado.</p>';

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
    ${avisoDesvio}
  `;
}