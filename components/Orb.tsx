import React, { useEffect, useRef } from 'react';
import { OrbState } from '../types';

interface OrbProps {
  state: OrbState;
  volume: number; // 0.0 to 1.0
}

export const Orb: React.FC<OrbProps> = ({ state, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animation state refs to keep values between renders for smoothness
  const timeRef = useRef(0);
  const smoothedVolRef = useRef(0);
  
  // Configuration for different states
  const getConfig = (s: OrbState) => {
    switch (s) {
      case OrbState.LISTENING:
        return {
          baseColor: { r: 56, g: 189, b: 248 }, // Cyan-400
          accentColor: { r: 14, g: 165, b: 233 }, // Sky-500
          speed: 0.002,
          noiseScale: 1.5,
          spikiness: 0.3,
          radiusBase: 100,
        };
      case OrbState.SPEAKING:
        return {
          baseColor: { r: 250, g: 204, b: 21 }, // Yellow-400
          accentColor: { r: 234, g: 179, b: 8 }, // Yellow-500
          speed: 0.005,
          noiseScale: 2.0,
          spikiness: 0.8,
          radiusBase: 110,
        };
      case OrbState.CELEBRATING:
        return {
          baseColor: { r: 236, g: 72, b: 153 }, // Pink-500
          accentColor: { r: 168, g: 85, b: 247 }, // Purple-500
          speed: 0.008,
          noiseScale: 3.0,
          spikiness: 0.5,
          radiusBase: 130,
        };
      case OrbState.THINKING:
         return {
          baseColor: { r: 255, g: 255, b: 255 },
          accentColor: { r: 148, g: 163, b: 184 },
          speed: 0.02, // Fast jitter
          noiseScale: 0.5,
          spikiness: 0.2,
          radiusBase: 90,
        };
      case OrbState.IDLE:
      default:
        return {
          baseColor: { r: 167, g: 139, b: 250 }, // Violet-400
          accentColor: { r: 139, g: 92, b: 246 }, // Violet-500
          speed: 0.001,
          noiseScale: 0.8,
          spikiness: 0.2,
          radiusBase: 100,
        };
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const size = 600; // Internal canvas size
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = '300px'; // CSS display size
    canvas.style.height = '300px';

    let animationId: number;
    const center = size / 2;

    // Pseudo-noise function (superposition of sine waves)
    const noise = (angle: number, time: number, scale: number) => {
      return Math.sin(angle * 3 + time) * 0.5 + 
             Math.cos(angle * 5 - time * 1.5) * 0.3 + 
             Math.sin(angle * 9 + time * 0.5) * 0.2;
    };

    const render = () => {
      const config = getConfig(state);
      
      // Smooth volume
      smoothedVolRef.current += (volume - smoothedVolRef.current) * 0.1;
      // Clamp volume influence
      const vol = Math.min(smoothedVolRef.current, 1.0);
      
      timeRef.current += config.speed + (vol * 0.01); // Speed up with volume

      ctx.clearRect(0, 0, size, size);

      // --- Draw Outer Glow (Aura) ---
      const auraRadius = config.radiusBase * 1.5 + (vol * 50);
      const auraGradient = ctx.createRadialGradient(center, center, config.radiusBase * 0.5, center, center, auraRadius);
      auraGradient.addColorStop(0, `rgba(${config.baseColor.r}, ${config.baseColor.g}, ${config.baseColor.b}, 0.2)`);
      auraGradient.addColorStop(1, `rgba(${config.baseColor.r}, ${config.baseColor.g}, ${config.baseColor.b}, 0)`);
      
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(center, center, auraRadius, 0, Math.PI * 2);
      ctx.fill();


      // --- Draw The Morphing Blob ---
      
      // We draw 3 layers of blobs with slight offsets for a "fluid" 3D look
      const layers = [
        { offset: 0, color: config.baseColor, alpha: 0.2, scaleMod: 1.1 }, // Outer faint
        { offset: 1, color: config.accentColor, alpha: 0.6, scaleMod: 0.95 }, // Mid shell
        { offset: 2, color: { r: 255, g: 255, b: 255 }, alpha: 0.9, scaleMod: 0.8 }, // Core highlight
      ];

      layers.forEach((layer) => {
         ctx.beginPath();
         const numPoints = 120;
         const angleStep = (Math.PI * 2) / numPoints;

         for (let i = 0; i <= numPoints; i++) {
           const angle = i * angleStep;
           
           // Calculate dynamic radius
           // Base + Noise + Volume Reaction
           const noiseVal = noise(angle, timeRef.current + layer.offset, config.noiseScale);
           
           // If Speaking, we add sharp spikes based on volume
           const spikeVal = state === OrbState.SPEAKING ? Math.pow(Math.sin(angle * 20 + timeRef.current * 5), 4) * vol * 50 : 0;
           
           const r = (config.radiusBase * layer.scaleMod) + 
                     (noiseVal * 20 * config.spikiness) + 
                     (noiseVal * vol * 80) + 
                     spikeVal;

           const x = center + Math.cos(angle) * r;
           const y = center + Math.sin(angle) * r;
           
           if (i === 0) ctx.moveTo(x, y);
           else ctx.lineTo(x, y);
         }
         
         ctx.closePath();
         
         // 3D Shading Effect
         // Create a gradient relative to the bounding box of the blob would be expensive, 
         // so we use a radial gradient slightly offset to top-left to simulate light source.
         const grad = ctx.createRadialGradient(
             center - 30, center - 30, 10, 
             center, center, config.radiusBase * 1.5
         );
         grad.addColorStop(0, `rgba(${layer.color.r}, ${layer.color.g}, ${layer.color.b}, ${layer.alpha})`);
         grad.addColorStop(1, `rgba(${layer.color.r * 0.8}, ${layer.color.g * 0.8}, ${layer.color.b * 0.8}, 0)`);
         
         ctx.fillStyle = grad;
         ctx.fill();
         
         // Add a subtle border for definition
         ctx.strokeStyle = `rgba(${layer.color.r}, ${layer.color.g}, ${layer.color.b}, 0.1)`;
         ctx.lineWidth = 1;
         ctx.stroke();
      });
      
      // Request next frame
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [state, volume]);

  return (
    <div className="flex items-center justify-center w-[300px] h-[300px]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};