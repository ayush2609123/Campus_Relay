import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return (
    <button
      aria-label="Toggle theme"
      onClick={() => setDark(!dark)}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition"
    >
      {dark ? <Sun size={16}/> : <Moon size={16}/>}<span className="text-sm">{dark ? 'Light' : 'Dark'}</span>
    </button>
  )
}