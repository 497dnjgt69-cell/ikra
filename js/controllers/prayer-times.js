import { handleAction } from "../shared/actions.js";
import { $ } from "../shared/dom.js";

export function bindPrayerTimes({ times, render, toast }) {
  $("#cityfetch").onclick = handleAction(() => {
    const address = $("#city").value.trim();
    if (!address) {
      toast("Şehir ve ülke yaz.");
      return;
    }
    times.fetchForSource({ type: "address", address });
  });
  $("#geofetch").onclick = handleAction(() => {
    if (!navigator.geolocation) {
      toast("Konum desteklenmiyor. Şehir yazabilirsin.");
      return;
    }
    if (
      !confirm(
        document.documentElement.lang === "en"
          ? "Your location coordinates will be sent to AlAdhan to retrieve prayer times. Your location is not used for advertising or tracking. Continue?"
          : "Namaz vakitlerini almak için konum koordinatların AlAdhan servisine gönderilecektir. Konumun reklam veya takip amacıyla kullanılmaz. Devam etmek istiyor musun?",
      )
    )
      return;
    navigator.geolocation.getCurrentPosition(
      (p) =>
        times.fetchForSource({
          type: "coords",
          lat: p.coords.latitude,
          lon: p.coords.longitude,
        }),
      () => toast("Konum izni alınamadı. Şehirle arayabilirsin."),
      { timeout: 12000, enableHighAccuracy: false },
    );
  });
  $("#manualtoggle").onclick = handleAction(() => {
    $("#prayerfields").classList.toggle("hidden");
    $("#manualtoggle").textContent = $("#prayerfields").classList.contains(
      "hidden",
    )
      ? "Elle gir"
      : "Alanları kapat";
  });
  $("#peek-config").onclick = handleAction(() => window.openPrayerSettings?.());
  $("#method").onchange = handleAction((e) => times.setMethod(e.target.value));
  $("#prayerfields").onchange = handleAction((e) => {
    if (e.target.matches("input[type=time]")) {
      times.setManual(
        e.target.dataset.prayer,
        e.target.value,
        $("#city").value.trim(),
      );
      render();
      $("#prayerfields").classList.remove("hidden");
      $("#manualtoggle").textContent = "Alanları kapat";
    }
  });
  $("#peek-toggle").onclick = handleAction(() => times.togglePeek());
  return {};
}
