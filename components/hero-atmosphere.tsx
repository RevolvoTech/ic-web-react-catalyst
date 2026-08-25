"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MOTION_KEY = "catalyst-motion-paused";

interface Particle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
}

export function HeroAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      setReducedMotion(media.matches);
      const saved = window.localStorage.getItem(MOTION_KEY);
      setPaused(media.matches || saved === "true");
    };

    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || paused || reducedMotion) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const host = canvas.parentElement;
    if (!host) return;

    const canvasElement: HTMLCanvasElement = canvas;
    const drawingContext: CanvasRenderingContext2D = context;
    const hostElement: HTMLElement = host;

    let visible = true;
    let documentVisible = document.visibilityState === "visible";
    let particles: Particle[] = [];
    const snowColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-snow")
      .trim();

    function resize() {
      const bounds = hostElement.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 1.5);
      canvasElement.width = Math.round(bounds.width * density);
      canvasElement.height = Math.round(bounds.height * density);
      canvasElement.style.width = `${bounds.width}px`;
      canvasElement.style.height = `${bounds.height}px`;
      drawingContext.setTransform(density, 0, 0, density, 0, 0);

      const count = Math.min(72, Math.max(28, Math.round(bounds.width / 24)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: (index * 79.3) % Math.max(bounds.width, 1),
        y: (index * 47.7) % Math.max(bounds.height, 1),
        radius: 0.6 + (index % 4) * 0.35,
        speed: 0.28 + (index % 7) * 0.08,
        drift: 0.18 + (index % 5) * 0.07,
        phase: index * 0.83,
      }));
    }

    function draw(time: number) {
      const bounds = hostElement.getBoundingClientRect();
      drawingContext.clearRect(0, 0, bounds.width, bounds.height);
      drawingContext.fillStyle = snowColor;
      drawingContext.globalAlpha = 0.28;

      for (const particle of particles) {
        particle.y += particle.speed;
        particle.x += particle.drift + Math.sin(time / 1_300 + particle.phase) * 0.12;
        if (particle.y > bounds.height + 8) particle.y = -8;
        if (particle.x > bounds.width + 8) particle.x = -8;
        drawingContext.beginPath();
        drawingContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        drawingContext.fill();
      }

      if (visible && documentVisible) frameRef.current = requestAnimationFrame(draw);
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && documentVisible && frameRef.current === null) {
        frameRef.current = requestAnimationFrame(draw);
      } else if (!visible && frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    });

    const onVisibilityChange = () => {
      documentVisible = document.visibilityState === "visible";
      if (!documentVisible && frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      } else if (documentVisible && visible && frameRef.current === null) {
        frameRef.current = requestAnimationFrame(draw);
      }
    };

    resize();
    observer.observe(hostElement);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [paused, reducedMotion]);

  function toggleMotion() {
    const nextPaused = !paused;
    setPaused(nextPaused);
    window.localStorage.setItem(MOTION_KEY, String(nextPaused));
  }

  return (
    <>
      <div className="hero-atmosphere">
        <canvas ref={canvasRef} className="hero-atmosphere__canvas" aria-hidden="true" />
      </div>
      {!reducedMotion ? (
        <button
          className="motion-control"
          type="button"
          aria-pressed={paused}
          onClick={toggleMotion}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          <span>{paused ? "Play motion" : "Pause motion"}</span>
        </button>
      ) : null}
    </>
  );
}
