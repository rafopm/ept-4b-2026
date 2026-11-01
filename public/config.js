const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.APP_CONFIG = {
  API_URL: isLocalDevelopment
    ? `${window.location.origin}/api`
    : "https://script.google.com/macros/s/AKfycbzQCeYwzfRIdPahIw9vkfhRzglxFd9wKQYcbGtpn1ENV66fCI7tCXYiKpClkQGBTvZs/exec",
  CLIENT_ID: '789057548601-l0qujt2ebv0n151t62timi5c6vnt3fhv.apps.googleusercontent.com',
  DOMAIN: '@colegiosanmartin.edu.pe'
};