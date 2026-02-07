import { useState, useCallback } from 'react'
import './styles/variables.css'
import './App.css'
import AudioRecorder from './components/AudioRecorder'
import GenreSelector from './components/GenreSelector'
import ThemeInput from './components/ThemeInput'
import GenerateButton from './components/GenerateButton'
import { generateCompleteSong } from './services/apiService'

function App() {
  const [recordingData, setRecordingData] = useState(null)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [theme, setTheme] = useState('')
  const [generationStep, setGenerationStep] = useState('IDLE')
  const [generatedSong, setGeneratedSong] = useState(null)
  const [generationError, setGenerationError] = useState(null)

  const handleRecordingComplete = (data) => {
    setRecordingData(data)
  }

  const canGenerate = recordingData && selectedGenre && theme.trim().length > 0
  const isGenerating = generationStep !== 'IDLE' && generationStep !== 'COMPLETE' && generationStep !== 'ERROR'

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isGenerating) return

    setGenerationError(null)
    setGeneratedSong(null)

    try {
      const result = await generateCompleteSong(
        recordingData,
        selectedGenre,
        theme,
        (step) => setGenerationStep(step)
      )

      setGeneratedSong(result)

      if (result.errors.length > 0) {
        console.warn('Non-critical errors:', result.errors)
      }
    } catch (err) {
      console.error('Generation failed:', err)
      setGenerationStep('ERROR')
      setGenerationError(err.message)
    }
  }, [canGenerate, isGenerating, recordingData, selectedGenre, theme])

  const handleRetry = () => {
    setGenerationStep('IDLE')
    setGenerationError(null)
  }

  return (
    <div className="app">
      <h1 className="app-title">REVERSE SHAZAM</h1>

      <AudioRecorder onRecordingComplete={handleRecordingComplete} />

      <GenreSelector
        onChange={setSelectedGenre}
        disabled={isGenerating}
      />

      <ThemeInput
        onChange={setTheme}
        disabled={isGenerating}
      />

      <GenerateButton
        disabled={!canGenerate}
        onClick={handleGenerate}
        generationStep={generationStep}
        error={generationError}
        onRetry={handleRetry}
      />

      {/* Generated song results */}
      {generatedSong && generationStep === 'COMPLETE' && (
        <div className="results-section">
          {/* Lyrics */}
          {generatedSong.lyrics && (
            <div className="result-card">
              <h3 className="result-card-title">LYRICS</h3>
              <pre className="result-lyrics">{generatedSong.lyrics}</pre>
            </div>
          )}

          {/* Audio Player + Album Art side by side */}
          <div className="result-media">
            {generatedSong.audioBlob && (
              <div className="result-card result-player-card">
                <h3 className="result-card-title">YOUR SONG</h3>
                <audio
                  className="result-audio"
                  controls
                  src={URL.createObjectURL(generatedSong.audioBlob)}
                />
              </div>
            )}

            {generatedSong.artworkUrl && (
              <div className="result-card result-artwork-card">
                <h3 className="result-card-title">ALBUM ART</h3>
                <img
                  className="result-artwork"
                  src={generatedSong.artworkUrl}
                  alt="Generated album artwork"
                />
              </div>
            )}
          </div>

          {/* Non-critical warnings */}
          {generatedSong.errors.length > 0 && (
            <div className="result-warnings">
              {generatedSong.errors.map((err, i) => (
                <p key={i} className="result-warning">{err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
