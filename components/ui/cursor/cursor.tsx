"use client";

import { useEffect, useState } from "react";

export const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    // Only enable on non-touch devices to avoid issues on mobile
    if (window.matchMedia("(pointer: fine)").matches) {
      const updateCursorPosition = (e: MouseEvent) => {
        setPosition({ x: e.clientX, y: e.clientY });
        
        // Check if the cursor is over a clickable element
        const target = e.target as HTMLElement;
        const isClickable = 
          target.tagName === "BUTTON" || 
          target.tagName === "A" || 
          target.closest("button") || 
          target.closest("a") ||
          window.getComputedStyle(target).cursor === "pointer";
          
        setIsPointer(isClickable);
      };

      const handleMouseDown = () => setIsClicked(true);
      const handleMouseUp = () => setIsClicked(false);
      const handleMouseEnter = () => setIsVisible(true);
      const handleMouseLeave = () => setIsVisible(false);

      document.addEventListener("mousemove", updateCursorPosition);
      document.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseenter", handleMouseEnter);
      document.addEventListener("mouseleave", handleMouseLeave);

      // Hide default cursor
      document.documentElement.style.cursor = "none";

      return () => {
        document.removeEventListener("mousemove", updateCursorPosition);
        document.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("mouseenter", handleMouseEnter);
        document.removeEventListener("mouseleave", handleMouseLeave);
        
        // Restore default cursor
        document.documentElement.style.cursor = "";
      };
    }
  }, []);

  // Don't render on touch devices
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <>
      {/* Outer ring cursor */}
      <div 
        className={`fixed pointer-events-none z-[9999] rounded-full transition-transform duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        } ${isClicked ? "scale-90" : ""}`}
        style={{
          width: isPointer ? "40px" : "24px",
          height: isPointer ? "40px" : "24px",
          border: `1.5px solid ${isPointer ? "rgba(34, 197, 94, 0.6)" : "rgba(34, 197, 94, 0.4)"}`,
          transform: `translate(${position.x - (isPointer ? 20 : 12)}px, ${position.y - (isPointer ? 20 : 12)}px)`,
          transition: "width 0.2s, height 0.2s, border 0.2s, transform 0.1s",
          mixBlendMode: "difference",
        }}
      />
      
      {/* Inner dot cursor */}
      <div 
        className={`fixed pointer-events-none z-[9999] rounded-full bg-green-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          width: isPointer ? "8px" : "6px",
          height: isPointer ? "8px" : "6px",
          transform: `translate(${position.x - (isPointer ? 4 : 3)}px, ${position.y - (isPointer ? 4 : 3)}px)`,
          transition: "width 0.2s, height 0.2s, transform 0.08s cubic-bezier(0.16, 1, 0.3, 1)",
          mixBlendMode: "difference",
        }}
      />
    </>
  );
};

export default CustomCursor;