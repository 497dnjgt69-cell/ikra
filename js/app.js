import { bootstrap } from "./bootstrap.js";
import { registerServiceWorker } from "./platform/register-service-worker.js";

try { bootstrap(); }
catch (error) {
  const message=document.createElement('p');message.textContent='IKRA açılamadı. Sayfayı yenileyerek tekrar dene. / IKRA could not start. Please reload.';
  document.body.replaceChildren(message);console.error(error);
} finally { clearTimeout(window.ikraBootGuard); document.documentElement.classList.remove('ikra-booting'); }
registerServiceWorker();
