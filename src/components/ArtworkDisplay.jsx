import { useState } from 'react'
import './ArtworkDisplay.css'

function ArtworkDisplay({ artworkUrl, title, genre, isPlaying }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  if (!artworkUrl) {
    console.warn('No artwork URL provided. Displaying placeholder.')
  }

  if (artworkUrl) {
    return (
      <div className={`artwork-display ${isPlaying ? 'is-playing' : ''}`}>
        <h3 className="artwork-title">ALBUM ART</h3>
        <div className="artwork-frame">
          {/* Loading state while Pollinations generates the image */}
          {!imageLoaded && !imageError && (
            <div className="artwork-loading">
              <div className="artwork-loading-grid">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="artwork-loading-block" />
                ))}
              </div>
              <p className="artwork-loading-text">GENERATING ARTWORK</p>
            </div>
          )}

          <img
            className="artwork-image"
            src={artworkUrl}
            alt="Generated album artwork"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />

          {/* Chromatic aberration layers — only after image loads */}
          {imageLoaded && (
            <>
              <img
                className="artwork-aberration artwork-red"
                src={artworkUrl}
                alt=""
                aria-hidden="true"
              />
              <img
                className="artwork-aberration artwork-blue"
                src={artworkUrl}
                alt=""
                aria-hidden="true"
              />
            </>
          )}

          {/* Error fallback */}
          {imageError && (
            <div className="artwork-error">
              <p className="artwork-error-text">ARTWORK UNAVAILABLE</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Placeholder when no artwork
  return (
    <div className={`artwork-display ${isPlaying ? 'is-playing' : ''}`}>
      <h3 className="artwork-title">ALBUM ART</h3>
      <div className="artwork-placeholder">
        <div className="artwork-placeholder-pattern" />
        <div className="artwork-placeholder-content">
          <p className="artwork-placeholder-title">{title || 'UNTITLED'}</p>
          <p className="artwork-placeholder-genre">{genre || 'GENRE'}</p>
        </div>
      </div>
    </div>
  )
}

export default ArtworkDisplay
