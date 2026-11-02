import { useEffect, useState } from 'react'

export function useCooldown(seconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(seconds)
  const isCoolingDown = secondsLeft > 0

  useEffect(() => {
    if (!isCoolingDown) return
    const timer = setInterval(() => setSecondsLeft((left) => left - 1), 1000)
    return () => clearInterval(timer)
  }, [isCoolingDown])

  return { secondsLeft, restart: () => setSecondsLeft(seconds) }
}
