import React, { useRef, useEffect, useState, PointerEvent } from 'react';
import { playMaterialSound } from './AudioEngine';

interface InteractiveWavesProps {
  onInteract: (frequency: number) => void;
  className?: string;
  baseFrequency?: number;
}

export const InteractiveWaves: React.FC<InteractiveWavesProps> = ({ 
  onInteract, 
  className = '',
  baseFrequency = 440
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const ripplesRef = useRef<{x: number, y: number, life: number, maxLife: number}[]>([]);
  const particlesRef = useRef<{x: number, y: number, life: number, maxLife: number, vx: number, vy: number}[]>([]);
  const interactionPosRef = useRef<{x: number, y: number} | null>(null);
  const lastEmitRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      phaseRef.current += 0.05;
      
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Draw Waves
      ctx.lineWidth = 1.5;
      
      for (let w = 0; w < 4; w++) {
        ctx.beginPath();
        const offset = w * (Math.PI / 3);
        const amp = isInteracting ? 25 + w * 10 : 10 + w * 5;
        const frequency = isInteracting ? 0.02 + w * 0.005 : 0.015 + w * 0.002;
        
        for (let x = 0; x <= width; x += 5) {
          let distortion = 0;
          if (isInteracting && interactionPosRef.current) {
            const dx = x - interactionPosRef.current.x;
            const dist = Math.abs(dx);
            if (dist < 200) {
              const distortionAmp = (200 - dist) * 0.3 * (1 - interactionPosRef.current.y / height);
              distortion = Math.sin(dx * 0.05 - phaseRef.current * 3 + w) * distortionAmp;
            }
          }

          const y = height / 2 + Math.sin(x * frequency + phaseRef.current + offset) * amp + distortion;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = `rgba(160, 160, 160, ${0.15 + w * 0.1})`;
        ctx.stroke();
      }

      // Draw Particles
      particlesRef.current.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${p.life / p.maxLife * 0.8})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Draw Ripples
      ripplesRef.current.forEach(r => {
        ctx.beginPath();
        const progress = 1 - (r.life / r.maxLife);
        const radius = progress * 60;
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${r.life / r.maxLife * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        r.life -= 1;
      });

      ripplesRef.current = ripplesRef.current.filter(r => r.life > 0);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isInteracting]);

  const handleInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    interactionPosRef.current = { x, y };

    ripplesRef.current.push({ x, y, life: 25, maxLife: 25 });
    
    // Add particles for the trail
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 10, 
        y: y + (Math.random() - 0.5) * 10, 
        life: 40 + Math.random() * 20, 
        maxLife: 60,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5
      });
    }

    const now = Date.now();
    if (now - lastEmitRef.current > 80) { // throttle sound/network
      lastEmitRef.current = now;
      
      const normalizedX = Math.max(0, Math.min(1, x / canvas.width));
      const normalizedY = 1 - Math.max(0, Math.min(1, y / canvas.height));
      
      // Calculate frequency: X axis sets octave/base factor, Y axis sets fine pitch
      const factorX = 1 + normalizedX; // 1 to 2
      const factorY = 0.5 + normalizedY * 0.5; // 0.5 to 1
      
      const freq = baseFrequency * factorX * factorY;
      
      onInteract(freq);
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    setIsInteracting(true);
    handleInteraction(e.clientX, e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (isInteracting) {
      handleInteraction(e.clientX, e.clientY);
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    setIsInteracting(false);
    interactionPosRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`w-full bg-[#080808] rounded-2xl border border-[#242424] cursor-crosshair touch-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ minHeight: '120px' }}
    />
  );
};
