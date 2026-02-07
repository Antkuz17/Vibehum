import './styles/variables.css'
import './App.css'
import AudioRecorder from './components/AudioRecorder'
import GenreSelector from './components/GenreSelector'
import ThemeInput from './components/ThemeInput'

function App() {
  return (
    <div className="app">
      <h1 className="app-title">REVERSE SHAZAM</h1>
      <AudioRecorder />
      <GenreSelector />
      <ThemeInput />
    </div>
  )
}

export default App
