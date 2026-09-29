const palette = [
  "#6d91c7",
  "#b887c4",
  "#65a69b",
  "#c49b61",
  "#cf8390",
  "#8189bd",
];
export function subjectColor(d, name) {
  const color = d.subjectColors?.[name];
  return /^#[0-9a-f]{6}$/i.test(color || "")
    ? color
    : palette[Math.max(0, d.subjects.indexOf(name)) % palette.length];
}
export function ensureSubject(d, name, color) {
  name = String(name).trim().slice(0, 60);
  if (!name) return "";
  d.archivedSubjects = (d.archivedSubjects || []).filter((x) => x !== name);
  if (!d.subjects.includes(name)) d.subjects.push(name);
  if (!d.subjects.includes(d.subject)) d.subject = d.subjects[0] || "";
  d.subjectColors = {
    ...d.subjectColors,
    [name]: /^#[0-9a-f]{6}$/i.test(color || "") ? color : subjectColor(d, name),
  };
  return name;
}
