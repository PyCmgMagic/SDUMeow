<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { catApi, typeApi } from '@/lib/api'
import {
  CampusMap, CatStatusMap, GenderMap, HealthStatusMap,
  type AdminCatItem,
  type CatImageKeyItem,
  type CreateCatParams,
  type TagTypeOption,
  type TypeOption,
  type UpdateCatParams
} from '@/types'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@/lib/upload'
import { toast } from '@/lib/toast'
import { ImagePlus, Sparkles, Trash2 } from 'lucide-vue-next'

interface Props { open: boolean; catData?: AdminCatItem | null }
const props = withDefaults(defineProps<Props>(), { open: false, catData: null })
const emit = defineEmits<{ 'update:open': [value: boolean]; success: [] }>()

const submitting = ref(false)
const typeLoading = ref(false)
const avatarInputRef = ref<HTMLInputElement | null>(null)
const galleryInputRef = ref<HTMLInputElement | null>(null)
const avatarFile = ref<File | null>(null)
const existingImages = ref<CatImageKeyItem[]>([])
const deletedImageKeys = ref<string[]>([])
const newImageFiles = ref<File[]>([])
const newImagePreviews = ref<Array<{ file: File; url: string }>>([])
const galleryLoading = ref(false)
const colorOptions = ref<TypeOption[]>([])
const locationOptions = ref<TypeOption[]>([])
const roleOptions = ref<TypeOption[]>([])
const tagOptions = ref<TagTypeOption[]>([])
let avatarPreviewUrl = ''
const formData = ref({
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
const resetPreview = () => { if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl); avatarPreviewUrl = '' }
const resetGallery = () => {
  newImagePreviews.value.forEach((item) => URL.revokeObjectURL(item.url))
  existingImages.value = []
  deletedImageKeys.value = []
  newImageFiles.value = []
  newImagePreviews.value = []
}
const initializeForm = () => {
  const cat = props.catData
  avatarFile.value = null
  resetPreview()
  formData.value = {
    name: cat?.name || '',
    aliases: ((cat as (AdminCatItem & { aliases?: string[] }) | null)?.aliases || []).join(', '),
    color: optionValue(colorOptions.value, cat?.color), avatar: cat?.avatar || '',
    status: enumValue(cat?.status, { SCHOOL: 0, GRADUATED: 1, MEOW_STAR: 2, HOSPITAL: 3 }, 0),
    role: optionValue(roleOptions.value, cat?.role),
    admissionDate: dateInputValue(cat?.admissionDate),
    gender: enumValue(cat?.gender, { UNKNOWN: 0, MALE: 1, FEMALE: 2 }, 2),
    campus: optionValue(campusOptions.map(({ value, label }) => ({ id: Number(value), label })), cat?.campus) || '0',
    healthStatus: enumValue(cat?.healthStatus, { HEALTHY: 0, SICK: 1, ILL: 1, RECOVERING: 2 }, 0),
    isNeutered: cat?.isNeutered || false,
    neuteredDate: dateInputValue(cat?.neuteredDate),
    neuteredType: String(cat?.neuteredType ?? 0),
    tags: cat?.tags || [],
    birthYear: Number((cat as (AdminCatItem & { birthYear?: number }) | null)?.birthYear ?? -1),
    hauntLocation: optionValue(locationOptions.value, cat?.hauntLocation ?? cat?.location),
    description: cat?.description || '',
    attributes: {
      friendliness: cat?.attributes?.friendliness ?? 5,
      gluttony: cat?.attributes?.gluttony ?? 5,
      fight: cat?.attributes?.fight ?? 5,
      appearance: cat?.attributes?.appearance ?? 5
    }
  }
}

const loadExistingImages = async () => {
  resetGallery()
  if (!props.catData) return
  galleryLoading.value = true
  try {
    const result = await catApi.getImageKeys(props.catData.id)
    existingImages.value = result.images || []
  } catch (error) {
    toast.warning(error instanceof Error ? `档案图片加载失败：${error.message}` : '档案图片加载失败')
  } finally {
    galleryLoading.value = false
  }
}

const loadOptions = async () => {
  if (colorOptions.value.length && locationOptions.value.length && roleOptions.value.length && tagOptions.value.length) return
  typeLoading.value = true
  try {
    const [colors, locations, roles, tags] =
      await Promise.all([typeApi.getColors(), typeApi.getLocations(), typeApi.getRoles(), typeApi.getTags()]);
    colorOptions.value = colors;
    locationOptions.value = locations;
    roleOptions.value = roles;
    tagOptions.value = tags
  }
  finally {
    typeLoading.value = false
  }
}

const chooseAvatar = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!isSupportedImageFile(file)) return toast.warning('仅支持 JPG 或 PNG 格式图片')
  if (file.size > 5 * 1024 * 1024) return toast.warning('图片大小不能超过 5MB')
  resetPreview()
  avatarFile.value = file
  avatarPreviewUrl = URL.createObjectURL(file)
  formData.value.avatar = avatarPreviewUrl;
  (event.target as HTMLInputElement).value = ''
}

const chooseGalleryImages = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  const remaining = Math.max(8 - existingImages.value.length - newImageFiles.value.length, 0)
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
  newImageFiles.value.push(...accepted)
  newImagePreviews.value.push(...accepted.map((file) => ({ file, url: URL.createObjectURL(file) })))
}

const removeExistingImage = (image: CatImageKeyItem) => {
  existingImages.value = existingImages.value.filter((item) => item.key !== image.key)
  if (!deletedImageKeys.value.includes(image.key)) deletedImageKeys.value.push(image.key)
}

const removeNewImage = (index: number) => {
  const preview = newImagePreviews.value[index]
  if (preview) URL.revokeObjectURL(preview.url)
  newImagePreviews.value.splice(index, 1)
  newImageFiles.value.splice(index, 1)
}

const updateAttribute = (key: keyof typeof formData.value.attributes, value: number) => {
  formData.value.attributes[key] = Math.max(0, Math.min(10, value))
}

const submit = async () => {
  if (!formData.value.name.trim() || !formData.value.color || !formData.value.campus) return toast.warning('请填写名称、花色和校区')
  if (!props.catData && !avatarFile.value) return toast.warning('请上传猫咪头像')
  submitting.value = true
  try {
    const avatarKey = avatarFile.value ? (await uploadImages([avatarFile.value], 'admin'))[0] : undefined
    const addedImageKeys = newImageFiles.value.length ? await uploadImages(newImageFiles.value, 'admin') : []
    const commonData = {
      name: formData.value.name.trim(),
      aliases: formData.value.aliases.split(',').map((item) => item.trim()).filter(Boolean),
      color: Number(formData.value.color),
      gender: Number(formData.value.gender),
      campus: Number(formData.value.campus),
      role: formData.value.role ? Number(formData.value.role) : undefined,
      admissionDate: formData.value.admissionDate || undefined,
      status: Number(formData.value.status),
      isNeutered: formData.value.isNeutered,
      neuteredDate: formData.value.neuteredDate || undefined,
      neuteredType: Number(formData.value.neuteredType),
      attributes: formData.value.attributes,
      healthStatus: Number(formData.value.healthStatus),
      tags: formData.value.tags,
      ...(formData.value.birthYear !== -1 && { birthYear: formData.value.birthYear }),
      ...(formData.value.hauntLocation && { hauntLocation: Number(formData.value.hauntLocation) }),
      ...(formData.value.description.trim() && { description: formData.value.description.trim() })
    }
    if (props.catData) {
      const galleryChanged = deletedImageKeys.value.length > 0 || addedImageKeys.length > 0
      await catApi.editCat(props.catData.id, {
        ...commonData,
        ...(avatarKey && { avatar: avatarKey }),
        ...(galleryChanged && { imageActions: { keep: existingImages.value.map((item) => item.key), delete: deletedImageKeys.value, add: addedImageKeys } })
      } satisfies UpdateCatParams)
    } else {
      if (!avatarKey) throw new Error('头像上传结果缺少 COS key')
      await catApi.addCat({ ...commonData, avatar: avatarKey, images: addedImageKeys } satisfies CreateCatParams)
    }
    toast.success(props.catData ? '猫咪档案已保存' : '猫咪档案已创建')
    emit('success');
    emit('update:open', false)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '保存猫咪档案失败')
  } finally {
    submitting.value = false
  }
}
watch(() => props.open, async (open) => {
  if (!open) { submitting.value = false; resetGallery(); return }
  try { await loadOptions(); initializeForm(); await loadExistingImages() }
  catch (error) {
    toast.error(error instanceof Error ? error.message : '类型数据加载失败')
  }
})
onBeforeUnmount(() => { resetPreview(); resetGallery() })
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogContent class="admin-dialog max-h-[90vh] overflow-y-auto border-2 border-black p-0 sm:max-w-4xl">
      <DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#DDF8F2] px-6 py-5 pr-14">
        <DialogTitle class="flex items-center gap-2 text-xl font-black">
          <Sparkles class="size-5" />{{ props.catData ? '编辑猫咪档案' : '新建猫咪档案' }}
        </DialogTitle>
        <DialogDescription>完善猫咪的基础资料、健康状态与特征评分。</DialogDescription>
      </DialogHeader>
      <div class="grid gap-6 px-6 py-5 md:grid-cols-[180px_minmax(0,1fr)]">
        <section class="flex flex-col gap-3">
          <p class="text-sm font-black">档案头像 <span class="text-red-700">*</span></p><button type="button"
            class="admin-dialog-upload flex aspect-square w-full items-center justify-center overflow-hidden border-2 border-dashed border-black bg-gray-50 hover:bg-[#DDF8F2]"
            @click="avatarInputRef?.click()"><img v-if="formData.avatar" :src="formData.avatar" :alt="formData.name"
              class="size-full object-cover" /><span v-else class="flex flex-col items-center text-gray-500">
              <ImagePlus class="mb-2 size-8" /><span class="text-xs font-bold">选择 JPG 或 PNG 图片</span>
            </span></button><Button type="button" variant="outline"
            class="admin-secondary-action border-2 border-black font-bold hover:bg-[#DDF8F2]"
            @click="avatarInputRef?.click()">{{ formData.avatar ? '更换头像' : '上传头像' }}</Button><input ref="avatarInputRef"
            type="file" hidden :accept="IMAGE_FILE_ACCEPT" @change="chooseAvatar" />
          <p class="text-xs leading-5 text-gray-500">单张图片不超过 5MB。</p>
        </section>
        <div class="grid gap-5">
          <section class="admin-dialog-section grid gap-4 border-2 border-black p-4">
            <h3 class="text-sm font-black">基础信息</h3>
            <div class="grid gap-4 sm:grid-cols-2"><label><Label>猫咪名称 *</Label><Input v-model="formData.name"
                  maxlength="50" placeholder="输入猫咪名称" class="mt-1 border-2 border-black" /></label><label><Label>花色
                  *</Label><Select v-model="formData.color">
                  <SelectTrigger class="mt-1 border-2 border-black">
                    <SelectValue placeholder="选择花色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in colorOptions" :key="option.id" :value="String(option.id)">{{
                      option.label }}</SelectItem>
                  </SelectContent>
                </Select></label><label><Label>校区 *</Label><Select v-model="formData.campus">
                  <SelectTrigger class="mt-1 border-2 border-black">
                    <SelectValue placeholder="选择校区" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in campusOptions" :key="option.value" :value="option.value">{{
                      option.label }}</SelectItem>
                  </SelectContent>
                </Select></label><label><Label>常驻地点</Label><Select v-model="formData.hauntLocation">
                  <SelectTrigger class="mt-1 border-2 border-black">
                    <SelectValue placeholder="选择常驻地点" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in locationOptions" :key="option.id" :value="String(option.id)">{{
                      option.label }}</SelectItem>
                  </SelectContent>
                </Select></label></div>
          </section>
          <section class="admin-dialog-section grid gap-4 border-2 border-black p-4">
            <h3 class="text-sm font-black">健康与状态</h3>
            <div class="grid gap-4 sm:grid-cols-2"><label><Label>在校状态</Label><Select v-model="formData.status">
                  <SelectTrigger class="mt-1 border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">{{
                      option.label }}</SelectItem>
                  </SelectContent>
                </Select></label><label><Label>性别</Label><Select v-model="formData.gender">
                  <SelectTrigger class="mt-1 border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in genderOptions" :key="option.value" :value="option.value">{{
                      option.label }}</SelectItem>
                  </SelectContent>
                </Select></label><label><Label>健康状态</Label><Select v-model="formData.healthStatus">
                  <SelectTrigger class="mt-1 border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in healthStatusOptions" :key="option.value" :value="option.value">{{
                      option.label }}</SelectItem>
                  </SelectContent>
                </Select></label><label><Label>是否绝育</Label><Select :model-value="String(formData.isNeutered)"
                  @update:model-value="(value) => formData.isNeutered = value === 'true'">
                  <SelectTrigger class="mt-1 border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">是</SelectItem>
                    <SelectItem value="false">否</SelectItem>
                  </SelectContent>
                </Select></label><label><Label>预计出生年份</Label><Input v-model.number="formData.birthYear" type="number"
                  min="1900" :max="new Date().getFullYear()" class="mt-1 border-2 border-black" /></label></div>
            <label><Label>性格与特征</Label><Textarea v-model="formData.description" rows="4" maxlength="500"
                placeholder="描述猫咪的性格、活动规律或需注意的特征" class="mt-1 resize-y border-2 border-black" /></label>
          </section>
        </div>
      </div>
      <section class="mx-6 mb-5 grid gap-4 border-2 border-black bg-white p-4 sm:grid-cols-2">
        <label><Label>别名</Label><Input v-model="formData.aliases" maxlength="200" placeholder="多个别名用逗号分隔"
            class="mt-1 border-2 border-black" /></label><label><Label>角色</Label><Select v-model="formData.role">
            <SelectTrigger class="mt-1 border-2 border-black">
              <SelectValue placeholder="选择角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="option in roleOptions" :key="option.id" :value="String(option.id)">{{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select></label><label><Label>入园时间</Label><Input v-model="formData.admissionDate" type="date"
            class="mt-1 border-2 border-black" /></label><label><Label>绝育日期</Label><Input
            v-model="formData.neuteredDate" type="date"
            class="mt-1 border-2 border-black" /></label><label><Label>绝育方式</Label><Select
            v-model="formData.neuteredType">
            <SelectTrigger class="mt-1 border-2 border-black">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">剪耳</SelectItem>
              <SelectItem value="1">未剪耳</SelectItem>
            </SelectContent>
          </Select></label>
        <div class="grid gap-2"><Label>特征标签</Label>
          <div class="flex flex-wrap gap-2"><button v-for="tag in tagOptions" :key="tag.id" type="button"
              class="border-2 px-2 py-1 text-xs font-bold"
              :class="formData.tags.includes(tag.id) ? 'border-black bg-[#FACC15]' : 'border-gray-300 bg-white'"
              @click="formData.tags = formData.tags.includes(tag.id) ? formData.tags.filter((id) => id !== tag.id) : [...formData.tags, tag.id]">{{
                tag.name }}</button></div>
        </div>
      </section>
      <section class="mx-6 mb-5 grid gap-4 border-2 border-black bg-white p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-sm font-black">档案图片</h3>
            <p class="mt-1 text-xs text-gray-500">最多 8 张，支持 JPG、PNG，单张不超过 5MB。</p>
          </div><Button type="button" variant="outline" class="border-2 border-black font-bold"
            :disabled="galleryLoading || existingImages.length + newImageFiles.length >= 8"
            @click="galleryInputRef?.click()">
            <ImagePlus class="size-4" />添加图片
          </Button><input ref="galleryInputRef" type="file" multiple hidden :accept="IMAGE_FILE_ACCEPT"
            @change="chooseGalleryImages" />
        </div>
        <p v-if="galleryLoading" class="py-6 text-center text-sm text-gray-500">正在加载档案图片...</p>
        <div v-else-if="existingImages.length || newImagePreviews.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="image in existingImages" :key="image.key" class="relative"><img :src="image.url" alt="已有档案图片"
              class="aspect-square w-full border-2 border-black object-cover" /><Button type="button" size="icon"
              variant="destructive" class="absolute right-1 top-1 size-8 border-2 border-black" aria-label="删除档案图片"
              @click="removeExistingImage(image)">
              <Trash2 class="size-4" />
            </Button></div>
          <div v-for="(image, index) in newImagePreviews" :key="image.url" class="relative"><img :src="image.url"
              alt="待上传档案图片" class="aspect-square w-full border-2 border-black object-cover" /><span
              class="absolute bottom-1 left-1 bg-[#FACC15] px-1.5 py-0.5 text-xs font-bold">待上传</span><Button
              type="button" size="icon" variant="destructive"
              class="absolute right-1 top-1 size-8 border-2 border-black" aria-label="移除待上传图片"
              @click="removeNewImage(index)">
              <Trash2 class="size-4" />
            </Button></div>
        </div>
        <p v-else class="border-2 border-dashed border-gray-300 py-6 text-center text-sm text-gray-500">暂无档案图片</p>
      </section>
      <section class="admin-dialog-score mx-6 mb-5 border-2 border-black bg-[#F3F4F6] p-4">
        <h3 class="text-sm font-black">特征评分</h3>
        <div class="mt-4 grid gap-4 sm:grid-cols-2"><label v-for="field in attributeFields" :key="field.key"
            class="grid gap-2"><span class="flex justify-between text-sm font-bold"><span>{{ field.label
                }}</span><span>{{ formData.attributes[field.key].toFixed(1) }}</span></span><Input type="range" min="0"
              max="10" step="0.5" :class="field.color" :value="formData.attributes[field.key]"
              @input="updateAttribute(field.key, Number(($event.target as HTMLInputElement).value))" /></label></div>
      </section>
      <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4"><Button variant="outline"
          class="admin-secondary-action border-2 border-black" :disabled="submitting"
          @click="emit('update:open', false)">{{ props.catData ? '放弃修改' : '取消' }}</Button><Button
          class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
          :disabled="submitting || typeLoading" @click="submit">{{ submitting ? '正在保存...' : typeLoading ? '正在加载选项...' :
            (props.catData ? '保存档案' : '创建档案') }}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
</template>
