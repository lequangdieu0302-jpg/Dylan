import { useEffect, useState } from 'react'
import { RotateCcw, Ban, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HopeStars } from '@/components/ui/HopeStars'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'
import { getAllUsers, banUser, resetHopeStars, moveUserCompany, getCompanies } from '@/services/adminService'
import { formatMoney, getAvatarFallback } from '@/lib/utils'
import type { Profile, Company } from '@/types'

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([getAllUsers(), getCompanies()])
      .then(([u, c]) => { setUsers(u); setCompanies(c) })
      .finally(() => setLoading(false))
  }, [])

  const reload = () => {
    getAllUsers().then(setUsers)
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.company as Company | null)?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display font-black text-2xl">Quản lý Người Dùng</h1>
        <input
          className="flex h-9 rounded-xl border border-input bg-background/50 px-3 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Người dùng', 'Công ty', 'Đúng/Sai', 'Tiền quỹ', 'Sao', 'Role', 'Hành động'].map(h => (
                    <th key={h} className="text-left p-3 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="p-3"><Skeleton className="h-10" /></td></tr>
                  ))
                  : filtered.map(u => {
                    const company = u.company as Company | null
                    return (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback>{getAvatarFallback(u.username)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.username}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {company?.name ?? '—'}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-green-400">{u.total_correct}✓</span>
                          {' '}
                          <span className="text-red-400">{u.total_wrong}✗</span>
                        </td>
                        <td className="p-3">
                          <span className={u.total_money > 0 ? 'text-red-400' : 'text-green-400'}>
                            {formatMoney(u.total_money)}
                          </span>
                        </td>
                        <td className="p-3">
                          <HopeStars count={u.hope_stars} size="sm" />
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${u.role === 'admin' ? 'border-gold-400/30 bg-gold-400/10 text-gold-400' : 'border-white/10 text-muted-foreground'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
                              onClick={async () => {
                                await resetHopeStars(u.id)
                                toast.success(`Reset sao cho ${u.username}`)
                                reload()
                              }}>
                              <RotateCcw className="h-3 w-3" /> Sao
                            </Button>
                            <select
                              className="h-7 rounded-lg border border-input bg-background/50 text-xs px-1"
                              value={u.company_id ?? ''}
                              onChange={async e => {
                                await moveUserCompany(u.id, e.target.value)
                                toast.success('Đã chuyển công ty')
                                reload()
                              }}
                            >
                              <option value="">Chuyển CT</option>
                              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {u.role !== 'admin' && (
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                                onClick={async () => {
                                  await banUser(u.id)
                                  toast.success(`Đã cập nhật role ${u.username}`)
                                  reload()
                                }}>
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
