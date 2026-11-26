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

const categoriasVehiculo = {
  moto: ['motocicleta'],
  automovil: ['carro_particular'],
  pesado: ['transporte_publico', 'carga']
};

function desviosPara(idIncidente, vehiculo) {
  const permitidos = categoriasVehiculo[vehiculo] || [];
  return todosLosDesvios.filter(d =>
    d.properties.incidente_id === idIncidente &&
    d.properties.vehiculos_permitidos.some(tipo => permitidos.includes(tipo))
  );
}