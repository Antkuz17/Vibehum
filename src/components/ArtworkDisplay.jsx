import './ArtworkDisplay.css'

function ArtworkDisplay({ artworkUrl, title, genre, isPlaying }) {
  if (artworkUrl) {
    return (
      <div className={`artwork-display ${isPlaying ? 'is-playing' : ''}`}>
        <h3 className="artwork-title">ALBUM ART</h3>
        <div className="artwork-frame">
          <img
            className="artwork-image"
            src={artworkUrl}
            alt="Generated album artwork"
          />
          {/* Chromatic aberration layers */}
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
