<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { catApi, typeApi } from '@/lib/api'
import { getCatAdoptionUnavailableReason, isCatAdoptable } from '@/lib/cat'
import { toast } from '@/lib/toast'
import {
  AdoptionExperienceMap, AdoptionHousingMap, GenderMap, HealthStatusMap,
  type AdoptionExperience,
  type AdoptionHousing,
  type AdoptionParams,
  type CatDetail,
  type CatListItem,
  type TypeOption
} from '@/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import CatPickerDialog from '@/components/CatPickerDialog.vue'
import { ArrowLeft, Building2, CheckCircle2, ChevronRight, HeartHandshake, Home, MessageCircle, PawPrint, Phone, School, Sprout, Users } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const targetCat = ref<CatDetail | null>(null)
const catLoading = ref(false)
const catError = ref('')
const submitting = ref(false)
const catDialogOpen = ref(false)
const colorOptions = ref<TypeOption[]>([])
const locationOptions = ref<TypeOption[]>([])
const form = ref<{
  housing: AdoptionHousing | '';
  experience: AdoptionExperience | '';
  plan: string;
  phone: string;
  wechat: string;
  agreement: boolean
}>
  ({
    housing: '',
    experience: '',
    plan: '',
    phone: '',
    wechat: '',
    agreement: false
  })
const housingOptions: Array<{ id: AdoptionHousing; label: string; icon: Component }> = [
  { id: 'OWN_HOUSE', label: AdoptionHousingMap.OWN_HOUSE, icon: Home },
  { id: 'RENT_WHOLE', label: AdoptionHousingMap.RENT_WHOLE, icon: Building2 },
  { id: 'RENT_SHARE', label: AdoptionHousingMap.RENT_SHARE, icon: Building2 },
  { id: 'DORM', label: AdoptionHousingMap.DORM, icon: School },
  { id: 'WITH_PARENT', label: AdoptionHousingMap.WITH_PARENT, icon: Users }
]

const experienceOptions: Array<{ id: AdoptionExperience; label: string; icon: Component }> = [
  { id: 'NEWBIE', label: AdoptionExperienceMap.NEWBIE, icon: Sprout },
  { id: 'EXPERIENCED', label: AdoptionExperienceMap.EXPERIENCED, icon: PawPrint },
  { id: 'MULTI_CAT', label: AdoptionExperienceMap.MULTI_CAT, icon: HeartHandshake }
]
const colorLabels = computed(() =>
  new Map(colorOptions.value.map((item) => [item.id, item.label])))

const locationLabels = computed(() =>
  new Map(locationOptions.value.map((item) => [item.id, item.label])))

const targetColorLabel = computed(() => {
  const id = targetCat.value?.basicInfo.color;
  return id === undefined ? '-' : colorLabels.value.get(id) || `花色 #${id}`
})

const targetLocationLabel = computed(() => {
  const id = targetCat.value?.basicInfo.hauntLocation;
  return id == null ? '-' : locationLabels.value.get(id) || `地点 #${id}`
})

const targetAdoptionUnavailableReason = computed(() => {
  const status = targetCat.value?.basicInfo.status;
  return status === undefined ? '' : getCatAdoptionUnavailableReason(status)
})

const isSelectableCat = (cat: CatListItem) => isCatAdoptable(cat.status)
const getSelectionDisabledReason = (cat: CatListItem) => getCatAdoptionUnavailableReason(cat.status)
const fetchTargetCat = async (id: string) => {
  if (!id) { targetCat.value = null; catError.value = ''; return };
  catLoading.value = true;
  catError.value = '';
  try {
    targetCat.value =
      await catApi.getCatDetail(id);
    catError.value = targetCat.value ? getCatAdoptionUnavailableReason(targetCat.value.basicInfo.status) : ''
  }
  catch (error) {
    targetCat.value = null;
    catError.value = error instanceof Error ? error.message : '无法加载指定猫咪';
    toast.error('无法加载指定猫咪，请重新选择')
  }
  finally {
    catLoading.value = false
  }
}

const selectCat = async (cat: CatListItem) => {
  if (!isSelectableCat(cat)) { toast.warning(getSelectionDisabledReason(cat)); return };
  catDialogOpen.value = false;
  await fetchTargetCat(String(cat.id))
}
const submit = async () => {
  if (!targetCat.value?.id) return toast.warning('请先选择一只猫咪');
  if (targetAdoptionUnavailableReason.value) return toast.warning(targetAdoptionUnavailableReason.value);
  if (!form.value.housing) return toast.warning('请选择居住情况');
  if (!form.value.experience) return toast.warning('请选择养猫经验');
  if (form.value.plan.trim().length < 10) return toast.warning('喂养计划至少填写 10 个字');
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) return toast.warning('请输入有效的 11 位手机号');
  if (!form.value.wechat.trim()) return toast.warning('请输入微信号');
  if (!form.value.agreement) return toast.warning('请确认领养承诺');
  submitting.value = true;
  try {
    const payload: AdoptionParams = {
      catId: String(targetCat.value.id),
      info: {
        housing: form.value.housing,
        experience: form.value.experience,
        plan: form.value.plan.trim()
      },
      contact:
      {
        phone: form.value.phone,
        wechat: form.value.wechat.trim()
      }
    };
    await catApi.submitAdoption(payload);
    router.push('/my-adoptions')
  }
  catch (error) { toast.error(error instanceof Error ? error.message : '领养申请提交失败，请稍后重试') }
  finally { submitting.value = false }
}

onMounted(() => {
  const catId = typeof route.query.catId === 'string' ? route.query.catId : '';
  void fetchTargetCat(catId);
  void Promise.all([
    typeApi.getColors(),
    typeApi.getLocations()])
    .then(([colors, locations]) => {
      colorOptions.value = colors;
      locationOptions.value = locations
    })
    .catch(() => undefined)
})
watch(() =>
  route.query.catId,
  (catId) => { void fetchTargetCat(typeof catId === 'string' ? catId : '') })
</script>

<template>
  <div class="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
    <main class="mx-auto max-w-6xl">
      <header class="flex items-start gap-3 border-b-2 border-black pb-5"><Button variant="outline" size="icon"
          class="shrink-0 border-2 border-black bg-white hover:bg-[#DDF8F2]" aria-label="返回上一页" @click="router.back()">
          <ArrowLeft class="size-4" />
        </Button>
        <div class="flex min-w-0 items-start gap-4"><span
            class="flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#5CD6C2] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <HeartHandshake class="size-6" />
          </span>
          <div>
            <p class="text-sm font-bold text-[#116B5E]">ADOPTION APPLICATION</p>
            <h1 class="mt-1 text-2xl font-black text-gray-950">申请领养</h1>
            <p class="mt-2 text-sm text-gray-600">确认你能提供稳定照顾后，提交一份完整的领养申请。</p>
          </div>
        </div>
      </header>
      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
        <form class="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]"
          @submit.prevent="submit">
          <div class="border-b-2 border-black bg-[#DDF8F2] px-5 py-3">
            <h2 class="text-sm font-black">申请信息</h2>
          </div>
          <div class="grid gap-7 p-5 sm:p-6">
            <section class="grid gap-2"><label class="text-sm font-black">领养对象</label>
              <CatPickerDialog v-model:open="catDialogOpen" title="选择要领养的猫咪" :is-selectable="isSelectableCat"
                :get-disabled-reason="getSelectionDisabledReason" @select="selectCat"><template #trigger><button
                    type="button"
                    class="flex min-h-16 w-full items-center justify-between gap-3 border-2 border-black bg-gray-50 px-4 text-left hover:bg-[#DDF8F2]"><span
                      v-if="targetCat" class="flex min-w-0 items-center gap-3"><img :src="targetCat.avatar"
                        :alt="targetCat.name" class="size-11 shrink-0 border-2 border-black object-cover"
                        :class="targetAdoptionUnavailableReason && 'grayscale opacity-60'" /><span
                        class="min-w-0"><strong class="block truncate">{{ targetCat.name }}</strong><span
                          class="block truncate text-xs text-gray-500">{{ targetColorLabel }} · {{ targetLocationLabel
                          }}</span></span></span><span v-else-if="catLoading"
                      class="text-sm text-gray-500">正在加载猫咪...</span><span v-else
                      class="text-sm text-gray-500">选择要申请领养的猫咪</span>
                    <ChevronRight class="size-5 shrink-0" />
                  </button></template>
              </CatPickerDialog>
              <p v-if="catError" class="text-sm text-red-700">{{ catError }}</p>
            </section>
            <section class="grid gap-3">
              <div class="flex items-center justify-between"><label class="text-sm font-black">居住情况</label><span
                  class="text-xs text-gray-500">请选择最符合的一项</span></div>
              <div class="grid gap-2 sm:grid-cols-2"><button v-for="option in housingOptions" :key="option.id"
                  type="button" class="flex min-h-14 items-center gap-3 border-2 px-4 text-left font-bold"
                  :class="form.housing === option.id ? 'border-black bg-[#DDF8F2] shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black'"
                  :aria-pressed="form.housing === option.id" @click="form.housing = option.id">
                  <component :is="option.icon" class="size-5" />{{ option.label }}
                </button></div>
            </section>
            <section class="grid gap-3"><label class="text-sm font-black">养猫经验</label>
              <div class="grid gap-2 sm:grid-cols-3"><button v-for="option in experienceOptions" :key="option.id"
                  type="button"
                  class="flex min-h-24 flex-col items-center justify-center gap-2 border-2 px-3 text-center text-sm font-bold"
                  :class="form.experience === option.id ? 'border-black bg-[#FFF8DE] shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black'"
                  :aria-pressed="form.experience === option.id" @click="form.experience = option.id">
                  <component :is="option.icon" class="size-6" />{{ option.label }}
                </button></div>
            </section><label class="grid gap-2" for="adoption-plan"><span
                class="text-sm font-black">喂养计划与经济情况</span><Textarea id="adoption-plan" v-model="form.plan" rows="6"
                maxlength="1000" placeholder="请说明你的日常喂养安排、居住稳定性和医疗支出计划。"
                class="resize-y border-2 border-black focus-visible:ring-[#5CD6C2]" /></label>
            <section class="grid gap-4 sm:grid-cols-2"><label class="grid gap-2" for="adoption-phone"><span
                  class="flex items-center gap-2 text-sm font-black">
                  <Phone class="size-4" />手机号码
                </span><Input id="adoption-phone" v-model="form.phone" inputmode="tel" maxlength="11"
                  placeholder="11 位手机号" class="border-2 border-black focus-visible:ring-[#5CD6C2]" /></label><label
                class="grid gap-2" for="adoption-wechat"><span class="flex items-center gap-2 text-sm font-black">
                  <MessageCircle class="size-4" />微信号
                </span><Input id="adoption-wechat" v-model="form.wechat" maxlength="100" placeholder="用于后续沟通"
                  class="border-2 border-black focus-visible:ring-[#5CD6C2]" /></label></section><label
              class="flex items-start gap-3 border-2 border-black bg-gray-50 p-4" for="adoption-agreement">
              <Checkbox id="adoption-agreement" v-model="form.agreement" class="mt-0.5 border-2 border-black" /><span
                class="text-sm leading-6 text-gray-700">我确认会为猫咪提供稳定住所、合理医疗和长期照顾；如情况变化，会及时联系管理人员。</span>
            </label>
          </div>
          <footer
            class="flex flex-col-reverse gap-3 border-t-2 border-black bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" class="border-2 border-black" :disabled="submitting"
              @click="router.back()">取消</Button><Button type="submit"
              class="border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
              :disabled="submitting || catLoading || !!targetAdoptionUnavailableReason">
              <HeartHandshake class="size-4" />{{ submitting ? '正在提交...' : targetAdoptionUnavailableReason || '提交领养申请'
              }}
            </Button>
          </footer>
        </form>
        <aside class="flex flex-col gap-5">
          <section class="border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <div class="border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
              <h2 class="text-sm font-black">猫咪信息</h2>
            </div>
            <div v-if="targetCat" class="p-5"><img :src="targetCat.avatar" :alt="targetCat.name"
                class="aspect-[4/3] w-full border-2 border-black object-cover"
                :class="targetAdoptionUnavailableReason && 'grayscale opacity-60'" />
              <h3 class="mt-4 text-lg font-black">{{ targetCat.name }}</h3>
              <dl class="mt-4 grid gap-3 text-sm">
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500">花色</dt>
                  <dd class="font-bold text-right">{{ targetColorLabel }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500">性别</dt>
                  <dd class="font-bold text-right">{{ GenderMap[targetCat.basicInfo.gender] }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500">健康状态</dt>
                  <dd class="font-bold text-right">{{ HealthStatusMap[targetCat.basicInfo.healthStatus] }}</dd>
                </div>
                <div class="flex justify-between gap-4">
                  <dt class="text-gray-500">常驻地点</dt>
                  <dd class="font-bold text-right">{{ targetLocationLabel }}</dd>
                </div>
              </dl>
            </div>
            <div v-else class="p-8 text-center text-sm text-gray-500">选择猫咪后显示档案信息</div>
          </section>
          <section class="border-2 border-black bg-[#FFF8DE] p-5">
            <h2 class="flex items-center gap-2 text-sm font-black">
              <CheckCircle2 class="size-5 text-[#8A5A00]" />领养承诺
            </h2>
            <ul class="mt-4 grid gap-3 text-sm leading-6 text-gray-700">
              <li>提供长期、稳定的居住环境</li>
              <li>承担日常喂养与必要医疗支出</li>
              <li>不因毕业、搬家等原因遗弃猫咪</li>
              <li>配合必要的回访与沟通</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  </div>
</template>
