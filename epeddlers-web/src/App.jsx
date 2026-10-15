import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ToastProvider } from './components/Toast'
import { Spinner } from './components/ui'

import { Users, LayoutDashboard, FileText, ScrollText, BarChart3 } from 'lucide-react'

import PublicLayout from './components/PublicLayout'
import WorkspaceLayout from './components/WorkspaceLayout'
import Landing from './pages/public/Landing'
import Apply from './pages/public/Apply'
import Track from './pages/public/Track'
import { About, HowItWorks, Contact, NotFound } from './pages/public/StaticPages'
import Login from './pages/Login'

import { Coins, CalendarCheck, Receipt } from 'lucide-react'

import AdminDashboard from './pages/admin/Dashboard'
import AdminApplications from './pages/admin/Applications'
import AdminUsers from './pages/admin/UsersPage'
import AdminActivityLogs from './pages/admin/ActivityLogs'
import AdminReports from './pages/admin/Reports'

import TreasuryDashboard from './pages/treasury/Dashboard'
import TreasuryApplicants from './pages/treasury/Applicants'
import TreasuryCollections from './pages/treasury/Collections'
import TreasuryWeeklyReport from './pages/treasury/WeeklyReport'

const ADMIN_NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/applications', label: 'Applications', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/activity', label: 'Activity Logs', icon: ScrollText },
]

const TREASURY_NAV = [
  { to: '/treasury', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/treasury/applicants', label: 'Payments', icon: Receipt },
  { to: '/treasury/collections', label: 'Collections', icon: Coins },
  { to: '/treasury/reports', label: 'Weekly Report', icon: CalendarCheck },
]

function RequireAuth({ children, permission }) {
  const { user, loading, hasPermission } = useAuth()
  if (loading)
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner size={28} className="text-primary" />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />
  if (permission && !hasPermission(permission)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-darkgreen">Access denied</h1>
        <p className="mt-2 text-sm text-gray-500">You don't have permission to view this area.</p>
      </div>
    )
  }
  return children
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Landing />} />
              <Route path="about" element={<About />} />
              <Route path="how-it-works" element={<HowItWorks />} />
              <Route path="apply" element={<Apply />} />
              <Route path="track" element={<Track />} />
              <Route path="contact" element={<Contact />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <RequireAuth permission="reports.view">
                  <WorkspaceLayout title="Admin" nav={ADMIN_NAV} />
                </RequireAuth>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="activity" element={<AdminActivityLogs />} />
            </Route>
            <Route
              path="/treasury"
              element={
                <RequireAuth permission="treasury.verify">
                  <WorkspaceLayout title="Treasury" nav={TREASURY_NAV} />
                </RequireAuth>
              }
            >
              <Route index element={<TreasuryDashboard />} />
              <Route path="applicants" element={<TreasuryApplicants />} />
              <Route path="collections" element={<TreasuryCollections />} />
              <Route path="reports" element={<TreasuryWeeklyReport />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}
