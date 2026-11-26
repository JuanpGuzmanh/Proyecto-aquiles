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

// Comprime y redimensiona la imagen en cliente para no llenar localStorage
function comprimirImagen(archivo, maxAncho = 720, calidad = 0.7) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));

    lector.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const escala = Math.min(1, maxAncho / img.width);
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);

          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          resolve(canvas.toDataURL('image/jpeg', calidad));
        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target.result;
    };

    lector.readAsDataURL(archivo);
  });
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
    foto: d.foto || '',
    fecha_reporte: new Date().toISOString().slice(0, 10)
  });

  try {
    localStorage.setItem(CLAVE, JSON.stringify(reportes));
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      return 'Almacenamiento lleno. Quita la foto o exporta y libera reportes antiguos.';
    }
    return 'No se pudo guardar el reporte en el navegador.';
  }

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