import { useState, useEffect, useRef } from 'react'
import { getAllSongs, searchSongs, initializeDemoSongs, isMongoConfigured } from '../services/mongoService'
import DEMO_SONGS from '../data/demoSongs'
import './SongLibrary.css'

function SongLibrary() {
  const [songs, setSongs] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const searchTimeoutRef = useRef(null)

  // Load songs on mount
  useEffect(() => {
    loadSongs()
  }, [])

  async function loadSongs() {
    if (!isMongoConfigured()) {
      // Fallback: show demo songs locally when MongoDB isn't configured
      setSongs(DEMO_SONGS.map((song, i) => ({ ...song, _id: `demo-${i}` })))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      // Try to initialize demo songs first
      await initializeDemoSongs(DEMO_SONGS)
      const result = await getAllSongs()
      setSongs(result)
    } catch (err) {
      console.error('Failed to load songs:', err)
      setError(err.message)
      // Fallback to local demo songs
      setSongs(DEMO_SONGS.map((song, i) => ({ ...song, _id: `demo-${i}` })))
    } finally {
      setIsLoading(false)
    }
  }

  function handleSearchInput(e) {
    const query = e.target.value
    setSearchQuery(query)

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.trim().length === 0) {
      setHasSearched(false)
      loadSongs()
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query)
    }, 600)
  }

  async function performSearch(query) {
    if (!isMongoConfigured()) {
      // Local fallback: basic text search
      const lower = query.toLowerCase()
      const filtered = DEMO_SONGS
        .filter(s =>
          s.theme.toLowerCase().includes(lower) ||
          s.genre.toLowerCase().includes(lower) ||
          s.lyrics.toLowerCase().includes(lower)
        )
        .map((song, i) => ({ ...song, _id: `demo-${i}`, similarity: 0.85 }))
      setSongs(filtered)
      setHasSearched(true)
      return
    }

    setIsSearching(true)
    setError(null)
    try {
      const results = await searchSongs(query)
      setSongs(results)
      setHasSearched(true)
    } catch (err) {
      console.error('Search failed:', err)
      setError('Search failed — showing all songs')
      loadSongs()
    } finally {
      setIsSearching(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      if (searchQuery.trim()) performSearch(searchQuery)
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function getEnergyBar(energy) {
    const pct = Math.round((energy || 0) * 100)
    return pct
  }

  return (
    <div className="song-library">
      <div className="library-header">
        <h2 className="library-title">SONG LIBRARY</h2>
        <p className="library-subtitle">
          {isMongoConfigured() ? 'SEMANTIC SEARCH POWERED BY AI' : 'LOCAL DEMO MODE'}
        </p>
      </div>

      {/* Search Bar */}
      <div className="library-search-container">
        <input
          type="text"
          className="library-search-input"
          placeholder="Search by vibe, mood, or theme..."
          value={searchQuery}
          onChange={handleSearchInput}
          onKeyDown={handleKeyDown}
        />
        {isSearching && (
          <div className="search-indicator">
            <div className="search-indicator-bar" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="library-error">{error}</div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="library-loading">
          <div className="loading-blocks">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="loading-block" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <p className="loading-text">LOADING LIBRARY</p>
        </div>
      )}

      {/* Results Count */}
      {!isLoading && hasSearched && (
        <div className="library-results-info">
          <span className="results-count">{songs.length}</span> RESULTS FOR
          <span className="results-query"> "{searchQuery}"</span>
        </div>
      )}

      {/* Song Grid */}
      {!isLoading && (
        <div className="library-grid">
          {songs.map((song, index) => (
            <div
              key={song._id || index}
              className="song-card"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Artwork Placeholder */}
              <div className="song-card-artwork">
                {song.artworkUrl ? (
                  <img src={song.artworkUrl} alt={song.theme} className="song-card-image" />
                ) : (
                  <div className="song-card-placeholder">
                    <div className="placeholder-grid">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="placeholder-cell" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Genre Badge */}
                <span className="song-card-genre">{song.genre}</span>
              </div>

              {/* Song Info */}
              <div className="song-card-info">
                <h3 className="song-card-theme">{song.theme}</h3>

                {/* Metadata Row */}
                <div className="song-card-meta">
                  {song.audioAnalysis?.tempo && (
                    <span className="meta-tag">{song.audioAnalysis.tempo} BPM</span>
                  )}
                  {song.audioAnalysis?.key && (
                    <span className="meta-tag">{song.audioAnalysis.key}</span>
                  )}
                </div>

                {/* Energy Bar */}
                {song.audioAnalysis?.energy != null && (
                  <div className="song-card-energy">
                    <span className="energy-label">ENERGY</span>
                    <div className="energy-track">
                      <div
                        className="energy-fill"
                        style={{ width: `${getEnergyBar(song.audioAnalysis.energy)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Lyrics Preview */}
                <p className="song-card-lyrics-preview">
                  {song.lyrics ? song.lyrics.split('\n').slice(0, 2).join(' / ') : 'No lyrics'}
                </p>

                {/* Similarity Score (only when searching) */}
                {hasSearched && song.similarity != null && (
                  <div className="song-card-similarity">
                    <span className="similarity-label">MATCH</span>
                    <span className="similarity-score">
                      {Math.round(song.similarity * 100)}%
                    </span>
                  </div>
                )}

                {/* Footer */}
                <div className="song-card-footer">
                  <span className="song-card-date">{formatDate(song.createdAt)}</span>
                  {song.isDemo && <span className="demo-badge">DEMO</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && songs.length === 0 && (
        <div className="library-empty">
          <p className="empty-title">NO SONGS FOUND</p>
          <p className="empty-subtitle">
            {hasSearched
              ? 'Try a different search query'
              : 'Generate your first song to get started'}
          </p>
        </div>
      )}
    </div>
  )
}

export default SongLibrary
