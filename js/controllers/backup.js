import { handleAction } from "../shared/actions.js";
import { $ } from "../shared/dom.js";
import { datekey } from "../shared/format.js";

export function bindBackup({ backup, times, render, toast }) {
  $("#export").onclick = handleAction(() => {
    try {
      const now = Date.now(),
        snapshot = backup.export();
      let blob = new Blob([JSON.stringify(snapshot, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "ikra-" + datekey(now) + ".json";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(
        "Yedek indirme başlatıldı. Dosyayı İndirilenler klasöründe bulabilirsin.",
      );
    } catch {
      toast("Yedek hazırlanamadı. Lütfen tekrar dene.");
    }
  });
  $("#import").onclick = handleAction(() => $("#importfile").click());
  $("#importfile").onchange = handleAction(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw Error("Yedek 20 MB sınırını aşıyor.");
      const parsed = JSON.parse(await file.text()),
        next = backup.validate(parsed);
      const summary = `${next.sessions.length} çalışma, ${next.tasks.length} görev, ${next.subjects.length} ders ve ${next.prayers.length} namaz kaydı yüklenecek. Mevcut kayıtlar değişecek; sayaçlar duraklatılmış olarak açılacak. Devam edilsin mi?`;
      if (!confirm(window.ikraT(summary))) return;
      times.invalidate();
      backup.restore(parsed);
      render();
      document.dispatchEvent(new Event("backup-restored"));
      toast(next.sessions.length + " çalışma kaydı ve derslerin yüklendi.");
      setTimeout(() => times.refresh(), 0);
    } catch (error) {
      toast(
        error instanceof SyntaxError
          ? "Dosya okunamadı: geçerli bir JSON yedeği seç."
          : error.message || "Yedek yüklenemedi.",
      );
    } finally {
      e.target.value = "";
    }
  });
  return {};
}
