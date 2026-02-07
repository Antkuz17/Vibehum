import axios from 'axios'

// ─── Feature Flags ───

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

// ─── Genre Prompt Mappings ───

export const GENRE_PROMPTS = {
  'Lo-fi Hip Hop': 'lo-fi hip hop with soft drums, mellow piano, and laid-back vinyl crackle',
  'Energetic EDM': 'energetic EDM with heavy bass drops, synth leads, and four-on-the-floor kick',
  'Sad Jazz': 'melancholic jazz with sultry saxophone, slow piano, and brushed drums',
  'Upbeat Rock': 'upbeat rock with driving electric guitar, punchy drums, and energetic bass',
}

// Genre → color accent for artwork generation
const GENRE_COLORS = {
  'Lo-fi Hip Hop': { primary: '#00D9FF', secondary: '#CCFF00', accent: '#FF006E' },
  'Energetic EDM': { primary: '#FF006E', secondary: '#00D9FF', accent: '#CCFF00' },
  'Sad Jazz': { primary: '#00D9FF', secondary: '#FF006E', accent: '#E8E8E8' },
  'Upbeat Rock': { primary: '#CCFF00', secondary: '#FF006E', accent: '#00D9FF' },
}

// ─── API Configuration ───

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const ELEVENLABS_MUSIC_URL = 'https://api.elevenlabs.io/v1/music/generate'

function getOpenRouterKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || ''
}

function getElevenLabsKey() {
  return import.meta.env.VITE_ELEVENLABS_API_KEY || ''
}

// ─── Retry Helper ───

async function retryWithBackoff(fn, maxRetries = 2) {
  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s
        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, err.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

// ─── Word Count Utilities ───

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function truncateAtSentenceBoundary(text, maxWords) {
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text

  const truncated = words.slice(0, maxWords).join(' ')
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )

  if (lastSentenceEnd > truncated.length * 0.5) {
    return truncated.slice(0, lastSentenceEnd + 1)
  }
  return truncated
}

// ─── Demo Mode: Mock Audio ───

function createMockAudioBlob(durationSeconds) {
  const sampleRate = 44100
  const numChannels = 2
  const numSamples = sampleRate * durationSeconds
  const dataLength = numSamples * numChannels * 2

  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  // WAV header
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, dataLength, true)

  // Generate a simple tone instead of silence so the player works visually
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    // Soft sine wave at 220Hz with fade in/out
    const envelope = Math.min(t * 4, 1, (durationSeconds - t) * 4)
    const sample = Math.sin(2 * Math.PI * 220 * t) * 0.15 * envelope
    const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF

    for (let ch = 0; ch < numChannels; ch++) {
      view.setInt16(44 + (i * numChannels + ch) * 2, intSample, true)
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

// ─── Client-side Artwork Generation (Canvas) ───

/**
 * Generate album artwork client-side using Canvas API.
 * Creates a Neo-Retro Y2K style geometric composition.
 * @param {string} title - Song title/theme
 * @param {string} genre - Selected genre
 * @param {object} analysisResults - Audio analysis results
 * @returns {string} Object URL of generated artwork
 */
function generateCanvasArtwork(title, genre, analysisResults) {
  const size = 800
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  const colors = GENRE_COLORS[genre] || GENRE_COLORS['Lo-fi Hip Hop']
  const energy = analysisResults?.energy || 0.5
  const tempo = analysisResults?.tempo || 120

  // Background — deep black
  ctx.fillStyle = '#0A0A0A'
  ctx.fillRect(0, 0, size, size)

  // Seed a simple PRNG from the title for consistent results
  let seed = 0
  for (let i = 0; i < (title || 'song').length; i++) {
    seed = ((seed << 5) - seed + (title || 'song').charCodeAt(i)) | 0
  }
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed & 0x7FFFFFFF) / 2147483647
  }

  // Diagonal grid lines
  ctx.strokeStyle = 'rgba(0, 217, 255, 0.06)'
  ctx.lineWidth = 1
  for (let i = -size; i < size * 2; i += 40) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + size, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(i + size, 0)
    ctx.lineTo(i, size)
    ctx.stroke()
  }

  // Geometric shapes based on energy/tempo
  const numShapes = Math.floor(8 + energy * 12)

  for (let i = 0; i < numShapes; i++) {
    const x = rand() * size
    const y = rand() * size
    const shapeSize = 30 + rand() * 120 * energy
    const shapeType = Math.floor(rand() * 3)
    const colorChoice = [colors.primary, colors.secondary, colors.accent][Math.floor(rand() * 3)]
    const alpha = 0.1 + rand() * 0.3

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rand() * Math.PI * 2)

    if (shapeType === 0) {
      // Triangle
      ctx.beginPath()
      ctx.moveTo(0, -shapeSize / 2)
      ctx.lineTo(-shapeSize / 2, shapeSize / 2)
      ctx.lineTo(shapeSize / 2, shapeSize / 2)
      ctx.closePath()
      ctx.fillStyle = colorChoice + Math.floor(alpha * 255).toString(16).padStart(2, '0')
      ctx.fill()
    } else if (shapeType === 1) {
      // Rectangle
      ctx.fillStyle = colorChoice + Math.floor(alpha * 255).toString(16).padStart(2, '0')
      ctx.fillRect(-shapeSize / 2, -shapeSize / 4, shapeSize, shapeSize / 2)
    } else {
      // Circle (ring)
      ctx.beginPath()
      ctx.arc(0, 0, shapeSize / 2, 0, Math.PI * 2)
      ctx.strokeStyle = colorChoice + Math.floor((alpha + 0.1) * 255).toString(16).padStart(2, '0')
      ctx.lineWidth = 3 + rand() * 4
      ctx.stroke()
    }

    ctx.restore()
  }

  // Chrome stripe accent
  const stripeY = size * 0.35 + rand() * size * 0.1
  const gradient = ctx.createLinearGradient(0, stripeY, size, stripeY)
  gradient.addColorStop(0, colors.primary + '00')
  gradient.addColorStop(0.3, colors.primary + '40')
  gradient.addColorStop(0.5, colors.primary + '80')
  gradient.addColorStop(0.7, colors.secondary + '40')
  gradient.addColorStop(1, colors.secondary + '00')
  ctx.fillStyle = gradient
  ctx.fillRect(0, stripeY, size, 4)

  // Second stripe
  const stripe2Y = stripeY + 60 + rand() * 40
  const gradient2 = ctx.createLinearGradient(0, stripe2Y, size, stripe2Y)
  gradient2.addColorStop(0, colors.secondary + '00')
  gradient2.addColorStop(0.4, colors.secondary + '30')
  gradient2.addColorStop(0.6, colors.accent + '60')
  gradient2.addColorStop(1, colors.accent + '00')
  ctx.fillStyle = gradient2
  ctx.fillRect(0, stripe2Y, size, 3)

  // BPM text in corner
  ctx.font = '500 28px "Orbitron", monospace'
  ctx.fillStyle = colors.primary + '40'
  ctx.textAlign = 'right'
  ctx.fillText(`${tempo} BPM`, size - 40, size - 40)

  // Title text — center
  const displayTitle = (title || 'UNTITLED').toUpperCase()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Neon glow layers
  ctx.font = '700 42px "Space Grotesk", sans-serif'
  ctx.shadowColor = colors.primary
  ctx.shadowBlur = 30
  ctx.fillStyle = colors.primary
  ctx.fillText(displayTitle, size / 2, size / 2 - 20, size - 80)

  ctx.shadowBlur = 0
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(displayTitle, size / 2, size / 2 - 20, size - 80)

  // Genre subtitle
  ctx.font = '500 16px "Orbitron", monospace'
  ctx.fillStyle = colors.secondary
  ctx.letterSpacing = '4px'
  ctx.fillText(genre.toUpperCase(), size / 2, size / 2 + 30)

  // Convert to blob URL
  const dataUrl = canvas.toDataURL('image/png')
  return dataUrl
}

// ─── API Functions ───

/**
 * Generate lyrics using Claude via OpenRouter.
 */
export async function generateLyrics(theme, genre) {
  const apiKey = getOpenRouterKey()
  if (!apiKey) throw new Error('OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to your .env file.')

  return retryWithBackoff(async () => {
    const response = await axios.post(OPENROUTER_API_URL, {
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        {
          role: 'system',
          content: 'You are a professional songwriter. Generate lyrics for a 30-second song. The lyrics MUST be between 100 and 150 words. Keep the lyrics singable, with clear rhythm and rhyme that matches the genre style. Return ONLY the lyrics text — no titles, no labels, no formatting marks.',
        },
        {
          role: 'user',
          content: `Write ${genre} song lyrics about: ${theme}`,
        },
      ],
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    let lyrics = response.data.choices[0].message.content.trim()

    const wordCount = countWords(lyrics)
    if (wordCount > 150) {
      lyrics = truncateAtSentenceBoundary(lyrics, 150)
    }

    return lyrics
  })
}

/**
 * Generate a complete song using ElevenLabs Music API.
 * In demo mode, returns a mock audio blob instead.
 */
export async function generateMusic(analysisText, lyrics, genre) {
  if (DEMO_MODE) {
    console.log('[DEMO MODE] Skipping ElevenLabs — returning mock audio')
    // Small delay to simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1500))
    return createMockAudioBlob(30)
  }

  const apiKey = getElevenLabsKey()
  if (!apiKey) throw new Error('ElevenLabs API key not configured. Add VITE_ELEVENLABS_API_KEY to your .env file.')

  const genreStyle = GENRE_PROMPTS[genre] || genre.toLowerCase()
  const prompt = `${genreStyle}. ${analysisText}. Lyrics: ${lyrics}`

  return retryWithBackoff(async () => {
    const response = await axios.post(ELEVENLABS_MUSIC_URL, {
      prompt,
      duration_seconds: 30,
    }, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
      timeout: 120000,
    })

    return response.data
  })
}

/**
 * Generate a Stable Diffusion image prompt using Claude via OpenRouter.
 * Skipped entirely when using Canvas artwork — only called if needed.
 */
export async function generateImagePrompt(lyrics, genre, analysisResults) {
  const apiKey = getOpenRouterKey()
  if (!apiKey) throw new Error('OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to your .env file.')

  return retryWithBackoff(async () => {
    const response = await axios.post(OPENROUTER_API_URL, {
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        {
          role: 'system',
          content: 'You generate Stable Diffusion image prompts for album artwork. Style MUST be Neo-Retro Y2K aesthetic. Required elements: neon cyan (#00D9FF) and magenta (#FF006E) colors, geometric shapes, chrome/metallic textures, bold typography integration. NEVER include purple gradients. NEVER include organic/soft shapes. Think: vibrant digital collage, retro futuristic, high contrast. Return ONLY the image prompt — no explanation, no quotes.',
        },
        {
          role: 'user',
          content: `Create an album art prompt for a ${genre} song. Energy: ${analysisResults.energyLevel}. Mood from lyrics: ${lyrics.slice(0, 200)}`,
        },
      ],
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    return response.data.choices[0].message.content.trim()
  })
}

/**
 * Generate album artwork client-side using Canvas.
 * Replaces the HuggingFace Stable Diffusion call to avoid CORS issues.
 */
export function generateArtwork(title, genre, analysisResults) {
  try {
    return generateCanvasArtwork(title, genre, analysisResults)
  } catch (err) {
    console.error('Canvas artwork generation failed:', err.message)
    return null
  }
}

/**
 * Orchestrate the full song generation pipeline.
 */
export async function generateCompleteSong(recordingData, genre, theme, onProgress) {
  const errors = []
  let lyrics = null
  let audioBlob = null
  let artworkUrl = null

  // Step 1: Generate lyrics
  onProgress('GENERATING_LYRICS')
  try {
    lyrics = await generateLyrics(theme, genre)
  } catch (err) {
    console.error('Lyrics generation failed:', err)
    throw new Error(`Failed to generate lyrics: ${err.message}`)
  }

  // Step 2: Generate music (image prompt no longer needed — Canvas artwork is instant)
  onProgress('GENERATING_MUSIC')
  try {
    audioBlob = await generateMusic(
      recordingData.analysisText,
      lyrics,
      genre
    )
  } catch (err) {
    console.error('Music generation failed:', err)
    throw new Error(`Failed to generate music: ${err.message}`)
  }

  // Step 3: Generate artwork client-side (instant, no API call)
  onProgress('GENERATING_ARTWORK')
  artworkUrl = generateArtwork(theme, genre, recordingData.analysisResults)
  if (!artworkUrl) {
    errors.push('Artwork generation failed — continuing without album art')
  }

  onProgress('COMPLETE')

  return { lyrics, audioBlob, artworkUrl, errors }
}
