import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Dashboard from './pages/Dashboard'
import ContentList from './pages/ContentList'
import Editor from './pages/Editor'
import SitePreview from './pages/SitePreview'
import Settings from './pages/Settings'

const router = createBrowserRouter([
  { path: '/', element: <Welcome /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/content', element: <ContentList /> },
  { path: '/editor/:type', element: <Editor /> },
  { path: '/editor', element: <Editor /> },
  { path: '/preview', element: <SitePreview /> },
  { path: '/settings', element: <Settings /> },
])

export default router