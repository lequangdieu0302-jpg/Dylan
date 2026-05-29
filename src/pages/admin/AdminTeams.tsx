import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import { getTeams, createTeam, updateTeam, deleteTeam, uploadLogo } from '@/services/adminService'
import type { Team } from '@/types'

export function AdminTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', logo_url: '', group_code: '', country_code: '' })
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [])
  async function load() { setTeams(await getTeams()) }

  const handleSave = async () => {
    try {
      if (editId) { await updateTeam(editId, form); toast.success('Đã cập nhật đội') }
      else { await createTeam(form); toast.success('Đã thêm đội bóng') }
      setShowForm(false); setEditId(null); load()
    } catch (e: unknown) { toast.error('Lỗi', e instanceof Error ? e.message : String(e)) }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadLogo('team-logos', file, form.name || 'team')
      setForm({ ...form, logo_url: url })
      toast.success('Logo tải lên thành công')
    } catch { toast.error('Upload thất bại') }
    finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-black text-2xl">Quản lý Đội Bóng</h1>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', logo_url: '', group_code: '', country_code: '' }) }}>
          <Plus className="h-4 w-4 mr-1" /> Thêm đội
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardContent className="pt-4 grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Tên đội</Label>
              <Input className="mt-1" placeholder="Brazil, Argentina..." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Logo</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="URL hoặc upload..." value={form.logo_url}
                  onChange={e => setForm({ ...form, logo_url: e.target.value })} />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  <Button type="button" variant="outline" size="icon" disabled={uploading}>
                    <Upload className="h-4 w-4" />
                  </Button>
                </label>
              </div>
            </div>
            <div>
              <Label>Bảng</Label>
              <Input className="mt-1" placeholder="A, B, C..." value={form.group_code}
                onChange={e => setForm({ ...form, group_code: e.target.value })} />
            </div>
            <div>
              <Label>Mã quốc gia</Label>
              <Input className="mt-1" placeholder="BRA, ARG..." value={form.country_code}
                onChange={e => setForm({ ...form, country_code: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={handleSave}><Check className="h-4 w-4 mr-1" /> Lưu</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4 mr-1" /> Huỷ</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {teams.map(t => (
          <Card key={t.id} className="glass-card border-white/10">
            <CardContent className="p-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                {t.logo_url ? <img src={t.logo_url} alt={t.name} className="w-12 h-12 object-contain" /> : <span className="text-3xl">🏴</span>}
              </div>
              <div className="font-semibold text-sm truncate">{t.name}</div>
              {t.group_code && <div className="text-xs text-muted-foreground">Bảng {t.group_code}</div>}
              <div className="flex justify-center gap-1 mt-2">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                  onClick={() => { setEditId(t.id); setForm({ name: t.name, logo_url: t.logo_url ?? '', group_code: t.group_code ?? '', country_code: t.country_code ?? '' }); setShowForm(true) }}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                  onClick={async () => { if (!confirm(`Xóa ${t.name}?`)) return; await deleteTeam(t.id); load() }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
