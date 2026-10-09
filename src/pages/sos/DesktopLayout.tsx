import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { catApi, sosApi, typeApi } from '@pc/lib/api'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@pc/lib/upload'
import { catDetailToListItem } from '@pc/lib/cat'
import { CampusMap, type CatListItem, type SymptomTypeOption, type TypeOption } from '@pc/types'
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pc/components/ui/select'
import { Textarea } from '@pc/components/ui/textarea'
import { CatPickerDialog } from '@pc/components/CatPickerDialog'
import { AlertTriangle, ArrowLeft, Camera, CircleAlert, Search, Siren, X } from 'lucide-react'

export function DesktopLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const [symptomOptions, setSymptomOptions] = useState<SymptomTypeOption[]>([])
  const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
  const [form, setForm] = useState({
    catId: '', selectedCat: null as CatListItem | null, campus: '', location: '', symptoms: [] as number[], description: '', images: [] as string[], imageFiles: [] as File[]
  })
  const campusOptions = Object.entries(CampusMap).map(([value, label]) => ({ value, label }))
  const colorLabels = useMemo(() => new Map(colorOptions.map((item) => [item.id, item.label])), [colorOptions])
  const colorLabel = (id: number) => colorLabels.get(id) || `花色 #${id}`
  const selectCatById = useCallback(async (catId: string) => {
    const detail = await catApi.getCatDetail(catId)
    const cat = catDetailToListItem(detail)
    setForm((prev) => ({
      ...prev,
      selectedCat: cat,
      catId: String(cat.id),
      campus: prev.campus || String(cat.campus),
    }))
  }, [])
  const selectCat = (cat: CatListItem) => {
    setForm((prev) => ({
      ...prev,
      selectedCat: cat,
      catId: String(cat.id),
      campus: prev.campus || String(cat.campus),
    }))
    setIsCatDialogOpen(false)
  }
  const selectUnknown = () => {
    setForm((prev) => ({ ...prev, selectedCat: null, catId: '' }))
    setIsCatDialogOpen(false)
  }
  const toggleSymptom = (id: number) => {
    setForm((prev) => ({ ...prev, symptoms: prev.symptoms.includes(id) ? prev.symptoms.filter((item) => item !== id) : [...prev.symptoms, id] }))
  }
  const triggerUpload = () => fileInput.current?.click()
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const remaining = 9 - form.imageFiles.length
    if (remaining <= 0) { toast.warning('最多上传 9 张现场图片'); return }
    const images = [...form.images]
    const imageFiles = [...form.imageFiles]
    for (const file of files.slice(0, remaining)) {
      if (!isSupportedImageFile(file)) { toast.warning(`${file.name} 仅支持 JPG 或 PNG 图片`); continue }
      imageFiles.push(file)
      images.push(URL.createObjectURL(file))
    }
    setForm((prev) => ({ ...prev, images, imageFiles }))
    if (files.length > remaining) toast.warning('最多上传 9 张现场图片')
    event.target.value = ''
  }
  const removeImage = (index: number) => {
    const preview = form.images[index]
    if (preview) URL.revokeObjectURL(preview)
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
      imageFiles: prev.imageFiles.filter((_, fileIndex) => fileIndex !== index),
    }))
  }
  const submit = async () => {
    if (!form.campus) return toast.warning('请选择所在校区')
    if (!form.location.trim()) return toast.warning('请填写详细位置')
    if (!form.symptoms.length) return toast.warning('请至少选择一个主要症状')
    if (!form.description.trim()) return toast.warning('请描述现场情况')
    if (!form.imageFiles.length) return toast.warning('请至少上传一张现场图片')
    setLoading(true)
    try {
      const media = await uploadImages(form.imageFiles)
      await sosApi.submitSOS({ catId: form.catId || undefined, campus: Number(form.campus), location: form.location.trim(), symptoms: form.symptoms, description: form.description.trim(), media })
      toast.success('SOS 求助已上报，请保持联系方式畅通')
      navigate('/my-sos')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'SOS 上报失败，请稍后重试') } finally { setLoading(false) }
  }
  const catIdQuery = new URLSearchParams(location.search).get('catId')
  useEffect(() => {
    void (async () => {
      setInitializing(true)
      try {
        const [symptoms, colors] = await Promise.all([typeApi.getSymptoms(), typeApi.getColors()])
        setSymptomOptions(symptoms)
        setColorOptions(colors)
        const catId = new URLSearchParams(location.search).get('catId') ?? ''
        if (catId) await selectCatById(catId)
      } catch (error) { console.error('Failed to initialize SOS form', error); toast.error('基础数据加载失败，请检查网络后重试') } finally { setInitializing(false) }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const catIdWatchInitialized = useRef(false)
  useEffect(() => {
    if (!catIdWatchInitialized.current) {
      catIdWatchInitialized.current = true
      return
    }
    if (typeof catIdQuery === 'string' && catIdQuery) void selectCatById(catIdQuery)
  }, [catIdQuery, selectCatById])
  const imagesRef = useRef(form.images)
  imagesRef.current = form.images
  useEffect(() => () => imagesRef.current.forEach((url) => URL.revokeObjectURL(url)), [])

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
      <main className="mx-auto max-w-4xl">
        <header className="flex items-start gap-3 border-b-2 border-black pb-5">
          <Button variant="outline" size="icon" className="shrink-0 border-2 border-black bg-white hover:bg-red-50" aria-label="返回上一页" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center border-2 border-black bg-red-500 text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              <Siren className="size-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-red-700">EMERGENCY REPORT</p>
              <h1 className="mt-1 text-2xl font-black text-gray-950">SOS 救援上报</h1>
              <p className="mt-2 text-sm text-gray-600">填写现场情况，救援人员会根据位置、症状和图片优先处理。</p>
            </div>
          </div>
        </header>
        <div className="mt-5 flex gap-3 border-2 border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-800">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <p>请在确保自身安全后提交。照片仅用于确认现场情况，建议拍摄猫咪整体状态和周边定位信息。</p>
        </div>
        <form
          className="mt-5 overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="border-b-2 border-black bg-[#FFF8DE] px-5 py-3"><h2 className="text-sm font-black">救援信息</h2></div>
          <div className="grid gap-6 p-5 sm:p-6">
            <section className="grid gap-2">
              <label className="text-sm font-black">涉及猫咪 <span className="font-medium text-gray-500">可选</span></label>
              <CatPickerDialog
                open={isCatDialogOpen}
                onOpenChange={setIsCatDialogOpen}
                title="选择需要救援的猫咪"
                allowUnknown
                onSelect={selectCat}
                onUnknown={selectUnknown}
                trigger={
                  <button type="button" className="flex min-h-14 w-full items-center justify-between gap-3 border-2 border-black bg-gray-50 px-4 text-left hover:bg-[#FFF8DE]">
                    {form.selectedCat ? (
                      <span className="flex min-w-0 items-center gap-3">
                        <img src={form.selectedCat.avatar} alt={form.selectedCat.name} className="size-9 shrink-0 border-2 border-black object-cover" />
                        <span className="min-w-0">
                          <strong className="block truncate">{form.selectedCat.name}</strong>
                          <span className="block truncate text-xs text-gray-500">{CampusMap[form.selectedCat.campus]} · {colorLabel(form.selectedCat.color)}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-gray-500"><Search className="size-4" />选择已收录猫咪，或继续上报未知猫咪</span>
                    )}
                    <span className="text-sm font-bold">选择</span>
                  </button>
                }
              />
            </section>
            <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <label className="grid gap-2">
                <span className="text-sm font-black">所在校区</span>
                <Select value={form.campus} onValueChange={(value) => setForm((prev) => ({ ...prev, campus: value }))} disabled={initializing}>
                  <SelectTrigger className="border-2 border-black"><SelectValue placeholder="选择校区" /></SelectTrigger>
                  <SelectContent>
                    {campusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2" htmlFor="sos-location">
                <span className="text-sm font-black">详细位置</span>
                <Input id="sos-location" value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} maxLength={100} placeholder="例如：食堂北门左侧草丛" className="border-2 border-black focus-visible:ring-red-400" />
              </label>
            </div>
            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-black">主要症状</label>
                <span className="text-xs text-gray-500">可多选</span>
              </div>
              {initializing ? (
                <div className="border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500">正在加载症状选项...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {symptomOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={cn(
                        'min-h-9 border-2 px-3 text-sm font-bold',
                        form.symptoms.includes(option.id)
                          ? 'border-red-600 bg-red-500 text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-black',
                      )}
                      aria-pressed={form.symptoms.includes(option.id)}
                      onClick={() => toggleSymptom(option.id)}
                    >
                      {option.tag}
                    </button>
                  ))}
                </div>
              )}
            </section>
            <label className="grid gap-2" htmlFor="sos-description">
              <span className="text-sm font-black">现场描述</span>
              <Textarea id="sos-description" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} rows={6} maxLength={1000} placeholder="请描述受伤部位、精神状态、是否可接近，以及目前是否有人在现场看护。" className="resize-y border-2 border-black focus-visible:ring-red-400" />
            </label>
            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-black">现场图片</label>
                <span className="text-xs text-gray-500">JPG / PNG，最多 9 张</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {form.images.map((image, index) => (
                  <div key={image} className="group relative aspect-square overflow-hidden border-2 border-black">
                    <img src={image} alt={`现场图片 ${index + 1}`} className="size-full object-cover" />
                    <Button type="button" variant="outline" size="icon" className="absolute right-2 top-2 size-8 border-2 border-black bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`移除图片 ${index + 1}`} onClick={() => removeImage(index)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                {form.images.length < 9 ? (
                  <button type="button" className="flex aspect-square flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-gray-50 px-3 text-center text-sm font-bold text-gray-600 hover:border-red-500 hover:bg-red-50 hover:text-red-700" onClick={triggerUpload}>
                    <Camera className="mb-2 size-7" />添加图片
                  </button>
                ) : null}
              </div>
              <input ref={fileInput} type="file" className="hidden" accept={IMAGE_FILE_ACCEPT} multiple onChange={handleFileChange} />
            </section>
          </div>
          <footer className="flex flex-col-reverse gap-3 border-t-2 border-black bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" className="border-2 border-black" disabled={loading} onClick={() => navigate(-1)}>取消</Button>
            <Button type="submit" className="border-2 border-black bg-red-500 font-black text-white hover:bg-red-600" disabled={loading || initializing}>
              <AlertTriangle className="size-4" />{loading ? '正在上报...' : '立即上报 SOS'}
            </Button>
          </footer>
        </form>
      </main>
    </div>
  )
}
