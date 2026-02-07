import { useState, useEffect, useMemo, useRef } from 'react'
import './LyricsDisplay.css'

function LyricsDisplay({ lyrics, isPlaying, audioRef }) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const lyricsContainerRef = useRef(null)

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

  // Lyrics sync: track current line based on audio playback time
  useEffect(() => {
    const audio = audioRef?.current
    if (!audio || lines.length === 0) return

    const updateCurrentLine = () => {
      const currentTime = audio.currentTime
      const duration = audio.duration || 30

      // Weight timing by line length for more natural pacing
      const totalChars = lines.reduce((sum, line) => sum + line.length, 0)
      let elapsed = 0
      let activeIndex = 0

      for (let i = 0; i < lines.length; i++) {
        const lineDuration = (lines[i].length / totalChars) * duration
        elapsed += lineDuration
        if (currentTime < elapsed) {
          activeIndex = i
          break
        }
        if (i === lines.length - 1) {
          activeIndex = lines.length - 1
        }
      }

      setCurrentLineIndex(activeIndex)
    }

    audio.addEventListener('timeupdate', updateCurrentLine)
    return () => audio.removeEventListener('timeupdate', updateCurrentLine)
  }, [audioRef, lines])

  // Reset highlight when not playing
  useEffect(() => {
    if (!isPlaying) {
      setCurrentLineIndex(-1)
    }
  }, [isPlaying])

  // Auto-scroll to keep current line visible
  useEffect(() => {
    if (currentLineIndex < 0 || !lyricsContainerRef.current) return

    const activeEl = lyricsContainerRef.current.querySelector('.lyrics-line.is-active')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentLineIndex])

  if (!lyrics) return null

  return (
    <div className="lyrics-display">
      <h3 className="lyrics-title">LYRICS</h3>
      <div className="lyrics-scroll" ref={lyricsContainerRef}>
        {lines.map((line, index) => {
          let lineClass = 'lyrics-line'
          if (index < visibleLines) lineClass += ' is-visible'
          if (isPlaying && index === currentLineIndex) lineClass += ' is-active'
          else if (isPlaying && currentLineIndex >= 0 && index < currentLineIndex) lineClass += ' is-past'
          else if (isPlaying && currentLineIndex >= 0 && index > currentLineIndex) lineClass += ' is-future'

          return (
            <p
              key={index}
              className={lineClass}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {line}
            </p>
          )
        })}
      </div>
    </div>
  )
}

export default LyricsDisplay
