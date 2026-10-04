import { t, bilingual, localizedText } from "../i18n/bindings.js";
import { handleAction } from "../shared/actions.js";
import { $ } from "../shared/dom.js";
import { datekey, display, pad } from "../shared/format.js";

export function bindManualSession({ store, records, render, playSound }) {
  $("#manual-open").onclick = handleAction(() => {
    const show = $("#manual-open").getAttribute("aria-expanded") !== "true";
    $("#manual-open").setAttribute("aria-expanded", String(show));
    window.animatePanel($("#manual-body"), show);
    if (show) {
      const now = new Date();
      $("#manual-date").max = datekey(now);
      $("#manual-date").value ||= datekey(now);
      $("#manual-time").value ||= pad(now.getHours()) + ":" + pad(now.getMinutes());
      localizedText($("#manual-status"), () => "");
      $("#manual-subject").value ||= store.state.subject;
      $("#manual-subject").focus();
    }
  });
  $("#manual-minutes").addEventListener("input", () => {
    const n = Number($("#manual-minutes").value);
    localizedText($("#manual-preview"), () => Number.isInteger(n) && n > 0 && n <= 1440
      ? t(display(n * 60))
      : bilingual("Dakika olarak gir: 1 saat = 60 dakika", "Enter minutes: 1 hour = 60 minutes"));
  });
  $("#manual-minutes").dispatchEvent(new Event("input"));
  $("#manual-session-form").onsubmit = handleAction(submitManualSession);
  const manualSave = $('#manual-session-form button[type="submit"]');
  manualSave.type = "submit";
  function submitManualSession(e) {
    e?.preventDefault();
    const status = $("#manual-status");
    localizedText(status, () => "");
    try {
      const subject = $("#manual-subject").value,
        minutes = Number($("#manual-minutes").value),
        date = $("#manual-date").value;
      const record = records.addManual({ subject, minutes, date, time: $("#manual-time").value });
      render();
      $("#manual-minutes").value = "";
      localizedText($("#manual-preview"), () => "");
      $("#manual-minutes").focus();
      localizedText(status, () => record.subject + " · " + t(display(record.seconds)) +
        bilingual(" kaydedildi.", " saved."));
      window.ikraNotify(
        () => record.subject + " · " + minutes + bilingual(" dakika istatistiklerine eklendi.", " min added to your statistics."),
        { completion: true, title: "Oturum kaydedildi" },
      );
      playSound("finish");
    } catch (error) {
      localizedText(status, () => t(error.message || "Kayıt saklanamadı."));
    }
  }
  return {};
}
