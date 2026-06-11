import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function CountUp({ to, prefix = "", suffix = "", duration = 1.5 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      setN(Math.floor(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span>{prefix}{n.toLocaleString()}{suffix}</span>;
}

export function GlassCard({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`glass rounded-2xl ${glow ? "neon-border-cyan" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function NeonHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-display font-bold tracking-tight ${className}`}>
      {children}
    </h2>
  );
}
