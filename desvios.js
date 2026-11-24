let todosLosDesvios = [];

async function cargarDesvios() {
  const respuesta = await fetch('datos/desvios.geojson');
  const geo = await respuesta.json();
  todosLosDesvios = geo.features;
}

// Si el vehículo está en la lista del desvío, se conserva; si no, se oculta
function desviosPara(idIncidente, vehiculo) {
  return todosLosDesvios.filter(d =>
    d.properties.incidente === idIncidente &&
    d.properties.vehiculos.includes(vehiculo)
  );
}