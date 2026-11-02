import { useEffect, useState } from 'react'

export function useSlideshow(count: number, intervalMs: number) {
  const [index, setIndex] = useState(0)
  // People who ask for less motion start on a still photo and can press play themselves.
  const [isPlaying, setIsPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), intervalMs)
    return () => clearInterval(timer)
  }, [count, intervalMs, isPlaying])

  return { index, isPlaying, togglePlaying: () => setIsPlaying((playing) => !playing) }
}
