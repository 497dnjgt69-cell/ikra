export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const register = () =>
    navigator.serviceWorker
      .register("./service-worker.js", { updateViaCache: "none" })
      .catch(() => {});
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
