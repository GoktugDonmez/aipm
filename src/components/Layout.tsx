import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Container, Flex, Box } from '@radix-ui/themes'
import { Home, Search, GitBranch, Settings } from 'lucide-react'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/visualize', icon: GitBranch, label: 'Visualize' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <Flex direction="column" style={{ minHeight: '100vh' }}>
      <Box
        className="nav-bar"
        style={{
          borderBottom: '1px solid var(--gray-6)',
          padding: '1rem 2rem',
        }}
      >
        <Flex justify="between" align="center">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Memoria</h1>
          <Flex gap="4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </Flex>
        </Flex>
      </Box>
      <Container size="4" style={{ flex: 1, paddingTop: '2rem', paddingBottom: '2rem' }}>
        {children}
      </Container>
    </Flex>
  )
}
