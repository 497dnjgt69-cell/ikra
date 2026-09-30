import { bilingual, t } from "../i18n/bindings.js";
import { display, pad, datekey } from "../shared/format.js";
import { focusDistribution, prayerWeek } from "../core/activity-insights.js";
import { prayerNames } from "../domain/prayer-timer.js";
import { handleAction } from "../shared/actions.js";

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  el.dataset.i18nManaged = "";
  return el;
}
function svgNode(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}
export function renderFocusInsights(records, start, end) {
  const root = document.querySelector('#focus-insights');
  root.replaceChildren();
  const result = focusDistribution(records, start, end);
  root.append(node('h3', '', bilingual('Odak ritmin', 'Your focus rhythm')),
    node('p', 'quiet', bilingual('Seçili dönemde gün ve saatlere göre toplam çalışma. Saatler cihazının yerel saatidir.', 'Total focus by day and hour in the selected period. Times use your device’s local timezone.')));
  const peak = result.peakHours.map(h => pad(h) + ':00–' + pad(h + 1) + ':00').join(', ');
  root.append(node('p', 'insight-highlight', result.total
    ? bilingual('En yoğun saat: ', 'Busiest hour: ') + peak
    : bilingual('Saat raporun ilk sayaç oturumundan sonra oluşacak.', 'Your hourly report will appear after your first timer session.')));
  const graph = svgNode('svg', { viewBox: '0 0 600 150', role: 'img', 'aria-label': bilingual('Saatlik toplam odak süresi', 'Total focus duration by hour'), class: 'focus-hour-chart' });
  const max = Math.max(60, ...result.hours), x = h => 40 + h * 23, y = v => 116 - v / max * 90;
  for (const fraction of [0, .5, 1]) {
    const py = y(max * fraction);
    graph.append(svgNode('line', { x1: 40, x2: 569, y1: py, y2: py, class: 'chart-guide' }));
    const label = svgNode('text', { x: 34, y: py + 4, 'text-anchor': 'end' });
    label.textContent = Math.round(max * fraction / 60); graph.append(label);
  }
  const unit = svgNode('text', { x: 5, y: 14 }); unit.textContent = bilingual('dk', 'min'); graph.append(unit);
  graph.append(svgNode('polyline', { points: result.hours.map((v, h) => `${x(h)},${y(v)}`).join(' '), class: 'chart-line' }));
  result.hours.forEach((value, h) => {
    const dot = svgNode('circle', { cx: x(h), cy: y(value), r: 3, class: 'chart-dot' });
    const title = svgNode('title', {}); title.textContent = pad(h) + ':00 · ' + t(display(value)); dot.append(title); graph.append(dot);
    if (h % 3 === 0 || h === 23) {
      const label = svgNode('text', { x: x(h), y: 140, 'text-anchor': 'middle' }); label.textContent = pad(h); graph.append(label);
    }
  });
  root.append(graph);
  const scroll = node('div', 'insight-scroll'), table = node('table', 'focus-hour-table');
  const caption = node('caption', 'quiet', bilingual('Gün × saat · Ayrıntı için bir hücre seç.', 'Day × hour · Select a cell for details.'));
  table.append(caption);
  const header = node('tr'); header.append(node('th', '', bilingual('Gün', 'Day')));
  for (let h = 0; h < 24; h++) { const th = node('th', '', pad(h)); th.scope = 'col'; header.append(th); }
  const thead = node('thead'); thead.append(header); table.append(thead);
  const body = node('tbody'), maxCell = Math.max(1, ...result.cells.flat());
  const detail = node('p', 'quiet insight-detail', bilingual('Renk koyulaştıkça çalışma süresi artar.', 'Darker cells indicate more focus time.'));
  detail.setAttribute('aria-live', 'polite');
  result.cells.forEach((hours, day) => {
    const row = node('tr'), date = new Date(2026, 8, 28 + day);
    const dayName = date.toLocaleDateString(window.ikraLocale(), { weekday: 'short' });
    const th = node('th', '', dayName); th.scope = 'row'; row.append(th);
    hours.forEach((seconds, hour) => {
      const td = node('td'), button = node('button', 'hour-cell'); button.type = 'button';
      button.dataset.level = seconds ? Math.max(1, Math.ceil(seconds / maxCell * 4)) : 0;
      const label = dayName + ' · ' + pad(hour) + ':00–' + pad(hour + 1) + ':00 · ' + t(display(seconds));
      button.title = label; button.setAttribute('aria-label', label);
      button.onclick = () => { detail.textContent = label; };
      td.append(button); row.append(td);
    });
    body.append(row);
  });
  table.append(body); scroll.append(table); root.append(scroll, detail);
  if (result.excluded) root.append(node('p', 'quiet', bilingual('Saati bilinmeyen elle eklenmiş çalışmalar saat analizine dahil değil: ', 'Manual entries without a known time are excluded from this analysis: ') + t(display(result.excluded))));
}

export function createPrayerInsights({ store, records }) {
  let anchor = new Date();
  function render() {
    const root = document.querySelector('#prayer-insights'); root.replaceChildren();
    const result = prayerWeek(store.state.prayers, store.state.prayerChecks, anchor);
    root.append(node('h3', '', bilingual('Beş vakit takibi', 'Five daily prayers')),
      node('p', 'quiet', bilingual('Kayıtlı namaz oturumların otomatik işaretlenir. Bir vakte dokunarak kaydı düzeltebilir veya kendin işaretleyebilirsin. Boş hücreler kayıt olmadığını gösterir.', 'Saved prayer sessions are marked automatically. Select a prayer to correct or mark it yourself. Empty cells mean no record.')));
    const nav = node('div', 'stat-period');
    const prev = node('button', 'button', '‹'), next = node('button', 'button', '›');
    prev.type = next.type = 'button';
    prev.setAttribute('aria-label', bilingual('Önceki hafta', 'Previous week'));
    next.setAttribute('aria-label', bilingual('Sonraki hafta', 'Next week'));
    next.disabled = result.days[6].key >= datekey(new Date());
    prev.onclick = () => { anchor.setDate(anchor.getDate() - 7); render(); };
    next.onclick = () => { anchor.setDate(anchor.getDate() + 7); render(); };
    nav.append(prev, node('strong', '', result.days[0].date.toLocaleDateString(window.ikraLocale(), { day: 'numeric', month: 'short' }) + ' – ' + result.days[6].date.toLocaleDateString(window.ikraLocale(), { day: 'numeric', month: 'short', year: 'numeric' })), next);
    root.append(nav, node('p', 'insight-highlight', bilingual(`${result.total} vakit kayıtlı · ${result.fullDays} gün beş vakit tamam`, `${result.total} prayers recorded · ${result.fullDays} days with all five recorded`)));
    const table = node('table', 'prayer-week-table'), thead = node('thead'), header = node('tr');
    header.append(node('th', '', bilingual('Gün', 'Day')));
    prayerNames.forEach(name => { const th = node('th', '', t(name)); th.scope = 'col'; header.append(th); });
    thead.append(header); table.append(thead);
    const tbody = node('tbody');
    result.days.forEach(day => {
      const row = node('tr'), label = day.date.toLocaleDateString(window.ikraLocale(), { weekday: 'short', day: 'numeric' });
      const th = node('th', '', label); th.scope = 'row'; row.append(th);
      prayerNames.forEach((name, index) => {
        const td = node('td'), done = day.values[index], button = node('button', 'prayer-check', done ? '✓' : '—');
        button.type = 'button'; button.disabled = day.future;
        button.setAttribute('aria-pressed', String(done));
        button.setAttribute('aria-label', label + ' · ' + t(name) + ' · ' + (done ? bilingual('Kayıtlı', 'Recorded') : bilingual('Kayıt yok', 'No record')));
        button.onclick = handleAction(() => {
          records.setPrayerCheck(day.key, name, !done);
          render();
        });
        td.append(button); row.append(td);
      });
      tbody.append(row);
    });
    table.append(tbody); root.append(table);
    const counts = node('div', 'prayer-counts');
    prayerNames.forEach(name => counts.append(node('span', '', t(name) + ' · ' + result.counts[name])));
    root.append(counts);
  }
  return { render };
}
