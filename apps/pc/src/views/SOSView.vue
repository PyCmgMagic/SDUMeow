<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { catApi, sosApi, typeApi } from '@/lib/api'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@/lib/upload'
import { catDetailToListItem } from '@/lib/cat'
import { CampusMap, type CatListItem, type SymptomTypeOption, type TypeOption } from '@/types'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import CatPickerDialog from '@/components/CatPickerDialog.vue'
import { AlertTriangle, ArrowLeft, Camera, CircleAlert, Search, Siren, X } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const initializing = ref(false)
const isCatDialogOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const symptomOptions = ref<SymptomTypeOption[]>([])
const colorOptions = ref<TypeOption[]>([])
const form = ref({
  catId: '', selectedCat: null as CatListItem | null, campus: '', location: '', symptoms: [] as number[], description: '', images: [] as string[], imageFiles: [] as File[]
})
const campusOptions = Object.entries(CampusMap).map(([value, label]) => ({ value, label }))
const colorLabels = computed(() => new Map(colorOptions.value.map((item) => [item.id, item.label])))
const colorLabel = (id: number) => colorLabels.value.get(id) || `花色 #${id}`
const selectCatById = async (catId: string) => {
  const detail = await catApi.getCatDetail(catId)
  const cat = catDetailToListItem(detail)
  form.value.selectedCat = cat
  form.value.catId = String(cat.id)
  if (!form.value.campus) form.value.campus = String(cat.campus)
}
const selectCat = (cat: CatListItem) => { form.value.selectedCat = cat; form.value.catId = String(cat.id); if (!form.value.campus) form.value.campus = String(cat.campus); isCatDialogOpen.value = false }
const selectUnknown = () => { form.value.selectedCat = null; form.value.catId = ''; isCatDialogOpen.value = false }
const toggleSymptom = (id: number) => { form.value.symptoms = form.value.symptoms.includes(id) ? form.value.symptoms.filter((item) => item !== id) : [...form.value.symptoms, id] }
const triggerUpload = () => fileInput.value?.click()
const handleFileChange = (event: Event) => {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  if (!files.length) return
  const remaining = 9 - form.value.imageFiles.length
  if (remaining <= 0) { toast.warning('最多上传 9 张现场图片'); return }
  for (const file of files.slice(0, remaining)) {
    if (!isSupportedImageFile(file)) { toast.warning(`${file.name} 仅支持 JPG 或 PNG 图片`); continue }
    form.value.imageFiles.push(file)
    form.value.images.push(URL.createObjectURL(file))
  }
  if (files.length > remaining) toast.warning('最多上传 9 张现场图片')
  ;(event.target as HTMLInputElement).value = ''
}
const removeImage = (index: number) => { const preview = form.value.images[index]; if (preview) URL.revokeObjectURL(preview); form.value.images.splice(index, 1); form.value.imageFiles.splice(index, 1) }
const submit = async () => {
  if (!form.value.campus) return toast.warning('请选择所在校区')
  if (!form.value.location.trim()) return toast.warning('请填写详细位置')
  if (!form.value.symptoms.length) return toast.warning('请至少选择一个主要症状')
  if (!form.value.description.trim()) return toast.warning('请描述现场情况')
  if (!form.value.imageFiles.length) return toast.warning('请至少上传一张现场图片')
  loading.value = true
  try {
    const media = await uploadImages(form.value.imageFiles)
    await sosApi.submitSOS({ catId: form.value.catId || undefined, campus: Number(form.value.campus), location: form.value.location.trim(), symptoms: form.value.symptoms, description: form.value.description.trim(), media })
    toast.success('SOS 求助已上报，请保持联系方式畅通')
    router.push('/my-sos')
  } catch (error) { toast.error(error instanceof Error ? error.message : 'SOS 上报失败，请稍后重试') } finally { loading.value = false }
}
onMounted(async () => { initializing.value = true; try { const [symptoms, colors] = await Promise.all([typeApi.getSymptoms(), typeApi.getColors()]); symptomOptions.value = symptoms; colorOptions.value = colors; const catId = typeof route.query.catId === 'string' ? route.query.catId : ''; if (catId) await selectCatById(catId) } catch (error) { console.error('Failed to initialize SOS form', error); toast.error('基础数据加载失败，请检查网络后重试') } finally { initializing.value = false } })
watch(() => route.query.catId, async (catId) => { if (typeof catId === 'string' && catId) await selectCatById(catId) })
onBeforeUnmount(() => form.value.images.forEach((url) => URL.revokeObjectURL(url)))
</script>

<template>
  <div class="min-h-full bg-gray-50 px-4 py-6 sm:px-6"><main class="mx-auto max-w-4xl"><header class="flex items-start gap-3 border-b-2 border-black pb-5"><Button variant="outline" size="icon" class="shrink-0 border-2 border-black bg-white hover:bg-red-50" aria-label="返回上一页" @click="router.back()"><ArrowLeft class="size-4" /></Button><div class="flex min-w-0 items-start gap-4"><span class="flex size-12 shrink-0 items-center justify-center border-2 border-black bg-red-500 text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]"><Siren class="size-6" /></span><div><p class="text-sm font-bold text-red-700">EMERGENCY REPORT</p><h1 class="mt-1 text-2xl font-black text-gray-950">SOS 救援上报</h1><p class="mt-2 text-sm text-gray-600">填写现场情况，救援人员会根据位置、症状和图片优先处理。</p></div></div></header><div class="mt-5 flex gap-3 border-2 border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-800"><CircleAlert class="mt-0.5 size-5 shrink-0" /><p>请在确保自身安全后提交。照片仅用于确认现场情况，建议拍摄猫咪整体状态和周边定位信息。</p></div><form class="mt-5 overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]" @submit.prevent="submit"><div class="border-b-2 border-black bg-[#FFF8DE] px-5 py-3"><h2 class="text-sm font-black">救援信息</h2></div><div class="grid gap-6 p-5 sm:p-6"><section class="grid gap-2"><label class="text-sm font-black">涉及猫咪 <span class="font-medium text-gray-500">可选</span></label><CatPickerDialog v-model:open="isCatDialogOpen" title="选择需要救援的猫咪" allow-unknown @select="selectCat" @unknown="selectUnknown"><template #trigger><button type="button" class="flex min-h-14 w-full items-center justify-between gap-3 border-2 border-black bg-gray-50 px-4 text-left hover:bg-[#FFF8DE]"><span v-if="form.selectedCat" class="flex min-w-0 items-center gap-3"><img :src="form.selectedCat.avatar" :alt="form.selectedCat.name" class="size-9 shrink-0 border-2 border-black object-cover" /><span class="min-w-0"><strong class="block truncate">{{ form.selectedCat.name }}</strong><span class="block truncate text-xs text-gray-500">{{ CampusMap[form.selectedCat.campus] }} · {{ colorLabel(form.selectedCat.color) }}</span></span></span><span v-else class="flex items-center gap-2 text-sm text-gray-500"><Search class="size-4" />选择已收录猫咪，或继续上报未知猫咪</span><span class="text-sm font-bold">选择</span></button></template></CatPickerDialog></section><div class="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><label class="grid gap-2"><span class="text-sm font-black">所在校区</span><Select v-model="form.campus" :disabled="initializing"><SelectTrigger class="border-2 border-black"><SelectValue placeholder="选择校区" /></SelectTrigger><SelectContent><SelectItem v-for="option in campusOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectContent></Select></label><label class="grid gap-2" for="sos-location"><span class="text-sm font-black">详细位置</span><Input id="sos-location" v-model="form.location" maxlength="100" placeholder="例如：食堂北门左侧草丛" class="border-2 border-black focus-visible:ring-red-400" /></label></div><section class="grid gap-3"><div class="flex items-center justify-between gap-3"><label class="text-sm font-black">主要症状</label><span class="text-xs text-gray-500">可多选</span></div><div v-if="initializing" class="border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500">正在加载症状选项...</div><div v-else class="flex flex-wrap gap-2"><button v-for="option in symptomOptions" :key="option.id" type="button" class="min-h-9 border-2 px-3 text-sm font-bold" :class="form.symptoms.includes(option.id) ? 'border-red-600 bg-red-500 text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black'" :aria-pressed="form.symptoms.includes(option.id)" @click="toggleSymptom(option.id)">{{ option.tag }}</button></div></section><label class="grid gap-2" for="sos-description"><span class="text-sm font-black">现场描述</span><Textarea id="sos-description" v-model="form.description" rows="6" maxlength="1000" placeholder="请描述受伤部位、精神状态、是否可接近，以及目前是否有人在现场看护。" class="resize-y border-2 border-black focus-visible:ring-red-400" /></label><section class="grid gap-3"><div class="flex items-center justify-between gap-3"><label class="text-sm font-black">现场图片</label><span class="text-xs text-gray-500">JPG / PNG，最多 9 张</span></div><div class="grid grid-cols-2 gap-3 sm:grid-cols-3"><div v-for="(image, index) in form.images" :key="image" class="group relative aspect-square overflow-hidden border-2 border-black"><img :src="image" :alt="`现场图片 ${index + 1}`" class="size-full object-cover" /><Button type="button" variant="outline" size="icon" class="absolute right-2 top-2 size-8 border-2 border-black bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100" :aria-label="`移除图片 ${index + 1}`" @click="removeImage(index)"><X class="size-4" /></Button></div><button v-if="form.images.length < 9" type="button" class="flex aspect-square flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-gray-50 px-3 text-center text-sm font-bold text-gray-600 hover:border-red-500 hover:bg-red-50 hover:text-red-700" @click="triggerUpload"><Camera class="mb-2 size-7" />添加图片</button></div><input ref="fileInput" type="file" class="hidden" :accept="IMAGE_FILE_ACCEPT" multiple @change="handleFileChange" /></section></div><footer class="flex flex-col-reverse gap-3 border-t-2 border-black bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end"><Button type="button" variant="outline" class="border-2 border-black" :disabled="loading" @click="router.back()">取消</Button><Button type="submit" class="border-2 border-black bg-red-500 font-black text-white hover:bg-red-600" :disabled="loading || initializing"><AlertTriangle class="size-4" />{{ loading ? '正在上报...' : '立即上报 SOS' }}</Button></footer></form></main></div>
</template>
