import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { catApi, postApi } from '@pc/lib/api'
import { catDetailToListItem } from '@pc/lib/cat'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@pc/lib/upload'
import { CampusMap, type CatListItem } from '@pc/types'
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'
import { ArrowLeft, Cat, CheckCircle2, ChevronRight, ImagePlus, MapPin, Tag, X } from 'lucide-react'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import { Textarea } from '@pc/components/ui/textarea'
import { CatPickerDialog } from '@pc/components/CatPickerDialog'

const predefinedTags = ['日常', '搞笑', '可爱', '求助', '科普', '记录', '偶遇', '投喂']

export function DesktopLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [isCatDialogOpen, setCatDialogOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement | null>(null)

  const [form, setForm] = useState({
    selectedCat: null as CatListItem | null,
    title: '',
    content: '',
    tags: [] as string[],
    images: [] as string[],
    imageFiles: [] as File[],
    location: '',
  })

  // 卸载时回收预览 URL 需要读取最新 images，用 ref 镜像
  const imagesRef = useRef(form.images)
  imagesRef.current = form.images

  const selectCatById = async (catId: string) => {
    try {
      const selectedCat = catDetailToListItem(await catApi.getCatDetail(catId))
      setForm((prev) => ({
        ...prev,
        selectedCat,
        location: !prev.location && selectedCat.campus !== undefined
          ? CampusMap[selectedCat.campus] || String(selectedCat.campus)
          : prev.location,
      }))
    } catch (error) {
      console.error('Failed to preselect cat:', error)
      toast.error('无法加载指定猫咪，请重新选择')
    }
  }

  const handleSelectCat = (cat: CatListItem) => {
    setForm((prev) => ({
      ...prev,
      selectedCat: cat,
      location: !prev.location && cat.campus !== undefined
        ? CampusMap[cat.campus] || String(cat.campus)
        : prev.location,
    }))
    setCatDialogOpen(false)
  }

  const triggerUpload = () => fileInput.current?.click()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const remaining = 9 - form.images.length
    if (files.length > remaining) toast.warning('最多只能上传 9 张图片')

    const nextImages = [...form.images]
    const nextImageFiles = [...form.imageFiles]
    for (const file of files.slice(0, Math.max(remaining, 0))) {
      if (!isSupportedImageFile(file)) {
        toast.warning(`${file.name} 仅支持 JPG 或 PNG 格式`)
        continue
      }
      nextImages.push(URL.createObjectURL(file))
      nextImageFiles.push(file)
    }
    setForm({ ...form, images: nextImages, imageFiles: nextImageFiles })
    event.target.value = ''
  }

  const removeImage = (index: number) => {
    const previewUrl = form.images[index]
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setForm({
      ...form,
      images: form.images.filter((_, i) => i !== index),
      imageFiles: form.imageFiles.filter((_, i) => i !== index),
    })
  }

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag],
    }))
  }

  const handleSubmit = async () => {
    if (!form.selectedCat) return toast.warning('请选择主角猫咪')
    if (!form.content.trim() && form.images.length === 0) {
      return toast.warning('请至少填写文字内容或添加一张图片')
    }

    setLoading(true)
    try {
      let content = form.content.trim()
      if (form.title.trim()) content = `【${form.title.trim()}】\n${content}`.trim()
      if (form.tags.length) content = `${content}\n${form.tags.map((tag) => `#${tag}`).join(' ')}`.trim()

      const media = await uploadImages(form.imageFiles)
      await postApi.createPost({
        content: content || undefined,
        catId: String(form.selectedCat.id),
        location: form.location.trim() || '校园内',
        media: media.length ? media : undefined,
      })
      toast.success('动态已发布')
      navigate('/')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : '发布失败')
    } finally {
      setLoading(false)
    }
  }

  // route.query.catId（string | null）
  const catIdQuery = new URLSearchParams(location.search).get('catId')

  // 挂载时与 catId 变化时预选猫咪（对应 onMounted + watch）
  useEffect(() => {
    if (catIdQuery) void selectCatById(catIdQuery)
  }, [catIdQuery])

  // 卸载时回收全部预览图片 URL（对应 onBeforeUnmount）
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  return (
    <div className="public-workbench min-h-full bg-gray-50 px-4 py-6 sm:px-6">
      <main className="mx-auto max-w-6xl">
        <header className="flex items-start gap-3 border-b-2 border-black pb-5">
          <Button variant="outline" size="icon" className="shrink-0 border-2 border-black bg-white hover:bg-[#FFF8DE]" aria-label="返回上一页" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#FACC15] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              <ImagePlus className="size-6" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#8A5A00]">NEW MOMENT</p>
              <h1 className="mt-1 text-2xl font-black text-gray-950">发布动态</h1>
              <p className="mt-2 text-sm text-gray-600">把校园里遇见的猫咪和当下的故事，一起记录下来。</p>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form className="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]" onSubmit={(event) => { event.preventDefault(); void handleSubmit() }}>
            <div className="border-b-2 border-black bg-[#FFF8DE] px-5 py-3">
              <h2 className="text-sm font-black">动态内容</h2>
            </div>

            <div className="grid gap-7 p-5 sm:p-6">
              <section className="grid gap-2">
                <label className="text-sm font-black">主角猫咪</label>
                <CatPickerDialog open={isCatDialogOpen} onOpenChange={setCatDialogOpen} title="选择主角猫咪" onSelect={handleSelectCat} trigger={
                  <button type="button" className="flex min-h-16 w-full items-center justify-between gap-3 border-2 border-black bg-gray-50 px-4 text-left hover:bg-[#FFF8DE]">
                    {form.selectedCat ? (
                      <span className="flex min-w-0 items-center gap-3">
                        <img src={form.selectedCat.avatar} alt={form.selectedCat.name} className="size-11 shrink-0 border-2 border-black object-cover" />
                        <span className="min-w-0">
                          <strong className="block truncate">{form.selectedCat.name}</strong>
                          <span className="block truncate text-xs text-gray-500">{CampusMap[form.selectedCat.campus] || '校园内'}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-sm text-gray-500"><Cat className="size-4" />选择要记录的猫咪</span>
                    )}
                    <ChevronRight className="size-5 shrink-0" />
                  </button>
                } />
              </section>

              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-black">图片</label>
                  <span className="text-xs text-gray-500">JPG / PNG，最多 9 张</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {form.images.map((image, index) => (
                    <div key={image} className="group relative aspect-square overflow-hidden border-2 border-black">
                      <img src={image} alt={`动态图片 ${index + 1}`} className="size-full object-cover" />
                      <Button type="button" variant="outline" size="icon" className="absolute right-2 top-2 size-8 border-2 border-black bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`移除图片 ${index + 1}`} onClick={() => removeImage(index)}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {form.images.length < 9 && (
                    <button type="button" className="flex aspect-square flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-gray-50 px-3 text-center text-sm font-bold text-gray-600 hover:border-[#8A5A00] hover:bg-[#FFF8DE]" onClick={triggerUpload}>
                      <ImagePlus className="mb-2 size-7" />添加图片
                    </button>
                  )}
                </div>
                <input ref={fileInput} type="file" className="hidden" accept={IMAGE_FILE_ACCEPT} multiple onChange={handleFileChange} />
              </section>

              <section className="grid gap-4">
                <label className="grid gap-2" htmlFor="moment-title"><span className="text-sm font-black">标题 <span className="font-medium text-gray-500">可选</span></span><Input id="moment-title" value={form.title} maxLength={80} placeholder="为这条记录起一个标题" className="border-2 border-black focus-visible:ring-[#FACC15]" onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label className="grid gap-2" htmlFor="moment-content"><span className="text-sm font-black">内容</span><Textarea id="moment-content" value={form.content} maxLength={2000} className="min-h-40 resize-y border-2 border-black focus-visible:ring-[#FACC15]" placeholder="记录今天看见的猫咪、它当时的状态，或你们之间的小故事。" onChange={(event) => setForm({ ...form, content: event.target.value })} /></label>
                <label className="grid gap-2" htmlFor="moment-location"><span className="flex items-center gap-2 text-sm font-black"><MapPin className="size-4" />位置</span><Input id="moment-location" value={form.location} maxLength={100} placeholder="例如：图书馆东侧台阶" className="border-2 border-black focus-visible:ring-[#FACC15]" onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
              </section>

              <section className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-black"><Tag className="size-4" />添加标签</div>
                <div className="flex flex-wrap gap-2">
                  {predefinedTags.map((tag) => (
                    <button key={tag} type="button" className={cn('min-h-9 border-2 px-3 text-sm font-bold', form.tags.includes(tag) ? 'border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black')} aria-pressed={form.tags.includes(tag)} onClick={() => toggleTag(tag)}># {tag}</button>
                  ))}
                </div>
              </section>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t-2 border-black bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="border-2 border-black" disabled={loading} onClick={() => navigate(-1)}>取消</Button>
              <Button type="submit" className="border-2 border-black bg-[#FACC15] font-black text-black hover:bg-[#EAB308]" disabled={loading}><ImagePlus className="size-4" />{loading ? '正在发布...' : '发布动态'}</Button>
            </footer>
          </form>

          <aside className="flex flex-col gap-5">
            <section className="border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="border-b-2 border-black bg-[#F3F4F6] px-5 py-3"><h2 className="text-sm font-black">发布建议</h2></div>
              <ul className="grid gap-4 p-5 text-sm leading-6 text-gray-700">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />选择清晰、主体明确的照片。</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />写明位置，方便其他同学找到猫咪。</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />涉及伤病或紧急情况，请使用 SOS 上报。</li>
              </ul>
            </section>
            <section className="border-2 border-black bg-[#FFF8DE] p-5">
              <h2 className="text-sm font-black">当前状态</h2>
              <p className="mt-3 text-sm leading-6 text-gray-700">{form.selectedCat ? `正在记录 ${form.selectedCat.name} 的动态。` : '选择主角猫咪后，即可完成发布。'}</p>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
