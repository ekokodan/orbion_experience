import React, { useEffect, useRef } from 'react';
import { Star } from '../types';

interface StarFieldProps {
  stars: Star[];
}

export const StarField: React.FC<StarFieldProps> = ({ stars }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    let animationFrameId: number;

    const render = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background static stars (faint)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for(let i=0; i<50; i++) {
          const x = (i * 137.5) % canvas.width;
          const y = (i * 293.2) % canvas.height;
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
      }

      // Draw User Earned Stars
      stars.forEach((star, index) => {
        // Draw connection line
        if (index > 0) {
            const prevStar = stars[index - 1];
            ctx.beginPath();
            ctx.moveTo(prevStar.x * canvas.width, prevStar.y * canvas.height);
            ctx.lineTo(star.x * canvas.width, star.y * canvas.height);
            ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)'; // Indigo-purple line
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw Star Glow
        const cx = star.x * canvas.width;
        const cy = star.y * canvas.height;
        
        const gradient = ctx.createRadialGradient(cx, cy, 1, cx, cy, 20);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(250, 204, 21, 0.8)'); // Yellow gold
        gradient.addColorStop(1, 'rgba(250, 204, 21, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fill();

        // Draw Center
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label (fade in effect logic simulated by just drawing it)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px "Segoe UI"';
        ctx.textAlign = 'center';
        ctx.fillText(star.label, cx, cy + 30);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [stars]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 pointer-events-none"
    />
  );
};