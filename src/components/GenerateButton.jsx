import './GenerateButton.css'

const STEPS = [
  { key: 'GENERATING_LYRICS', label: 'LYRICS', estimate: '~10s' },
  { key: 'GENERATING_MUSIC', label: 'MUSIC', estimate: '~45s' },
  { key: 'GENERATING_ARTWORK', label: 'ARTWORK', estimate: '~30s' },
  { key: 'COMPLETE', label: 'DONE', estimate: '' },
]

function getStepIndex(step) {
  return STEPS.findIndex(s => s.key === step)
}

function GenerateButton({ disabled, onClick, generationStep, error, onRetry }) {
  const isGenerating = generationStep !== 'IDLE' && generationStep !== 'COMPLETE' && generationStep !== 'ERROR'
  const isComplete = generationStep === 'COMPLETE'
  const isError = generationStep === 'ERROR'
  const currentIndex = getStepIndex(generationStep)

  // Idle state — show the generate button
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

  // Generating / Complete — show progress steps
  return (
    <div className="generate-section">
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
              {isActive && step.estimate && (
                <span className="progress-step-estimate">{step.estimate}</span>
              )}
            </div>
          )
        })}
      </div>

      {isGenerating && (
        <p className="progress-status">
          {generationStep === 'GENERATING_LYRICS' && 'Writing lyrics with Claude...'}
          {generationStep === 'GENERATING_MUSIC' && 'Generating your song with ElevenLabs...'}
          {generationStep === 'GENERATING_ARTWORK' && 'Creating album artwork...'}
        </p>
      )}

      {isComplete && (
        <p className="progress-complete">Generation complete</p>
      )}
    </div>
  )
}

export default GenerateButton
