import { useEffect, useRef } from "react";

// Optimised space canvas — 30fps cap, edges cached, gradients pre-built

interface Star {
  x: number; y: number; r: number;
  alpha: number; twinkleSpeed: number; twinklePhase: number;
  color: string; isBright: boolean;
}
interface Shooter {
  x: number; y: number; vx: number; vy: number;
  len: number; alpha: number; life: number; maxLife: number;
  color: string; active: boolean;
}
interface NeonDot {
  x: number; y: number; vx: number; vy: number;
  r: number; hex: string; alpha: number; life: number; maxLife: number;
}

const NEON = ["#ff1a4e","#00ffe0","#ff6600","#7c3aed","#00b4ff","#ff0088","#00ff77","#ffcc00"];

const hex2rgb = (hex: string) => [
  parseInt(hex.slice(1,3),16),
  parseInt(hex.slice(3,5),16),
  parseInt(hex.slice(5,7),16),
] as const;

// Build a simple edge list once — no per-frame recompute
function buildEdges(nodes: { x:number; y:number }[], maxDist: number): [number,number][] {
  const edges: [number,number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i+1; j < nodes.length; j++) {
      const d = Math.hypot(nodes[i].x-nodes[j].x, nodes[i].y-nodes[j].y);
      if (d < maxDist) {
        const k = `${i}-${j}`;
        if (!seen.has(k)) { seen.add(k); edges.push([i,j]); }
      }
    }
  }
  return edges;
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, animId = 0, tick = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5); // cap DPR
    const FPS_INTERVAL = 1000 / 30; // 30fps cap
    let lastTime = 0;

    let stars: Star[] = [];
    let shooters: Shooter[] = [];
    let neons: NeonDot[] = [];

    const STAR_COLORS = ["255,255,255","240,248,255","255,248,240","200,220,255"];

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildStars();
    };

    const buildStars = () => {
      stars = [];
      // Micro dust (70)
      for (let i = 0; i < 70; i++) stars.push({
        x: Math.random()*W*0.68, y: Math.random()*H,
        r: 0.3+Math.random()*0.5, alpha: 0.15+Math.random()*0.3,
        twinkleSpeed: 0.005+Math.random()*0.01, twinklePhase: Math.random()*Math.PI*2,
        color: STAR_COLORS[0], isBright: false,
      });
      // Medium (40)
      for (let i = 0; i < 40; i++) stars.push({
        x: Math.random()*W*0.70, y: Math.random()*H,
        r: 0.6+Math.random()*0.9, alpha: 0.4+Math.random()*0.4,
        twinkleSpeed: 0.008+Math.random()*0.018, twinklePhase: Math.random()*Math.PI*2,
        color: STAR_COLORS[Math.floor(Math.random()*STAR_COLORS.length)], isBright: false,
      });
      // Bright with spikes (10)
      for (let i = 0; i < 10; i++) stars.push({
        x: 30+Math.random()*W*0.6, y: 30+Math.random()*H*0.85,
        r: 1.4+Math.random()*1.8, alpha: 0.75+Math.random()*0.25,
        twinkleSpeed: 0.015+Math.random()*0.025, twinklePhase: Math.random()*Math.PI*2,
        color: STAR_COLORS[0], isBright: true,
      });
    };

    const drawStar = (s: Star, a: number) => {
      if (a <= 0.02) return;
      const c = s.color;
      if (s.isBright) {
        // Halo — one gradient, no nested loops
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r*6, 0, Math.PI*2);
        const halo = ctx.createRadialGradient(s.x,s.y,0, s.x,s.y, s.r*6);
        halo.addColorStop(0, `rgba(${c},${a*0.3})`);
        halo.addColorStop(1, `rgba(${c},0)`);
        ctx.fillStyle = halo; ctx.fill();
        // 2 cross spikes only (not 4)
        for (const [dx,dy] of [[s.r*16,0],[0,s.r*16]] as const) {
          const sg = ctx.createLinearGradient(s.x-dx,s.y-dy, s.x+dx,s.y+dy);
          sg.addColorStop(0,   `rgba(${c},0)`);
          sg.addColorStop(0.48,`rgba(${c},${a*0.18})`);
          sg.addColorStop(0.5, `rgba(${c},${a*0.55})`);
          sg.addColorStop(0.52,`rgba(${c},${a*0.18})`);
          sg.addColorStop(1,   `rgba(${c},0)`);
          ctx.beginPath();
          ctx.moveTo(s.x-dx,s.y-dy); ctx.lineTo(s.x+dx,s.y+dy);
          ctx.strokeStyle = sg; ctx.lineWidth = s.r*0.3; ctx.stroke();
        }
      }
      // Core dot
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r*(s.isBright?2:1.3), 0, Math.PI*2);
      ctx.fillStyle = `rgba(${c},${Math.min(1,a)})`;
      ctx.fill();
    };

    const spawnShooter = () => {
      const x = 40+Math.random()*W*0.55;
      const y = 20+Math.random()*H*0.45;
      const angle = (15+Math.random()*25)*(Math.PI/180);
      const speed = 9+Math.random()*12;
      const life = 45+Math.random()*35;
      shooters.push({
        x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
        len: 80+Math.random()*100, alpha: 1,
        life, maxLife: life, color: "255,255,255", active: true,
      });
    };

    const drawShooter = (s: Shooter, a: number) => {
      const mag = Math.hypot(s.vx,s.vy);
      const nx=s.vx/mag, ny=s.vy/mag;
      const tx=s.x-nx*s.len, ty=s.y-ny*s.len;
      const sg = ctx.createLinearGradient(tx,ty,s.x,s.y);
      sg.addColorStop(0,   `rgba(${s.color},0)`);
      sg.addColorStop(0.6, `rgba(${s.color},${a*0.4})`);
      sg.addColorStop(1,   `rgba(${s.color},${a})`);
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(s.x,s.y);
      ctx.strokeStyle=sg; ctx.lineWidth=1.6; ctx.lineCap="round"; ctx.stroke();
      // Head glow
      ctx.beginPath(); ctx.arc(s.x,s.y,4,0,Math.PI*2);
      const hg=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,4);
      hg.addColorStop(0,`rgba(${s.color},${a})`);
      hg.addColorStop(1,`rgba(${s.color},0)`);
      ctx.fillStyle=hg; ctx.fill();
    };

    const spawnNeon = () => {
      const x=W*0.52+Math.random()*W*0.44;
      const y=H*0.28+Math.random()*H*0.65;
      const angle=Math.random()*Math.PI*2;
      const speed=0.2+Math.random()*0.6;
      const life=90+Math.random()*120;
      const hex=NEON[Math.floor(Math.random()*NEON.length)];
      neons.push({ x,y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-0.3,
        r:1.5+Math.random()*3, hex, alpha:0.6+Math.random()*0.4, life, maxLife:life });
    };

    const drawNeon = (p: NeonDot, a: number) => {
      if (a <= 0.02) return;
      const [r,g,b]=hex2rgb(p.hex);
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r*2.5,0,Math.PI*2);
      const bloom=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2.5);
      bloom.addColorStop(0,`rgba(${r},${g},${b},${a*0.5})`);
      bloom.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=bloom; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${r},${g},${b},${a})`; ctx.fill();
    };

    // Very subtle atmosphere gradient — drawn once per frame (cheap rect fill)
    const drawAtmo = () => {
      const g=ctx.createLinearGradient(W*0.4,0,W,H*0.5);
      g.addColorStop(0,"rgba(80,140,255,0)");
      g.addColorStop(0.4,"rgba(60,120,255,0.05)");
      g.addColorStop(1,"rgba(40,100,220,0)");
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    };

    // ── Main loop ── capped at 30fps ────────────────────────────────
    const draw = (ts: number) => {
      animId = requestAnimationFrame(draw);
      if (ts - lastTime < FPS_INTERVAL) return; // skip frames
      lastTime = ts - ((ts - lastTime) % FPS_INTERVAL);
      tick++;

      ctx.clearRect(0,0,W,H);
      drawAtmo();

      // Stars
      for (const s of stars) {
        s.twinklePhase += s.twinkleSpeed;
        const a = s.alpha*(s.isBright
          ? 0.6+0.4*Math.sin(s.twinklePhase)
          : 0.45+0.55*Math.sin(s.twinklePhase));
        drawStar(s, Math.max(0,a));
      }

      // Shooting stars every ~7s
      if (tick % 210 === 0 && Math.random()<0.75) {
        spawnShooter();
        if (Math.random()<0.2) setTimeout(spawnShooter, 500+Math.random()*500);
      }
      shooters = shooters.filter(s=>s.active);
      for (const s of shooters) {
        s.life--;
        if (s.life<=0){s.active=false;continue;}
        s.x+=s.vx; s.y+=s.vy;
        const p=1-s.life/s.maxLife;
        const a=p<0.12?p/0.12:p>0.7?(1-p)/0.3:1;
        drawShooter(s,Math.max(0,a));
      }

      // Neon particles
      if (tick%8===0 && Math.random()<0.5) spawnNeon();
      neons = neons.filter(p=>p.life>0);
      for (const p of neons) {
        p.life--; p.x+=p.vx; p.y+=p.vy; p.vy-=0.005;
        const t=1-p.life/p.maxLife;
        const a=p.alpha*(t<0.12?t/0.12:t>0.75?(1-t)/0.25:1);
        drawNeon(p,Math.max(0,a));
      }
    };

    resize();
    window.addEventListener("resize", resize);
    setTimeout(spawnShooter, 1500);
    setTimeout(spawnShooter, 4500);
    for (let i=0;i<8;i++) setTimeout(spawnNeon, i*180);

    animId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <>
      <div style={{ position:"fixed",inset:0,zIndex:-3,
        backgroundImage:"url('/space-bg.png')",
        backgroundSize:"cover", backgroundPosition:"center right" }}/>
      <div style={{ position:"fixed",inset:0,zIndex:-3,
        background:"linear-gradient(105deg,rgba(0,0,4,0.62) 0%,rgba(0,0,8,0.35) 45%,rgba(0,0,4,0.12) 100%)" }}/>
      <canvas ref={canvasRef} style={{
        position:"fixed",inset:0,width:"100vw",height:"100vh",
        zIndex:-2,pointerEvents:"none",display:"block",
        willChange:"transform", // GPU layer hint
      }}/>
    </>
  );
}
