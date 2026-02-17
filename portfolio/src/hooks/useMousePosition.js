import { useState, useEffect } from 'react';

/**
 * Hook that tracks the user's mouse position and normalizes it to [-1, 1] range.
 *
 * Returns:
 * - x: -1 (far left) to +1 (far right)
 * - y: -1 (bottom) to +1 (top) in WebGL convention
 *
 * Updates via requestAnimationFrame for smooth, throttled updates.
 * On touch devices, returns a static visually pleasant Julia constant.
 */
export function useMousePosition() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect if device is touch-based
    const detectTouch = () => {
      const hasTouch =
        window.matchMedia('(hover: none)').matches ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0;
      setIsTouchDevice(hasTouch);
    };

    detectTouch();

    // If touch device, use static constant and skip mouse tracking
    if (isTouchDevice) {
      setMousePos({ x: -0.4, y: 0.6 });
      return;
    }

    let rafId = null;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const handleMouseMove = (e) => {
      // Store raw mouse coordinates
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      // Schedule update via RAF to throttle to ~60fps
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          // Normalize to [-1, 1]
          // x: 0 to window.innerWidth → -1 to +1
          // y: 0 to window.innerHeight → +1 to -1 (flip for WebGL convention)
          const x = (lastMouseX / window.innerWidth) * 2 - 1;
          const y = 1 - (lastMouseY / window.innerHeight) * 2;

          setMousePos({ x, y });
          rafId = null;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isTouchDevice]);

  return mousePos;
}
