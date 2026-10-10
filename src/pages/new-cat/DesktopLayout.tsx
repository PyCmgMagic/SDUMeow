import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { newCatApi, typeApi } from '@pc/lib/api'
import { CampusMap, type TagTypeOption, type TypeOption } from '@pc/types'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@pc/lib/upload'
import { cn } from '@pc/lib/utils'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pc/components/ui/select'
import { toast } from '@pc/lib/toast'
import { ArrowLeft, Camera, Cat, CheckCircle2, Image as ImageIcon, X } from 'lucide-react'
import { clearDraft, readDraft, useDraftSnapshot } from '@shared/drafts'

const campusOptions = Object.entries(CampusMap).map(([value, label]) => ({ value, label }))

export function DesktopLayout() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [typeLoading, setTypeLoading] = useState(false)
  const [form, setForm] = useState(() => ({
    tempName: '', tags: [] as number[],
    ...readDraft('new-cat').values,
    color: String(readDraft('new-cat').values.color ?? ''),
    campus: String(readDraft('new-cat').values.campus ?? ''),
    location: String(readDraft('new-cat').values.location ?? ''),
    images: readDraft('new-cat').files,
  }))
  useDraftSnapshot('new-cat', { tempName: form.tempName, color: form.color, campus: form.campus, location: form.location, tags: form.tags }, form.images)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  useEffect(() => {
    const urls = readDraft('new-cat').files.map((file) => URL.createObjectURL(file))
    setImagePreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])
  const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
  const [tagOptions, setTagOptions] = useState<TagTypeOption[]>([])
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const fileInput = useRef<HTMLInputElement | null>(null)

  // 卸载时回收预览 URL 需要读取最新列表，用 ref 镜像
  const imagePreviewsRef = useRef(imagePreviews)
  imagePreviewsRef.current = imagePreviews

  const triggerUpload = () => fileInput.current?.click()
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const remaining = 9 - form.images.length
    const nextImages = [...form.images]
    const nextPreviews = [...imagePreviews]
    for (const file of files.slice(0, Math.max(remaining, 0))) {
      if (!isSupportedImageFile(file)) { toast.warning(`${file.name} 仅支持 JPG 或 PNG 图片`); continue }
      if (file.size > 5 * 1024 * 1024) { toast.warning(`${file.name} 超过 5MB`); continue }
      nextImages.push(file)
      nextPreviews.push(URL.createObjectURL(file))
    }
    if (files.length > remaining) toast.warning('最多上传 9 张图片')
    setForm({ ...form, images: nextImages })
    setImagePreviews(nextPreviews)
    event.target.value = ''
  }
  const removeImage = (index: number) => { const preview = imagePreviews[index]; if (preview) URL.revokeObjectURL(preview); setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) })); setImagePreviews((prev) => prev.filter((_, i) => i !== index)) }
  const toggleTag = (tagId: number) => { setForm((prev) => ({ ...prev, tags: prev.tags.includes(tagId) ? prev.tags.filter((id) => id !== tagId) : [...prev.tags, tagId] })) }
  const loadTypeOptions = async () => { setTypeLoading(true); try { const [colors, tags, locations] = await Promise.all([typeApi.getColors(), typeApi.getTags(), typeApi.getLocations()]); setColorOptions(colors); setTagOptions(tags); setLocationOptions(locations) } catch (error) { toast.error(error instanceof Error ? error.message : '类型数据加载失败') } finally { setTypeLoading(false) } }
  const submit = async () => {
    if (!form.color) return toast.warning('请选择猫咪花色')
    if (!form.campus) return toast.warning('请选择所在校区')
    if (!form.location.trim()) return toast.warning('请填写详细位置')
    if (!form.images.length) return toast.warning('请至少上传一张图片')
    setLoading(true)
    try {
      const images = await uploadImages(form.images)
      const result = await newCatApi.submitNewCat({
        ...(form.tempName.trim() ? { tempName: form.tempName.trim() } : {}),
        color: Number(form.color),
        campus: Number(form.campus),
        location: form.location.trim(),
        images,
        ...(form.tags.length ? { tags: form.tags } : {})
      })
      toast.success(`线索已提交，审核通过后可获得 ${result.experience} 经验和 ${result.currency} 小鱼干`)
      clearDraft('new-cat')
      navigate('/')
    } catch (error) { toast.error(error instanceof Error ? error.message : '提交失败，请稍后重试') } finally { setLoading(false) }
  }
  useEffect(() => { void loadTypeOptions() }, [])
  // 卸载时回收全部预览图片 URL（对应 onBeforeUnmount）
  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
      <main className="mx-auto max-w-5xl">
        <header className="flex items-start gap-3 border-b-2 border-black pb-5"><Button variant="outline" size="icon"
            className="shrink-0 border-2 border-black bg-white hover:bg-[#FFF8DE]" aria-label="返回上一页" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex min-w-0 items-start gap-4"><span
            className="flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#FACC15] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <Cat className="size-6" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#8A5A00]">NEW CAT CLUE</p>
            <h1 className="mt-1 text-2xl font-black text-gray-950">发现新猫</h1>
            <p className="mt-2 text-sm text-gray-600">提交清晰的现场照片和位置，帮助我们确认并建立校园猫咪档案。</p>
          </div>
        </div>
        </header>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form className="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]"
            onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <div className="border-b-2 border-black bg-[#FFF8DE] px-5 py-3">
              <h2 className="text-sm font-black">线索信息</h2>
            </div>
            <div className="grid gap-6 p-5 sm:p-6">
              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-3"><label className="text-sm font-black">猫咪照片</label><span
                  className="text-xs text-gray-500">JPG / PNG，最多 9 张</span></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {imagePreviews.map((image, index) => (
                    <div key={image}
                      className="group relative aspect-square overflow-hidden border-2 border-black"><img src={image}
                        alt={`猫咪照片 ${index + 1}`} className="size-full object-cover" /><Button type="button" variant="outline"
                        size="icon"
                        className="absolute right-2 top-2 size-8 border-2 border-black bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`移除图片 ${index + 1}`} onClick={() => removeImage(index)}>
                        <X className="size-4" />
                      </Button></div>
                  ))}{form.images.length < 9 && (
                    <button type="button"
                      className="flex aspect-square flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-gray-50 px-3 text-center text-sm font-bold text-gray-600 hover:border-[#8A5A00] hover:bg-[#FFF8DE]"
                      onClick={triggerUpload}>
                      <Camera className="mb-2 size-7" />添加照片
                    </button>
                  )}
                </div><input ref={fileInput} type="file" className="hidden" accept={IMAGE_FILE_ACCEPT} multiple
                  onChange={handleFileChange} />
              </section><label className="grid gap-2" htmlFor="new-cat-name"><span className="text-sm font-black">临时名称 <span
                  className="font-medium text-gray-500">可选</span></span><Input id="new-cat-name" value={form.tempName}
                maxLength={50} placeholder="方便后续识别，例如“图书馆小橘”"
                className="border-2 border-black focus-visible:ring-[#FACC15]"
                onChange={(event) => setForm({ ...form, tempName: event.target.value })} /></label>
              <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2"><span
                  className="text-sm font-black">毛色特征</span><Select value={form.color} disabled={typeLoading}
                  onValueChange={(value) => setForm({ ...form, color: value })}>
                  <SelectTrigger className="border-2 border-black">
                    <SelectValue placeholder="选择花色" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.id} value={String(color.id)}>{color.label
                      }</SelectItem>
                    ))}
                  </SelectContent>
                </Select></label><label className="grid gap-2"><span className="text-sm font-black">所在校区</span><Select
                  value={form.campus} disabled={typeLoading}
                  onValueChange={(value) => setForm({ ...form, campus: value })}>
                  <SelectTrigger className="border-2 border-black">
                    <SelectValue placeholder="选择校区" />
                  </SelectTrigger>
                  <SelectContent>
                    {campusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select></label></div><label className="grid gap-2" htmlFor="new-cat-location"><span
                className="text-sm font-black">详细位置</span>
                <Select value={form.location} disabled={typeLoading} onValueChange={(value) => setForm({ ...form, location: value })}>
                  <SelectTrigger id="new-cat-location" className="border-2 border-black"><SelectValue placeholder="选择发现位置" /></SelectTrigger>
                  <SelectContent>{locationOptions.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.label}</SelectItem>)}</SelectContent>
                </Select>
              </label>
              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-3"><label className="text-sm font-black">可见特征</label><span
                  className="text-xs text-gray-500">可多选</span></div>
                {typeLoading && (
                  <div className="border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500">
                    正在加载特征选项...</div>
                )}
                {!typeLoading && (
                  <div className="flex flex-wrap gap-2">{tagOptions.map((tag) => (
                    <button key={tag.id} type="button"
                      className={cn('min-h-9 border-2 px-3 text-sm font-bold',
                        form.tags.includes(tag.id) ? 'border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black')}
                      aria-pressed={form.tags.includes(tag.id)} onClick={() => toggleTag(tag.id)}>{tag.name}</button>
                  ))}</div>
                )}
              </section>
            </div>
            <footer
              className="flex flex-col-reverse gap-3 border-t-2 border-black bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="border-2 border-black" disabled={loading}
                onClick={() => navigate(-1)}>取消</Button><Button type="submit"
              className="border-2 border-black bg-[#FACC15] font-black text-black hover:bg-[#EAB308]"
              disabled={loading || typeLoading}>
                <ImageIcon className="size-4" />{loading ? '正在提交...' : '提交新猫线索'}
              </Button></footer>
          </form>
          <aside className="flex flex-col gap-5">
            <section className="border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
                <h2 className="text-sm font-black">提交建议</h2>
              </div>
              <ul className="grid gap-4 p-5 text-sm leading-6 text-gray-700">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />拍摄清晰的整体照片，尽量不要只拍局部。
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />位置尽可能具体，便于后续再次确认。
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />特征标签可帮助避免与已有档案重复。
                </li>
              </ul>
            </section>
            <section className="border-2 border-black bg-[#FFF8DE] p-5">
              <h2 className="text-sm font-black">审核后</h2>
              <p className="mt-3 text-sm leading-6 text-gray-700">管理员确认线索后会建立正式档案，奖励将按审核结果发放。</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
