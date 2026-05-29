import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Check, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import { getCompanies, createCompany, updateCompany, deleteCompany, uploadLogo } from '@/services/adminService'
import type { Company } from '@/types'

export function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', logo_url: '', is_active: true })
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [])
  async function load() { setCompanies(await getCompanies()) }

  const handleSave = async () => {
    try {
      if (editId) { await updateCompany(editId, form); toast.success('Đã cập nhật') }
      else { await createCompany(form); toast.success('Đã tạo công ty') }
      setShowForm(false); setEditId(null); load()
    } catch (e: unknown) { toast.error('Lỗi', e instanceof Error ? e.message : String(e)) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa công ty này?')) return
    try { await deleteCompany(id); load(); toast.success('Đã xóa') }
    catch (e: unknown) { toast.error('Lỗi', e instanceof Error ? e.message : String(e)) }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadLogo('company-logos', file, form.name || 'company')
      setForm({ ...form, logo_url: url })
      toast.success('Logo tải lên thành công')
    } catch (e: unknown) { toast.error('Upload thất bại', e instanceof Error ? e.message : String(e)) }
    finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-black text-2xl">Quản lý Công Ty</h1>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', logo_url: '', is_active: true }) }}>
          <Plus className="h-4 w-4 mr-1" /> Thêm công ty
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-primary/20">
          <CardHeader><CardTitle>{editId ? 'Sửa công ty' : 'Thêm công ty mới'}</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Tên công ty</Label>
              <Input className="mt-1" placeholder="TTI, Jabil, Intel..." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Logo URL</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="https://..." value={form.logo_url}
                  onChange={e => setForm({ ...form, logo_url: e.target.value })} />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  <Button type="button" variant="outline" size="icon" disabled={uploading}>
                    <Upload className="h-4 w-4" />
                  </Button>
                </label>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <Label htmlFor="active">Hoạt động</Label>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button onClick={handleSave}><Check className="h-4 w-4 mr-1" /> Lưu</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4 mr-1" /> Huỷ</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {companies.map(c => (
          <Card key={c.id} className="glass-card border-white/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {c.logo_url ? <img src={c.logo_url} alt={c.name} className="w-8 h-8 object-contain" /> : <span className="text-xl">🏢</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                <div className={`text-xs ${c.is_active ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {c.is_active ? '● Hoạt động' : '○ Không hoạt động'}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                  onClick={() => { setEditId(c.id); setForm({ name: c.name, logo_url: c.logo_url ?? '', is_active: c.is_active }); setShowForm(true) }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                  onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
