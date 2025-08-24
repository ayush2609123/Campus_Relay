import { useUI } from '@/store/ui'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/components/utils/cn'
import {
  LayoutDashboard, Search, Ticket, CarFront, CalendarClock,
  Navigation, UserCircle, ChevronLeft, ChevronRight
} from 'lucide-react'

type ItemT = { to: string; label: string; icon: React.ComponentType<{ size?: number, className?: string }> }

const baseItems: ItemT[] = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/find-trips', label: 'Find Trips', icon: Search },
  { to: '/bookings',   label: 'My Bookings',icon: Ticket },
]

const driverItems: ItemT[] = [
  { to: '/driver/create-trip', label: 'Create Trip', icon: Navigation },
  { to: '/driver/my-trips',    label: 'My Trips',    icon: CalendarClock },
  { to: '/driver/vehicles',    label: 'Vehicles',    icon: CarFront },
]

const profileItems: ItemT[] = [
  { to: '/profile/sessions', label: 'Sessions', icon: UserCircle },
]

export function Sidebar({ role }: { role?: 'rider'|'driver'|'admin' }) {
  const { sidebarOpen, toggleSidebar } = useUI()
  const loc = useLocation()

  const Item = ({ to, label, icon: Icon }: ItemT) => {
    const active = loc.pathname === to
    return (
      <Link
        to={to}
        title={label}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2 transition',
          'hover:bg-slate-100 dark:hover:bg-slate-900',
          active && 'bg-slate-100 dark:bg-slate-900 font-semibold',
          !sidebarOpen && 'justify-center'
        )}
      >
        <Icon size={18} className="shrink-0"/>
        {sidebarOpen && <span className="truncate">{label}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'border-r border-slate-200 dark:border-slate-800 h-[calc(100vh-56px)] sticky top-[56px] bg-transparent',
        'transition-all duration-200',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Collapse/Expand button */}
      <div className="p-2">
        <button
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className={cn(
            'w-full flex items-center justify-center rounded-lg border',
            'border-slate-200 dark:border-slate-800 px-2 py-1 text-xs',
            'hover:bg-slate-50 dark:hover:bg-slate-900 transition'
          )}
        >
          {sidebarOpen ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
          {sidebarOpen && <span className="ml-2">Collapse</span>}
        </button>
      </div>

      <nav className="px-2 pb-4 space-y-2">
        {baseItems.map(i => <Item key={i.to} {...i} />)}

        {role === 'driver' && (
          <>
            {sidebarOpen && <div className="px-3 pt-3 text-xs uppercase tracking-wider text-slate-400">Driver</div>}
            {driverItems.map(i => <Item key={i.to} {...i} />)}
          </>
        )}

        {sidebarOpen && <div className="px-3 pt-3 text-xs uppercase tracking-wider text-slate-400">Profile</div>}
        {profileItems.map(i => <Item key={i.to} {...i} />)}
      </nav>
    </aside>
  )
}
