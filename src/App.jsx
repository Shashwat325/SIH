import { useState } from 'react'
import { Routes, Route } from "react-router-dom";
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import MapComponent from './map/MapComponent'

function App() {
  const [count, setCount] = useState(0)

  return (
    
      <Routes>
      <Route path="/" element={<MapComponent />} />
    </Routes>
    
  )
}

export default App
