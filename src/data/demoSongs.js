/**
 * Hardcoded demo songs for showcasing the song library.
 * These are pre-populated so judges can see the library in action
 * without needing to generate songs first.
 */
const DEMO_SONGS = [
  {
    genre: 'Lo-fi Hip Hop',
    theme: 'Rainy night studying alone',
    lyrics: `Rain taps the window like a metronome\nBooks stacked high in my little zone\nCoffee getting cold but I don't mind\nLost in pages, losing track of time\n\nPencil scratches, lamplight glow\nThe world outside moves soft and slow\nThunder rolls like a distant drum\nIn this quiet place I've become\n\nSomebody who finds peace in the storm\nSomebody who likes the cold to stay warm\nRainy nights are my favorite song\nStudying alone, right where I belong`,
    audioAnalysis: { tempo: 85, key: 'D minor', energy: 0.35, energyLevel: 'mellow', contour: 'descending' },
    artworkUrl: null,
    createdAt: '2026-02-06T22:00:00Z',
  },
  {
    genre: 'Energetic EDM',
    theme: 'Neon city at midnight',
    lyrics: `Neon signs bleeding into the sky\nBass drops hit as the cars fly by\nMidnight pulse of the city streets\nEvery corner's got a different beat\n\nLights flash cyan and magenta bright\nLost in the chaos of the night\nSkyscrapers reaching for the stars\nWe're electric, we're who we are\n\nDrop the bass, let the speakers blow\nNeon city, put on a show\nEvery heartbeat syncs to the floor\nMidnight frenzy, give me more`,
    audioAnalysis: { tempo: 140, key: 'F minor', energy: 0.92, energyLevel: 'explosive', contour: 'ascending' },
    artworkUrl: null,
    createdAt: '2026-02-06T21:30:00Z',
  },
  {
    genre: 'Sad Jazz',
    theme: 'Missing someone at a cafe',
    lyrics: `Empty chair across the table\nYour coffee order on my lips\nI trace the rim of my ceramic cup\nAnd take these melancholic sips\n\nThe saxophone plays your favorite key\nA minor falling like the rain\nI see your ghost in every shadow here\nAnd smile through all this gentle pain\n\nThe barista knows my name by now\nShe pours another cup of blue\nThis cafe holds a thousand memories\nAnd every single one is you`,
    audioAnalysis: { tempo: 72, key: 'A minor', energy: 0.25, energyLevel: 'gentle', contour: 'descending' },
    artworkUrl: null,
    createdAt: '2026-02-06T21:00:00Z',
  },
  {
    genre: 'Upbeat Rock',
    theme: 'Road trip with best friends',
    lyrics: `Windows down and the volume up\nHighway stretches to the sun\nThree best friends and a beat-up truck\nThis summer's only just begun\n\nSinging wrong words at the top of our lungs\nGas station snacks and getting lost for fun\nEvery mile's a memory being made\nEvery sunset better than the last one played\n\nWe don't need a map, we don't need a plan\nJust the open road and my best friend's band\nTurn it up, let the whole world hear\nThis is the trip we'll talk about for years`,
    audioAnalysis: { tempo: 135, key: 'G major', energy: 0.85, energyLevel: 'high', contour: 'ascending' },
    artworkUrl: null,
    createdAt: '2026-02-06T20:30:00Z',
  },
  {
    genre: 'Dreamy Shoegaze',
    theme: 'Floating through a dream',
    lyrics: `Walls dissolve to watercolor skies\nGravity forgets I exist\nI'm drifting through a world of sighs\nWrapped in lavender and mist\n\nEvery sound becomes a texture here\nGuitar walls like ocean tides\nI can't tell what's far or near\nReality just softly hides\n\nFloating through a dream I never want to end\nEvery color bends and starts to blend\nWake me never, let me stay\nIn this beautiful delay`,
    audioAnalysis: { tempo: 95, key: 'E major', energy: 0.45, energyLevel: 'moderate', contour: 'oscillating' },
    artworkUrl: null,
    createdAt: '2026-02-06T20:00:00Z',
  },
  {
    genre: 'Trap Beats',
    theme: 'Grinding to the top',
    lyrics: `Started from the bottom floor\nNow I'm climbing, wanting more\nHi-hats rolling like a storm\nEight-oh-eight bass keeps me warm\n\nEvery setback made me sharp\nEvery hater lit a spark\nGrinding daily, never stop\nWon't slow down until I'm at the top\n\nMoney on my mind but peace in my soul\nBuilding something bigger than the goal\nThey said I couldn't, watch me prove them wrong\nThis the anthem, this my grinding song`,
    audioAnalysis: { tempo: 145, key: 'C minor', energy: 0.88, energyLevel: 'high', contour: 'ascending' },
    artworkUrl: null,
    createdAt: '2026-02-06T19:30:00Z',
  },
  {
    genre: 'Indie Folk',
    theme: 'Autumn leaves and old memories',
    lyrics: `Leaves are turning amber gold\nLike the stories grandma told\nPorch swing creaking, cider steam\nAutumn paints a fading dream\n\nI remember running through these trees\nChasing fireflies in the evening breeze\nNow the branches hold our names\nCarved in bark like tiny flames\n\nEvery leaf that falls reminds me of the days\nWhen the world was simple, warm, and safe\nI'll keep these memories like pressed flowers in a book\nAnd return to them each time I need to look`,
    audioAnalysis: { tempo: 100, key: 'C major', energy: 0.4, energyLevel: 'gentle', contour: 'oscillating' },
    artworkUrl: null,
    createdAt: '2026-02-06T19:00:00Z',
  },
  {
    genre: 'Synthwave',
    theme: 'Driving through the future',
    lyrics: `Chrome dashboard glowing blue\nRetro future, me and you\nSynthesizers fill the air\nNeon ribbons everywhere\n\nDriving through a world that never was\nEighty-five and breaking all the laws\nSunset pixels on the horizon line\nThis machine and me, we're doing fine\n\nRewind the future, fast-forward the past\nEvery moment built to last\nLaser grids and starlit roads\nDriving through the future in synth mode`,
    audioAnalysis: { tempo: 118, key: 'A minor', energy: 0.7, energyLevel: 'moderate', contour: 'ascending' },
    artworkUrl: null,
    createdAt: '2026-02-06T18:30:00Z',
  },
]

export default DEMO_SONGS
