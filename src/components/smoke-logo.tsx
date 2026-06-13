import { motion } from "framer-motion";

/**
 * SmokeLogo — admin badge with rising white-smoke animation.
 * Layered blurred blobs animate upward + outward to simulate smoke.
 */
export function SmokeLogo({ size = 44, label = "CC" }: { size?: number; label?: string }) {
  return (
    <div
      className="relative inline-grid place-items-center select-none"
      style={{ width: size, height: size }}
      aria-label="CC Whale admin"
    >
      {/* Smoke plumes */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="absolute left-1/2 bottom-1/2 rounded-full"
            style={{
              width: size * 0.55,
              height: size * 0.55,
              x: "-50%",
              background:
                "radial-gradient(closest-side, rgba(255,255,255,0.55), rgba(255,255,255,0.18) 60%, rgba(255,255,255,0) 80%)",
              filter: "blur(6px)",
              mixBlendMode: "screen",
            }}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{
              y: [-size * 0.2, -size * 1.4],
              x: ["-50%", `calc(-50% + ${(i % 2 ? 1 : -1) * size * 0.25}px)`],
              opacity: [0, 0.7, 0],
              scale: [0.5, 1.4, 1.8],
            }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Core badge */}
      <div
        className="relative rounded-full grid place-items-center font-black font-display tracking-wider text-foreground"
        style={{
          width: size * 0.78,
          height: size * 0.78,
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.98 0 0), oklch(0.78 0 0))",
          boxShadow:
            "0 0 24px rgba(255,255,255,0.45), inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -2px 6px rgba(0,0,0,0.25)",
          fontSize: size * 0.32,
          color: "#0a0a0a",
        }}
      >
        {label}
      </div>

      {/* Subtle ring pulse */}
      <motion.span
        className="absolute inset-0 rounded-full border border-white/30 pointer-events-none"
        animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
