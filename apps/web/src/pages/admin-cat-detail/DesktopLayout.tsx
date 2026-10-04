import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { catApi, typeApi } from '@pc/lib/api'
import {
  CampusMap, CatStatusMap, GenderMap, HealthStatusMap, type CatDetail, type TagTypeOption, type TypeOption
} from '@pc/types'
import { Button } from '@pc/components/ui/button'
import { AdminPageHeader } from '@pc/components/admin/AdminPageHeader'
import { AdminPanel } from '@pc/components/admin/AdminPanel'
import { ArrowLeft, Cat, MapPin } from 'lucide-react'

const attributeLabels: Record<keyof CatDetail['attributes'], string> = {
  friendliness: '亲人指数',
  gluttony: '贪吃指数',
  fight: '战斗力',
  appearance: '颜值'
}

const formatTime = (value?: string | null) => value ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '-'

export function DesktopLayout() {
  const { id } = useParams()
  const router = useNavigate()
  const [cat, setCat] = useState<CatDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const [roleOptions, setRoleOptions] = useState<TypeOption[]>([])
  const [tagOptions, setTagOptions] = useState<TagTypeOption[]>([])
  const colorLabel = colorOptions.find((item) => item.id === cat?.basicInfo.color)?.label || `花色 #${cat?.basicInfo.color ?? '-'}`
  const locationLabel = locationOptions.find((item) => item.id === cat?.basicInfo.hauntLocation)?.label || (cat?.basicInfo.hauntLocation == null ? '-' : `地点 #${cat.basicInfo.hauntLocation}`)
  const roleLabel = roleOptions.find((item) => item.id === cat?.basicInfo.role)?.label || `角色 #${cat?.basicInfo.role ?? '-'}`
  const tagLabel = (id: number) => tagOptions.find((item) => item.id === id)?.name || `标签 #${id}`

  const fetchDetail = async () => {
    setLoading(true)
    setError('')
    try {
      setCat(await catApi.getCatDetail(String(id)))
      const results = await Promise.allSettled([typeApi.getColors(), typeApi.getLocations(), typeApi.getRoles(), typeApi.getTags()])
      if (results[0].status === 'fulfilled') setColorOptions(results[0].value)
      if (results[1].status === 'fulfilled') setLocationOptions(results[1].value)
      if (results[2].status === 'fulfilled') setRoleOptions(results[2].value)
      if (results[3].status === 'fulfilled') setTagOptions(results[3].value)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '猫咪档案加载失败')
    } finally { setLoading(false) }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 意图为仅挂载执行 / 模拟 Vue watch
  useEffect(() => { void fetchDetail() }, [])

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader eyebrow="CAT ARCHIVE" title="猫咪档案详情" description="查看完整档案字段，不离开管理员工作台进入用户端页面。" icon={Cat} tone="mint"
        action={<Button variant="outline" className="border-2 border-black font-bold" onClick={() => router('/admin/cats')}><ArrowLeft className="size-4" />返回猫咪档案</Button>}
      />
      {loading ? (
        <div className="border-2 border-black bg-white p-10 text-center text-gray-500">正在加载猫咪档案...</div>
      ) : error ? (
        <div className="border-2 border-red-300 bg-red-50 p-10 text-center text-red-700">{error}</div>
      ) : cat ? (
        <>
          <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]"><img src={cat.avatar} alt={cat.name} className="aspect-square w-full border-2 border-black object-cover" /><h2 className="mt-4 text-2xl font-black">{cat.name}</h2><p className="mt-1 text-sm text-gray-500">{cat.aliases.join('、') || '暂无别名'}</p><span className="mt-4 inline-flex border-2 border-black bg-[#DDF8F2] px-2 py-1 text-sm font-bold">{CatStatusMap[cat.basicInfo.status]}</span></div>
            <AdminPanel title="基础与状态字段" meta="与管理员编辑档案对应"><dl className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"><div><dt className="text-xs text-gray-500">花色</dt><dd className="mt-1 font-bold">{colorLabel}</dd></div><div><dt className="text-xs text-gray-500">性别</dt><dd className="mt-1 font-bold">{GenderMap[cat.basicInfo.gender]}</dd></div><div><dt className="text-xs text-gray-500">校区</dt><dd className="mt-1 font-bold">{CampusMap[cat.basicInfo.campus] || `校区 #${cat.basicInfo.campus}`}</dd></div><div><dt className="text-xs text-gray-500">常驻地点</dt><dd className="mt-1 flex items-center gap-1 font-bold"><MapPin className="size-4" />{locationLabel}</dd></div><div><dt className="text-xs text-gray-500">角色</dt><dd className="mt-1 font-bold">{roleLabel}</dd></div><div><dt className="text-xs text-gray-500">健康状态</dt><dd className="mt-1 font-bold">{HealthStatusMap[cat.basicInfo.healthStatus]}</dd></div><div><dt className="text-xs text-gray-500">出生年份</dt><dd className="mt-1 font-bold">{cat.basicInfo.birthYear || '-'}</dd></div><div><dt className="text-xs text-gray-500">最后看见时间</dt><dd className="mt-1 font-bold">{formatTime(cat.basicInfo.lastSeenTime)}</dd></div><div><dt className="text-xs text-gray-500">入园时间</dt><dd className="mt-1 font-bold">{formatTime(cat.basicInfo.admissionDate)}</dd></div><div><dt className="text-xs text-gray-500">绝育</dt><dd className="mt-1 font-bold">{cat.basicInfo.neutered.isNeutered ? '已绝育' : '未绝育'}</dd></div><div><dt className="text-xs text-gray-500">人气值</dt><dd className="mt-1 font-bold">{cat.popularity}</dd></div></dl></AdminPanel>
          </section>
          <AdminPanel title="特征与描述"><div className="grid gap-5 p-5"><div className="flex flex-wrap gap-2">{cat.tags.map((tag) => <span key={tag} className="border-2 border-gray-300 bg-white px-3 py-1 text-sm font-bold">{tagLabel(tag)}</span>)}{!cat.tags.length ? <span className="text-sm text-gray-500">暂无标签</span> : null}</div><p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">{cat.description || '暂无描述'}</p><div className="grid gap-3 sm:grid-cols-4">{(Object.entries(cat.attributes) as Array<[keyof CatDetail['attributes'], number]>).map(([key, value]) => <div key={key} className="border-2 border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">{attributeLabels[key]}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}</div></div></AdminPanel>
          {cat.images?.length ? (
            <AdminPanel title="档案图片"><div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">{cat.images.map((image, index) => <img key={image + index} src={image} alt={`${cat.name}档案图片 ${index + 1}`} className="aspect-square w-full border-2 border-black object-cover" />)}</div></AdminPanel>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
