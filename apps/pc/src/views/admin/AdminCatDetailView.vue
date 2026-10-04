<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { catApi, typeApi } from '@/lib/api'
import { CampusMap, CatStatusMap, GenderMap, HealthStatusMap, type CatDetail, type TagTypeOption, type TypeOption } from '@/types'
import { Button } from '@/components/ui/button'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AdminPanel from '@/components/admin/AdminPanel.vue'
import { ArrowLeft, Cat, MapPin } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const cat = ref<CatDetail | null>(null)
const loading = ref(true)
const error = ref('')
const colorOptions = ref<TypeOption[]>([])
const locationOptions = ref<TypeOption[]>([])
const roleOptions = ref<TypeOption[]>([])
const tagOptions = ref<TagTypeOption[]>([])
const colorLabel = computed(() => colorOptions.value.find((item) => item.id === cat.value?.basicInfo.color)?.label || `花色 #${cat.value?.basicInfo.color ?? '-'}`)
const locationLabel = computed(() => locationOptions.value.find((item) => item.id === cat.value?.basicInfo.hauntLocation)?.label || (cat.value?.basicInfo.hauntLocation == null ? '-' : `地点 #${cat.value.basicInfo.hauntLocation}`))
const roleLabel = computed(() => roleOptions.value.find((item) => item.id === cat.value?.basicInfo.role)?.label || `角色 #${cat.value?.basicInfo.role ?? '-'}`)
const tagLabel = (id: number) => tagOptions.value.find((item) => item.id === id)?.name || `标签 #${id}`
const attributeLabels: Record<keyof CatDetail['attributes'], string> = {
  friendliness: '亲人指数',
  gluttony: '贪吃指数',
  fight: '战斗力',
  appearance: '颜值'
}
const formatTime = (value?: string | null) => value ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-'
const fetchDetail = async () => {
  loading.value = true
  error.value = ''
  try {
    cat.value = await catApi.getCatDetail(String(route.params.id))
    const results = await Promise.allSettled([typeApi.getColors(), typeApi.getLocations(), typeApi.getRoles(), typeApi.getTags()])
    if (results[0].status === 'fulfilled') colorOptions.value = results[0].value
    if (results[1].status === 'fulfilled') locationOptions.value = results[1].value
    if (results[2].status === 'fulfilled') roleOptions.value = results[2].value
    if (results[3].status === 'fulfilled') tagOptions.value = results[3].value
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '猫咪档案加载失败'
  } finally { loading.value = false }
}
onMounted(() => void fetchDetail())
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader eyebrow="CAT ARCHIVE" title="猫咪档案详情" description="查看完整档案字段，不离开管理员工作台进入用户端页面。" :icon="Cat" tone="mint">
      <template #action><Button variant="outline" class="border-2 border-black font-bold" @click="router.push('/admin/cats')"><ArrowLeft class="size-4" />返回猫咪档案</Button></template>
    </AdminPageHeader>
    <div v-if="loading" class="border-2 border-black bg-white p-10 text-center text-gray-500">正在加载猫咪档案...</div>
    <div v-else-if="error" class="border-2 border-red-300 bg-red-50 p-10 text-center text-red-700">{{ error }}</div>
    <template v-else-if="cat">
      <section class="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div class="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]"><img :src="cat.avatar" :alt="cat.name" class="aspect-square w-full border-2 border-black object-cover" /><h2 class="mt-4 text-2xl font-black">{{ cat.name }}</h2><p class="mt-1 text-sm text-gray-500">{{ cat.aliases.join('、') || '暂无别名' }}</p><span class="mt-4 inline-flex border-2 border-black bg-[#DDF8F2] px-2 py-1 text-sm font-bold">{{ CatStatusMap[cat.basicInfo.status] }}</span></div>
        <AdminPanel title="基础与状态字段" meta="与管理员编辑档案对应"><dl class="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"><div><dt class="text-xs text-gray-500">花色</dt><dd class="mt-1 font-bold">{{ colorLabel }}</dd></div><div><dt class="text-xs text-gray-500">性别</dt><dd class="mt-1 font-bold">{{ GenderMap[cat.basicInfo.gender] }}</dd></div><div><dt class="text-xs text-gray-500">校区</dt><dd class="mt-1 font-bold">{{ CampusMap[cat.basicInfo.campus] || `校区 #${cat.basicInfo.campus}` }}</dd></div><div><dt class="text-xs text-gray-500">常驻地点</dt><dd class="mt-1 flex items-center gap-1 font-bold"><MapPin class="size-4" />{{ locationLabel }}</dd></div><div><dt class="text-xs text-gray-500">角色</dt><dd class="mt-1 font-bold">{{ roleLabel }}</dd></div><div><dt class="text-xs text-gray-500">健康状态</dt><dd class="mt-1 font-bold">{{ HealthStatusMap[cat.basicInfo.healthStatus] }}</dd></div><div><dt class="text-xs text-gray-500">出生年份</dt><dd class="mt-1 font-bold">{{ cat.basicInfo.birthYear || '-' }}</dd></div><div><dt class="text-xs text-gray-500">最后看见时间</dt><dd class="mt-1 font-bold">{{ formatTime(cat.basicInfo.lastSeenTime) }}</dd></div><div><dt class="text-xs text-gray-500">入园时间</dt><dd class="mt-1 font-bold">{{ formatTime(cat.basicInfo.admissionDate) }}</dd></div><div><dt class="text-xs text-gray-500">绝育</dt><dd class="mt-1 font-bold">{{ cat.basicInfo.neutered.isNeutered ? '已绝育' : '未绝育' }}</dd></div><div><dt class="text-xs text-gray-500">人气值</dt><dd class="mt-1 font-bold">{{ cat.popularity }}</dd></div></dl></AdminPanel>
      </section>
      <AdminPanel title="特征与描述"><div class="grid gap-5 p-5"><div class="flex flex-wrap gap-2"><span v-for="tag in cat.tags" :key="tag" class="border-2 border-gray-300 bg-white px-3 py-1 text-sm font-bold">{{ tagLabel(tag) }}</span><span v-if="!cat.tags.length" class="text-sm text-gray-500">暂无标签</span></div><p class="whitespace-pre-wrap text-sm leading-6 text-gray-700">{{ cat.description || '暂无描述' }}</p><div class="grid gap-3 sm:grid-cols-4"><div v-for="(value, key) in cat.attributes" :key="key" class="border-2 border-gray-200 bg-gray-50 p-3"><p class="text-xs text-gray-500">{{ attributeLabels[key] }}</p><p class="mt-1 text-xl font-black">{{ value }}</p></div></div></div></AdminPanel>
      <AdminPanel v-if="cat.images?.length" title="档案图片"><div class="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4"><img v-for="(image, index) in cat.images" :key="image + index" :src="image" :alt="`${cat.name}档案图片 ${index + 1}`" class="aspect-square w-full border-2 border-black object-cover" /></div></AdminPanel>
    </template>
  </div>
</template>
