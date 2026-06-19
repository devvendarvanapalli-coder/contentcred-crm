import { useRef, useState } from "react";

export default function Magnet({
  children,
  padding = 150,
  strength = 3,
  activeTransition = "transform 0.3s ease-out",
  inactiveTransition = "transform 0.6s ease-in-out",
}) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMouseMove(e) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    setPos({ x: dx / strength, y: dy / strength });
  }

  function handleMouseEnter(e) {
    setActive(true);
    handleMouseMove(e);
  }

  function handleMouseLeave() {
    setActive(false);
    setPos({ x: 0, y: 0 });
  }

  const outer = {
    position: "relative",
    display: "inline-block",
    padding: `${padding}px`,
    margin: `-${padding}px`,
  };

  const inner = {
    willChange: "transform",
    transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
    transition: active ? activeTransition : inactiveTransition,
  };

  return (
    <div
      style={outer}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={inner} ref={ref}>
        {children}
      </div>
    </div>
  );
}
