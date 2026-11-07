import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { GolfCoursePage } from './components/GolfCoursePag.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GolfCoursePage />
  </StrictMode>,
)
