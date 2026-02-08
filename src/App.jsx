import { useState, useCallback } from 'react'
import './styles/variables.css'
import './App.css'
import LandingPage from './components/LandingPage'
import QuestionFlow from './components/QuestionFlow'
import AudioRecorder from './components/AudioRecorder'
import GenreSelector from './components/GenreSelector'
import ThemeInput from './components/ThemeInput'
import GenerateButton from './components/GenerateButton'
import MusicPlayer from './components/MusicPlayer'
import LyricsDisplay from './components/LyricsDisplay'
import ArtworkDisplay from './components/ArtworkDisplay'
import SongLibrary from './components/SongLibrary'
import { generateCompleteSong } from './services/apiService'
import { saveSongToMongo, isMongoConfigured } from './services/mongoService'

function App() {
  const [appState, setAppState] = useState('landing') // 'landing' | 'questions' | 'generate' | 'library'
  const [view, setView] = useState('generate') // 'generate' | 'library'
  const [showQuestionFlow, setShowQuestionFlow] = useState(false)
  const [recordingData, setRecordingData] = useState(null)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [theme, setTheme] = useState('')
  const [generationStep, setGenerationStep] = useState('IDLE')
  const [generatedSong, setGeneratedSong] = useState(null)
  const [generationError, setGenerationError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioRef, setAudioRef] = useState(null)

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

      // Save to MongoDB in background (non-blocking)
      if (isMongoConfigured()) {
        saveSongToMongo({
          genre: selectedGenre,
          theme,
          lyrics: result.lyrics,
          audioAnalysis: recordingData.analysisResults,
          artworkUrl: result.artworkUrl,
        }).catch(err => console.warn('Failed to save song to MongoDB:', err.message))
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

  const handleGetStarted = () => {
    setShowQuestionFlow(true)
  }

  const handleQuestionFlowClose = () => {
    setShowQuestionFlow(false)
  }

  const handleQuestionFlowComplete = (answers) => {
    console.log('Question flow completed with answers:', answers)
    
    // Close the flow
    setShowQuestionFlow(false)
    setAppState('generate')
    
    // Map answers to existing state
    if (answers.genre) {
      // Map genre IDs to genre names
      const genreMap = {
        'lofi': 'Lo-fi Hip Hop',
        'edm': 'Energetic EDM',
        'jazz': 'Sad Jazz',
        'rock': 'Upbeat Rock'
      }
      setSelectedGenre(genreMap[answers.genre])
    }
    if (answers.theme) {
      setTheme(answers.theme)
    }
    if (answers.recording) {
      setRecordingData(answers.recording)
    }
  }

  return (
    <>
      {/* Landing Page */}
      {appState === 'landing' && (
        <LandingPage onGetStarted={handleGetStarted} />
      )}

      {/* Question Flow Modal */}
      <QuestionFlow 
        isOpen={showQuestionFlow}
        onClose={handleQuestionFlowClose}
        onComplete={handleQuestionFlowComplete}
      />

      {/* Main App Content */}
      {appState === 'generate' && (
        <div className="app">
          {import.meta.env.VITE_DEMO_MODE === 'true' && (
            <div className="demo-mode-banner">
              DEMO MODE — Music generation uses mock audio
            </div>
          )}

          <h1 className="app-title">VIBEHUM</h1>

          {/* ─── Navigation ─── */}
          <nav className="app-nav">
            <button
              className={`nav-tab ${view === 'generate' ? 'is-active' : ''}`}
              onClick={() => setView('generate')}
            >
              CREATE
            </button>
            <button
              className={`nav-tab ${view === 'library' ? 'is-active' : ''}`}
              onClick={() => setView('library')}
            >
              LIBRARY
            </button>
          </nav>

          {/* ─── Generate View ─── */}
          {view === 'generate' && (
            <>
              {/* Prompt to get started if no selections yet */}
              {!recordingData && !selectedGenre && !theme && (
                <div className="get-started-prompt">
                  <h2 className="prompt-title">Ready to Create?</h2>
                  <p className="prompt-text">
                    Start by recording your melody and answering a few questions about your song.
                  </p>
                  <button 
                    className="prompt-btn"
                    onClick={() => setShowQuestionFlow(true)}
                  >
                    GET STARTED
                  </button>
                </div>
              )}

              {/* Summary of selections */}
              {(recordingData || selectedGenre || theme) && (
                <div className="selection-summary">
                  <div className="summary-header">
                    <h2 className="summary-title">YOUR SELECTIONS</h2>
                    <button 
                      className="edit-selections-btn"
                      onClick={() => setShowQuestionFlow(true)}
                      disabled={isGenerating}
                    >
                      EDIT
                    </button>
                  </div>
                  
                  {recordingData && (
                    <div className="summary-item">
                      <span className="summary-label">AUDIO</span>
                      <span className="summary-value">Recording complete ({recordingData.analysisResults?.tempo || 'Unknown'} BPM)</span>
                    </div>
                  )}
                  
                  {selectedGenre && (
                    <div className="summary-item">
                      <span className="summary-label">GENRE</span>
                      <span className="summary-value">{selectedGenre}</span>
                    </div>
                  )}
                  
                  {theme && (
                    <div className="summary-item">
                      <span className="summary-label">THEME</span>
                      <span className="summary-value">{theme}</span>
                    </div>
                  )}
                </div>
              )}

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
                        audioRef={audioRef}
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
                      onAudioRef={setAudioRef}
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
            </>
          )}

          {/* ─── Library View ─── */}
          {view === 'library' && (
            <SongLibrary />
          )}
        </div>
      )}
    </>
  )
}

export default App
