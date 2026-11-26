let todosLosDesvios = [];

async function cargarDesvios() {
  const respuesta = await fetch('datos/desvios.geojson');
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar desvios.geojson: ${respuesta.status}`);
  }

  const geo = await respuesta.json();
  if (geo.type !== 'FeatureCollection' || !Array.isArray(geo.features)) {
    throw new Error('desvios.geojson no contiene un FeatureCollection válido.');
  }

  todosLosDesvios = geo.features;
}

function desviosPara(idIncidente, vehiculo) {
  return todosLosDesvios.filter(d =>
    d.properties.incidente === idIncidente &&
    d.properties.vehiculos.includes(vehiculo)
  );
}

function restriccionesDesvioPara(idIncidente, vehiculo) {
  return todosLosDesvios.filter(d =>
    d.properties.incidente === idIncidente &&
    Array.isArray(d.properties.no_apto_para) &&
    d.properties.no_apto_para.includes(vehiculo)
  );
}