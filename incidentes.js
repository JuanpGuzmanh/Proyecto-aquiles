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

// 2. Abrir tu sección #formulario al hacer clic en el mapa
mapa.on('click', (e) => {
  coordSeleccionada = e.latlng;
  document.getElementById('coord').textContent =
    `${coordSeleccionada.lat.toFixed(5)}, ${coordSeleccionada.lng.toFixed(5)}`;

  document.getElementById('detalle').hidden = true;
  document.getElementById('formulario').hidden = false;
});

document.getElementById('btn-cancelar').addEventListener('click', () => {
  document.getElementById('form-reporte').reset();
  document.getElementById('formulario').hidden = true;
  document.getElementById('detalle').hidden = false;
});

// 3. Guardar reporte ciudadano con foto comprimida
document.getElementById('form-reporte').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!coordSeleccionada) return;

  const form = ev.target;
  const mapaSeveridad = { alto: 'roja', medio: 'naranja', bajo: 'amarilla' };
  const inputFoto = document.getElementById('rep-foto');
  let fotoBase64 = '';

  if (inputFoto && inputFoto.files[0]) {
    fotoBase64 = await comprimirImagen(inputFoto.files[0], 600);
  }

  const nuevoReporte = {
    id: 'CIU-' + Date.now(),
    origen: 'ciudadano',
    tipo: form.tipo.value,
    severidad: mapaSeveridad[form.impacto.value] || 'amarilla',
    lat: Number(coordSeleccionada.lat.toFixed(6)),
    lng: Number(coordSeleccionada.lng.toFixed(6)),
    via: 'Reporte ciudadano',
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