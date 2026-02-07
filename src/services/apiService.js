import axios from 'axios'

// ─── Feature Flags ───

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

// ─── Genre Prompt Mappings ───

export const GENRE_PROMPTS = {
  'Lo-fi Hip Hop': 'lo-fi hip hop with soft drums, mellow piano, and laid-back vinyl crackle',
  'Energetic EDM': 'energetic EDM with heavy bass drops, synth leads, and four-on-the-floor kick',
  'Sad Jazz': 'melancholic jazz with sultry saxophone, slow piano, and brushed drums',
  'Upbeat Rock': 'upbeat rock with driving electric guitar, punchy drums, and energetic bass',
  'Dreamy Shoegaze': 'dreamy shoegaze with wall-of-sound guitars, ethereal vocals, heavy reverb and delay, wall of distortion',
  'Trap Beats': 'trap music with heavy 808 bass, rapid hi-hat rolls, snare rolls, dark atmospheric synths',
  'Indie Folk': 'indie folk with fingerpicked acoustic guitar, warm vocal harmonies, organic percussion, intimate production',
  'Synthwave': 'synthwave with analog synthesizers, 80s drum machines, retro basslines, nostalgic arpeggios, neon atmosphere',
}

// ─── API Configuration ───

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const ELEVENLABS_MUSIC_URL = 'https://api.elevenlabs.io/v1/music/generate'
const HUGGINGFACE_INFERENCE_URL = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell'

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

// ─── Artwork Prompt Helpers ───

function getHuggingFaceKey() {
  return import.meta.env.VITE_HUGGINGFACE_API_KEY || ''
}

function enhancePromptForAlbumArt(basePrompt) {
  const albumArtStyle = 'album cover art, professional music artwork, square composition, centered design, visually striking'
  const y2kStyle = 'Y2K aesthetic, neo-retro futuristic, neon cyan and hot magenta color scheme, chrome metallic elements, geometric shapes, digital glitch effects, holographic textures, cyberpunk vibes'
  const qualityTags = 'highly detailed, professional quality, 4k resolution, vibrant colors, sharp focus, digital art'
  return `${basePrompt}, ${albumArtStyle}, ${y2kStyle}, ${qualityTags}. NO purple gradients, NO soft pastels, NO minimalism`
}

/**
 * Generate a detailed image prompt using Claude via OpenRouter.
 */
export async function generateImagePrompt(lyrics, genre, analysisResults, theme) {
  const apiKey = getOpenRouterKey()
  if (!apiKey) throw new Error('OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to your .env file.')

  return retryWithBackoff(async () => {
    const response = await axios.post(OPENROUTER_API_URL, {
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating prompts for AI image generation that produce stunning, unique album cover artwork.

Given song lyrics, genre, and audio characteristics, create a detailed image generation prompt for album artwork.

REQUIREMENTS:
1. Be HIGHLY SPECIFIC and DESCRIPTIVE — generic prompts make generic images
2. Include concrete visual elements (objects, scenes, compositions)
3. Describe lighting, atmosphere, and mood in detail
4. Specify artistic style or reference real art movements
5. Use vivid, evocative language

MUST INCLUDE (Neo-Retro Y2K aesthetic):
- Neon cyan (#00D9FF) and hot magenta (#FF006E) colors prominently
- Chrome/metallic elements or holographic effects
- Geometric shapes or digital glitch aesthetics
- Y2K/early 2000s internet vibes

AVOID:
- Purple gradients or purple as dominant color
- Generic phrases like "beautiful" or "high quality" on their own
- Vague descriptions
- Corporate/minimalist aesthetics

STRUCTURE YOUR PROMPT LIKE THIS:
"[Main subject/scene], [specific visual details], [artistic style], [lighting/atmosphere], [color palette], [mood/emotion], [composition notes]"

Return ONLY the image prompt text — no explanation, no quotes, no labels.`,
        },
        {
          role: 'user',
          content: `Create an album art prompt for:
- Theme: ${theme}
- Genre: ${genre}
- Energy: ${analysisResults?.energyLevel || 'moderate'} (${analysisResults?.energy || 0.5}/1.0)
- BPM: ${analysisResults?.tempo || 120}
- Key: ${analysisResults?.key || 'unknown'}
- Mood from lyrics: ${(lyrics || '').slice(0, 300)}`,
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
 * Generate album artwork using Hugging Face Inference API (FLUX.1-schnell).
 * Returns an object URL of the generated image blob.
 */
export async function generateArtwork(imagePrompt) {
  const apiKey = getHuggingFaceKey()
  if (!apiKey) {
    console.warn('Hugging Face API key not configured — skipping artwork generation')
    return null
  }

  try {
    console.log('Generating artwork with Hugging Face...')
    const enhancedPrompt = enhancePromptForAlbumArt(imagePrompt)

    const response = await retryWithBackoff(async () => {
      const res = await fetch(HUGGINGFACE_INFERENCE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: enhancedPrompt }),
      })

      if (!res.ok) {
        if (res.status === 503) {
          const data = await res.json()
          throw new Error(`Model loading: ${data.estimated_time || 20}s`)
        }
        throw new Error(`HTTP ${res.status}`)
      }

      return res
    })

    const blob = await response.blob()
    const imageUrl = URL.createObjectURL(blob)
    console.log('Artwork generated successfully')
    return imageUrl
  } catch (err) {
    console.error('Artwork generation failed:', err.message)
    return null
  }
}

// ─── Embedding Generation ───

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'

function getOpenAIKey() {
  return import.meta.env.VITE_OPENAI_API_KEY || ''
}

/**
 * Generate an embedding vector using OpenAI text-embedding-3-small.
 */
export async function generateEmbedding(text) {
  const apiKey = getOpenAIKey()
  if (!apiKey) throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.')

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI Embedding failed: HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.data[0].embedding
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

  // Step 2: Generate music + image prompt in parallel
  onProgress('GENERATING_MUSIC')
  let imagePrompt = null
  try {
    const [musicResult, promptResult] = await Promise.allSettled([
      generateMusic(recordingData.analysisText, lyrics, genre),
      generateImagePrompt(lyrics, genre, recordingData.analysisResults, theme),
    ])

    if (musicResult.status === 'fulfilled') {
      audioBlob = musicResult.value
    } else {
      throw musicResult.reason
    }

    if (promptResult.status === 'fulfilled') {
      imagePrompt = promptResult.value
    } else {
      console.warn('Image prompt generation failed:', promptResult.reason?.message)
      errors.push('Image prompt generation failed — continuing without album art')
    }
  } catch (err) {
    console.error('Music generation failed:', err)
    throw new Error(`Failed to generate music: ${err.message}`)
  }

  // Step 3: Generate artwork via Hugging Face FLUX.1-schnell
  onProgress('GENERATING_ARTWORK')
  if (imagePrompt) {
    artworkUrl = await generateArtwork(imagePrompt)
    if (!artworkUrl) {
      errors.push('Artwork generation failed — continuing without album art')
    }
  }

  onProgress('COMPLETE')

  return { lyrics, audioBlob, artworkUrl, errors }
}
