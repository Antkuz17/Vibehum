import { motion } from 'framer-motion'
import BackgroundPaths from './BackgroundPaths'
import './LandingPage.css'

function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-page">
      {/* Animated Background Paths */}
      <BackgroundPaths />

      <motion.div 
        className="landing-content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <motion.h1 
          className="landing-title"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.5, 
            delay: 0.2,
            ease: [0.34, 1.56, 0.64, 1] 
          }}
        >
          VIBEHUM
        </motion.h1>
        
        <motion.p 
          className="landing-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          Transform your hums into complete songs with AI
        </motion.p>

        <motion.button
          className="get-started-btn"
          onClick={onGetStarted}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.4, 
            delay: 0.6,
            ease: [0.34, 1.56, 0.64, 1] 
          }}
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.15 }
          }}
          whileTap={{ 
            scale: 0.95,
            transition: { duration: 0.1 }
          }}
        >
          GET STARTED
        </motion.button>
      </motion.div>
    </div>
  )
}

export default LandingPage
