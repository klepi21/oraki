function hashHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

/** Deterministic per-name color so the same student always reads the same
 * hue across the calendar, lists, and every screen — a quick visual
 * anchor without needing a real photo. */
export function avatarColor(name: string): string {
  return `hsl(${hashHue(name)} 55% 42%)`;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      style={{ backgroundColor: avatarColor(name), width: size, height: size, fontSize: size * 0.42 }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
