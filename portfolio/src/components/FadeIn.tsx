import { motion, Variants } from 'framer-motion'
import React from 'react'

interface FadeInProps {
  children: React.ReactNode
  delay?: number
  duration?: number
  x?: number
  y?: number
  className?: string
  as?: keyof JSX.IntrinsicElements
}

export default function FadeIn({
  children,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  className,
  as = 'div',
}: FadeInProps) {
  const variants: Variants = {
    hidden: { opacity: 0, x, y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  }

  const MotionEl = motion[as as keyof typeof motion] as typeof motion.div

  return (
    <MotionEl
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '50px', amount: 0 }}
      variants={variants}
    >
      {children}
    </MotionEl>
  )
}
