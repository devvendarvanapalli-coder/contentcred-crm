import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export default function AnimatedText({ text, className, style }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.2"],
  });

  const chars = text.split("");

  return (
    <p ref={ref} className={className} style={{ position: "relative", ...style }}>
      {chars.map((char, i) => {
        const start = i / chars.length;
        const end = start + 1 / chars.length;
        return (
          <Char
            key={i}
            char={char}
            scrollYProgress={scrollYProgress}
            start={start}
            end={end}
          />
        );
      })}
    </p>
  );
}

function Char({ char, scrollYProgress, start, end }) {
  const opacity = useTransform(scrollYProgress, [start, end], [0.2, 1]);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ opacity: 0 }}>{char === " " ? " " : char}</span>
      <motion.span style={{ opacity, position: "absolute", left: 0, top: 0 }}>
        {char === " " ? " " : char}
      </motion.span>
    </span>
  );
}
