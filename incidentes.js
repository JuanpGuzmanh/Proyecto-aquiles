const CLAVE_STORAGE = 'radar_desvios_reportes';
let incidentesCampo = [];
let coordSeleccionada = null;

// 1. Cargar datos iniciales (campo + localStorage)
async function inicializarIncidentes() {
  try {
    const res = await fetch('datos/incidentes.json');
    if (!res.ok) {
      throw new Error(`No se pudo cargar incidentes.json: ${res.status}`);
    }
    incidentesCampo = await res.json();
  } catch (err) {
    console.error('Error cargando incidentes.json:', err);
  }

  try {
    await cargarDesvios();
  } catch (err) {
    console.error('Error cargando desvios.geojson:', err);
  }

  renderizarTodosLosIncidentes();
}

function obtenerReportesGuardados() {
  const datos = localStorage.getItem(CLAVE_STORAGE);
  return datos ? JSON.parse(datos) : [];
}

function renderizarTodosLosIncidentes() {
  const todos = [...incidentesCampo, ...obtenerReportesGuardados()];
  if (typeof dibujarIncidentes === 'function') {
    dibujarIncidentes(todos);
  }
}

function eliminarReporteCiudadano(id) {
  if (!confirm('¿Seguro que quieres eliminar este reporte ciudadano?')) return;

  const reportes = obtenerReportesGuardados();
  const actualizados = reportes.filter(
    (reporte) => reporte.origen !== 'ciudadano' || reporte.id !== id
  );
  if (actualizados.length === reportes.length) return;

  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(actualizados));
  renderizarTodosLosIncidentes();
  const detalle = document.getElementById('detalle');
  detalle.innerHTML = '<p>Haz clic en un punto del mapa para ver su detalle.</p>';
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
    tipo: form.tipo.value,
    severidad: mapaSeveridad[form.impacto.value] || 'amarilla',
    lat: Number(coordSeleccionada.lat.toFixed(6)),
    lng: Number(coordSeleccionada.lng.toFixed(6)),
    via: 'Reporte ciudadano',
<<<<<<< HEAD
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
=======
    sentido_afectado: form.sentido.value,
    descripcion: form.descripcion.value.trim(),
    foto: fotoBase64,
    verificado: new Date().toISOString().split('T')[0]
  };

  const guardados = obtenerReportesGuardados();
  guardados.push(nuevoReporte);
  localStorage.setItem(CLAVE_STORAGE, JSON.stringify(guardados));

  form.reset();
  renderizarTodosLosIncidentes();
  mostrarDetalleEnPanel(nuevoReporte);
});

// 4. Compresor de imágenes para celular
function comprimirImagen(archivo, maxAncho) {
  return new Promise((resolve) => {
    const lector = new FileReader();
    lector.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const escala = Math.min(1, maxAncho / img.width);
        canvas.width = img.width * escala;
        canvas.height = img.height * escala;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target.result;
    };
    lector.readAsDataURL(archivo);
  });
>>>>>>> dddb460f73ac4f9e10f90f61cd49a037a518be19
}

// 5. Exportar e Importar JSON usando tus botones
document.getElementById('btn-exportar').addEventListener('click', () => {
  const datos = obtenerReportesGuardados();
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reportes-santa-marta-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-importar').addEventListener('click', () => {
  document.getElementById('archivo-importar').click();
});

document.getElementById('archivo-importar').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = (ev) => {
    try {
      const importados = JSON.parse(ev.target.result);
      const actuales = obtenerReportesGuardados();
      const idsExistentes = new Set(actuales.map((r) => r.id));

      let agregados = 0;
      importados.forEach((rep) => {
        if (rep.id && !idsExistentes.has(rep.id)) {
          actuales.push(rep);
          idsExistentes.add(rep.id);
          agregados++;
        }
      });

      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(actuales));
      renderizarTodosLosIncidentes();
      alert(`Se importaron ${agregados} reportes nuevos sin duplicados.`);
    } catch (err) {
      alert('El archivo JSON no tiene un formato válido.');
    }
    e.target.value = '';
  };
  lector.readAsText(archivo);
});

inicializarIncidentes();