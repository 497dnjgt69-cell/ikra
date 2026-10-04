export const pad = (value) => String(value).padStart(2, "0");
export function datekey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function isDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(value + "T12:00:00");
  return !isNaN(date) && datekey(date) === value;
}
export function fmt(value) {
  const seconds = Math.max(0, Math.floor(value));
  return pad(Math.floor(seconds / 60)) + ":" + pad(seconds % 60);
}
export function display(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return (
    [
      Math.floor(seconds / 3600) ? Math.floor(seconds / 3600) + " sa" : "",
      Math.floor((seconds % 3600) / 60)
        ? Math.floor((seconds % 3600) / 60) + " dk"
        : "",
    ]
      .filter(Boolean)
      .join(" ") || (seconds > 0 ? "<1 dk" : "0 dk")
  );
}
export const newId = () =>
  globalThis.crypto?.randomUUID?.() || Date.now() + "-" + Math.random();
