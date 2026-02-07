import { generateEmbedding } from './apiService'

// ─── MongoDB Atlas Data API Config ───

const MONGO_DATA_API_URL = () => {
  const appId = import.meta.env.VITE_MONGODB_APP_ID || ''
  return `https://data.mongodb-api.com/app/${appId}/endpoint/data/v1`
}

function getMongoApiKey() {
  return import.meta.env.VITE_MONGODB_API_KEY || ''
}

function getMongoCluster() {
  return import.meta.env.VITE_MONGODB_CLUSTER || 'Cluster0'
}

const DATABASE = 'reverse_shazam'
const COLLECTION = 'songs'

// ─── Data API Helpers ───

async function mongoRequest(action, body) {
  const apiKey = getMongoApiKey()
  if (!apiKey) throw new Error('MongoDB API key not configured')

  const url = `${MONGO_DATA_API_URL()}/action/${action}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      dataSource: getMongoCluster(),
      database: DATABASE,
      collection: COLLECTION,
      ...body,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MongoDB ${action} failed: ${response.status} — ${text}`)
  }

  return response.json()
}

// ─── Cosine Similarity ───

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ─── Public API ───

/**
 * Save a generated song to MongoDB with its embedding.
 */
export async function saveSongToMongo(songData) {
  const { genre, theme, lyrics, audioAnalysis, artworkUrl } = songData

  const embeddingText = createEmbeddingText(genre, theme, lyrics, audioAnalysis)
  let embedding = null

  try {
    embedding = await generateEmbedding(embeddingText)
  } catch (err) {
    console.warn('Embedding generation failed — saving without embedding:', err.message)
  }

  const document = {
    genre,
    theme,
    lyrics,
    artworkUrl: artworkUrl || null,
    audioAnalysis: audioAnalysis || {},
    embedding,
    createdAt: new Date().toISOString(),
    isDemo: false,
  }

  const result = await mongoRequest('insertOne', { document })
  return result.insertedId
}

/**
 * Get all songs from MongoDB, sorted newest first.
 */
export async function getAllSongs() {
  const result = await mongoRequest('find', {
    filter: {},
    sort: { createdAt: -1 },
    limit: 50,
  })
  return result.documents || []
}

/**
 * Search songs by semantic similarity.
 * Embeds the query, then ranks all songs by cosine similarity.
 */
export async function searchSongs(query) {
  const queryEmbedding = await generateEmbedding(query)

  const result = await mongoRequest('find', {
    filter: {},
    limit: 50,
  })

  const songs = result.documents || []

  const scored = songs
    .filter(song => song.embedding && song.embedding.length > 0)
    .map(song => ({
      ...song,
      similarity: cosineSimilarity(queryEmbedding, song.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)

  return scored.slice(0, 8)
}

/**
 * Initialize demo songs in MongoDB (only if collection is empty).
 */
export async function initializeDemoSongs(demoSongs) {
  try {
    const existing = await mongoRequest('find', { filter: {}, limit: 1 })
    if (existing.documents && existing.documents.length > 0) {
      return false // already initialized
    }

    const documents = demoSongs.map(song => ({
      ...song,
      createdAt: song.createdAt || new Date().toISOString(),
      isDemo: true,
    }))

    await mongoRequest('insertMany', { documents })
    return true
  } catch (err) {
    console.warn('Demo songs initialization failed:', err.message)
    return false
  }
}

// ─── Embedding Text Builder ───

function createEmbeddingText(genre, theme, lyrics, audioAnalysis) {
  const parts = [
    `Genre: ${genre}`,
    `Theme: ${theme}`,
  ]

  if (audioAnalysis) {
    if (audioAnalysis.tempo) parts.push(`Tempo: ${audioAnalysis.tempo} BPM`)
    if (audioAnalysis.energy) parts.push(`Energy: ${audioAnalysis.energy}`)
    if (audioAnalysis.key) parts.push(`Key: ${audioAnalysis.key}`)
  }

  if (lyrics) {
    parts.push(`Lyrics: ${lyrics.slice(0, 500)}`)
  }

  return parts.join('. ')
}

/**
 * Check if MongoDB is configured.
 */
export function isMongoConfigured() {
  return !!(import.meta.env.VITE_MONGODB_API_KEY && import.meta.env.VITE_MONGODB_APP_ID)
}
