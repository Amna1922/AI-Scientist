import { useEffect, useRef } from 'react';

export default function BackgroundGraph() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0015,
      vy: (Math.random() - 0.5) * 0.0015,
    }));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(7, 12, 20, 0.28)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of points) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x <= 0 || p.x >= 1) p.vx *= -1;
        if (p.y <= 0 || p.y >= 1) p.vy *= -1;
      }

      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const a = points[i];
          const b = points[j];
          const dx = (a.x - b.x) * canvas.width;
          const dy = (a.y - b.y) * canvas.height;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 180) {
            const alpha = 1 - d / 180;
            ctx.strokeStyle = `rgba(96, 165, 250, ${alpha * 0.18})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
            ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
            ctx.stroke();
          }
        }
      }

      for (const p of points) {
        ctx.fillStyle = 'rgba(148, 197, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = window.requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="bg-graph" aria-hidden />;
}
