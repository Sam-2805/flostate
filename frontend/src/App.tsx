import React, { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Workload from './pages/Workload'
import Scheduler from './pages/Scheduler'
import Regions from './pages/Regions'
import EnvironmentalData from './pages/EnvironmentalData'
import JobHistory from './pages/JobHistory'
import QueryRouting from './pages/QueryRouting'
import Settings from './pages/Settings'

export type Page = 'dashboard' | 'query-routing' | 'workload' | 'scheduler' | 'regions' | 'environment' | 'history' | 'settings'

const NAV_ITEMS: { id: Page; label: string; icon: string; section?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'query-routing', label: 'Query Routing', icon: '🔍' },
  { id: 'workload', label: 'Workload', icon: '⚡' },
  { id: 'scheduler', label: 'Scheduler', icon: '🔄' },
  { id: 'regions', label: 'Regions', icon: '🌐' },
  { id: 'environment', label: 'Environmental Data', icon: '🌱' },
  { id: 'history', label: 'Job History', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />
      case 'query-routing': return <QueryRouting />
      case 'workload': return <Workload onComplete={() => setCurrentPage('scheduler')} />
      case 'scheduler': return <Scheduler />
      case 'regions': return <Regions />
      case 'environment': return <EnvironmentalData />
      case 'history': return <JobHistory />
      case 'settings': return <Settings />
      default: return <Dashboard onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">F</div>
            <div>
              <div className="sidebar-logo-text">FLOState</div>
              <div className="sidebar-logo-sub">AI Workload Orchestrator</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Main</div>
          {NAV_ITEMS.slice(0, 2).map(item => (
            <a
              key={item.id}
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}

          <div className="sidebar-section-title">Analysis</div>
          {NAV_ITEMS.slice(2, 5).map(item => (
            <a
              key={item.id}
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}

          <div className="sidebar-section-title">System</div>
          {NAV_ITEMS.slice(5).map(item => (
            <a
              key={item.id}
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div>v1.0.0 · Prototype</div>
          <div className="demo-badge">
            <span>●</span> DEMO MODE
          </div>
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  )
}
