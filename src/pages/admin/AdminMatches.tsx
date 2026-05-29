import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'
import { adminGetAllMatches, getTeams } from '@/services/adminService'
import { createMatch, updateMatch, deleteMatch, setMatchResult } from '@/services/matchService'
import { formatMatchTime } from '@/lib/utils'
import type { Match, Team } from '@/types'

export function AdminMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [form, setForm] = useState({
    home_team_id: '', away_team_id: '', match_time: '', round: '', venue: '', status: 'upcoming' as Match['status'],
  })
  const [resultForm, setResultForm] = useState<{ id: string; home: string; away: string } | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [m, t] = await Promise.all([adminGetAllMatches(), getTeams()])
    setMatches(m); setTeams(t); setLoading(false)
  }

  const handleSave = async () => {
    try {
      if (editId) {
        await updateMatch(editId, { ...form })
        toast.success('Đã cập nhật trận đấu')
      } else {
        await createMatch({ ...form })
        toast.success('Đã tạo trận đấu')
      }
      setShowForm(false); setEditId(null); load()
    } catch (e: unknown) { toast.error('Lỗi', e instanceof Error ? e.message : String(e)) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa trận đấu này?')) return
    try { await deleteMatch(id); load(); toast.success('Đã xóa') }
    catch (e: unknown) { toast.error('Lỗi', e instanceof Error ? e.message : String(e)) }
  }

  const handleSetResult = async () => {
    if (!resultForm) return
    try {
      await setMatchResult(resultForm.id, +resultForm.home, +resultForm.away)
      setResultForm(null); load()
      toast.success('Đã cập nhật kết quả và tính điểm!')
    } catch (e: unknown) { toast.error('Lỗi', e instanceof Error ? e.message : String(e)) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-black text-2xl">Quản lý trận đấu</h1>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm({ home_team_id: '', away_team_id: '', match_time: '', round: '', venue: '', status: 'upcoming' }) }}>
          <Plus className="h-4 w-4 mr-1" /> Thêm trận
        </Button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader><CardTitle>{editId ? 'Sửa trận đấu' : 'Thêm trận đấu mới'}</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Đội nhà</Label>
              <select className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm mt-1"
                value={form.home_team_id} onChange={e => setForm({ ...form, home_team_id: e.target.value })}>
                <option value="">Chọn đội...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Đội khách</Label>
              <select className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm mt-1"
                value={form.away_team_id} onChange={e => setForm({ ...form, away_team_id: e.target.value })}>
                <option value="">Chọn đội...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Giờ thi đấu</Label>
              <Input type="datetime-local" className="mt-1" value={form.match_time}
                onChange={e => setForm({ ...form, match_time: e.target.value })} />
            </div>
            <div>
              <Label>Vòng đấu</Label>
              <Input className="mt-1" placeholder="Vòng bảng, Tứ kết..." value={form.round}
                onChange={e => setForm({ ...form, round: e.target.value })} />
            </div>
            <div>
              <Label>Sân vận động</Label>
              <Input className="mt-1" placeholder="Tên sân..." value={form.venue}
                onChange={e => setForm({ ...form, venue: e.target.value })} />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <select className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm mt-1"
                value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Match['status'] })}>
                <option value="upcoming">Sắp diễn ra</option>
                <option value="live">LIVE</option>
                <option value="finished">Kết thúc</option>
                <option value="cancelled">Huỷ</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={handleSave}><Check className="h-4 w-4 mr-1" /> Lưu</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4 mr-1" /> Huỷ</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result form */}
      {resultForm && (
        <Card className="glass-card border-green-500/30">
          <CardHeader><CardTitle className="text-green-400">Cập nhật kết quả</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3">
            <Input type="number" min={0} className="w-24" placeholder="Đội nhà"
              value={resultForm.home} onChange={e => setResultForm({ ...resultForm, home: e.target.value })} />
            <span className="font-bold text-xl text-muted-foreground">-</span>
            <Input type="number" min={0} className="w-24" placeholder="Đội khách"
              value={resultForm.away} onChange={e => setResultForm({ ...resultForm, away: e.target.value })} />
            <Button onClick={handleSetResult} className="ml-2">Xác nhận & Tính điểm</Button>
            <Button variant="outline" onClick={() => setResultForm(null)}>Huỷ</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Trận', 'Giờ', 'Vòng', 'Trạng thái', 'Tỷ số', ''].map(h => (
                    <th key={h} className="text-left p-3 text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="p-3"><Skeleton className="h-8" /></td></tr>
                  ))
                  : matches.map(m => (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="p-3">
                        <span className="font-medium">{m.home_team?.name ?? '?'}</span>
                        <span className="text-muted-foreground mx-2">vs</span>
                        <span className="font-medium">{m.away_team?.name ?? '?'}</span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{formatMatchTime(m.match_time)}</td>
                      <td className="p-3 text-muted-foreground text-xs">{m.round ?? '—'}</td>
                      <td className="p-3">
                        <span className={m.status === 'live' ? 'badge-live' : m.status === 'upcoming' ? 'badge-upcoming' : 'badge-finished'}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        {m.home_score !== null ? `${m.home_score} - ${m.away_score}` : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                            onClick={() => setResultForm({ id: m.id, home: String(m.home_score ?? ''), away: String(m.away_score ?? '') })}>
                            Kết quả
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => { setEditId(m.id); setForm({ home_team_id: m.home_team_id, away_team_id: m.away_team_id, match_time: m.match_time.slice(0, 16), round: m.round ?? '', venue: m.venue ?? '', status: m.status }); setShowForm(true) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
