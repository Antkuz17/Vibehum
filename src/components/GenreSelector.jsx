import { useState, useRef, useEffect } from 'react'
import './GenreSelector.css'

const GENRES = [
  'Lo-fi Hip Hop',
  'Energetic EDM',
  'Sad Jazz',
  'Upbeat Rock',
  'Dreamy Shoegaze',
  'Trap Beats',
  'Indie Folk',
  'Synthwave',
]

function GenreSelector({ onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleSelect = (genre) => {
    setSelectedGenre(genre)
    setIsOpen(false)
    if (onChange) onChange(genre)
  }

  const toggleOpen = () => {
    if (!disabled) setIsOpen(prev => !prev)
  }

  return (
    <div className="genre-selector" ref={containerRef}>
      <h2 className="genre-title">SELECT GENRE</h2>

      <button
        className={`genre-trigger ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={toggleOpen}
        disabled={disabled}
      >
        <span className="genre-trigger-text">
          {selectedGenre || 'Select a genre...'}
        </span>
        <span className={`genre-arrow ${isOpen ? 'is-open' : ''}`}>
          &#9662;
        </span>
      </button>

      {isOpen && (
        <div className="genre-dropdown">
          {GENRES.map((genre, index) => (
            <button
              key={genre}
              className={`genre-option ${selectedGenre === genre ? 'is-selected' : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleSelect(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default GenreSelector
