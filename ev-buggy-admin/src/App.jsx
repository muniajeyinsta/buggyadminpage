import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
const AUTH_KEY = 'ev_buggy_admin_auth'
const PAGE_SIZE = 50
const LOGIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'admin'
const LOGIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'buggy2026'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
})

function errMessage(error) {
  if (!API_BASE_URL) {
    return 'API base URL not configured. Set VITE_API_BASE_URL in .env.'
  }
  if (!error?.response) return 'Server not reachable'
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Request failed'
  )
}

function normalizeUser(raw) {
  const expiryDate =
    raw.expiryDate || raw.expiry_date || raw.expires_at || raw.expiresAt || ''
  const status = String(raw.status || 'Pending')
  return {
    id: String(raw.id || raw._id || raw.userId || raw.user_id || ''),
    userId: String(raw.userId || raw.user_id || raw.id || ''),
    name: String(raw.name || ''),
    phone: String(raw.phone || raw.phone_number || ''),
    apartment_name: String(raw.apartment_name || raw.apartmentName || ''),
    tower: String(raw.tower || ''),
    floor: String(raw.floor || ''),
    flat_number: String(raw.flat_number || raw.flatNumber || ''),
    status: ['Paid', 'Pending', 'Expired'].includes(status) ? status : 'Pending',
    expiryDate: String(expiryDate).slice(0, 10),
    plan: String(raw.plan || raw.plan_name || ''),
    amountPaid: Number(raw.amountPaid || raw.amount_paid || 0),
  }
}

function isExpired(expiryDate) {
  if (!expiryDate) return false
  const d = new Date(expiryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function effectiveStatus(u) {
  if (u.status === 'Pending') return 'Pending'
  if (isExpired(u.expiryDate)) return 'Expired'
  return 'Paid'
}

async function fetchUsers() {
  if (!API_BASE_URL) throw new Error('API base URL not configured')
  const { data } = await api.get('/admin/users')
  const list = Array.isArray(data) ? data : data?.users || data?.data || []
  return list.map(normalizeUser)
}

async function fetchUserById(id) {
  if (!API_BASE_URL) throw new Error('API base URL not configured')
  const { data } = await api.get(`/admin/user/${encodeURIComponent(id)}`)
  return normalizeUser(data?.user || data?.data || data)
}

async function createUser(payload) {
  if (!API_BASE_URL) throw new Error('API base URL not configured')
  const { data } = await api.post('/admin/create-user', payload)
  return normalizeUser(data?.user || data?.data || payload)
}

async function updateUser(payload) {
  if (!API_BASE_URL) throw new Error('API base URL not configured')
  const { data } = await api.post('/admin/update-user', payload)
  return normalizeUser(data?.user || data?.data || payload)
}

async function deleteUser(id) {
  if (!API_BASE_URL) throw new Error('API base URL not configured')
  await api.delete(`/admin/user/${encodeURIComponent(id)}`)
}

function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function ErrorBanner({ error, retry }) {
  if (!error) return null
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
      <div className="flex items-start gap-2">
        <span aria-hidden className="pt-0.5">
          ⚠️
        </span>
        <span>{error}</span>
      </div>
      {retry && (
        <button
          className="rounded-lg bg-amber-700 px-3 py-2 font-semibold text-white hover:bg-amber-800"
          onClick={retry}
          type="button"
        >
          Retry
        </button>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    Paid: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-rose-100 text-rose-700',
    Expired: 'bg-rose-100 text-rose-700',
  }
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${map[status] || map.Pending}`}
    >
      {status}
    </span>
  )
}

function Spinner() {
  return (
    <span
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
      aria-label="Loading"
    />
  )
}

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const to = location.state?.from?.pathname || '/'

  const submit = (e) => {
    e.preventDefault()
    if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, '1')
      navigate(to, { replace: true })
      return
    }
    setError('Invalid username or password')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm"
      >
        <h1 className="text-2xl font-bold text-slate-900">EV Buggy Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to continue</p>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          Username
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}
        <button
          className="mt-4 w-full rounded-xl bg-slate-900 py-3 font-semibold text-white"
          type="submit"
        >
          Login
        </button>
      </form>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const authed = localStorage.getItem(AUTH_KEY) === '1'
  const location = useLocation()
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

function AppLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const logout = () => {
    localStorage.removeItem(AUTH_KEY)
    navigate('/login', { replace: true })
  }
  const navClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-slate-200 hover:bg-slate-800'
    }`

  const apiLabel = API_BASE_URL || 'Not configured'

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-slate-900 p-4 shadow-xl transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between md:justify-start">
          <h2 className="text-xl font-bold text-white">EV Buggy Admin</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg border border-slate-700 px-2 py-1 text-slate-200 md:hidden"
            type="button"
          >
            ✕
          </button>
        </div>
        <nav className="grid gap-2">
          <NavLink to="/" end className={navClass}>
            <span aria-hidden>📊</span> Dashboard
          </NavLink>
          <NavLink to="/users" className={navClass}>
            <span aria-hidden>👥</span> Users
          </NavLink>
          <NavLink to="/add-user" className={navClass}>
            <span aria-hidden>➕</span> Add User
          </NavLink>
          <NavLink to="/import" className={navClass}>
            <span aria-hidden>📤</span> Import
          </NavLink>
        </nav>
      </aside>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <main className="min-w-0 flex-1 md:ml-0">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-300 px-3 py-2 md:hidden"
              type="button"
            >
              ☰
            </button>
            <div>
              <h1 className="text-lg font-semibold">Admin Panel</h1>
              <p className="text-xs text-slate-500">API: {apiLabel}</p>
            </div>
          </div>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            type="button"
            onClick={logout}
          >
            Logout
          </button>
        </header>
        <div className="p-4 md:p-6">
        <Outlet />
        </div>
      </main>
    </div>
  )
}

function DashboardPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setUsers(await fetchUsers())
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    let paid = 0
    let expired = 0
    let pending = 0
    users.forEach((u) => {
      const s = effectiveStatus(u)
      if (s === 'Paid') paid++
      else if (s === 'Expired') expired++
      else pending++
    })
    return { total: users.length, paid, expired, pending }
  }, [users])

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <Spinner /> <span>Loading dashboard...</span>
      </div>
    )
  }

  const cardClass = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100'
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mb-4 text-sm text-slate-500">Quick subscription summary</p>
      <ErrorBanner error={error} retry={load} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Total users</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Active users (Paid)</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.paid}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Expired users</p>
          <p className="text-3xl font-bold text-rose-600">{stats.expired}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Pending users</p>
          <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
        </div>
      </div>
    </div>
  )
}

function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const debouncedQuery = useDebounce(query)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setUsers(await fetchUsers())
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const filter = searchParams.get('filter')
    if (['Paid', 'Pending', 'Expired'].includes(filter)) setStatusFilter(filter)
  }, [searchParams])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const normalizedQuery = debouncedQuery.toLowerCase().trim()
    const output = users.filter((u) => {
      const matchQuery =
        !normalizedQuery ||
        `${u.userId} ${u.phone} ${u.flat_number}`.toLowerCase().includes(normalizedQuery)
      const matchFilter =
        statusFilter === 'all' || effectiveStatus(u) === statusFilter
      return matchQuery && matchFilter
    })
    output.sort((a, b) => {
      const aDate = a.expiryDate ? new Date(a.expiryDate).getTime() : 0
      const bDate = b.expiryDate ? new Date(b.expiryDate).getTime() : 0
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
    })
    return output
  }, [users, debouncedQuery, statusFilter, sortOrder])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, statusFilter, sortOrder])

  const setFilter = (value) => {
    setStatusFilter(value)
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('filter')
    else next.set('filter', value)
    setSearchParams(next, { replace: true })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Users</h1>
      <p className="text-sm text-slate-500">Manage and update users</p>
      <ErrorBanner error={error} retry={load} />
      <div className="mt-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-4">
        <div className="relative md:col-span-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔎
          </span>
          <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by userId, phone, flat"
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Expired">Expired</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="asc">Expiry (earliest)</option>
          <option value="desc">Expiry (latest)</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm">
          <Spinner /> <span>Loading users...</span>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Apartment</th>
                  <th className="p-3">Tower</th>
                  <th className="p-3">Floor</th>
                  <th className="p-3">Flat</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Plan</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={`border-t border-slate-100 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                    } hover:bg-blue-50`}
                  >
                    <td className="p-3 font-semibold">
                      <Link to={`/users/${encodeURIComponent(u.id)}`} className="text-blue-700">
                        {u.userId}
                      </Link>
                    </td>
                    <td className="p-3">{u.name || '-'}</td>
                    <td className="p-3">{u.phone || '-'}</td>
                    <td className="p-3">{u.apartment_name || '-'}</td>
                    <td className="p-3">{u.tower || '-'}</td>
                    <td className="p-3">{u.floor || '-'}</td>
                    <td className="p-3">{u.flat_number || '-'}</td>
                    <td className="p-3">
                      <StatusBadge status={effectiveStatus(u)} />
                    </td>
                    <td className="p-3">{u.expiryDate || '-'}</td>
                    <td className="p-3">{u.plan || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginated.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <p className="text-3xl">📭</p>
                <p className="mt-2 text-base font-medium text-slate-700">No users found</p>
                <p className="text-sm">Try updating search or filters.</p>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              type="button"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {safePage} / {totalPages}
            </span>
            <button
              className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function UserDetailPage() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const [status, setStatus] = useState('Pending')
  const [expiryDate, setExpiryDate] = useState('')
  const [plan, setPlan] = useState('')
  const [amountPaid, setAmountPaid] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchUserById(id)
      setUser(data)
      setStatus(data.status === 'Expired' ? 'Paid' : data.status)
      setExpiryDate(data.expiryDate || '')
      setPlan(data.plan || '')
      setAmountPaid(String(data.amountPaid || ''))
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const saveChanges = async (patch = {}) => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      const updated = await updateUser({
        id: user.id,
        userId: user.userId,
        status: patch.status ?? status,
        expiryDate: patch.expiryDate ?? expiryDate,
        expiry_date: patch.expiryDate ?? expiryDate,
        plan: patch.plan ?? plan,
        amountPaid: Number(patch.amountPaid ?? amountPaid ?? 0),
      })
      setUser(updated)
      setStatus(updated.status === 'Expired' ? 'Paid' : updated.status)
      setExpiryDate(updated.expiryDate || '')
      setPlan(updated.plan || '')
      setAmountPaid(String(updated.amountPaid || 0))
      setSuccess('Changes saved successfully.')
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const extend30 = () => {
    const base = expiryDate ? new Date(expiryDate) : new Date()
    base.setDate(base.getDate() + 30)
    const nextDate = base.toISOString().slice(0, 10)
    setExpiryDate(nextDate)
    saveChanges({ expiryDate: nextDate })
  }

  const resetPending = () => saveChanges({ status: 'Pending' })
  const markPaid = () => saveChanges({ status: 'Paid' })
  const submit = (e) => {
    e.preventDefault()
    saveChanges()
  }

  const remove = async () => {
    if (!window.confirm('Delete this user?')) return
    try {
      setSaving(true)
      setError('')
      await deleteUser(user.id)
      navigate('/users', { replace: true })
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <Spinner /> <span>Loading user...</span>
      </div>
    )
  }
  if (!user) return <p>User not found</p>

  return (
    <div>
      <Link to="/users" className="text-sm text-blue-700">
        ← Back to users
      </Link>
      <h1 className="mt-2 text-2xl font-bold">User Detail</h1>
      <ErrorBanner error={error} retry={load} />
      {success && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm text-slate-500">Name</p>
        <p className="font-semibold">{user.name || '-'}</p>
        <p className="mt-2 text-sm text-slate-500">Phone</p>
        <p>{user.phone || '-'}</p>
        <p className="mt-2 text-sm text-slate-500">Apartment Info</p>
        <p>
          {[user.apartment_name, user.tower, user.floor, user.flat_number]
            .filter(Boolean)
            .join(' · ') || '-'}
        </p>
      </div>

      <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Expiry Date
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Plan
            <input
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Amount Paid
            <input
              type="number"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
            type="submit"
            disabled={saving}
          >
            Save changes
          </button>
          <button
            className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            type="button"
            onClick={markPaid}
            disabled={saving}
          >
            Mark as Paid
          </button>
          <button
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            type="button"
            onClick={extend30}
            disabled={saving}
          >
            Extend +30 days
          </button>
          <button
            className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-white disabled:opacity-50"
            type="button"
            onClick={resetPending}
            disabled={saving}
          >
            Reset to Pending
          </button>
          <button
            className="rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            type="button"
            onClick={remove}
            disabled={saving}
          >
            Delete User
          </button>
        </div>
      </form>
    </div>
  )
}

function AddUserPage() {
  const empty = {
    userId: '',
    name: '',
    phone: '',
    apartment_name: '',
    tower: '',
    floor: '',
    flat_number: '',
  }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const setValue = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError('')
      const payload = {
        userId: form.userId.trim(),
        user_id: form.userId.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        apartment_name: form.apartment_name.trim(),
        tower: form.tower.trim(),
        floor: form.floor.trim(),
        flat_number: form.flat_number.trim(),
      }
      await createUser(payload)
      setSuccess('User created successfully.')
      setForm(empty)
    } catch (err) {
      setError(errMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Add User</h1>
      <p className="text-sm text-slate-500">Create a new user from admin panel</p>
      <ErrorBanner error={error} />
      {success && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </p>
      )}
      <form
        onSubmit={submit}
        className="mt-4 max-w-3xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            User ID *
            <input
              required
              value={form.userId}
              onChange={setValue('userId')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Name *
            <input
              required
              value={form.name}
              onChange={setValue('name')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Phone *
            <input
              required
              value={form.phone}
              onChange={setValue('phone')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Apartment *
            <input
              required
              value={form.apartment_name}
              onChange={setValue('apartment_name')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Tower *
            <input
              required
              value={form.tower}
              onChange={setValue('tower')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Floor *
            <input
              required
              value={form.floor}
              onChange={setValue('floor')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Flat Number *
            <input
              required
              value={form.flat_number}
              onChange={setValue('flat_number')}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  )
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length <= 1) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    const obj = {}
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || ''
    })
    return {
      userId: obj.userid || obj.user_id || obj.id || '',
      name: obj.name || obj.full_name || '',
      phone: obj.phone || obj.mobile || '',
      apartment_name: obj.apartment_name || obj.apartment || '',
      tower: obj.tower || '',
      floor: obj.floor || '',
      flat_number: obj.flat_number || obj.flat || '',
    }
  })
}

function BulkImportPage() {
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setResult(null)
    setError('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result || ''))
        setRows(parsed)
      } catch {
        setError('Could not parse CSV file')
      }
    }
    reader.readAsText(file)
  }

  const runImport = async () => {
    setImporting(true)
    setError('')
    let ok = 0
    const failed = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.userId || !row.name || !row.phone) {
        failed.push(`Row ${i + 1}: missing userId/name/phone`)
        continue
      }
      try {
        await createUser(row)
        ok++
      } catch (e) {
        failed.push(`Row ${i + 1}: ${errMessage(e)}`)
      }
    }
    setResult({ ok, failed })
    setImporting(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Bulk Import</h1>
      <p className="text-sm text-slate-500">
        Upload CSV, preview data, then insert users via API
      </p>
      <ErrorBanner error={error} />
      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm text-slate-500">
          Required headers: userId, name, phone (plus apartment_name, tower, floor,
          flat_number)
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={onFile}
          className="mt-3 block w-full text-sm"
        />
      </div>

      {rows.length > 0 && (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-600">Preview rows: {rows.length}</p>
            <button
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
              onClick={runImport}
              disabled={importing}
              type="button"
            >
              {importing ? 'Importing...' : 'Import All'}
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3">User ID</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Apartment</th>
                  <th className="p-3">Tower</th>
                  <th className="p-3">Floor</th>
                  <th className="p-3">Flat</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="p-3">{r.userId || '-'}</td>
                    <td className="p-3">{r.name || '-'}</td>
                    <td className="p-3">{r.phone || '-'}</td>
                    <td className="p-3">{r.apartment_name || '-'}</td>
                    <td className="p-3">{r.tower || '-'}</td>
                    <td className="p-3">{r.floor || '-'}</td>
                    <td className="p-3">{r.flat_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-semibold text-emerald-700">Imported: {result.ok}</p>
          {result.failed.length > 0 && (
            <>
              <p className="mt-2 font-semibold text-rose-700">Failed: {result.failed.length}</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-rose-700">
                {result.failed.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
          <Route path="/import" element={<BulkImportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
