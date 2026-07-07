import { Routes, Route } from 'react-router-dom'
import DashboardLayout from './layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import DailyBytesParser from './pages/DailyBytesParser'
import StaticParser from './pages/StaticParser'
import CAParser from './pages/CAParser'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="daily-bytes-parser" element={<DailyBytesParser />} />
        <Route path="static-parser" element={<StaticParser />} />
        <Route path="ca-parser" element={<CAParser />} />
      </Route>
    </Routes>
  )
}

export default App
