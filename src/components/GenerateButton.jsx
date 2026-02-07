import { useState, useEffect } from 'react'
import './GenerateButton.css'

const STEPS = [
  { key: 'GENERATING_LYRICS', label: 'LYRICS', estimateSeconds: 10 },
  { key: 'GENERATING_MUSIC', label: 'MUSIC', estimateSeconds: 45 },
  { key: 'GENERATING_ARTWORK', label: 'ARTWORK', estimateSeconds: 30 },
  { key: 'COMPLETE', label: 'DONE', estimateSeconds: 0 },
]

const PIXEL_BLOCKS = 12

function getStepIndex(step) {
  return STEPS.findIndex(s => s.key === step)
}

function GenerateButton({ disabled, onClick, generationStep, error, onRetry }) {
  const [elapsed, setElapsed] = useState(0)
  const isGenerating = generationStep !== 'IDLE' && generationStep !== 'COMPLETE' && generationStep !== 'ERROR'
  const isComplete = generationStep === 'COMPLETE'
  const isError = generationStep === 'ERROR'
  const currentIndex = getStepIndex(generationStep)

  // Timer for elapsed seconds in current step
  useEffect(() => {
    if (!isGenerating) {
      setElapsed(0)
      return
    }
    setElapsed(0)
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return () => clearInterval(interval)
  }, [generationStep, isGenerating])

  // Idle state
  if (generationStep === 'IDLE') {
    return (
      <div className="generate-section">
        <button
          className={`generate-btn ${disabled ? 'is-disabled' : ''}`}
          onClick={onClick}
          disabled={disabled}
        >
          GENERATE SONG
        </button>
        {disabled && (
          <p className="generate-hint">
            Record audio, select a genre, and enter a theme to begin
          </p>
        )}
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="generate-section">
        <div className="generate-error">
          <p className="generate-error-text">{error}</p>
          <button className="generate-retry-btn" onClick={onRetry}>
            TRY AGAIN
          </button>
        </div>
      </div>
    )
  }

  // Active step info
  const activeStep = STEPS[currentIndex] || STEPS[0]
  const remaining = Math.max(0, activeStep.estimateSeconds - elapsed)

  // Calculate pixel blocks filled
  const ratio = activeStep.estimateSeconds > 0
    ? Math.min(elapsed / activeStep.estimateSeconds, 1)
    : 0
  const filledBlocks = Math.floor(ratio * PIXEL_BLOCKS)

  return (
    <div className="generate-section">
      {/* Step labels */}
      <div className="progress-steps">
        {STEPS.map((step, index) => {
          const isActive = step.key === generationStep
          const isDone = currentIndex > index || isComplete

          return (
            <div
              key={step.key}
              className={`progress-step ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`}
            >
              <div className="progress-step-indicator">
                <div className="progress-step-fill" />
              </div>
              <span className="progress-step-label">{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* Pixel progress bar */}
      {isGenerating && (
        <div className="pixel-progress">
          <div className="pixel-progress-track">
            {Array.from({ length: PIXEL_BLOCKS }).map((_, i) => (
              <div
                key={i}
                className={`pixel-block ${i < filledBlocks ? 'is-filled' : ''} ${i === filledBlocks ? 'is-current' : ''}`}
              />
            ))}
          </div>
          <div className="pixel-progress-info">
            <span className="pixel-progress-step">
              {generationStep === 'GENERATING_LYRICS' && 'Writing lyrics with Claude...'}
              {generationStep === 'GENERATING_MUSIC' && 'Generating your song...'}
              {generationStep === 'GENERATING_ARTWORK' && 'Creating album artwork...'}
            </span>
            <span className="pixel-progress-time">
              ~{remaining}s remaining
            </span>
          </div>
        </div>
      )}

      {/* Scan line overlay during generation */}
      {isGenerating && <div className="scanline-overlay" />}

      {isComplete && (
        <p className="progress-complete">Generation complete</p>
      )}
    </div>
  )
}

export default GenerateButton
