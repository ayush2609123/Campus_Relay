import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '@/lib/api'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useQueryClient } from "@tanstack/react-query";
const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
type FormData = z.infer<typeof schema>

export default function Login() {
  const nav = useNavigate()
  const qc = useQueryClient();
  const loc = useLocation() as any
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      await api.post('/auth/login', data)
      await qc.invalidateQueries({ queryKey: ["me"] });
      const from = (loc.state as any)?.from?.pathname || "/dashboard";
      nav(from, { replace: true });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-card bg-white/70 dark:bg-slate-950/70 backdrop-blur p-6">
        <h2 className="text-2xl font-semibold">Welcome back</h2>
        <p className="text-sm text-slate-500 mb-4">Sign in to continue</p>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Email</span>
            <input type="email" {...register('email')} className="rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500" />
            {errors.email && <small className="text-rose-500">{errors.email.message}</small>}
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Password</span>
            <input type="password" {...register('password')} className="rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500" />
            {errors.password && <small className="text-rose-500">{errors.password.message}</small>}
          </label>
          <button disabled={isSubmitting} className="rounded-xl bg-brand-600 text-white py-2 hover:bg-brand-700 transition disabled:opacity-60">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
          {error && <div className="text-sm text-rose-600">{error}</div>}
        </form>
        <div className="flex items-center justify-between mt-4 text-sm">
          <Link to="/register" className="text-brand-700 dark:text-brand-300 hover:underline">Create account</Link>
          <Link to="/" className="text-slate-500 hover:underline">Back</Link>
        </div>
      </div>
    </div>
  )
}