import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AdminMetrics } from './pages/AdminMetrics'
import { BestDishes } from './pages/BestDishes'
import { Capture } from './pages/Capture'
import { Home } from './pages/Home'
import { ListEditor } from './pages/ListEditor'
import { Lists } from './pages/Lists'
import { Login } from './pages/Login'
import { MapPage } from './pages/MapPage'
import { Settings } from './pages/Settings'
import { SharedList } from './pages/SharedList'
import { SpotDetail } from './pages/SpotDetail'
import { Spots } from './pages/Spots'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/l/:slug" element={<SharedList />} />
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="add" element={<Capture />} />
        <Route path="spots" element={<Spots />} />
        <Route path="spots/:id" element={<SpotDetail />} />
        <Route path="map" element={<MapPage />} />
        <Route path="best" element={<BestDishes />} />
        <Route path="lists" element={<Lists />} />
        <Route path="lists/:id" element={<ListEditor />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin/metrics" element={<AdminMetrics />} />
      </Route>
    </Routes>
  )
}
