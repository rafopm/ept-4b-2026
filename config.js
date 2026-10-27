const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.APP_CONFIG = {
  API_URL: isLocalDevelopment
    ? `${window.location.origin}/api`
    : "https://script.google.com/macros/s/AKfycbxRt_235tE-R-KhSoXCeEDXN9TVpr1XI0tSXSoE-Ui5YMLR1iITQ5haP_yVfZ6DVcWm/exec",
  CLIENT_ID: '789057548601-l0qujt2ebv0n151t62timi5c6vnt3fhv.apps.googleusercontent.com',
  DOMAIN: '@colegiosanmartin.edu.pe'
};