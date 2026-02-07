import { useState, useEffect, useMemo } from 'react'
import './LyricsDisplay.css'

function LyricsDisplay({ lyrics, isPlaying }) {
  const [visibleLines, setVisibleLines] = useState(0)

  const lines = useMemo(() => {
    if (!lyrics) return []
    return lyrics.split('\n').filter(line => line.trim().length > 0)
  }, [lyrics])

  // Typewriter effect: reveal lines one by one on mount
  useEffect(() => {
    if (lines.length === 0) return

    setVisibleLines(0)
    let current = 0
    const interval = setInterval(() => {
      current++
      setVisibleLines(current)
      if (current >= lines.length) {
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [lines])

  if (!lyrics) return null

  return (
    <div className="lyrics-display">
      <h3 className="lyrics-title">LYRICS</h3>
      <div className="lyrics-scroll">
        {lines.map((line, index) => (
          <p
            key={index}
            className={`lyrics-line ${index < visibleLines ? 'is-visible' : ''} ${isPlaying && index === 0 ? 'is-highlighted' : ''}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

export default LyricsDisplay
