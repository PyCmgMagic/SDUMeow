import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { catApi, postApi, typeApi } from '@pc/lib/api';
import { getAccessToken } from '@pc/lib/auth'
import { getCatAdoptionUnavailableReason, isCatAdoptable } from '@pc/lib/cat'
import { MomentCard } from '@pc/components/MomentCard';
import { Button } from '@pc/components/ui/button';
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'
import {
    CampusMap,
    CatStatusMap,
    GenderMap,
    HealthStatusMap,
    type CatDetail,
    type PostItem,
    type Status,
    type TagTypeOption,
    type TypeOption
} from '@pc/types';
import warningIcon from '@pc/assets/icons/warning.svg'
import { CAT_METRIC_LABELS } from './shared'
import { Fish, Camera } from 'lucide-react'

export function DesktopLayout() {
const navigate = useNavigate();
const [postList, setPostList] = useState<PostItem[]>([]);
//数据
const [catDetail, setCatDetail] = useState<CatDetail | null>(null);
const catId = useParams().id as string;
const [loading, setLoading] = useState(true);
const [feedLoading, setFeedLoading] = useState(false);

const [loadingPosts, setLoadingPosts] = useState(false)
const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
const [roleOptions, setRoleOptions] = useState<TypeOption[]>([])
const [tagOptions, setTagOptions] = useState<TagTypeOption[]>([])

const statusMap: Record<Status, { label: string; color: string; dot: string }> = {
    0: { label: CatStatusMap[0], color: 'bg-green-100 text-green-600', dot: 'bg-green-500' },
    1: { label: CatStatusMap[1], color: 'bg-blue-100 text-blue-600', dot: 'bg-blue-500' },
    2: { label: CatStatusMap[2], color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-500' },
    3: { label: CatStatusMap[3], color: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    4: { label: CatStatusMap[4], color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
}

//计算当前状态标签函数
const currentStatus = catDetail
    ? statusMap[catDetail.basicInfo.status]
    : { label: '未知', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-500' };

const optionMap = (options: TypeOption[]) => new Map(options.map((item) => [item.id, item.label]))
const colorLabels = optionMap(colorOptions)
const locationLabels = optionMap(locationOptions)
const roleLabels = optionMap(roleOptions)
const tagLabels = new Map(tagOptions.map((item) => [item.id, item.name]))
const colorLabel = (() => {
    const id = catDetail?.basicInfo.color
    return id === undefined ? '未知' : colorLabels.get(id) || `花色 #${id}`
})()
const locationLabel = (() => {
    const id = catDetail?.basicInfo.hauntLocation
    return id == null ? '未知' : locationLabels.get(id) || `地点 #${id}`
})()
const roleLabel = (() => {
    const id = catDetail?.basicInfo.role
    return id === undefined ? '未知' : roleLabels.get(id) || `角色 #${id}`
})()
const tagLabel = (() => {
    const tags = catDetail?.tags || []
    if (!tags.length) return '暂无标签'
    return tags.map((id) => tagLabels.get(id) || `标签 #${id}`).join('、')
})()
const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '暂无记录'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date)
}
const adoptionUnavailableReason = (() => {
    const status = catDetail?.basicInfo.status
    return status === undefined ? '' : getCatAdoptionUnavailableReason(status)
})()
const canAdopt = (() => {
    const status = catDetail?.basicInfo.status
    return status !== undefined && isCatAdoptable(status)
})()

//计算指数标签函数
const displayAttributes = [
    {
        label: CAT_METRIC_LABELS.friendliness,
        value: catDetail?.attributes.friendliness || 0,
        colorClasss: 'bg-blue-400'
    },
    {
        label: CAT_METRIC_LABELS.gluttony,
        value: catDetail?.attributes.gluttony || 0,
        colorClasss: 'bg-yellow-400'

    },
    {
        label: CAT_METRIC_LABELS.fight,
        value: catDetail?.attributes.fight || 0,
        colorClasss: 'bg-red-400'
    },
    {
        label: CAT_METRIC_LABELS.appearance,
        value: catDetail?.attributes.appearance || 0,
        colorClasss: 'bg-green-400',

    }
]

const fetchCatDetail = async () => {
    setLoading(true);
    try {
        const data = await catApi.getCatDetail(catId);
        if (data) {
            setCatDetail(data);
        }
    } catch (error) {
        console.error('请求猫咪详情失败:', error);
    } finally {
        setLoading(false);
    }
}

const fetchTypeOptions = async () => {
    const results = await Promise.allSettled([
        typeApi.getColors(),
        typeApi.getLocations(),
        typeApi.getRoles(),
        typeApi.getTags()
    ])
    if (results[0].status === 'fulfilled') setColorOptions(results[0].value)
    if (results[1].status === 'fulfilled') setLocationOptions(results[1].value)
    if (results[2].status === 'fulfilled') setRoleOptions(results[2].value)
    if (results[3].status === 'fulfilled') setTagOptions(results[3].value)
}

const fetchPosts = async () => {
    if (!catId) return;
    setLoadingPosts(true);
    try {
        const res = await postApi.getPosts({
            page: 1,
            pageSize: 20,
            catId: catId
        })
        setPostList(res.items || [])
    }
    catch (error) {
        console.error('请求动态列表失败:', error)
        toast.error('获取动态列表失败，请稍后再试')
        setPostList([])
    } finally {
        setLoadingPosts(false);
    }
}

const handlePostDeleted = (postId: string) => {
    setPostList((prev) => prev.filter((item) => item.id !== postId))
}
// 检查登录状态并跳转领养页
const handleAdopt = () => {
    if (!catDetail || !canAdopt) {
        if (adoptionUnavailableReason) toast.warning(adoptionUnavailableReason)
        return
    }
    if (!getAccessToken()) {
        toast.warning('请先登录')
        navigate('/login')
        return
    }
    navigate(`/adopt?catId=${catDetail.id}`)
}

// 投喂猫咪（带登录守卫）
const handleFeed = async () => {
    if (!getAccessToken()) {
        toast.warning('请先登录')
        navigate('/login')
        return
    }
    if (feedLoading) return
    setFeedLoading(true)
    try {
        const res = await catApi.feedCat(catId)
        toast.success(`投喂成功！剩余猫粮: ${res?.userCurrency ?? '--'}`)
    } catch (error) {
        const msg = error instanceof Error ? error.message : '投喂失败'
        toast.error(msg)
    } finally {
        setFeedLoading(false)
    }
}

// 跳转发布动态页（带登录守卫）
const handlePostMoment = () => {
    if (!getAccessToken()) {
        toast.warning('请先登录')
        navigate('/login')
        return
    }
    const id = catDetail?.id
    navigate(id ? `/publish?catId=${id}` : '/publish')
}

useEffect(() => {
    fetchCatDetail();
    fetchPosts();
    void fetchTypeOptions();
// eslint-disable-next-line react-hooks/exhaustive-deps -- 意图为仅挂载执行 / 模拟 Vue watch
}, []);

return (
    <div className="public-page flex min-h-full w-full flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-[3.7fr_1fr] gap-6 items-start overflow-hidden">
            {loading ? (
                <div className="p-10 text-center text-gray-400">
                    <div className="animate-spin text-4xl mb-3">🌀</div>
                    正在赶来喵...🐱
                </div>
            ) : !catDetail ? (
                <div className="p-10 text-center text-red-500">
                    <div className="text-4xl mb-3">❌</div>
                    抱歉，找不到了喵😿。
                </div>
            ) : (
            /*详情内容*/
            <div className="flex flex-col lg:flex-col rounded-lg shadow-md md:flex-row ">
                <div className="relative w-full aspect-[2.5/1] bg-gray-100 overflow-hidden">
                    <img src={catDetail.images[0] || catDetail.avatar} alt="Cat Image"
                        className="w-full p-0 h-max-[300px] object-contain rounded-lg shadow-md" />
                </div>
                <div
                    className="flex items-start relative bg-slate-50 gap-3 px-2 py-4 rounded-lg border border-b border-gray-200 shadow-sm">
                    {catDetail.images.map((image, index) => (
                        <div key={index}
                            className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shadow-md">
                            <img src={image} alt="Cat Image" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
                <div
                    className="flex flex-col mt-3 w-full  border border-b border-gray-200 bg-slate-50 shadow-sm rounded-lg ">
                    <div className="py-4 flex flex-auto  items-cneter">
                        <h3 className="text-xl font-bold  text-black px-3">{catDetail.name}</h3>
                        <span className={cn('flex  items-cneter justify-center mt-1  shadow-sm rounded-md border  w-5.9 h-6 ',
                            catDetail.basicInfo.gender === 1 ? 'text-blue-600 bg-blue-100' : 'text-pink-600 bg-pink-100')}>
                            {catDetail.basicInfo.gender === 1 ? '♂ ' : catDetail.basicInfo.gender === 2 ? '♀ ' : '?'}

                        </span>
                        {catDetail.aliases.length ? (
                            <span
                                className="ml-auto mr-3 text-xl font-medium text-[#0288D1] w-fit px-2 bg-[#E1F5FE] shadow-sm border rounded-md ">
                                ({catDetail.aliases.join(', ')})
                            </span>
                        ) : null}
                    </div>
                    <span className={cn('px-2 py-1 w-fit ml-3 -mt-2 rounded-full text-sm font-bold text-gray-300 shadow-sm',
                        currentStatus.color)}>
                        {currentStatus.label}
                    </span>
                    <div className="grid grid-cols-2 gap-6 main-w-full text-lg bg-white text-gray-700 mr-3 mt-4 mb-4 ml-3">
                        <div
                            className="flex flex-col rounded-xl border-2 p-3 gap-2  bg-gray-100 shadow-md border-purple-400">
                            <span className="text-xs text-gray-500 ">学历/编制</span>
                            <span className="font-bold ">{roleLabel}</span>
                        </div>
                        <div
                            className="flex flex-col rounded-xl border-2 p-3 gap-2  bg-gray-100 shadow-md border-purple-400 ">
                            <span className="text-xs text-gray-500 ">常驻地点</span>
                            <span className="font-bold ">{locationLabel}</span>
                        </div>
                        <div
                            className="flex flex-col rounded-xl border-2 p-3 gap-2  bg-gray-100 shadow-md border-purple-400 ">
                            <span className="text-xs text-gray-500 ">最后看见时间</span>
                            <span className="font-bold ">{formatDateTime(catDetail.basicInfo.lastSeenTime)}</span>
                        </div>
                        <div
                            className="flex flex-col rounded-xl border-2 p-3 gap-2  bg-gray-100 shadow-md border-purple-400 ">
                            <span className="text-xs text-gray-500 ">性格特点</span>
                            <span className="font-bold ">{tagLabel}</span>
                        </div>
                    </div>
                </div>
                <div
                    className="flex flex-col mt-3 mb-2 w-full  border border-b border-gray-200 bg-slate-50 shadow-sm rounded-lg">
                    <h4 className="flex items-center justify-between p-3 mt-2 text-black font-bold text-lg ">猫格属性</h4>
                    <div className="space-y-5 p-3 mt-2">
                        {displayAttributes.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <span className="text-sm font-medium text-gray-600 w-20 shrink-0">
                                    {item.label}
                                </span>
                                {/*进度条*/}
                                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={cn('h-full rounded-full transition-all duration-500 ease-out', item.colorClasss)}
                                        style={{ width: `${item.value * 10}%` }}>
                                    </div>
                                </div>
                                {/*右侧数值*/}
                                <span className="text-sm font-bold text-gray-500 w-8 text-tight shrink-0">
                                    {item.value.toFixed(1)}
                                </span>
                            </div>
                        ))}

                    </div>
                    <div
                        className="flex items-center main-w text-sm font-bold border-2 border-[#FFCDD2] bg-[#FFEBEE] text-[#C62828] text-right rounded-lg h-fit mt-2 ml-3 mr-3 mb-4 p-2">
                        <img src={warningIcon} alt="warning" className="gap-2 h-3 w-3 mr-2" />
                        <span>{catDetail.description}</span>

                    </div>




                </div>
                {/* 最新动态区域  */}
                <div className="w-full max-w-6xl">

                    {/* 标题栏 */}
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-[#F3B72E] pl-3">
                            最新动态
                        </h2>
                    </div>

                    {/* Loading */}
                    {loadingPosts ? (
                        <div className="py-12 text-center text-gray-400">
                            <div className="animate-spin text-2xl mb-2">🌀</div>
                            加载动态中...
                        </div>
                    ) : postList.length === 0 ? (
                    /* 空状态 (No Data) */
                        <div
                            className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-4">
                                🛋️
                            </div>
                            <h3 className="text-lg font-bold text-gray-600">暂无动态</h3>
                            <p className="text-sm text-gray-400 mb-6">这里空空如也，快去抢沙发吧！</p>
                        </div>
                    ) : (
                    /* 动态列表 (瀑布流/网格) */
                    /* 使用 Masonry 或者简单的 columns 布局 */
                        <div className="columns-1  gap-6 space-y-6 break-inside-avoid mb-6">
                            {/*
           class="break-inside-avoid": 防止卡片被瀑布流切断

        */}
                            {postList.map((item) => (
                                <div key={item.id} className="break-inside-avoid mb-6">
                                    <MomentCard data={item} onDeleted={handlePostDeleted} />
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>
            )}





            <aside className="flex flex-col gap-6">
                {/* 投喂与发动态区域 */}
                <div className="w-full rounded-xl bg-gradient-to-br from-[#F3B72E] to-[#f5c957] p-5 shadow-md max-w-sm">
                    <h3 className="text-xl font-bold text-white mb-1">喜欢{catDetail?.name || '这只猫咪'}吗？</h3>
                    <p className="text-white/80 text-sm mb-4">投喂可以增加亲密度，让小猫咪记住你</p>
                    <div className="flex gap-3">
                        <Button
                            className="flex-1 h-12 bg-white hover:bg-gray-50 text-[#F3B72E] font-bold rounded-xl shadow"
                            disabled={feedLoading}
                            onClick={() => void handleFeed()}>
                            <Fish className="w-5 h-5 mr-2" />
                            {feedLoading ? '投喂中...' : '投喂'}
                        </Button>
                        <Button
                            className="flex-1 h-12 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl border-2 border-white/50"
                            onClick={handlePostMoment}>
                            <Camera className="w-5 h-5 mr-2" />
                            发动态
                        </Button>
                    </div>
                </div>

                <div className="w-full h-screen rounded-sm z-10 border border-b bg-white p-4  justify-between max-w-sm">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 w-full ">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">详细信息</h3>
                        {catDetail ? (
                            <div className="divide-y divide-gray-300 divide-solid">
                                <div className="py-4 flex justify-between">
                                    <span className="text-gray-600">花色:</span>
                                    <span className="font-sm text-gray-800">{colorLabel}</span>
                                </div>
                                <div className="py-4 flex justify-between">
                                    <span className="text-gray-600">性别:</span>
                                    <span className="font-sm text-gray-800">{GenderMap[catDetail.basicInfo.gender]}</span>
                                </div>
                                <div className="py-4 flex justify-between">
                                    <span className="text-gray-600">校区:</span>
                                    <span className="font-sm text-gray-800">{CampusMap[catDetail.basicInfo.campus]}</span>
                                </div>
                                <div className="py-4 flex justify-between">
                                    <span className="text-gray-600">绝育状态:</span>
                                    <span className="font-sm text-gray-800">{catDetail.basicInfo.neutered?.isNeutered ? '已绝育' : '未绝育'}</span>
                                </div>
                                {catDetail.basicInfo.neutered?.date ? (
                                    <div className="py-4 flex justify-between">
                                        <span className="text-gray-600">绝育日期:</span>
                                        <span className="font-sm text-gray-800">{catDetail.basicInfo.neutered.date}</span>
                                    </div>
                                ) : null}
                                <div className="py-4 flex justify-between">
                                    <span className="text-gray-600">健康状况:</span>
                                    <span className="font-sm text-gray-800">{HealthStatusMap[catDetail.basicInfo.healthStatus]}</span>
                                </div>
                                <div className="py-4 flex justify-between">
                                    <span className="text-gray-600">常驻地:</span>
                                    <span className="font-sm text-gray-800">{locationLabel}</span>
                                </div>
                                <div className="py-4 flex justify-between">
                                    <span className="text-gray-600">人气值:</span>
                                    <span className="font-sm text-gray-800">{catDetail.popularity ?? 0}</span>
                                </div>
                            </div>
                        ) : null}

                    </div>
                    <div className="flex justify-end mt-4">
                        <Button
                            className="flex-1 h-12 text-lg font-bold bg-[#F3B72E] hover:bg-[#e0a82e] text-black shadow-md rounded-xl"
                            disabled={!canAdopt}
                            title={adoptionUnavailableReason || '申请领养此猫'}
                            onClick={handleAdopt}>
                            <span className="mr-2"></span> {adoptionUnavailableReason || '申请领养此猫'}
                        </Button>

                    </div>
                </div>
            </aside>
        </div>

    </div>
)
}
