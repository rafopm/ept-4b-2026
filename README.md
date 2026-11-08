# Emprende Digital 2026

Aplicacion web para el area de Educacion para el Trabajo (EPT), construida con Vue 3 y Vite.

## Desarrollo

```sh
npm install
npm run dev
```

La aplicación usa el despliegue web de Google Apps Script configurado en `public/config.js` para producción y en `vite.config.js` para desarrollo local. Mantén ambas URL sincronizadas cuando publiques una nueva implementación.

Al recibir un estudiante una calificación individual, su tarea semanal queda cerrada para nuevas entregas, aunque su fecha límite siga vigente. Una calificación grupal no cierra por sí sola la entrega de cada integrante. Al modificar la validación en `code.gs`, actualiza y vuelve a implementar la aplicación de Apps Script para que el bloqueo también se aplique en el servidor.

El ranking de equipos se ordena primero por porcentaje de logro calculado con calificaciones grupales e individuales, sin bonificaciones, y usa los puntos totales como desempate. Los XP individuales por Backup no se agregan al puntaje del equipo.
