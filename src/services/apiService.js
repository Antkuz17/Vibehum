import axios from 'axios'

// ─── Genre Prompt Mappings ───

export const GENRE_PROMPTS = {
  'Lo-fi Hip Hop': 'lo-fi hip hop with soft drums, mellow piano, and laid-back vinyl crackle',
  'Energetic EDM': 'energetic EDM with heavy bass drops, synth leads, and four-on-the-floor kick',
  'Sad Jazz': 'melancholic jazz with sultry saxophone, slow piano, and brushed drums',
  'Upbeat Rock': 'upbeat rock with driving electric guitar, punchy drums, and energetic bass',
}

// ─── API Configuration ───

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const ELEVENLABS_MUSIC_URL = 'https://api.elevenlabs.io/v1/music/generate'
const HUGGINGFACE_SD_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0'

function getOpenRouterKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || ''
}

function getElevenLabsKey() {
  return import.meta.env.VITE_ELEVENLABS_API_KEY || ''
}

function getHuggingFaceKey() {
  return import.meta.env.VITE_HUGGINGFACE_API_KEY || ''
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
  // Find the last sentence-ending punctuation
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

// ─── API Functions ───

/**
 * Generate lyrics using Claude via OpenRouter.
 * @param {string} theme - Song theme/topic
 * @param {string} genre - Selected genre name
 * @returns {Promise<string>} Generated lyrics (100-150 words)
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

    // Validate and adjust word count
    const wordCount = countWords(lyrics)
    if (wordCount > 150) {
      lyrics = truncateAtSentenceBoundary(lyrics, 150)
    }

    return lyrics
  })
}

/**
 * Generate a complete song using ElevenLabs Music API.
 * @param {string} analysisText - Human-readable audio analysis description
 * @param {string} lyrics - Generated lyrics
 * @param {string} genre - Selected genre name
 * @returns {Promise<Blob>} Generated audio as Blob
 */
export async function generateMusic(analysisText, lyrics, genre) {
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
 * @param {string} lyrics - Generated lyrics
 * @param {string} genre - Selected genre name
 * @param {object} analysisResults - Audio analysis results object
 * @returns {Promise<string>} Image generation prompt
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
 * Generate album artwork using Stable Diffusion via HuggingFace.
 * @param {string} imagePrompt - Stable Diffusion prompt
 * @returns {Promise<string|null>} Object URL of generated image, or null on failure
 */
export async function generateArtwork(imagePrompt) {
  const apiKey = getHuggingFaceKey()
  if (!apiKey) {
    console.warn('HuggingFace API key not configured. Skipping artwork generation.')
    return null
  }

  try {
    return await retryWithBackoff(async () => {
      const response = await axios.post(HUGGINGFACE_SD_URL, {
        inputs: imagePrompt,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'blob',
        timeout: 90000,
      })

      return URL.createObjectURL(response.data)
    })
  } catch (err) {
    console.error('Artwork generation failed:', err.message)
    return null
  }
}

/**
 * Orchestrate the full song generation pipeline.
 * @param {object} recordingData - { audioBlob, analysisResults, analysisText }
 * @param {string} genre - Selected genre name
 * @param {string} theme - Song theme text
 * @param {function} onProgress - Callback: (step: string) => void
 * @returns {Promise<object>} { lyrics, audioBlob, artworkUrl, errors }
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

  // Step 2: Generate music AND image prompt in parallel
  onProgress('GENERATING_MUSIC')

  const musicPromise = generateMusic(
    recordingData.analysisText,
    lyrics,
    genre
  )

  const imagePromptPromise = generateImagePrompt(
    lyrics,
    genre,
    recordingData.analysisResults
  )

  const [musicResult, imagePromptResult] = await Promise.allSettled([
    musicPromise,
    imagePromptPromise,
  ])

  // Handle music result (critical)
  if (musicResult.status === 'fulfilled') {
    audioBlob = musicResult.value
  } else {
    console.error('Music generation failed:', musicResult.reason)
    throw new Error(`Failed to generate music: ${musicResult.reason.message}`)
  }

  // Step 3: Generate artwork if image prompt succeeded (non-critical)
  if (imagePromptResult.status === 'fulfilled') {
    onProgress('GENERATING_ARTWORK')
    artworkUrl = await generateArtwork(imagePromptResult.value)
    if (!artworkUrl) {
      errors.push('Artwork generation failed — continuing without album art')
    }
  } else {
    console.error('Image prompt generation failed:', imagePromptResult.reason)
    errors.push('Artwork prompt generation failed — continuing without album art')
  }

  onProgress('COMPLETE')

  return { lyrics, audioBlob, artworkUrl, errors }
}
