import { Routes, Route } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Search from './pages/Search'
import Visualize from './pages/Visualize'
import Settings from './pages/Settings'

function App() {
  return (
    <Theme appearance="dark" accentColor="indigo">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<Search />} />
          <Route path="/visualize" element={<Visualize />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Theme>
  )
}

export default App
