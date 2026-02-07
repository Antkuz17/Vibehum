/**
 * Audio analysis utilities for extracting musical features from recorded audio.
 * All functions operate on Web Audio API AudioBuffer objects.
 */

const NOTE_FREQUENCIES = [
  { note: 'C', freq: 261.63 },
  { note: 'C#', freq: 277.18 },
  { note: 'D', freq: 293.66 },
  { note: 'D#', freq: 311.13 },
  { note: 'E', freq: 329.63 },
  { note: 'F', freq: 349.23 },
  { note: 'F#', freq: 369.99 },
  { note: 'G', freq: 392.00 },
  { note: 'G#', freq: 415.30 },
  { note: 'A', freq: 440.00 },
  { note: 'A#', freq: 466.16 },
  { note: 'B', freq: 493.88 },
]

const MINOR_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const KEY_QUALITIES = ['minor', 'major']

function frequencyToNote(freq) {
  if (freq <= 0) return { note: 'C', octave: 4 }

  // Normalize frequency to octave 4 range (261-523 Hz)
  let normalized = freq
  let octave = 4
  while (normalized < NOTE_FREQUENCIES[0].freq) {
    normalized *= 2
    octave--
  }
  while (normalized >= NOTE_FREQUENCIES[0].freq * 2) {
    normalized /= 2
    octave++
  }

  let closest = NOTE_FREQUENCIES[0]
  let minDist = Math.abs(normalized - closest.freq)
  for (let i = 1; i < NOTE_FREQUENCIES.length; i++) {
    const dist = Math.abs(normalized - NOTE_FREQUENCIES[i].freq)
    if (dist < minDist) {
      minDist = dist
      closest = NOTE_FREQUENCIES[i]
    }
  }

  return { note: closest.note, octave }
}

/**
 * Detect tempo (BPM) using onset detection on the energy envelope.
 */
export function detectTempo(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  // Compute energy envelope with a hop size of ~10ms
  const hopSize = Math.floor(sampleRate * 0.01)
  const envelope = []
  for (let i = 0; i < channelData.length - hopSize; i += hopSize) {
    let sum = 0
    for (let j = i; j < i + hopSize; j++) {
      sum += channelData[j] * channelData[j]
    }
    envelope.push(Math.sqrt(sum / hopSize))
  }

  // Normalize envelope
  const maxEnv = Math.max(...envelope, 0.0001)
  const normalized = envelope.map(v => v / maxEnv)

  // Onset detection: find peaks where energy rises above a moving average
  const windowSize = 8
  const onsets = []
  for (let i = windowSize; i < normalized.length - 1; i++) {
    let avg = 0
    for (let j = i - windowSize; j < i; j++) {
      avg += normalized[j]
    }
    avg /= windowSize

    const threshold = avg * 1.5 + 0.05
    if (normalized[i] > threshold && normalized[i] > normalized[i - 1] && normalized[i] >= normalized[i + 1]) {
      // Avoid double-counting onsets too close together (< 100ms)
      const timeMs = (i * hopSize / sampleRate) * 1000
      if (onsets.length === 0 || timeMs - onsets[onsets.length - 1] > 100) {
        onsets.push(timeMs)
      }
    }
  }

  if (onsets.length < 2) {
    return { bpm: 120, onsets }
  }

  // Calculate inter-onset intervals
  const intervals = []
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1])
  }

  // Use median interval for robustness
  intervals.sort((a, b) => a - b)
  const medianInterval = intervals[Math.floor(intervals.length / 2)]

  let bpm = 60000 / medianInterval

  // Clamp to reasonable range, adjusting octave if needed
  while (bpm > 200) bpm /= 2
  while (bpm < 60) bpm *= 2

  return { bpm: Math.round(bpm), onsets }
}

/**
 * Detect dominant pitch and map to a musical key.
 * Uses autocorrelation for pitch detection (more accurate for voice than FFT peak).
 */
export function detectPitch(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  // Take a segment from the middle of the recording (most stable pitch)
  const segmentLength = Math.min(channelData.length, sampleRate * 2)
  const start = Math.floor((channelData.length - segmentLength) / 2)
  const segment = channelData.slice(start, start + segmentLength)

  // Autocorrelation-based pitch detection
  const minLag = Math.floor(sampleRate / 1000) // ~1000 Hz max
  const maxLag = Math.floor(sampleRate / 60)    // ~60 Hz min
  let bestLag = minLag
  let bestCorrelation = -1

  for (let lag = minLag; lag <= Math.min(maxLag, segment.length / 2); lag++) {
    let correlation = 0
    let norm1 = 0
    let norm2 = 0
    const compareLength = Math.min(segment.length - lag, 4096)

    for (let i = 0; i < compareLength; i++) {
      correlation += segment[i] * segment[i + lag]
      norm1 += segment[i] * segment[i]
      norm2 += segment[i + lag] * segment[i + lag]
    }

    const normFactor = Math.sqrt(norm1 * norm2)
    if (normFactor > 0) {
      correlation /= normFactor
    }

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestLag = lag
    }
  }

  const detectedFreq = sampleRate / bestLag
  const { note } = frequencyToNote(detectedFreq)

  // Determine major/minor based on simple heuristic:
  // Lower energy recordings tend toward minor, higher toward major
  const rms = calculateEnergy(audioBuffer)
  const quality = rms.energy > 0.4 ? 'major' : 'minor'

  return {
    frequency: Math.round(detectedFreq * 10) / 10,
    note,
    key: `${note} ${quality}`,
  }
}

/**
 * Calculate RMS energy level (0-1 scale).
 */
export function calculateEnergy(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0)

  let sumSquares = 0
  for (let i = 0; i < channelData.length; i++) {
    sumSquares += channelData[i] * channelData[i]
  }

  const rms = Math.sqrt(sumSquares / channelData.length)

  // Normalize: typical mic RMS ranges 0-0.5, scale to 0-1
  const energy = Math.min(rms * 3, 1)

  let level
  if (energy < 0.3) level = 'low'
  else if (energy < 0.6) level = 'moderate'
  else level = 'high'

  return { energy: Math.round(energy * 100) / 100, level }
}

/**
 * Classify rhythm pattern based on onset timing regularity.
 */
export function classifyRhythm(onsets) {
  if (!onsets || onsets.length < 3) {
    return 'straight'
  }

  const intervals = []
  for (let i = 1; i < onsets.length; i++) {
    intervals.push(onsets[i] - onsets[i - 1])
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((sum, val) => sum + (val - mean) ** 2, 0) / intervals.length
  const cv = Math.sqrt(variance) / mean // Coefficient of variation

  // Check for triplet feel (swing): intervals alternate long-short
  let swingScore = 0
  if (intervals.length >= 4) {
    for (let i = 0; i < intervals.length - 1; i += 2) {
      const ratio = intervals[i] / (intervals[i + 1] || intervals[i])
      if (ratio > 1.3 && ratio < 2.2) swingScore++
    }
    swingScore /= Math.floor(intervals.length / 2)
  }

  if (swingScore > 0.5) return 'swing'
  if (cv > 0.35) return 'syncopated'
  return 'straight'
}

/**
 * Detect melodic contour (ascending, descending, or oscillating).
 * Divides the audio into segments and tracks average pitch direction.
 */
export function detectContour(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const numSegments = 6
  const segmentLength = Math.floor(channelData.length / numSegments)

  const segmentPitches = []

  for (let seg = 0; seg < numSegments; seg++) {
    const start = seg * segmentLength
    const end = Math.min(start + segmentLength, channelData.length)
    const segment = channelData.slice(start, end)

    // Simple zero-crossing rate as a pitch proxy (faster than full autocorrelation per segment)
    let zeroCrossings = 0
    for (let i = 1; i < segment.length; i++) {
      if ((segment[i] >= 0 && segment[i - 1] < 0) || (segment[i] < 0 && segment[i - 1] >= 0)) {
        zeroCrossings++
      }
    }

    const estimatedFreq = (zeroCrossings * sampleRate) / (2 * segment.length)
    segmentPitches.push(estimatedFreq)
  }

  // Linear regression to find pitch trend
  const n = segmentPitches.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += segmentPitches[i]
    sumXY += i * segmentPitches[i]
    sumX2 += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const avgPitch = sumY / n

  // Normalize slope relative to average pitch
  const normalizedSlope = avgPitch > 0 ? slope / avgPitch : 0

  // Count direction changes for oscillation detection
  let directionChanges = 0
  for (let i = 2; i < segmentPitches.length; i++) {
    const prev = segmentPitches[i - 1] - segmentPitches[i - 2]
    const curr = segmentPitches[i] - segmentPitches[i - 1]
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
      directionChanges++
    }
  }

  if (directionChanges >= 2) return 'oscillating'
  if (normalizedSlope > 0.02) return 'ascending'
  if (normalizedSlope < -0.02) return 'descending'
  return 'oscillating'
}

/**
 * Run full analysis on an AudioBuffer and return all features.
 */
export function analyzeAudioBuffer(audioBuffer) {
  const tempoResult = detectTempo(audioBuffer)
  const pitchResult = detectPitch(audioBuffer)
  const energyResult = calculateEnergy(audioBuffer)
  const rhythm = classifyRhythm(tempoResult.onsets)
  const contour = detectContour(audioBuffer)

  return {
    tempo: tempoResult.bpm,
    key: pitchResult.key,
    note: pitchResult.note,
    frequency: pitchResult.frequency,
    energy: energyResult.energy,
    energyLevel: energyResult.level,
    rhythm,
    contour,
  }
}

/**
 * Build a human-readable description string from analysis results.
 */
export function buildAnalysisText(results) {
  return `${results.tempo} BPM, ${results.key}, ${results.energyLevel} energy, ${results.rhythm} rhythm, ${results.contour} melody`
}
