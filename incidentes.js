const CLAVE = 'reportes_radar';
let incidentesCampo = [];

const SEVERIDAD_POR_TIPO = {
  cierre_total: 'roja',
  un_carril: 'naranja',
  malla_vial: 'amarilla'
};

async function cargarIncidentesCampo() {
  const respuesta = await fetch('datos/incidentes.json');
  incidentesCampo = await respuesta.json();
}

function leerReportes() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '[]');
  } catch (e) {
    return [];
  }
}

function todosLosIncidentes() {
  return [...incidentesCampo, ...leerReportes()];
}

// Devuelve null si todo está bien, o un texto con el error
function guardarReporte(d) {
  if (!d.tipo || !d.sentido || !d.impacto || !d.descripcion.trim()) {
    return 'Todos los campos son obligatorios.';
  }
  if (d.descripcion.length > 200) {
    return 'La descripción supera los 200 caracteres.';
  }
  const reportes = leerReportes();
  reportes.push({
    id: 'CIU-' + Date.now(),
    origen: 'ciudadano',
    tipo: d.tipo,
    severidad: SEVERIDAD_POR_TIPO[d.tipo],
    lat: d.lat,
    lng: d.lng,
    via: 'Reporte ciudadano',
    sentido_afectado: d.sentido,
    impacto: d.impacto,
    descripcion: d.descripcion.trim(),
    fecha_reporte: new Date().toISOString().slice(0, 10)
  });
  localStorage.setItem(CLAVE, JSON.stringify(reportes));
  return null;
}

function exportarReportes() {
  const texto = JSON.stringify(leerReportes(), null, 2);
  const blob = new Blob([texto], { type: 'application/json' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(blob);
  enlace.download = 'reportes.json';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function importarReportes(archivo, alTerminar) {
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const nuevos = JSON.parse(lector.result);
      if (!Array.isArray(nuevos)) throw new Error('Formato inválido');

      const actuales = leerReportes();
      const ids = new Set(actuales.map(r => r.id));
      let agregados = 0;

      nuevos.forEach(r => {
        if (r.id && !ids.has(r.id)) {   // se compara por id, sin duplicar
          actuales.push(r);
          ids.add(r.id);
          agregados++;
        }
      });
      localStorage.setItem(CLAVE, JSON.stringify(actuales));
      alTerminar(agregados);
    } catch (e) {
      alert('El archivo no es un JSON de reportes válido.');
    }
  };
  lector.readAsText(archivo);
}