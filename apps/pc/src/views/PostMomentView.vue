<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { catApi, postApi } from '@/lib/api'
import { catDetailToListItem } from '@/lib/cat'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@/lib/upload'
import { CampusMap, type CatListItem } from '@/types'
import { toast } from '@/lib/toast'
import { ArrowLeft, Cat, CheckCircle2, ChevronRight, ImagePlus, MapPin, Tag, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import CatPickerDialog from '@/components/CatPickerDialog.vue'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const isCatDialogOpen = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const form = ref({
  selectedCat: null as CatListItem | null,
  title: '',
  content: '',
  tags: [] as string[],
  images: [] as string[],
  imageFiles: [] as File[],
  location: '',
})

const predefinedTags = ['日常', '搞笑', '可爱', '求助', '科普', '记录', '偶遇', '投喂']

const selectCatById = async (catId: string) => {
  try {
    const selectedCat = catDetailToListItem(await catApi.getCatDetail(catId))
    form.value.selectedCat = selectedCat
    if (!form.value.location && selectedCat.campus !== undefined) {
      form.value.location = CampusMap[selectedCat.campus] || String(selectedCat.campus)
    }
  } catch (error) {
    console.error('Failed to preselect cat:', error)
    toast.error('无法加载指定猫咪，请重新选择')
  }
}

const handleSelectCat = (cat: CatListItem) => {
  form.value.selectedCat = cat
  if (!form.value.location && cat.campus !== undefined) {
    form.value.location = CampusMap[cat.campus] || String(cat.campus)
  }
  isCatDialogOpen.value = false
}

const triggerUpload = () => fileInput.value?.click()

const handleFileChange = (event: Event) => {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  const remaining = 9 - form.value.images.length
  if (files.length > remaining) toast.warning('最多只能上传 9 张图片')

  for (const file of files.slice(0, Math.max(remaining, 0))) {
    if (!isSupportedImageFile(file)) {
      toast.warning(`${file.name} 仅支持 JPG 或 PNG 格式`)
      continue
    }
    form.value.images.push(URL.createObjectURL(file))
    form.value.imageFiles.push(file)
  }
  ;(event.target as HTMLInputElement).value = ''
}

const removeImage = (index: number) => {
  const previewUrl = form.value.images[index]
  if (previewUrl) URL.revokeObjectURL(previewUrl)
  form.value.images.splice(index, 1)
  form.value.imageFiles.splice(index, 1)
}

const toggleTag = (tag: string) => {
  form.value.tags = form.value.tags.includes(tag)
    ? form.value.tags.filter((item) => item !== tag)
    : [...form.value.tags, tag]
}

const handleSubmit = async () => {
  if (!form.value.selectedCat) return toast.warning('请选择主角猫咪')
  if (!form.value.content.trim() && form.value.images.length === 0) {
    return toast.warning('请至少填写文字内容或添加一张图片')
  }

  loading.value = true
  try {
    let content = form.value.content.trim()
    if (form.value.title.trim()) content = `【${form.value.title.trim()}】\n${content}`.trim()
    if (form.value.tags.length) content = `${content}\n${form.value.tags.map((tag) => `#${tag}`).join(' ')}`.trim()

    const media = await uploadImages(form.value.imageFiles)
    await postApi.createPost({
      content: content || undefined,
      catId: String(form.value.selectedCat.id),
      location: form.value.location.trim() || '校园内',
      media: media.length ? media : undefined,
    })
    toast.success('动态已发布')
    await router.push('/')
  } catch (error) {
    console.error(error)
    toast.error(error instanceof Error ? error.message : '发布失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const catId = typeof route.query.catId === 'string' ? route.query.catId : ''
  if (catId) void selectCatById(catId)
})

watch(() => route.query.catId, (catId) => {
  if (typeof catId === 'string' && catId) void selectCatById(catId)
})

onBeforeUnmount(() => form.value.images.forEach((url) => URL.revokeObjectURL(url)))
</script>

<template>
  <div class="public-workbench min-h-full bg-gray-50 px-4 py-6 sm:px-6">
    <main class="mx-auto max-w-6xl">
      <header class="flex items-start gap-3 border-b-2 border-black pb-5">
        <Button variant="outline" size="icon" class="shrink-0 border-2 border-black bg-white hover:bg-[#FFF8DE]" aria-label="返回上一页" @click="router.back()">
          <ArrowLeft class="size-4" />
        </Button>
        <div class="flex min-w-0 items-start gap-4">
          <span class="flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#FACC15] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <ImagePlus class="size-6" />
          </span>
          <div>
            <p class="text-sm font-bold text-[#8A5A00]">NEW MOMENT</p>
            <h1 class="mt-1 text-2xl font-black text-gray-950">发布动态</h1>
            <p class="mt-2 text-sm text-gray-600">把校园里遇见的猫咪和当下的故事，一起记录下来。</p>
          </div>
        </div>
      </header>

      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form class="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]" @submit.prevent="handleSubmit">
          <div class="border-b-2 border-black bg-[#FFF8DE] px-5 py-3">
            <h2 class="text-sm font-black">动态内容</h2>
          </div>

          <div class="grid gap-7 p-5 sm:p-6">
            <section class="grid gap-2">
              <label class="text-sm font-black">主角猫咪</label>
              <CatPickerDialog v-model:open="isCatDialogOpen" title="选择主角猫咪" @select="handleSelectCat">
                <template #trigger>
                  <button type="button" class="flex min-h-16 w-full items-center justify-between gap-3 border-2 border-black bg-gray-50 px-4 text-left hover:bg-[#FFF8DE]">
                    <span v-if="form.selectedCat" class="flex min-w-0 items-center gap-3">
                      <img :src="form.selectedCat.avatar" :alt="form.selectedCat.name" class="size-11 shrink-0 border-2 border-black object-cover" />
                      <span class="min-w-0">
                        <strong class="block truncate">{{ form.selectedCat.name }}</strong>
                        <span class="block truncate text-xs text-gray-500">{{ CampusMap[form.selectedCat.campus] || '校园内' }}</span>
                      </span>
                    </span>
                    <span v-else class="flex items-center gap-2 text-sm text-gray-500"><Cat class="size-4" />选择要记录的猫咪</span>
                    <ChevronRight class="size-5 shrink-0" />
                  </button>
                </template>
              </CatPickerDialog>
            </section>

            <section class="grid gap-3">
              <div class="flex items-center justify-between gap-3">
                <label class="text-sm font-black">图片</label>
                <span class="text-xs text-gray-500">JPG / PNG，最多 9 张</span>
              </div>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div v-for="(image, index) in form.images" :key="image" class="group relative aspect-square overflow-hidden border-2 border-black">
                  <img :src="image" :alt="`动态图片 ${index + 1}`" class="size-full object-cover" />
                  <Button type="button" variant="outline" size="icon" class="absolute right-2 top-2 size-8 border-2 border-black bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100" :aria-label="`移除图片 ${index + 1}`" @click="removeImage(index)">
                    <X class="size-4" />
                  </Button>
                </div>
                <button v-if="form.images.length < 9" type="button" class="flex aspect-square flex-col items-center justify-center border-2 border-dashed border-gray-400 bg-gray-50 px-3 text-center text-sm font-bold text-gray-600 hover:border-[#8A5A00] hover:bg-[#FFF8DE]" @click="triggerUpload">
                  <ImagePlus class="mb-2 size-7" />添加图片
                </button>
              </div>
              <input ref="fileInput" type="file" class="hidden" :accept="IMAGE_FILE_ACCEPT" multiple @change="handleFileChange" />
            </section>

            <section class="grid gap-4">
              <label class="grid gap-2" for="moment-title"><span class="text-sm font-black">标题 <span class="font-medium text-gray-500">可选</span></span><Input id="moment-title" v-model="form.title" maxlength="80" placeholder="为这条记录起一个标题" class="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
              <label class="grid gap-2" for="moment-content"><span class="text-sm font-black">内容</span><Textarea id="moment-content" v-model="form.content" maxlength="2000" class="min-h-40 resize-y border-2 border-black focus-visible:ring-[#FACC15]" placeholder="记录今天看见的猫咪、它当时的状态，或你们之间的小故事。" /></label>
              <label class="grid gap-2" for="moment-location"><span class="flex items-center gap-2 text-sm font-black"><MapPin class="size-4" />位置</span><Input id="moment-location" v-model="form.location" maxlength="100" placeholder="例如：图书馆东侧台阶" class="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
            </section>

            <section class="grid gap-3">
              <div class="flex items-center gap-2 text-sm font-black"><Tag class="size-4" />添加标签</div>
              <div class="flex flex-wrap gap-2">
                <button v-for="tag in predefinedTags" :key="tag" type="button" class="min-h-9 border-2 px-3 text-sm font-bold" :class="form.tags.includes(tag) ? 'border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black'" :aria-pressed="form.tags.includes(tag)" @click="toggleTag(tag)"># {{ tag }}</button>
              </div>
            </section>
          </div>

          <footer class="flex flex-col-reverse gap-3 border-t-2 border-black bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" class="border-2 border-black" :disabled="loading" @click="router.back()">取消</Button>
            <Button type="submit" class="border-2 border-black bg-[#FACC15] font-black text-black hover:bg-[#EAB308]" :disabled="loading"><ImagePlus class="size-4" />{{ loading ? '正在发布...' : '发布动态' }}</Button>
          </footer>
        </form>

        <aside class="flex flex-col gap-5">
          <section class="border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div class="border-b-2 border-black bg-[#F3F4F6] px-5 py-3"><h2 class="text-sm font-black">发布建议</h2></div>
            <ul class="grid gap-4 p-5 text-sm leading-6 text-gray-700">
              <li class="flex gap-2"><CheckCircle2 class="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />选择清晰、主体明确的照片。</li>
              <li class="flex gap-2"><CheckCircle2 class="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />写明位置，方便其他同学找到猫咪。</li>
              <li class="flex gap-2"><CheckCircle2 class="mt-0.5 size-4 shrink-0 text-[#8A5A00]" />涉及伤病或紧急情况，请使用 SOS 上报。</li>
            </ul>
          </section>
          <section class="border-2 border-black bg-[#FFF8DE] p-5">
            <h2 class="text-sm font-black">当前状态</h2>
            <p class="mt-3 text-sm leading-6 text-gray-700">{{ form.selectedCat ? `正在记录 ${form.selectedCat.name} 的动态。` : '选择主角猫咪后，即可完成发布。' }}</p>
          </section>
        </aside>
      </div>
    </main>
  </div>
</template>
