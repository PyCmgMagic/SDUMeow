<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { newCatApi, typeApi } from '@/lib/api'
import { CampusMap, type TagTypeOption, type TypeOption } from '@/types'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@/lib/upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { ArrowLeft, Camera, Cat, CheckCircle2, Image as ImageIcon, MapPin, X } from 'lucide-vue-next'

const router = useRouter()
const loading = ref(false)
const typeLoading = ref(false)
const form = ref({ tempName: '', color: '', campus: '', location: '', tags: [] as number[], images: [] as File[] })
const imagePreviews = ref<string[]>([])
const colorOptions = ref<TypeOption[]>([])
const tagOptions = ref<TagTypeOption[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const campusOptions = Object.entries(CampusMap).map(([value, label]) => ({ value, label }))

const triggerUpload = () => fileInput.value?.click()
const handleFileChange = (event: Event) => {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  const remaining = 9 - form.value.images.length
  for (const file of files.slice(0, Math.max(remaining, 0))) {
    if (!isSupportedImageFile(file)) { toast.warning(`${file.name} 仅支持 JPG 或 PNG 图片`); continue }
    if (file.size > 5 * 1024 * 1024) { toast.warning(`${file.name} 超过 5MB`); continue }
    form.value.images.push(file)
    imagePreviews.value.push(URL.createObjectURL(file))
  }
  if (files.length > remaining) toast.warning('最多上传 9 张图片')
    ; (event.target as HTMLInputElement).value = ''
}
const removeImage = (index: number) => { const preview = imagePreviews.value[index]; if (preview) URL.revokeObjectURL(preview); form.value.images.splice(index, 1); imagePreviews.value.splice(index, 1) }
const toggleTag = (tagId: number) => { form.value.tags = form.value.tags.includes(tagId) ? form.value.tags.filter((id) => id !== tagId) : [...form.value.tags, tagId] }
const loadTypeOptions = async () => { typeLoading.value = true; try { const [colors, tags] = await Promise.all([typeApi.getColors(), typeApi.getTags()]); colorOptions.value = colors; tagOptions.value = tags } catch (error) { toast.error(error instanceof Error ? error.message : '类型数据加载失败') } finally { typeLoading.value = false } }
const submit = async () => {
  if (!form.value.color) return toast.warning('请选择猫咪花色')
  if (!form.value.campus) return toast.warning('请选择所在校区')
  if (!form.value.location.trim()) return toast.warning('请填写详细位置')
  if (!form.value.images.length) return toast.warning('请至少上传一张图片')
  loading.value = true
  try {
    const images = await uploadImages(form.value.images)
    const result = await newCatApi.submitNewCat({
      ...(form.value.tempName.trim() ? { tempName: form.value.tempName.trim() } : {}),
      color: Number(form.value.color),
      campus: Number(form.value.campus),
      location: form.value.location.trim(),
      images,
      ...(form.value.tags.length ? { tags: form.value.tags } : {})
    })
    toast.success(`线索已提交，审核通过后可获得 ${result.experience} 经验和 ${result.currency} 小鱼干`)
    router.push('/')
  } catch (error) { toast.error(error instanceof Error ? error.message : '提交失败，请稍后重试') } finally { loading.value = false }
}
onMounted(() => void loadTypeOptions())
onBeforeUnmount(() => imagePreviews.value.forEach((url) => URL.revokeObjectURL(url)))
</script>

<template>
  <div class="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
    <main class="mx-auto max-w-5xl">
      <header class="flex items-start gap-3 border-b-2 border-black pb-5"><Button variant="outline" size="icon"
          class="shrink-0 border-2 border-black bg-white hover:bg-[#FFF8DE]" aria-label="返回上一页" @click="router.back()">
          <ArrowLeft class="size-4" />
        </Button>
        <div class="flex min-w-0 items-start gap-4"><span
            class="flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#FACC15] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <Cat class="size-6" />
          </span>
          <div>
            <p class="text-sm font-bold text-[#8A5A00]">NEW CAT CLUE</p>
            <h1 class="mt-1 text-2xl font-black text-gray-950">发现新猫</h1>
            <p class="mt-2 text-sm text-gray-600">提交清晰的现场照片和位置，帮助我们确认并建立校园猫咪档案。</p>
          </div>
        </div>
      </header>
      <div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form class="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]"
          @submit.prevent="submit">
          <div class="border-b-2 border-black bg-[#FFF8DE] px-5 py-3">
            <h2 class="text-sm font-black">线索信息</h2>
          </div>
          <div class="grid gap-6 p-5 sm:p-6">
            <section class="grid gap-3">
              <div class="flex items-center justify-between gap-3"><label class="text-sm font-black">猫咪照片</label><span
                  class="text-xs text-gray-500">JPG / PNG，最多 9 张</span></div>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div v-for="(image, index) in imagePreviews" :key="image"
                  class="group relative aspect-square overflow-hidden border-2 border-black"><img :src="image"
                    :alt="`猫咪照片 ${index + 1}`" class="size-full object-cover" /><Button type="button" variant="outline"
                    size="icon"
                    class="absolute right-2 top-2 size-8 border-2 border-black bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    :aria-label="`移除图片 ${index + 1}`" @click="removeImage(index)">
                    <X class="size-4" />
                  </Button></div><button v-if="form.images.length < 9" type="button"
                  class="flex aspect-square flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-gray-50 px-3 text-center text-sm font-bold text-gray-600 hover:border-[#8A5A00] hover:bg-[#FFF8DE]"
                  @click="triggerUpload">
                  <Camera class="mb-2 size-7" />添加照片
                </button>
              </div><input ref="fileInput" type="file" class="hidden" :accept="IMAGE_FILE_ACCEPT" multiple
                @change="handleFileChange" />
            </section><label class="grid gap-2" for="new-cat-name"><span class="text-sm font-black">临时名称 <span
                  class="font-medium text-gray-500">可选</span></span><Input id="new-cat-name" v-model="form.tempName"
                maxlength="50" placeholder="方便后续识别，例如“图书馆小橘”"
                class="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
            <div class="grid gap-5 sm:grid-cols-2"><label class="grid gap-2"><span
                  class="text-sm font-black">毛色特征</span><Select v-model="form.color" :disabled="typeLoading">
                  <SelectTrigger class="border-2 border-black">
                    <SelectValue placeholder="选择花色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="color in colorOptions" :key="color.id" :value="String(color.id)">{{ color.label
                      }}</SelectItem>
                  </SelectContent>
                </Select></label><label class="grid gap-2"><span class="text-sm font-black">所在校区</span><Select
                  v-model="form.campus" :disabled="typeLoading">
                  <SelectTrigger class="border-2 border-black">
                    <SelectValue placeholder="选择校区" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="option in campusOptions" :key="option.value" :value="option.value">{{
                      option.label }}</SelectItem>
                  </SelectContent>
                </Select></label></div><label class="grid gap-2" for="new-cat-location"><span
                class="text-sm font-black">详细位置</span>
              <div class="relative">
                <MapPin class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" /><Input
                  id="new-cat-location" v-model="form.location" maxlength="100" placeholder="例如：图书馆东侧台阶旁"
                  class="border-2 border-black pl-9 focus-visible:ring-[#FACC15]" />
              </div>
            </label>
            <section class="grid gap-3">
              <div class="flex items-center justify-between gap-3"><label class="text-sm font-black">可见特征</label><span
                  class="text-xs text-gray-500">可多选</span></div>
              <div v-if="typeLoading" class="border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500">
                正在加载特征选项...</div>
              <div v-else class="flex flex-wrap gap-2"><button v-for="tag in tagOptions" :key="tag.id" type="button"
                  class="min-h-9 border-2 px-3 text-sm font-bold"
                  :class="form.tags.includes(tag.id) ? 'border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black'"
                  :aria-pressed="form.tags.includes(tag.id)" @click="toggleTag(tag.id)">{{ tag.name }}</button></div>
            </section>
          </div>
          <footer
            class="flex flex-col-reverse gap-3 border-t-2 border-black bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" class="border-2 border-black" :disabled="loading"
              @click="router.back()">取消</Button><Button type="submit"
              class="border-2 border-black bg-[#FACC15] font-black text-black hover:bg-[#EAB308]"
              :disabled="loading || typeLoading">
              <ImageIcon class="size-4" />{{ loading ? '正在提交...' : '提交新猫线索' }}
            </Button></footer>
        </form>
        <aside class="flex flex-col gap-5">
          <section class="border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div class="border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
              <h2 class="text-sm font-black">提交建议</h2>
            </div>
            <ul class="grid gap-4 p-5 text-sm leading-6 text-gray-700">
              <li class="flex gap-2">
                <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />拍摄清晰的整体照片，尽量不要只拍局部。
              </li>
              <li class="flex gap-2">
                <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />位置尽可能具体，便于后续再次确认。
              </li>
              <li class="flex gap-2">
                <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />特征标签可帮助避免与已有档案重复。
              </li>
            </ul>
          </section>
          <section class="border-2 border-black bg-[#FFF8DE] p-5">
            <h2 class="text-sm font-black">审核后</h2>
            <p class="mt-3 text-sm leading-6 text-gray-700">管理员确认线索后会建立正式档案，奖励将按审核结果发放。</p>
          </section>
        </aside>
      </div>
    </main>
  </div>
</template>
