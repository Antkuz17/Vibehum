import { useState } from 'react'
import './ThemeInput.css'

const MAX_CHARS = 200
const WARN_THRESHOLD = 180

function ThemeInput({ onChange, disabled }) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (e) => {
    const newValue = e.target.value.slice(0, MAX_CHARS)
    setValue(newValue)
    if (onChange) onChange(newValue)
  }

  const hasContent = value.length > 0
  const isNearLimit = value.length > WARN_THRESHOLD

  return (
    <div className="theme-input">
      <h2 className="theme-title">SONG THEME</h2>

      <div className={`theme-field ${isFocused ? 'is-focused' : ''} ${disabled ? 'is-disabled' : ''}`}>
        <label
          className={`theme-label ${isFocused || hasContent ? 'is-floating' : ''}`}
          htmlFor="theme-textarea"
        >
          e.g., a song about pi in the sky, nostalgia for summer...
        </label>
        <textarea
          id="theme-textarea"
          className="theme-textarea"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          rows={3}
        />
      </div>

      <div className="theme-footer">
        <span className={`theme-char-count ${isNearLimit ? 'is-near-limit' : ''}`}>
          {value.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  )
}

export default ThemeInput
