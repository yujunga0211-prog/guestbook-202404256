// 시각은 한국 시간(Asia/Seoul) 기준 "2026-09-30 14:05"로 보여준다.
const seoulParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatSeoulDateTime(date: Date): string {
  const p = Object.fromEntries(seoulParts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
