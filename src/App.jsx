import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import DashboardLayout from './layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import DailyBytesParser from './pages/DailyBytesParser'
import StaticParser from './pages/StaticParser'
import CAParser from './pages/CAParser'
import RecallGameParser from './pages/RecallGameParser'
import CaQbParser from './pages/CaQbParser'
import './App.css'

// Code-split: pdfjs-dist is heavy and only needed on this one page, so it
// shouldn't bloat the initial bundle for every visitor.
const TnpscParser = lazy(() => import('./pages/TnpscParser'))

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="daily-bytes-parser" element={<DailyBytesParser />} />
        <Route path="static-parser" element={<StaticParser />} />
        <Route path="ca-parser" element={<CAParser />} />
        <Route path="recall-game-parser" element={<RecallGameParser />} />
        <Route path="ca-qb-parser" element={<CaQbParser />} />
        <Route
          path="tnpsc-parser"
          element={
            <Suspense fallback={<div className="page"><p>Loading…</p></div>}>
              <TnpscParser />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}

export default App
