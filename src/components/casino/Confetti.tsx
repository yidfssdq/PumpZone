import { useEffect, useState, useRef } from "react";

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
}

const EMOJIS = ["🎊", "✨", "💥", "⭐", "🎉", "💎", "🔥", "🏆", "💰", "🪙"];
const COLORS = [
  "hsl(263 70% 58%)", // primary
  "hsl(217 91% 60%)", // secondary
  "hsl(160 84% 39%)", // success
  "hsl(25 95% 53%)",  // warning
  "hsl(0 0% 100%)",
];

const Confetti = ({ intensity = "normal" }: { intensity?: "normal" | "epic" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emojiParticles, setEmojiParticles] = useState<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  // Canvas confetti (colored rectangles/circles falling)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const count = intensity === "epic" ? 150 : 60;
    const pieces: {
      x: number; y: number; w: number; h: number;
      color: string; vx: number; vy: number; rot: number; rotV: number; opacity: number;
      shape: "rect" | "circle";
    }[] = [];

    for (let i = 0; i < count; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        w: 4 + Math.random() * 8,
        h: 6 + Math.random() * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.15,
        opacity: 0.8 + Math.random() * 0.2,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }

    let frame = 0;
    const maxFrames = intensity === "epic" ? 180 : 120;

    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const fadeOut = frame > maxFrames - 30 ? (maxFrames - frame) / 30 : 1;

      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.rot += p.rotV;
        p.vx *= 0.99;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity * fadeOut;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (frame < maxFrames) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [intensity]);

  // Emoji burst from center
  useEffect(() => {
    const count = intensity === "epic" ? 30 : 15;
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 3 + Math.random() * 5;
      return {
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: 50,
        y: 40,
        rotation: Math.random() * 360,
        scale: 0.6 + Math.random() * 0.8,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 3,
        rotationSpeed: (Math.random() - 0.5) * 15,
        opacity: 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });
    setEmojiParticles(particles);
  }, [intensity]);

  // Animate emoji particles
  useEffect(() => {
    if (emojiParticles.length === 0) return;
    const interval = setInterval(() => {
      setEmojiParticles((prev) => {
        const next = prev.map((p) => ({
          ...p,
          x: p.x + p.velocityX * 0.3,
          y: p.y + p.velocityY * 0.3,
          velocityY: p.velocityY + 0.15,
          rotation: p.rotation + p.rotationSpeed,
          opacity: Math.max(0, p.opacity - 0.012),
        })).filter((p) => p.opacity > 0);
        if (next.length === 0) clearInterval(interval);
        return next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [emojiParticles.length > 0]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {emojiParticles.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            opacity: p.opacity,
            fontSize: "1.5rem",
            transition: "none",
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
};

export default Confetti;
