// Decorative fire along the bottom edge. Fixed per-tongue values (no Math.random) keep server and client markup identical.
const TONGUES = Array.from({ length: 28 }, (_, i) => ({
  height: 7 + ((i * 7) % 6) * 1.4,
  duration: 0.5 + ((i * 5) % 7) * 0.1,
  delay: -((i * 3) % 10) * 0.13,
}));

export default function Flames() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-0 flex h-56 items-end justify-center overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-orange-600/70 via-red-700/40 to-transparent blur-xl" />
      {TONGUES.map((t, i) => (
        <span
          key={i}
          className="flame -mx-6 w-24 shrink-0 motion-safe:animate-flicker"
          style={{ height: `${t.height}rem`, animationDuration: `${t.duration}s`, animationDelay: `${t.delay}s` }}
        />
      ))}
    </div>
  );
}
