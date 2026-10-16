import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GameScreen } from './screens/GameScreen'
import { MainMenuScreen } from './screens/MainMenuScreen'
import { OptionsScreen } from './screens/OptionsScreen'
import { ResultScreen } from './screens/ResultScreen'

export default function App() {
  return (
    <BrowserRouter
      basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}
    >
      <Routes>
        <Route path="/" element={<MainMenuScreen />} />
        <Route path="/options" element={<OptionsScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/result" element={<ResultScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
