import AppRouter from './AppRouter.jsx'
import './AppFrame.css'

function App() {
  return (
    <div className="app-stage">
      <div className="app-desktop-glow" aria-hidden="true" />
      <div className="app-mobile-root">
        <AppRouter />
      </div>
    </div>
  )
}

export default App
