import { useState, useRef, useEffect, useCallback } from 'react'
import { analyzeAudioBuffer, buildAnalysisText } from '../utils/audioAnalysis'
import './AudioRecorder.css'

const MAX_DURATION = 8
const MIN_DURATION = 1

function AudioRecorder({ onRecordingComplete }) {
  const [status, setStatus] = useState('idle') // idle | recording | analyzing | done | error
  const [elapsedTime, setElapsedTime] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [analysisText, setAnalysisText] = useState('')

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const canvasRef = useRef(null)
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const animationFrameRef = useRef(null)
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const startTimeRef = useRef(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
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

      // Draw frequency bars
      const barCount = 64
      const barWidth = (width / barCount) - 2
      const step = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step]
        const barHeight = (value / 255) * height * 0.9

        const x = i * (barWidth + 2)
        const y = height - barHeight

        ctx.fillStyle = '#00D9FF'
        ctx.fillRect(x, y, barWidth, barHeight)

        // Add a slight glow effect on top of tall bars
        if (barHeight > height * 0.5) {
          ctx.fillStyle = 'rgba(0, 217, 255, 0.3)'
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

    // Draw subtle baseline bars
    const barCount = 64
    const barWidth = (width / barCount) - 2

    for (let i = 0; i < barCount; i++) {
      const barHeight = 3 + Math.random() * 4
      const x = i * (barWidth + 2)
      const y = height - barHeight

      ctx.fillStyle = 'rgba(0, 217, 255, 0.2)'
      ctx.fillRect(x, y, barWidth, barHeight)
    }
  }, [])

  // Draw idle waveform on mount and when returning to idle
  useEffect(() => {
    if (status === 'idle' || status === 'done') {
      // Set canvas dimensions
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        const ctx = canvas.getContext('2d')
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
        canvas.width = rect.width
        canvas.height = rect.height
      }
      drawIdleWaveform()
    }
  }, [status, drawIdleWaveform])

  const startRecording = async () => {
    setErrorMessage(null)
    setAnalysisResults(null)
    setAnalysisText('')
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up Web Audio API for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.6
      source.connect(analyser)
      analyserRef.current = analyser

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        handleRecordingComplete(audioBlob)
      }

      mediaRecorder.start(100) // collect data every 100ms
      setStatus('recording')
      startTimeRef.current = Date.now()

      // Set canvas dimensions
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
      }

      // Start waveform visualization
      drawWaveform()

      // Start timer
      setElapsedTime(0)
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000
        setElapsedTime(Math.min(elapsed, MAX_DURATION))

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION) {
          stopRecording()
        }
      }, 100)

    } catch (err) {
      setStatus('error')
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Microphone access denied. Please allow microphone access and try again.')
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('No microphone found. Please connect a microphone and try again.')
      } else {
        setErrorMessage(`Recording failed: ${err.message}`)
      }
    }
  }

  const stopRecording = useCallback(() => {
    // Stop timer
    clearInterval(timerRef.current)

    // Stop animation
    cancelAnimationFrame(animationFrameRef.current)

    // Check minimum duration
    const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0
    if (elapsed < MIN_DURATION) {
      // Too short, keep recording
      return
    }

    // Stop MediaRecorder (triggers onstop → handleRecordingComplete)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  const handleRecordingComplete = async (audioBlob) => {
    setStatus('analyzing')

    try {
      // Decode audio blob to AudioBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Run analysis
      const results = analyzeAudioBuffer(audioBuffer)
      const text = buildAnalysisText(results)

      setAnalysisResults(results)
      setAnalysisText(text)
      setStatus('done')

      // Close the temporary audio context
      await audioContext.close()

      // Notify parent
      if (onRecordingComplete) {
        onRecordingComplete({
          audioBlob,
          analysisResults: results,
          analysisText: text,
        })
      }
    } catch (err) {
      setStatus('error')
      setErrorMessage(`Audio analysis failed: ${err.message}`)
    }
  }

  const resetRecording = () => {
    setStatus('idle')
    setElapsedTime(0)
    setErrorMessage(null)
    setAnalysisResults(null)
    setAnalysisText('')
    audioChunksRef.current = []
  }

  const formatTime = (seconds) => {
    const s = Math.floor(seconds)
    const tenths = Math.floor((seconds % 1) * 10)
    return `${s}.${tenths}`
  }

  return (
    <div className="audio-recorder">
      <h2 className="recorder-title">AUDIO CAPTURE</h2>

      {/* Waveform canvas */}
      <div className="waveform-container">
        <canvas ref={canvasRef} className="waveform-canvas" />
      </div>

      {/* Timer */}
      <div className="timer-row">
        <span className="timer-display">
          {formatTime(elapsedTime)}
        </span>
        <span className="timer-max">/ {MAX_DURATION}.0s</span>
      </div>

      {/* Status text */}
      <p className="status-text">
        {status === 'idle' && 'Press to record your hum, melody, or beatbox'}
        {status === 'recording' && 'Recording...'}
        {status === 'analyzing' && 'Analyzing audio...'}
        {status === 'done' && 'Analysis complete'}
        {status === 'error' && errorMessage}
      </p>

      {/* Controls */}
      <div className="controls-row">
        {status === 'idle' && (
          <button className="record-btn" onClick={startRecording}>
            <span className="record-btn-inner" />
            <span className="record-btn-label">RECORD</span>
          </button>
        )}

        {status === 'recording' && (
          <button className="stop-btn" onClick={stopRecording}>
            <span className="stop-btn-ring ring-1" />
            <span className="stop-btn-ring ring-2" />
            <span className="stop-btn-ring ring-3" />
            <span className="stop-btn-inner" />
            <span className="stop-btn-label">STOP</span>
          </button>
        )}

        {status === 'analyzing' && (
          <div className="analyzing-indicator">
            <div className="analyzing-bar" />
            <div className="analyzing-bar" />
            <div className="analyzing-bar" />
            <div className="analyzing-bar" />
            <div className="analyzing-bar" />
          </div>
        )}

        {status === 'done' && (
          <button className="rerecord-btn" onClick={resetRecording}>
            RE-RECORD
          </button>
        )}

        {status === 'error' && (
          <button className="rerecord-btn" onClick={resetRecording}>
            TRY AGAIN
          </button>
        )}
      </div>

      {/* Analysis results */}
      {status === 'done' && analysisResults && (
        <div className="analysis-results">
          <h3 className="analysis-title">AUDIO ANALYSIS</h3>
          <div className="analysis-grid">
            <div className="analysis-item">
              <span className="analysis-label">TEMPO</span>
              <span className="analysis-value">{analysisResults.tempo} BPM</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">KEY</span>
              <span className="analysis-value">{analysisResults.key}</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">ENERGY</span>
              <span className="analysis-value">{analysisResults.energyLevel}</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">RHYTHM</span>
              <span className="analysis-value">{analysisResults.rhythm}</span>
            </div>
            <div className="analysis-item">
              <span className="analysis-label">MELODY</span>
              <span className="analysis-value">{analysisResults.contour}</span>
            </div>
          </div>
          <p className="analysis-description">{analysisText}</p>
        </div>
      )}
    </div>
  )
}

export default AudioRecorder
