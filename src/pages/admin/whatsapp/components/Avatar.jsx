export default function Avatar({ name, size = 40 }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
  const colors = ['#00a884', '#53bdeb', '#7c5cbf', '#fc5c68', '#f5a623', '#00bcd4'];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        background: color,
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.35)),
      }}
    >
      {initials}
    </span>
  );
}
