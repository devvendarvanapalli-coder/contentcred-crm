import React, { useRef, useCallback } from 'react'

interface MagnetProps {
  children: React.ReactNode
  padding?: number
  strength?: number
  activeTransition?: string
  inactiveTransition?: string
  className?: string
}

export default function Magnet({
  children,
  strength = 3,
  activeTransition = 'transform 0.3s ease-out',
  inactiveTransition = 'transform 0.6s ease-in-out',
  className,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      ref.current.style.transition = activeTransition
      ref.current.style.transform = `translate3d(${dx / strength}px, ${dy / strength}px, 0)`
    },
    [activeTransition, strength]
  )

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return
    ref.current.style.transition = inactiveTransition
    ref.current.style.transform = 'translate3d(0,0,0)'
  }, [inactiveTransition])

  const handleMouseEnter = useCallback(() => {
    if (!ref.current) return
    const el = ref.current
    document.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', () => {
      document.removeEventListener('mousemove', handleMouseMove)
      handleMouseLeave()
    }, { once: true })
  }, [handleMouseMove, handleMouseLeave])

  return (
    <div
      ref={ref}
      className={className}
      onMouseEnter={handleMouseEnter}
      style={{ willChange: 'transform' }}
    >
      {children}
    </div>
  )
}
