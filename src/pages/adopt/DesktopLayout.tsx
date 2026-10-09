import { useEffect, useRef, useState, type ComponentType } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { catApi, typeApi } from '@pc/lib/api'
import { getCatAdoptionUnavailableReason, isCatAdoptable } from '@pc/lib/cat'
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'
import {
  AdoptionExperienceMap, AdoptionHousingMap, GenderMap, HealthStatusMap,
  type AdoptionExperience,
  type AdoptionHousing,
  type AdoptionParams,
  type CatDetail,
  type CatListItem,
  type TypeOption
} from '@pc/types'
import { Button } from '@pc/components/ui/button'
import { Checkbox } from '@pc/components/ui/checkbox'
import { Input } from '@pc/components/ui/input'
import { Textarea } from '@pc/components/ui/textarea'
import { CatPickerDialog } from '@pc/components/CatPickerDialog'
import { ArrowLeft, Building2, CheckCircle2, ChevronRight, HeartHandshake, Home, MessageCircle, PawPrint, Phone, School, Sprout, Users } from 'lucide-react'
import { clearDraft, readDraft, useDraftSnapshot } from '@shared/drafts'
import { invalidateRelatedQueries } from '@shared/mutationSync'

const housingOptions: Array<{ id: AdoptionHousing; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'OWN_HOUSE', label: AdoptionHousingMap.OWN_HOUSE, icon: Home },
  { id: 'RENT_WHOLE', label: AdoptionHousingMap.RENT_WHOLE, icon: Building2 },
  { id: 'RENT_SHARE', label: AdoptionHousingMap.RENT_SHARE, icon: Building2 },
  { id: 'DORM', label: AdoptionHousingMap.DORM, icon: School },
  { id: 'WITH_PARENT', label: AdoptionHousingMap.WITH_PARENT, icon: Users }
]

const experienceOptions: Array<{ id: AdoptionExperience; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: 'NEWBIE', label: AdoptionExperienceMap.NEWBIE, icon: Sprout },
  { id: 'EXPERIENCED', label: AdoptionExperienceMap.EXPERIENCED, icon: PawPrint },
  { id: 'MULTI_CAT', label: AdoptionExperienceMap.MULTI_CAT, icon: HeartHandshake }
]

export function DesktopLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [targetCat, setTargetCat] = useState<CatDetail | null>(null)
  const [catLoading, setCatLoading] = useState(false)
  const [catError, setCatError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const [form, setForm] = useState<{
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
      agreement: false,
      ...readDraft('adopt').values,
    })
  useDraftSnapshot('adopt', { ...form, ...(targetCat ? { catId: String(targetCat.id) } : {}) })

  const colorLabels = new Map(colorOptions.map((item) => [item.id, item.label]))

  const locationLabels = new Map(locationOptions.map((item) => [item.id, item.label]))

  const targetColorId = targetCat?.basicInfo.color
  const targetColorLabel = targetColorId === undefined ? '-' : colorLabels.get(targetColorId) || `花色 #${targetColorId}`

  const targetLocationId = targetCat?.basicInfo.hauntLocation
  const targetLocationLabel = targetLocationId == null ? '-' : locationLabels.get(targetLocationId) || `地点 #${targetLocationId}`

  const targetStatus = targetCat?.basicInfo.status
  const targetAdoptionUnavailableReason = targetStatus === undefined ? '' : getCatAdoptionUnavailableReason(targetStatus)

  const isSelectableCat = (cat: CatListItem) => isCatAdoptable(cat.status)
  const getSelectionDisabledReason = (cat: CatListItem) => getCatAdoptionUnavailableReason(cat.status)
  const fetchTargetCat = async (id: string) => {
    if (!id) { setTargetCat(null); setCatError(''); return };
    setCatLoading(true);
    setCatError('');
    try {
      const detail =
        await catApi.getCatDetail(id);
      setTargetCat(detail);
      setCatError(detail ? getCatAdoptionUnavailableReason(detail.basicInfo.status) : '')
    }
    catch (error) {
      setTargetCat(null);
      setCatError(error instanceof Error ? error.message : '无法加载指定猫咪');
      toast.error('无法加载指定猫咪，请重新选择')
    }
    finally {
      setCatLoading(false)
    }
  }

  const selectCat = async (cat: CatListItem) => {
    if (!isSelectableCat(cat)) { toast.warning(getSelectionDisabledReason(cat)); return };
    setCatDialogOpen(false);
    await fetchTargetCat(String(cat.id))
  }
  const submit = async () => {
    if (!targetCat?.id) return toast.warning('请先选择一只猫咪');
    if (targetAdoptionUnavailableReason) return toast.warning(targetAdoptionUnavailableReason);
    if (!form.housing) return toast.warning('请选择居住情况');
    if (!form.experience) return toast.warning('请选择养猫经验');
    if (form.plan.trim().length < 10) return toast.warning('喂养计划至少填写 10 个字');
    if (!/^1[3-9]\d{9}$/.test(form.phone)) return toast.warning('请输入有效的 11 位手机号');
    if (!form.wechat.trim()) return toast.warning('请输入微信号');
    if (!form.agreement) return toast.warning('请确认领养承诺');
    setSubmitting(true);
    try {
      const payload: AdoptionParams = {
        catId: String(targetCat.id),
        info: {
          housing: form.housing,
          experience: form.experience,
          plan: form.plan.trim()
        },
        contact:
        {
          phone: form.phone,
          wechat: form.wechat.trim()
        }
      };
      await catApi.submitAdoption(payload);
      void invalidateRelatedQueries('adoption')
      clearDraft('adopt')
      navigate('/my-adoptions')
    }
    catch (error) { toast.error(error instanceof Error ? error.message : '领养申请提交失败，请稍后重试') }
    finally { setSubmitting(false) }
  }

  // route.query.catId（string | null）
  const catIdQuery = new URLSearchParams(location.search).get('catId')
  const catSelectionInitialized = useRef(false)

  // 挂载时与 catId 变化时重新加载目标猫咪（对应 onMounted + watch）
  useEffect(() => {
    const selectedId = catSelectionInitialized.current ? catIdQuery : String(readDraft('adopt').values.catId || '') || catIdQuery
    catSelectionInitialized.current = true
    void fetchTargetCat(selectedId || '');
  }, [catIdQuery])

  useEffect(() => {
    void Promise.all([
      typeApi.getColors(),
      typeApi.getLocations()])
      .then(([colors, locations]) => {
        setColorOptions(colors);
        setLocationOptions(locations)
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
      <main className="mx-auto max-w-6xl">
        <header className="flex items-start gap-3 border-b-2 border-black pb-5"><Button variant="outline" size="icon"
            className="shrink-0 border-2 border-black bg-white hover:bg-[#DDF8F2]" aria-label="返回上一页" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex min-w-0 items-start gap-4"><span
            className="flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#5CD6C2] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <HeartHandshake className="size-6" />
          </span>
          <div>
            <p className="text-sm font-bold text-[#116B5E]">ADOPTION APPLICATION</p>
            <h1 className="mt-1 text-2xl font-black text-gray-950">申请领养</h1>
            <p className="mt-2 text-sm text-gray-600">确认你能提供稳定照顾后，提交一份完整的领养申请。</p>
          </div>
        </div>
        </header>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
          <form className="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]"
            onSubmit={(event) => { event.preventDefault(); void submit() }}>
            <div className="border-b-2 border-black bg-[#DDF8F2] px-5 py-3">
              <h2 className="text-sm font-black">申请信息</h2>
            </div>
            <div className="grid gap-7 p-5 sm:p-6">
              <section className="grid gap-2"><label className="text-sm font-black">领养对象</label>
                <CatPickerDialog open={catDialogOpen} onOpenChange={setCatDialogOpen} title="选择要领养的猫咪" isSelectable={isSelectableCat}
                  getDisabledReason={getSelectionDisabledReason} onSelect={selectCat} trigger={
                    <button
                      type="button"
                      className="flex min-h-16 w-full items-center justify-between gap-3 border-2 border-black bg-gray-50 px-4 text-left hover:bg-[#DDF8F2]">
                      {targetCat ? (
                        <span className="flex min-w-0 items-center gap-3"><img src={targetCat.avatar}
                          alt={targetCat.name} className={cn('size-11 shrink-0 border-2 border-black object-cover', targetAdoptionUnavailableReason && 'grayscale opacity-60')} /><span
                          className="min-w-0"><strong className="block truncate">{targetCat.name}</strong><span
                          className="block truncate text-xs text-gray-500">{targetColorLabel} · {targetLocationLabel
                          }</span></span></span>
                      ) : catLoading ? (
                        <span className="text-sm text-gray-500">正在加载猫咪...</span>
                      ) : (
                        <span className="text-sm text-gray-500">选择要申请领养的猫咪</span>
                      )}
                      <ChevronRight className="size-5 shrink-0" />
                    </button>
                  } />
                {catError && <p className="text-sm text-red-700">{catError}</p>}
              </section>
              <section className="grid gap-3">
                <div className="flex items-center justify-between"><label className="text-sm font-black">居住情况</label><span
                  className="text-xs text-gray-500">请选择最符合的一项</span></div>
                <div className="grid gap-2 sm:grid-cols-2">{housingOptions.map((option) => {
                  const Icon = option.icon
                  return <button key={option.id}
                    type="button" className={cn('flex min-h-14 items-center gap-3 border-2 px-4 text-left font-bold',
                      form.housing === option.id ? 'border-black bg-[#DDF8F2] shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black')}
                    aria-pressed={form.housing === option.id} onClick={() => setForm({ ...form, housing: option.id })}>
                    <Icon className="size-5" />{option.label}
                  </button>
                })}</div>
              </section>
              <section className="grid gap-3"><label className="text-sm font-black">养猫经验</label>
                <div className="grid gap-2 sm:grid-cols-3">{experienceOptions.map((option) => {
                  const Icon = option.icon
                  return <button key={option.id}
                    type="button"
                    className={cn('flex min-h-24 flex-col items-center justify-center gap-2 border-2 px-3 text-center text-sm font-bold',
                      form.experience === option.id ? 'border-black bg-[#FFF8DE] shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'border-gray-300 bg-white text-gray-700 hover:border-black')}
                    aria-pressed={form.experience === option.id} onClick={() => setForm({ ...form, experience: option.id })}>
                    <Icon className="size-6" />{option.label}
                  </button>
                })}</div>
              </section><label className="grid gap-2" htmlFor="adoption-plan"><span
                className="text-sm font-black">喂养计划与经济情况</span><Textarea id="adoption-plan" value={form.plan} rows={6}
                  maxLength={1000} placeholder="请说明你的日常喂养安排、居住稳定性和医疗支出计划。"
                  onChange={(event) => setForm({ ...form, plan: event.target.value })}
                  className="resize-y border-2 border-black focus-visible:ring-[#5CD6C2]" /></label>
              <section className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2" htmlFor="adoption-phone"><span
                  className="flex items-center gap-2 text-sm font-black">
                  <Phone className="size-4" />手机号码
                </span><Input id="adoption-phone" value={form.phone} inputMode="tel" maxLength={11}
                  placeholder="11 位手机号" className="border-2 border-black focus-visible:ring-[#5CD6C2]"
                  onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label
                className="grid gap-2" htmlFor="adoption-wechat"><span className="flex items-center gap-2 text-sm font-black">
                  <MessageCircle className="size-4" />微信号
                </span><Input id="adoption-wechat" value={form.wechat} maxLength={100} placeholder="用于后续沟通"
                  className="border-2 border-black focus-visible:ring-[#5CD6C2]"
                  onChange={(event) => setForm({ ...form, wechat: event.target.value })} /></label></section><label
              className="flex items-start gap-3 border-2 border-black bg-gray-50 p-4" htmlFor="adoption-agreement">
              <Checkbox id="adoption-agreement" checked={form.agreement}
                onCheckedChange={(checked) => setForm({ ...form, agreement: Boolean(checked) })}
                className="mt-0.5 border-2 border-black" /><span
                className="text-sm leading-6 text-gray-700">我确认会为猫咪提供稳定住所、合理医疗和长期照顾；如情况变化，会及时联系管理人员。</span>
            </label>
            </div>
            <footer
              className="flex flex-col-reverse gap-3 border-t-2 border-black bg-gray-50 px-5 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="border-2 border-black" disabled={submitting}
                onClick={() => navigate(-1)}>取消</Button><Button type="submit"
              className="border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
              disabled={submitting || catLoading || !!targetAdoptionUnavailableReason}>
                <HeartHandshake className="size-4" />{submitting ? '正在提交...' : targetAdoptionUnavailableReason || '提交领养申请'
              }
              </Button>
            </footer>
          </form>
          <aside className="flex flex-col gap-5">
            <section className="border-2 border-black bg-white shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
                <h2 className="text-sm font-black">猫咪信息</h2>
              </div>
              {targetCat && <div className="p-5"><img src={targetCat.avatar} alt={targetCat.name}
                className={cn('aspect-[4/3] w-full border-2 border-black object-cover', targetAdoptionUnavailableReason && 'grayscale opacity-60')} />
              <h3 className="mt-4 text-lg font-black">{targetCat.name}</h3>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">花色</dt>
                  <dd className="font-bold text-right">{targetColorLabel}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">性别</dt>
                  <dd className="font-bold text-right">{GenderMap[targetCat.basicInfo.gender]}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">健康状态</dt>
                  <dd className="font-bold text-right">{HealthStatusMap[targetCat.basicInfo.healthStatus]}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">常驻地点</dt>
                  <dd className="font-bold text-right">{targetLocationLabel}</dd>
                </div>
              </dl>
            </div>}
            {!targetCat && <div className="p-8 text-center text-sm text-gray-500">选择猫咪后显示档案信息</div>}
            </section>
            <section className="border-2 border-black bg-[#FFF8DE] p-5">
              <h2 className="flex items-center gap-2 text-sm font-black">
                <CheckCircle2 className="size-5 text-[#8A5A00]" />领养承诺
              </h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-gray-700">
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
  )
}
