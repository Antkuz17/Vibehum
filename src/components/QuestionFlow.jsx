import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AudioRecorder from './AudioRecorder'
import './QuestionFlow.css'

const questions = [
  {
    id: 'record',
    title: 'Record Your Melody',
    description: 'Hum, sing, or beatbox for 5-8 seconds to get started',
    type: 'recorder'
  },
  {
    id: 'genre',
    title: 'Choose Your Genre',
    description: 'What style resonates with your vibe?',
    type: 'genre',
    options: [
      { id: 'lofi', label: 'Lo-fi Hip Hop' },
      { id: 'edm', label: 'Energetic EDM' },
      { id: 'jazz', label: 'Sad Jazz' },
      { id: 'rock', label: 'Upbeat Rock' }
    ]
  },
  {
    id: 'theme',
    title: 'What\'s Your Song About?',
    description: 'Describe the theme or feeling of your song',
    type: 'text',
    placeholder: 'e.g., "a song about pi in the sky" or "summer nostalgia"',
    buttonText: 'FINISH'
  }
]

function QuestionFlow({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({
    genre: null,
    theme: '',
    recording: null
  })
  const [direction, setDirection] = useState(1) // 1 for forward, -1 for backward

  const currentQuestion = questions[currentStep]

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    } else {
      // All questions answered, complete the flow
      onComplete(answers)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleGenreSelect = (genreId) => {
    setAnswers(prev => ({ ...prev, genre: genreId }))
    // Auto-advance after selection
    setTimeout(() => handleNext(), 400)
  }

  const handleThemeChange = (e) => {
    setAnswers(prev => ({ ...prev, theme: e.target.value }))
  }

  const handleRecordingComplete = (recordingData) => {
    setAnswers(prev => ({ ...prev, recording: recordingData }))
  }

  const canProceed = () => {
    if (currentQuestion.id === 'record') return answers.recording !== null
    if (currentQuestion.id === 'genre') return answers.genre !== null
    if (currentQuestion.id === 'theme') return answers.theme.trim().length > 0
    return false
  }

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }

  const windowVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 50
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1]
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  const contentVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1]
      }
    },
    exit: (direction) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="question-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
        >
          <motion.div
            className="question-window"
            variants={windowVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress indicator */}
            <div className="question-progress">
              {questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                />
              ))}
            </div>

            {/* Close button */}
            <button className="question-close" onClick={onClose}>
              ✕
            </button>

            {/* Question content with animation */}
            <div className="question-content-wrapper">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentQuestion.id}
                  custom={direction}
                  variants={contentVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="question-content"
                >
                  <h2 className="question-title">{currentQuestion.title}</h2>
                  <p className="question-description">{currentQuestion.description}</p>

                  {/* Render different question types */}
                  {currentQuestion.type === 'recorder' && (
                    <div className="question-recorder">
                      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                    </div>
                  )}

                  {currentQuestion.type === 'genre' && (
                    <div className="genre-options">
                      {currentQuestion.options.map((option) => (
                        <motion.button
                          key={option.id}
                          className={`genre-option ${answers.genre === option.id ? 'selected' : ''}`}
                          onClick={() => handleGenreSelect(option.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="genre-label">{option.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === 'text' && (
                    <div className="question-input-wrapper">
                      <input
                        type="text"
                        className="question-input"
                        placeholder={currentQuestion.placeholder}
                        value={answers.theme}
                        onChange={handleThemeChange}
                        autoFocus
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="question-nav">
              {currentStep > 0 && (
                <motion.button
                  className="nav-btn nav-btn-back"
                  onClick={handleBack}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  BACK
                </motion.button>
              )}

              {currentQuestion.type !== 'genre' && currentQuestion.type !== 'recorder' && (
                <motion.button
                  className={`nav-btn nav-btn-next ${!canProceed() ? 'disabled' : ''}`}
                  onClick={handleNext}
                  disabled={!canProceed()}
                  whileHover={canProceed() ? { scale: 1.05 } : {}}
                  whileTap={canProceed() ? { scale: 0.95 } : {}}
                >
                  {currentStep === questions.length - 1 ? 'FINISH' : (currentQuestion.buttonText || 'NEXT')}
                </motion.button>
              )}

              {currentQuestion.type === 'recorder' && answers.recording && (
                <motion.button
                  className="nav-btn nav-btn-next"
                  onClick={handleNext}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  NEXT
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default QuestionFlow
