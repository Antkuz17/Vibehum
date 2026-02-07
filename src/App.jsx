import { useState, useCallback } from 'react'
import './styles/variables.css'
import './App.css'
import AudioRecorder from './components/AudioRecorder'
import GenreSelector from './components/GenreSelector'
import ThemeInput from './components/ThemeInput'
import GenerateButton from './components/GenerateButton'
import MusicPlayer from './components/MusicPlayer'
import LyricsDisplay from './components/LyricsDisplay'
import ArtworkDisplay from './components/ArtworkDisplay'
import { generateCompleteSong } from './services/apiService'

function App() {
  const [recordingData, setRecordingData] = useState(null)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [theme, setTheme] = useState('')
  const [generationStep, setGenerationStep] = useState('IDLE')
  const [generatedSong, setGeneratedSong] = useState(null)
  const [generationError, setGenerationError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleRecordingComplete = (data) => {
    setRecordingData(data)
  }

  const canGenerate = recordingData && selectedGenre && theme.trim().length > 0
  const isGenerating = generationStep !== 'IDLE' && generationStep !== 'COMPLETE' && generationStep !== 'ERROR'

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isGenerating) return

    setGenerationError(null)
    setGeneratedSong(null)
    setIsPlaying(false)

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

  const handleStartOver = () => {
    setGenerationStep('IDLE')
    setGenerationError(null)
    setGeneratedSong(null)
    setIsPlaying(false)
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

      {/* ─── Results Section ─── */}
      {generatedSong && generationStep === 'COMPLETE' && (
        <div className="results-section">
          {/* Two-column: lyrics left, artwork right */}
          <div className="results-grid">
            <div className="results-col-lyrics">
              <LyricsDisplay
                lyrics={generatedSong.lyrics}
                isPlaying={isPlaying}
              />
            </div>

            <div className="results-col-artwork">
              <ArtworkDisplay
                artworkUrl={generatedSong.artworkUrl}
                title={theme}
                genre={selectedGenre}
                isPlaying={isPlaying}
              />
            </div>
          </div>

          {/* Full-width player below */}
          {generatedSong.audioBlob && (
            <MusicPlayer
              audioBlob={generatedSong.audioBlob}
              title={theme}
              onPlayStateChange={setIsPlaying}
            />
          )}

          {/* Non-critical warnings */}
          {generatedSong.errors.length > 0 && (
            <div className="result-warnings">
              {generatedSong.errors.map((err, i) => (
                <p key={i} className="result-warning">{err}</p>
              ))}
            </div>
          )}

          {/* Start over button */}
          <div className="results-footer">
            <button className="start-over-btn" onClick={handleStartOver}>
              GENERATE ANOTHER SONG
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
