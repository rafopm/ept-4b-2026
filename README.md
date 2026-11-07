# Emprende Digital 2026

Aplicacion web para el area de Educacion para el Trabajo (EPT), construida con Vue 3 y Vite.

## Desarrollo

```sh
npm install
npm run dev
```

La aplicación usa el despliegue web de Google Apps Script configurado en `public/config.js` para producción y en `vite.config.js` para desarrollo local. Mantén ambas URL sincronizadas cuando publiques una nueva implementación.

Al recibir una calificación grupal o individual, la tarea semanal queda cerrada para nuevas entregas, aunque su fecha límite siga vigente. Al modificar la validación en `code.gs`, actualiza y vuelve a implementar la aplicación de Apps Script para que el bloqueo también se aplique en el servidor.
