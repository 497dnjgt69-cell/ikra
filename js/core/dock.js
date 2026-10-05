export const DOCK_IDS = ['tasks','history','anki','sounds','settings','peek','progress'];
export function normalizeDock(value) {
  const order=[...new Set((Array.isArray(value?.order)?value.order:[]).filter(id=>DOCK_IDS.includes(id)))];
  return {order:[...order,...DOCK_IDS.filter(id=>!order.includes(id))],hidden:[...new Set((Array.isArray(value?.hidden)?value.hidden:[]).filter(id=>DOCK_IDS.includes(id)))]};
}
