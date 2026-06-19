import React, { useRef } from 'react'
import { useScroll, useTransform, motion, MotionValue } from 'framer-motion'

interface AnimatedTextProps {
  text: string
  className?: string
  style?: React.CSSProperties
}

function CharSpan({
  char,
  start,
  end,
  scrollYProgress,
}: {
  char: string
  start: number
  end: number
  scrollYProgress: MotionValue<number>
}) {
  const opacity = useTransform(scrollYProgress, [start, end], [0.2, 1])
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={{ opacity: 0 }}>{char === ' ' ? ' ' : char}</span>
      <motion.span style={{ position: 'absolute', left: 0, top: 0, opacity }}>
        {char === ' ' ? ' ' : char}
      </motion.span>
    </span>
  )
}

export default function AnimatedText({ text, className, style }: AnimatedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.2'],
  })

  const chars = text.split('')

  return (
    <p ref={ref} className={className} style={style}>
      {chars.map((char, i) => {
        const start = i / chars.length
        const end = (i + 1) / chars.length
        return (
          <CharSpan
            key={i}
            char={char}
            start={start}
            end={end}
            scrollYProgress={scrollYProgress}
          />
        )
      })}
    </p>
  )
}
