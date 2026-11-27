
# Radar de desvíos y frentes de obra en Santa Marta

**Equipo:** Los Cartografos
**Curso:** Introducción a la Ingeniería de Sistemas, 2026-2 · Universidad del Magdalena
**Docente:** Aquiles Cohen
**Prototipo publicado:** (https://juanpguzmanh.github.io/Radar-de-desvios/)

## Roles

**juan Guzmán**: Coordinador de repositorio, QA y documentación
**Carlos Serge**: Desarrollador de interfaz, reportes y almacenamiento
**Christian Manjarrez**: Líder de datos geográficos y campo
**Nickolle Rondano**: Desarrollador de mapa y lógica de desvíos

## Descripción

Radar de desvíos es una aplicación web basada en mapas que reúne los cierres viales y frentes de obra de un corredor de Santa Marta: la **Troncal del Caribe y la Glorieta Zúñiga**. Cuando se cierra un carril, la noticia llega tarde y por pedazos, y los conductores siguen entrando a la vía bloqueada. Esta app muestra dónde está cada afectación y por dónde se puede pasar según el tipo de vehículo.

Los puntos críticos y los desvíos fueron **verificados en campo** por el equipo: coordenadas con GPS, fotos anonimizadas y sentido de cada vía comprobado.

## Cómo abrirlo

**En línea:** (https://juanpguzmanh.github.io/Radar-de-desvios/). Funciona en celular y computador.

**En local:**
1. Clona el repositorio.
2. Ábrelo en VS Code y usa la extensión **Live Server** (clic derecho en `index.html` → *Open with Live Server*).
3. No lo abras con doble clic: los datos se cargan con `fetch` y el navegador lo bloquea.

El mapa necesita conexión a internet, porque Leaflet y las teselas de OpenStreetMap se descargan en línea.
