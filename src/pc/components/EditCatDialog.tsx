import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@pc/components/ui/dialog'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import { Label } from '@pc/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pc/components/ui/select'
import { Textarea } from '@pc/components/ui/textarea'
import { catApi, typeApi } from '@pc/lib/api'
import {
  CampusMap, CatStatusMap, GenderMap, HealthStatusMap,
  type AdminCatItem,
  type CatImageKeyItem,
  type CreateCatParams,
  type TagTypeOption,
  type TypeOption,
  type UpdateCatParams
} from '@pc/types'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@pc/lib/upload'
import { toast } from '@pc/lib/toast'
import { ImagePlus, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@pc/lib/utils'
import { clearDraft, readDraft, useDraftSnapshot } from '@shared/drafts'
import { invalidateRelatedQueries } from '@shared/mutationSync'

export interface EditCatDialogProps {
  open?: boolean
  catData?: AdminCatItem | null
  onOpenChange?: (value: boolean) => void
  onSuccess?: () => void
}

const genderOptions = Object.entries(GenderMap).map(([value, label]) => ({ value, label }))
const statusOptions = Object.entries(CatStatusMap).map(([value, label]) => ({ value, label }))
const campusOptions = Object.entries(CampusMap).map(([value, label]) => ({ value, label }))
const healthStatusOptions = Object.entries(HealthStatusMap).map(([value, label]) => ({ value, label }))
const attributeFields = [
  { key: 'friendliness', label: '亲人指数', color: 'accent-blue-500' },
  { key: 'gluttony', label: '贪吃指数', color: 'accent-yellow-500' },
  { key: 'fight', label: '战斗力', color: 'accent-red-500' },
  { key: 'appearance', label: '颜值', color: 'accent-green-500' }
] as const

const enumValue = (value: unknown, mapping: Record<string, number>, fallback: number) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) ? String(numeric) : String(mapping[String(value)] ?? fallback)
}
const optionValue = (options: TypeOption[], value: unknown) => {
  const numeric = Number(value)
  return Number.isInteger(numeric) ? String(numeric) : String(options.find((item) => item.label === String(value))?.id ?? '')
}
const dateInputValue = (value?: string | null) => value ? value.slice(0, 10) : ''

export function EditCatDialog(props: EditCatDialogProps) {
  const { open = false, catData = null, onOpenChange, onSuccess } = props
  const draftKey = `admin-cat-edit-${catData?.id || 'new'}` as const
  const [initialized, setInitialized] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [typeLoading, setTypeLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [existingImages, setExistingImages] = useState<CatImageKeyItem[]>([])
  const [deletedImageKeys, setDeletedImageKeys] = useState<string[]>([])
  const [newImageFiles, setNewImageFiles] = useState<File[]>([])
  const [newImagePreviews, setNewImagePreviews] = useState<Array<{ file: File; url: string }>>([])
  const newImagePreviewsRef = useRef<Array<{ file: File; url: string }>>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const [roleOptions, setRoleOptions] = useState<TypeOption[]>([])
  const [tagOptions, setTagOptions] = useState<TagTypeOption[]>([])
  const optionsRef = useRef({ colors: [] as TypeOption[], locations: [] as TypeOption[], roles: [] as TypeOption[], tags: [] as TagTypeOption[] })
  const avatarPreviewUrlRef = useRef('')
  const [formData, setFormData] = useState({
    name: '',
    aliases: '',
    color: '',
    avatar: '',
    status: '0',
    gender: '2',
    campus: '0',
    role: '',
    admissionDate: '',
    healthStatus: '0',
    birthYear: -1,
    isNeutered: false,
    neuteredDate: '',
    neuteredType: '0',
    hauntLocation: '',
    description: '', tags: [] as number[],
    attributes: {
      friendliness: 5,
      gluttony: 5,
      fight: 5,
      appearance: 5
    }
  })
  useDraftSnapshot(draftKey, open && initialized ? { source: 'pc', pc: formData, existingImages, deletedImageKeys, newImageFiles } : undefined, avatarFile ? [avatarFile] : [])

  const applyNewImagePreviews = (next: Array<{ file: File; url: string }>) => {
    newImagePreviewsRef.current = next
    setNewImagePreviews(next)
  }
  const resetPreview = () => { if (avatarPreviewUrlRef.current) URL.revokeObjectURL(avatarPreviewUrlRef.current); avatarPreviewUrlRef.current = '' }
  const resetGallery = () => {
    newImagePreviewsRef.current.forEach((item) => URL.revokeObjectURL(item.url))
    newImagePreviewsRef.current = []
    setExistingImages([])
    setDeletedImageKeys([])
    setNewImageFiles([])
    setNewImagePreviews([])
  }
  const initializeForm = () => {
    const cat = catData
    setAvatarFile(null)
    resetPreview()
    setFormData({
      name: cat?.name || '',
      aliases: ((cat as (AdminCatItem & { aliases?: string[] }) | null)?.aliases || []).join(', '),
      color: optionValue(optionsRef.current.colors, cat?.color), avatar: cat?.avatar || '',
      status: enumValue(cat?.status, { SCHOOL: 0, GRADUATED: 1, MEOW_STAR: 2, HOSPITAL: 3 }, 0),
      role: optionValue(optionsRef.current.roles, cat?.role),
      admissionDate: dateInputValue(cat?.admissionDate),
      gender: enumValue(cat?.gender, { UNKNOWN: 0, MALE: 1, FEMALE: 2 }, 2),
      campus: optionValue(campusOptions.map(({ value, label }) => ({ id: Number(value), label })), cat?.campus) || '0',
      healthStatus: enumValue(cat?.healthStatus, { HEALTHY: 0, SICK: 1, ILL: 1, RECOVERING: 2 }, 0),
      isNeutered: cat?.isNeutered || false,
      neuteredDate: dateInputValue(cat?.neuteredDate),
      neuteredType: String(cat?.neuteredType ?? 0),
      tags: cat?.tags || [],
      birthYear: Number((cat as (AdminCatItem & { birthYear?: number }) | null)?.birthYear ?? -1),
      hauntLocation: optionValue(optionsRef.current.locations, cat?.hauntLocation ?? cat?.location),
      description: cat?.description || '',
      attributes: {
        friendliness: cat?.attributes?.friendliness ?? 5,
        gluttony: cat?.attributes?.gluttony ?? 5,
        fight: cat?.attributes?.fight ?? 5,
        appearance: cat?.attributes?.appearance ?? 5
      }
    })
    const saved = readDraft(draftKey)
    if (saved.values.pc) setFormData(saved.values.pc as typeof formData)
    const mobile = saved.values.mobile as Record<string, unknown> | undefined
    if (mobile && saved.values.source === 'mobile') setFormData((prev) => ({
      ...prev,
      name: String(mobile.name ?? prev.name), color: String(mobile.color ?? prev.color),
      gender: String(({ UNKNOWN: 0, MALE: 1, FEMALE: 2 } as Record<string, number>)[String(mobile.gender)] ?? prev.gender),
      campus: String(mobile.campus ?? prev.campus), role: String(mobile.role ?? prev.role),
      hauntLocation: String(mobile.location ?? prev.hauntLocation),
      status: String(({ SCHOOL: 0, GRADUATED: 1, MEOW_STAR: 2, HOSPITAL: 3, ADOPTION_HANDOVER: 4 } as Record<string, number>)[String(mobile.status)] ?? prev.status),
      isNeutered: mobile.neuteredType !== 'NONE', neuteredType: mobile.neuteredType === 'EAR_CUT' ? '0' : '1',
      neuteredDate: String(mobile.neuteredDate ?? prev.neuteredDate), description: String(mobile.description ?? prev.description),
      tags: (mobile.tags as number[] | undefined) ?? prev.tags,
      attributes: {
        friendliness: Number(mobile.friendlinessScore ?? 50) / 10, gluttony: Number(mobile.gluttonyScore ?? 50) / 10,
        fight: Number(mobile.fightScore ?? 50) / 10, appearance: Number(mobile.appearanceScore ?? 50) / 10,
      },
    }))
    if (saved.files[0]) {
      setAvatarFile(saved.files[0])
      avatarPreviewUrlRef.current = URL.createObjectURL(saved.files[0])
      setFormData((prev) => ({ ...prev, avatar: avatarPreviewUrlRef.current }))
    }
  }

  const loadExistingImages = async () => {
    resetGallery()
    if (!catData) return
    const savedImages = readDraft(draftKey).values.existingImages as CatImageKeyItem[] | undefined
    if (savedImages) {
      setExistingImages(savedImages)
      return
    }
    setGalleryLoading(true)
    try {
      const result = await catApi.getImageKeys(catData.id)
      const saved = readDraft(draftKey).values
      setExistingImages((saved.existingImages as CatImageKeyItem[] | undefined) ?? result.images ?? [])
    } catch (error) {
      toast.warning(error instanceof Error ? `档案图片加载失败：${error.message}` : '档案图片加载失败')
    } finally {
      setGalleryLoading(false)
    }
  }

  const loadOptions = async () => {
    if (optionsRef.current.colors.length && optionsRef.current.locations.length && optionsRef.current.roles.length && optionsRef.current.tags.length) return
    setTypeLoading(true)
    try {
      const [colors, locations, roles, tags] =
        await Promise.all([typeApi.getColors(), typeApi.getLocations(), typeApi.getRoles(), typeApi.getTags()]);
      optionsRef.current = { colors, locations, roles, tags };
      setColorOptions(colors);
      setLocationOptions(locations);
      setRoleOptions(roles);
      setTagOptions(tags)
    }
    finally {
      setTypeLoading(false)
    }
  }

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedImageFile(file)) return toast.warning('仅支持 JPG 或 PNG 格式图片')
    if (file.size > 5 * 1024 * 1024) return toast.warning('图片大小不能超过 5MB')
    resetPreview()
    setAvatarFile(file)
    avatarPreviewUrlRef.current = URL.createObjectURL(file)
    setFormData((prev) => ({ ...prev, avatar: avatarPreviewUrlRef.current }));
    event.target.value = ''
  }

  const chooseGalleryImages = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const files = Array.from(input.files || [])
    input.value = ''
    const remaining = Math.max(8 - existingImages.length - newImageFiles.length, 0)
    if (remaining === 0) return toast.warning('档案图片最多保留 8 张')

    const accepted = files.filter((file) => {
      if (!isSupportedImageFile(file)) {
        toast.warning(`${file.name} 不是 JPG 或 PNG 图片`);
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.warning(`${file.name} 超过 5MB`);
        return false
      }
      return true
    }).slice(0, remaining)
    if (accepted.length < files.length && accepted.length === remaining) toast.warning('档案图片最多保留 8 张')
    setNewImageFiles([...newImageFiles, ...accepted])
    applyNewImagePreviews([...newImagePreviewsRef.current, ...accepted.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }

  const removeExistingImage = (image: CatImageKeyItem) => {
    setExistingImages(existingImages.filter((item) => item.key !== image.key))
    if (!deletedImageKeys.includes(image.key)) setDeletedImageKeys([...deletedImageKeys, image.key])
  }

  const removeNewImage = (index: number) => {
    const preview = newImagePreviewsRef.current[index]
    if (preview) URL.revokeObjectURL(preview.url)
    applyNewImagePreviews(newImagePreviewsRef.current.filter((_, i) => i !== index))
    setNewImageFiles(newImageFiles.filter((_, i) => i !== index))
  }

  const updateAttribute = (key: 'friendliness' | 'gluttony' | 'fight' | 'appearance', value: number) => {
    setFormData((prev) => ({ ...prev, attributes: { ...prev.attributes, [key]: Math.max(0, Math.min(10, value)) } }))
  }

  const submit = async () => {
    if (!formData.name.trim() || !formData.color || !formData.campus) return toast.warning('请填写名称、花色和校区')
    if (!catData && !avatarFile) return toast.warning('请上传猫咪头像')
    setSubmitting(true)
    try {
      const avatarKey = avatarFile ? (await uploadImages([avatarFile], 'admin'))[0] : undefined
      const addedImageKeys = newImageFiles.length ? await uploadImages(newImageFiles, 'admin') : []
      const commonData = {
        name: formData.name.trim(),
        aliases: formData.aliases.split(',').map((item) => item.trim()).filter(Boolean),
        color: Number(formData.color),
        gender: Number(formData.gender),
        campus: Number(formData.campus),
        role: formData.role ? Number(formData.role) : undefined,
        admissionDate: formData.admissionDate || undefined,
        status: Number(formData.status),
        isNeutered: formData.isNeutered,
        neuteredDate: formData.neuteredDate || undefined,
        neuteredType: Number(formData.neuteredType),
        attributes: formData.attributes,
        healthStatus: Number(formData.healthStatus),
        tags: formData.tags,
        ...(formData.birthYear !== -1 && { birthYear: formData.birthYear }),
        ...(formData.hauntLocation && { hauntLocation: Number(formData.hauntLocation) }),
        ...(formData.description.trim() && { description: formData.description.trim() })
      }
      if (catData) {
        const galleryChanged = deletedImageKeys.length > 0 || addedImageKeys.length > 0
        await catApi.editCat(catData.id, {
          ...commonData,
          ...(avatarKey && { avatar: avatarKey }),
          ...(galleryChanged && { imageActions: { keep: existingImages.map((item) => item.key), delete: deletedImageKeys, add: addedImageKeys } })
        } satisfies UpdateCatParams)
      } else {
        if (!avatarKey) throw new Error('头像上传结果缺少 COS key')
        await catApi.addCat({ ...commonData, avatar: avatarKey, images: addedImageKeys } satisfies CreateCatParams)
      }
      toast.success(catData ? '猫咪档案已保存' : '猫咪档案已创建')
      clearDraft(draftKey)
      invalidateRelatedQueries('cat', catData?.id)
      onSuccess?.();
      onOpenChange?.(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存猫咪档案失败')
    } finally {
      setSubmitting(false)
    }
  }
  useEffect(() => {
    let cancelled = false
    setInitialized(false)
    if (!open) { setSubmitting(false); resetGallery(); return }
    void (async () => {
      try {
        await loadOptions()
        if (cancelled) return
        initializeForm()
        await loadExistingImages()
        if (cancelled) return
        const saved = readDraft(draftKey).values
        setDeletedImageKeys((saved.deletedImageKeys as string[] | undefined) ?? [])
        const files = (saved.newImageFiles as File[] | undefined) ?? []
        setNewImageFiles(files)
        applyNewImagePreviews(files.map((file) => ({ file, url: URL.createObjectURL(file) })))
        setInitialized(true)
      }
      catch (error) {
        toast.error(error instanceof Error ? error.message : '类型数据加载失败')
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 挂载/打开时初始化表单，函数引用随闭包更新
  }, [open])
  useEffect(() => {
    return () => { resetPreview(); resetGallery() }
  }, [])

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) clearDraft(draftKey)
      onOpenChange?.(value)
    }}>
      <DialogContent className="admin-dialog max-h-[90vh] overflow-y-auto border-2 border-black p-0 sm:max-w-4xl">
        <DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#DDF8F2] px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Sparkles className="size-5" />{catData ? '编辑猫咪档案' : '新建猫咪档案'}
          </DialogTitle>
          <DialogDescription>完善猫咪的基础资料、健康状态与特征评分。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 px-6 py-5 md:grid-cols-[180px_minmax(0,1fr)]">
          <section className="flex flex-col gap-3">
            <p className="text-sm font-black">档案头像 <span className="text-red-700">*</span></p><button type="button"
              className="admin-dialog-upload flex aspect-square w-full items-center justify-center overflow-hidden border-2 border-dashed border-black bg-gray-50 hover:bg-[#DDF8F2]"
              onClick={() => avatarInputRef.current?.click()}>{formData.avatar ? <img
              src={formData.avatar} alt={formData.name}
              className="size-full object-cover" /> : <span className="flex flex-col items-center text-gray-500">
              <ImagePlus className="mb-2 size-8" /><span className="text-xs font-bold">选择 JPG 或 PNG 图片</span>
            </span>}</button><Button type="button" variant="outline"
            className="admin-secondary-action border-2 border-black font-bold hover:bg-[#DDF8F2]"
            onClick={() => avatarInputRef.current?.click()}>{formData.avatar ? '更换头像' : '上传头像'}</Button><input ref={avatarInputRef}
            type="file" hidden accept={IMAGE_FILE_ACCEPT} onChange={chooseAvatar} />
          <p className="text-xs leading-5 text-gray-500">单张图片不超过 5MB。</p>
        </section>
        <div className="grid gap-5">
          <section className="admin-dialog-section grid gap-4 border-2 border-black p-4">
            <h3 className="text-sm font-black">基础信息</h3>
            <div className="grid gap-4 sm:grid-cols-2"><label><Label>猫咪名称 *</Label><Input value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  maxLength={50} placeholder="输入猫咪名称" className="mt-1 border-2 border-black" /></label><label><Label>花色
                  *</Label><Select value={formData.color} onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}>
                  <SelectTrigger className="mt-1 border-2 border-black">
                    <SelectValue placeholder="选择花色" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((option) => <SelectItem key={option.id} value={String(option.id)}>{
                      option.label}</SelectItem>)}
                  </SelectContent>
                </Select></label><label><Label>校区 *</Label><Select value={formData.campus} onValueChange={(value) => setFormData((prev) => ({ ...prev, campus: value }))}>
                  <SelectTrigger className="mt-1 border-2 border-black">
                    <SelectValue placeholder="选择校区" />
                  </SelectTrigger>
                  <SelectContent>
                    {campusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{
                      option.label}</SelectItem>)}
                  </SelectContent>
                </Select></label><label><Label>常驻地点</Label><Select value={formData.hauntLocation} onValueChange={(value) => setFormData((prev) => ({ ...prev, hauntLocation: value }))}>
                  <SelectTrigger className="mt-1 border-2 border-black">
                    <SelectValue placeholder="选择常驻地点" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((option) => <SelectItem key={option.id} value={String(option.id)}>{
                      option.label}</SelectItem>)}
                  </SelectContent>
                </Select></label></div>
          </section>
          <section className="admin-dialog-section grid gap-4 border-2 border-black p-4">
            <h3 className="text-sm font-black">健康与状态</h3>
            <div className="grid gap-4 sm:grid-cols-2"><label><Label>在校状态</Label><Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger className="mt-1 border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{
                      option.label}</SelectItem>)}
                  </SelectContent>
                </Select></label><label><Label>性别</Label><Select value={formData.gender} onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}>
                  <SelectTrigger className="mt-1 border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => <SelectItem key={option.value} value={option.value}>{
                      option.label}</SelectItem>)}
                  </SelectContent>
                </Select></label><label><Label>健康状态</Label><Select value={formData.healthStatus} onValueChange={(value) => setFormData((prev) => ({ ...prev, healthStatus: value }))}>
                  <SelectTrigger className="mt-1 border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {healthStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{
                      option.label}</SelectItem>)}
                  </SelectContent>
                </Select></label><label><Label>是否绝育</Label><Select value={String(formData.isNeutered)}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, isNeutered: value === 'true' }))}>
                  <SelectTrigger className="mt-1 border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">是</SelectItem>
                    <SelectItem value="false">否</SelectItem>
                  </SelectContent>
                </Select></label><label><Label>预计出生年份</Label><Input type="number"
                  min="1900" max={new Date().getFullYear()} value={formData.birthYear}
                  onChange={(event) => setFormData((prev) => ({ ...prev, birthYear: event.target.value === '' ? ('' as unknown as number) : Number(event.target.value) }))}
                  className="mt-1 border-2 border-black" /></label></div>
            <label><Label>性格与特征</Label><Textarea value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} rows={4} maxLength={500}
                placeholder="描述猫咪的性格、活动规律或需注意的特征" className="mt-1 resize-y border-2 border-black" /></label>
          </section>
        </div>
      </div>
      <section className="mx-6 mb-5 grid gap-4 border-2 border-black bg-white p-4 sm:grid-cols-2">
        <label><Label>别名</Label><Input value={formData.aliases} onChange={(event) => setFormData((prev) => ({ ...prev, aliases: event.target.value }))} maxLength={200} placeholder="多个别名用逗号分隔"
            className="mt-1 border-2 border-black" /></label><label><Label>角色</Label><Select value={formData.role} onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}>
            <SelectTrigger className="mt-1 border-2 border-black">
              <SelectValue placeholder="选择角色" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((option) => <SelectItem key={option.id} value={String(option.id)}>{option.label}
              </SelectItem>)}
            </SelectContent>
          </Select></label><label><Label>入园时间</Label><Input type="date" value={formData.admissionDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, admissionDate: event.target.value }))}
              className="mt-1 border-2 border-black" /></label><label><Label>绝育日期</Label><Input type="date" value={formData.neuteredDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, neuteredDate: event.target.value }))}
              className="mt-1 border-2 border-black" /></label><label><Label>绝育方式</Label><Select
            value={formData.neuteredType} onValueChange={(value) => setFormData((prev) => ({ ...prev, neuteredType: value }))}>
            <SelectTrigger className="mt-1 border-2 border-black">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">剪耳</SelectItem>
              <SelectItem value="1">未剪耳</SelectItem>
            </SelectContent>
          </Select></label>
        <div className="grid gap-2"><Label>特征标签</Label>
          <div className="flex flex-wrap gap-2">{tagOptions.map((tag) => <button key={tag.id} type="button"
              className={cn('border-2 px-2 py-1 text-xs font-bold',
              formData.tags.includes(tag.id) ? 'border-black bg-[#FACC15]' : 'border-gray-300 bg-white')}
              onClick={() => setFormData((prev) => ({ ...prev, tags: prev.tags.includes(tag.id) ? prev.tags.filter((id) => id !== tag.id) : [...prev.tags, tag.id] }))}>{
                tag.name}</button>)}</div>
        </div>
      </section>
      <section className="mx-6 mb-5 grid gap-4 border-2 border-black bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black">档案图片</h3>
            <p className="mt-1 text-xs text-gray-500">最多 8 张，支持 JPG、PNG，单张不超过 5MB。</p>
          </div><Button type="button" variant="outline" className="border-2 border-black font-bold"
            disabled={galleryLoading || existingImages.length + newImageFiles.length >= 8}
            onClick={() => galleryInputRef.current?.click()}>
            <ImagePlus className="size-4" />添加图片
          </Button><input ref={galleryInputRef} type="file" multiple hidden accept={IMAGE_FILE_ACCEPT}
            onChange={chooseGalleryImages} />
        </div>
        {galleryLoading ? <p className="py-6 text-center text-sm text-gray-500">正在加载档案图片...</p>
          : existingImages.length || newImagePreviews.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {existingImages.map((image) => <div key={image.key} className="relative"><img src={image.url} alt="已有档案图片"
              className="aspect-square w-full border-2 border-black object-cover" /><Button type="button" size="icon"
              variant="destructive" className="absolute right-1 top-1 size-8 border-2 border-black" aria-label="删除档案图片"
              onClick={() => removeExistingImage(image)}>
              <Trash2 className="size-4" />
            </Button></div>)}
          {newImagePreviews.map((image, index) => <div key={image.url} className="relative"><img src={image.url}
              alt="待上传档案图片" className="aspect-square w-full border-2 border-black object-cover" /><span
              className="absolute bottom-1 left-1 bg-[#FACC15] px-1.5 py-0.5 text-xs font-bold">待上传</span><Button
              type="button" size="icon" variant="destructive"
              className="absolute right-1 top-1 size-8 border-2 border-black" aria-label="移除待上传图片"
              onClick={() => removeNewImage(index)}>
              <Trash2 className="size-4" />
            </Button></div>)}
        </div>
          : <p className="border-2 border-dashed border-gray-300 py-6 text-center text-sm text-gray-500">暂无档案图片</p>}
      </section>
      <section className="admin-dialog-score mx-6 mb-5 border-2 border-black bg-[#F3F4F6] p-4">
        <h3 className="text-sm font-black">特征评分</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{attributeFields.map((field) => <label key={field.key}
            className="grid gap-2"><span className="flex justify-between text-sm font-bold"><span>{field.label}
            </span><span>{formData.attributes[field.key].toFixed(1)}</span></span><Input type="range" min="0"
            max="10" step="0.5" className={field.color} value={formData.attributes[field.key]}
            onInput={(event) => updateAttribute(field.key, Number((event.target as HTMLInputElement).value))} /></label>)}</div>
      </section>
      <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4"><Button variant="outline"
          className="admin-secondary-action border-2 border-black" disabled={submitting}
          onClick={() => onOpenChange?.(false)}>{catData ? '放弃修改' : '取消'}</Button><Button
          className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
          disabled={submitting || typeLoading} onClick={() => void submit()}>{submitting ? '正在保存...' : typeLoading ? '正在加载选项...' :
            (catData ? '保存档案' : '创建档案')}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
  )
}

export default EditCatDialog
