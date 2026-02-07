import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import './MusicPlayer.css'

function MusicPlayer({ audioBlob, title, onPlayStateChange, onAudioRef }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const sourceRef = useRef(null)
  const animationFrameRef = useRef(null)

  const audioUrl = useMemo(() => {
    if (!audioBlob) return null
    return URL.createObjectURL(audioBlob)
  }, [audioBlob])

  // Expose audio ref to parent for lyrics sync
  useEffect(() => {
    if (onAudioRef) onAudioRef(audioRef)
  }, [onAudioRef])

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [audioUrl])

  // Set up Web Audio API analyser when audio element is ready
  const connectAnalyser = useCallback(() => {
    if (sourceRef.current || !audioRef.current) return

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = ctx
      const source = ctx.createMediaElementSource(audioRef.current)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      analyser.connect(ctx.destination)
      analyserRef.current = analyser
      sourceRef.current = source
    } catch (e) {
      console.warn('Could not create audio analyser:', e.message)
    }
  }, [])

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      const width = canvas.width
      const height = canvas.height

      ctx.fillStyle = '#0A0A0A'
      ctx.fillRect(0, 0, width, height)

      const barCount = 48
      const barWidth = (width / barCount) - 2
      const step = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step]
        const barHeight = (value / 255) * height * 0.85

        const x = i * (barWidth + 2)
        const y = height - barHeight

        ctx.fillStyle = '#00D9FF'
        ctx.fillRect(x, y, barWidth, barHeight)

        if (barHeight > height * 0.5) {
          ctx.fillStyle = 'rgba(0, 217, 255, 0.25)'
          ctx.fillRect(x - 1, y - 2, barWidth + 2, 4)
        }
      }
    }

    draw()
  }, [])

  const drawIdleWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    ctx.fillStyle = '#0A0A0A'
    ctx.fillRect(0, 0, width, height)

    const barCount = 48
    const barWidth = (width / barCount) - 2

    for (let i = 0; i < barCount; i++) {
      const barHeight = 2 + Math.random() * 3
      const x = i * (barWidth + 2)
      ctx.fillStyle = 'rgba(0, 217, 255, 0.15)'
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
    }
  }, [])

  // Size canvas and draw idle state
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    drawIdleWaveform()
  }, [drawIdleWaveform])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    connectAnalyser()
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }

    if (isPlaying) {
      audio.pause()
      cancelAnimationFrame(animationFrameRef.current)
      setIsPlaying(false)
      onPlayStateChange?.(false)
    } else {
      audio.play()
      drawWaveform()
      setIsPlaying(true)
      onPlayStateChange?.(true)
    }
  }

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current?.currentTime || 0)
  }

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0)
  }

  const handleEnded = () => {
    setIsPlaying(false)
    cancelAnimationFrame(animationFrameRef.current)
    drawIdleWaveform()
    onPlayStateChange?.(false)
  }

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = ratio * duration
    }
  }

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `${title || 'generated-song'}.webm`
    a.click()
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="music-player">
      <h3 className="player-title">YOUR SONG</h3>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Waveform visualization */}
      <div className="player-waveform-container">
        <canvas ref={canvasRef} className="player-waveform" />
      </div>

      {/* Controls row */}
      <div className="player-controls">
        <button className="player-play-btn" onClick={togglePlay}>
          {isPlaying ? (
            <svg className="player-icon" viewBox="0 0 24 24" width="24" height="24">
              <rect x="6" y="4" width="4" height="16" fill="currentColor" />
              <rect x="14" y="4" width="4" height="16" fill="currentColor" />
            </svg>
          ) : (
            <svg className="player-icon" viewBox="0 0 24 24" width="24" height="24">
              <polygon points="6,4 20,12 6,20" fill="currentColor" />
            </svg>
          )}
        </button>

        {/* Progress bar */}
        <div className="player-progress-wrapper">
          <div className="player-progress-track" onClick={handleSeek}>
            <div className="player-progress-fill" style={{ width: `${progress}%` }}>
              <div className="player-progress-shimmer" />
            </div>
          </div>
          <div className="player-time">
            <span className="player-time-current">{formatTime(currentTime)}</span>
            <span className="player-time-separator">/</span>
            <span className="player-time-duration">{formatTime(duration)}</span>
          </div>
        </div>

        <button className="player-download-btn" onClick={handleDownload}>
          SAVE
        </button>
      </div>
    </div>
  )
}

export default MusicPlayer
