import { useEffect, useRef, useState } from 'react'
import { num, clamp } from './utils.js'

export function useTicker(value, ms = 450) {
  const [display, setDisplay] = useState(value)
  const previous = useRef(value)
  const raf = useRef(0)

  useEffect(() => {
    const from = num(previous.current)
    const to = num(value)
    if (from === to) return
    const start = performance.now()

    const step = (now) => {
      const p = clamp((now - start) / ms, 0, 1)
      const eased = 1 - (1 - p) ** 3
      setDisplay(from + (to - from) * eased)
      if (p < 1) {
        raf.current = requestAnimationFrame(step)
        return
      }
      previous.current = to
    }

    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value, ms])

  return display
}
