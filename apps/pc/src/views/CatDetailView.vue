<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { catApi, postApi, typeApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth'
import { getCatAdoptionUnavailableReason, isCatAdoptable } from '@/lib/cat'
import { useRoute, useRouter } from 'vue-router';
import MomentCard from '@/components/MomentCard.vue';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast'
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
} from '@/types';
import warningIcon from '@/assets/icons/warning.svg'
import { Fish, Camera } from 'lucide-vue-next'

const route = useRoute();
const router = useRouter();
const postList = ref<PostItem[]>([]);
//数据
const catDetail = ref<CatDetail | null>(null);
const catId = route.params.id as string;
const loading = ref(true);
const feedLoading = ref(false);

const loadingPosts = ref(false)
const colorOptions = ref<TypeOption[]>([])
const locationOptions = ref<TypeOption[]>([])
const roleOptions = ref<TypeOption[]>([])
const tagOptions = ref<TagTypeOption[]>([])

const statusMap: Record<Status, { label: string; color: string; dot: string }> = {
    0: { label: CatStatusMap[0], color: 'bg-green-100 text-green-600', dot: 'bg-green-500' },
    1: { label: CatStatusMap[1], color: 'bg-blue-100 text-blue-600', dot: 'bg-blue-500' },
    2: { label: CatStatusMap[2], color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-500' },
    3: { label: CatStatusMap[3], color: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
    4: { label: CatStatusMap[4], color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
}

//计算当前状态标签函数
const currentStatus = computed(() => {
    if (!catDetail.value) return { label: '未知', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-500' };
    return statusMap[catDetail.value.basicInfo.status];
});

const optionMap = (options: TypeOption[]) => new Map(options.map((item) => [item.id, item.label]))
const colorLabels = computed(() => optionMap(colorOptions.value))
const locationLabels = computed(() => optionMap(locationOptions.value))
const roleLabels = computed(() => optionMap(roleOptions.value))
const tagLabels = computed(() => new Map(tagOptions.value.map((item) => [item.id, item.name])))
const colorLabel = computed(() => {
    const id = catDetail.value?.basicInfo.color
    return id === undefined ? '未知' : colorLabels.value.get(id) || `花色 #${id}`
})
const locationLabel = computed(() => {
    const id = catDetail.value?.basicInfo.hauntLocation
    return id == null ? '未知' : locationLabels.value.get(id) || `地点 #${id}`
})
const roleLabel = computed(() => {
    const id = catDetail.value?.basicInfo.role
    return id === undefined ? '未知' : roleLabels.value.get(id) || `角色 #${id}`
})
const tagLabel = computed(() => {
    const tags = catDetail.value?.tags || []
    if (!tags.length) return '暂无标签'
    return tags.map((id) => tagLabels.value.get(id) || `标签 #${id}`).join('、')
})
const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '暂无记录'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date)
}
const adoptionUnavailableReason = computed(() => {
    const status = catDetail.value?.basicInfo.status
    return status === undefined ? '' : getCatAdoptionUnavailableReason(status)
})
const canAdopt = computed(() => {
    const status = catDetail.value?.basicInfo.status
    return status !== undefined && isCatAdoptable(status)
})

//计算指数标签函数
const displayAttributes = computed(() => [
    {
        label: '亲人指数',
        value: catDetail.value?.attributes.friendliness || 0,
        colorClasss: 'bg-blue-400'
    },
    {
        label: '贪吃指数',
        value: catDetail.value?.attributes.gluttony || 0,
        colorClasss: 'bg-yellow-400'

    },
    {
        label: '战斗力',
        value: catDetail.value?.attributes.fight || 0,
        colorClasss: 'bg-red-400'
    },
    {
        label: '颜值',
        value: catDetail.value?.attributes.appearance || 0,
        colorClasss: 'bg-green-400',

    }
])

const fetchCatDetail = async () => {
    loading.value = true;
    try {
        const data = await catApi.getCatDetail(catId);
        if (data) {
            catDetail.value = data;
        }
    } catch (error) {
        console.error('请求猫咪详情失败:', error);
    } finally {
        loading.value = false;
    }
}

const fetchTypeOptions = async () => {
    const results = await Promise.allSettled([
        typeApi.getColors(),
        typeApi.getLocations(),
        typeApi.getRoles(),
        typeApi.getTags()
    ])
    if (results[0].status === 'fulfilled') colorOptions.value = results[0].value
    if (results[1].status === 'fulfilled') locationOptions.value = results[1].value
    if (results[2].status === 'fulfilled') roleOptions.value = results[2].value
    if (results[3].status === 'fulfilled') tagOptions.value = results[3].value
}

const fetchPosts = async () => {
    if (!catId) return;
    loadingPosts.value = true;
    try {
        const res = await postApi.getPosts({
            page: 1,
            pageSize: 20,
            catId: catId
        })
        postList.value = res.items || []
    }
    catch (error) {
        console.error('请求动态列表失败:', error)
        toast.error('获取动态列表失败，请稍后再试')
        postList.value = []
    } finally {
        loadingPosts.value = false;
    }
}

const handlePostDeleted = (postId: string) => {
    postList.value = postList.value.filter((item) => item.id !== postId)
}
// 检查登录状态并跳转领养页
const handleAdopt = () => {
    if (!catDetail.value || !canAdopt.value) {
        if (adoptionUnavailableReason.value) toast.warning(adoptionUnavailableReason.value)
        return
    }
    if (!getAccessToken()) {
        toast.warning('请先登录')
        router.push({ name: 'login' })
        return
    }
    router.push({ name: 'adopt', query: { catId: catDetail.value?.id } })
}

// 投喂猫咪（带登录守卫）
const handleFeed = async () => {
    if (!getAccessToken()) {
        toast.warning('请先登录')
        router.push({ name: 'login' })
        return
    }
    if (feedLoading.value) return
    feedLoading.value = true
    try {
        const res = await catApi.feedCat(catId)
        toast.success(`投喂成功！剩余猫粮: ${res?.userCurrency ?? '--'}`)
    } catch (error) {
        const msg = error instanceof Error ? error.message : '投喂失败'
        toast.error(msg)
    } finally {
        feedLoading.value = false
    }
}

// 跳转发布动态页（带登录守卫）
const handlePostMoment = () => {
    if (!getAccessToken()) {
        toast.warning('请先登录')
        router.push({ name: 'login' })
        return
    }
    router.push({ name: 'post-moment', query: { catId: catDetail.value?.id } })
}

onMounted(() => {
    fetchCatDetail();
    fetchPosts();
    void fetchTypeOptions();
});

</script>

<template>
    <div class="public-page flex min-h-full w-full flex-col">
        <div class="grid grid-cols-1 lg:grid-cols-[3.7fr_1fr] gap-6 items-start overflow-hidden">
            <div v-if="loading" class="p-10 text-center text-gray-400">
                <div class="animate-spin text-4xl mb-3">🌀</div>
                正在赶来喵...🐱
            </div>
            <div v-else-if="!catDetail" class="p-10 text-center text-red-500">
                <div class="text-4xl mb-3">❌</div>
                抱歉，找不到了喵😿。
            </div>
            <!--详情内容-->
            <div v-else class="flex flex-col lg:flex-col rounded-lg shadow-md md:flex-row ">
                <div class="relative w-full aspect-[2.5/1] bg-gray-100 overflow-hidden">
                    <img :src="catDetail.images[0] || catDetail.avatar" alt="Cat Image"
                        class="w-full p-0 h-max-[300px] object-contain rounded-lg shadow-md" />
                </div>
                <div
                    class="flex items-start relative bg-slate-50 gap-3 px-2 py-4 rounded-lg border border-b border-gray-200 shadow-sm">
                    <div v-for="(image, index) in catDetail.images" :key="index"
                        class="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shadow-md">
                        <img :src="image" alt="Cat Image" class="w-full h-full object-cover" />
                    </div>
                </div>
                <div
                    class="flex flex-col mt-3 w-full  border border-b border-gray-200 bg-slate-50 shadow-sm rounded-lg ">
                    <div class="py-4 flex flex-auto  items-cneter">
                        <h3 class="text-xl font-bold  text-black px-3">{{ catDetail.name }}</h3>
                        <span class="flex  items-cneter justify-center mt-1  shadow-sm rounded-md border  w-5.9 h-6 "
                            :class="catDetail.basicInfo.gender === 1 ? 'text-blue-600 bg-blue-100' : 'text-pink-600 bg-pink-100'">
                            {{
                                catDetail.basicInfo.gender === 1 ? '♂ ' : catDetail.basicInfo.gender === 2 ? '♀ ' : '?' }}

                        </span>
                        <span v-if="catDetail.aliases.length"
                            class="ml-auto mr-3 text-xl font-medium text-[#0288D1] w-fit px-2 bg-[#E1F5FE] shadow-sm border rounded-md ">
                            ({{ catDetail.aliases.join(', ') }})
                        </span>
                    </div>
                    <span class="px-2 py-1 w-fit ml-3 -mt-2 rounded-full text-sm font-bold text-gray-300 shadow-sm"
                        :class="currentStatus.color">
                        {{ currentStatus.label }}
                    </span>
                    <div class="grid grid-cols-2 gap-6 main-w-full text-lg bg-white text-gray-700 mr-3 mt-4 mb-4 ml-3">
                        <div
                            class="flex flex-col rounded-xl border-2 p-3 gap-2  bg-gray-100 shadow-md border-purple-400">
                            <span class="text-xs text-gray-500 ">学历/编制</span>
                            <span class="font-bold ">{{ roleLabel }}</span>
                        </div>
                        <div
                            class="flex flex-col rounded-xl border-2 p-3 gap-2  bg-gray-100 shadow-md border-purple-400 ">
                            <span class="text-xs text-gray-500 ">常驻地点</span>
                            <span class="font-bold ">{{ locationLabel }}</span>
                        </div>
                        <div
                            class="flex flex-col rounded-xl border-2 p-3 gap-2  bg-gray-100 shadow-md border-purple-400 ">
                            <span class="text-xs text-gray-500 ">最后看见时间</span>
                            <span class="font-bold ">{{ formatDateTime(catDetail.basicInfo.lastSeenTime) }}</span>
                        </div>
                        <div
                            class="flex flex-col rounded-xl border-2 p-3 gap-2  bg-gray-100 shadow-md border-purple-400 ">
                            <span class="text-xs text-gray-500 ">性格特点</span>
                            <span class="font-bold ">{{ tagLabel }}</span>
                        </div>
                    </div>
                </div>
                <div
                    class="flex flex-col mt-3 mb-2 w-full  border border-b border-gray-200 bg-slate-50 shadow-sm rounded-lg">
                    <h4 class="flex items-center justify-between p-3 mt-2 text-black font-bold text-lg ">猫格属性</h4>
                    <div class="space-y-5 p-3 mt-2">
                        <div v-for="(item, index) in displayAttributes" :key="index" class="flex items-center gap-4">
                            <span class="text-sm font-medium text-gray-600 w-20 shrink-0">
                                {{ item.label }}
                            </span>
                            <!--进度条-->
                            <div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div class="h-full rounded-full transition-all duration-500 ease-out"
                                    :class="item.colorClasss" :style="{ width: (item.value * 10) + '%' }">
                                </div>
                            </div>
                            <!--右侧数值-->
                            <span class="text-sm font-bold text-gray-500 w-8 text-tight shrink-0">
                                {{ item.value.toFixed(1) }}
                            </span>
                        </div>

                    </div>
                    <div
                        class="flex items-center main-w text-sm font-bold border-2 border-[#FFCDD2] bg-[#FFEBEE] text-[#C62828] text-right rounded-lg h-fit mt-2 ml-3 mr-3 mb-4 p-2">
                        <img :src="warningIcon" alt="warning" class="gap-2 h-3 w-3 mr-2">
                        <span>{{ catDetail.description }}</span>

                    </div>



                </div>
                <!-- 最新动态区域  -->
                <div class="w-full max-w-6xl">

                    <!-- 标题栏 -->
                    <div class="flex items-center justify-between mb-6 px-2">
                        <h2 class="text-2xl font-bold text-gray-800 border-l-4 border-[#F3B72E] pl-3">
                            最新动态
                        </h2>
                    </div>

                    <!-- Loading -->
                    <div v-if="loadingPosts" class="py-12 text-center text-gray-400">
                        <div class="animate-spin text-2xl mb-2">🌀</div>
                        加载动态中...
                    </div>

                    <!-- 空状态 (No Data) -->
                    <div v-else-if="postList.length === 0"
                        class="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                        <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-4xl mb-4">
                            🛋️
                        </div>
                        <h3 class="text-lg font-bold text-gray-600">暂无动态</h3>
                        <p class="text-sm text-gray-400 mb-6">这里空空如也，快去抢沙发吧！</p>
                    </div>

                    <!-- 动态列表 (瀑布流/网格) -->
                    <!-- 使用 Masonry 或者简单的 columns 布局 -->
                    <div v-else class="columns-1  gap-6 space-y-6 break-inside-avoid mb-6">
                        <!-- 
           class="break-inside-avoid": 防止卡片被瀑布流切断 
           
        -->
                        <div v-for="item in postList" :key="item.id" class="break-inside-avoid mb-6">
                            <MomentCard :data="item" @deleted="handlePostDeleted" />
                        </div>
                    </div>

                </div>
            </div>





            <aside class="flex flex-col gap-6">
                <!-- 投喂与发动态区域 -->
                <div class="w-full rounded-xl bg-gradient-to-br from-[#F3B72E] to-[#f5c957] p-5 shadow-md max-w-sm">
                    <h3 class="text-xl font-bold text-white mb-1">喜欢{{ catDetail?.name || '这只猫咪' }}吗？</h3>
                    <p class="text-white/80 text-sm mb-4">投喂可以增加亲密度，让小猫咪记住你</p>
                    <div class="flex gap-3">
                        <Button
                            class="flex-1 h-12 bg-white hover:bg-gray-50 text-[#F3B72E] font-bold rounded-xl shadow"
                            :disabled="feedLoading"
                            @click="handleFeed">
                            <Fish class="w-5 h-5 mr-2" />
                            {{ feedLoading ? '投喂中...' : '投喂' }}
                        </Button>
                        <Button
                            class="flex-1 h-12 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl border-2 border-white/50"
                            @click="handlePostMoment">
                            <Camera class="w-5 h-5 mr-2" />
                            发动态
                        </Button>
                    </div>
                </div>

                <div class="w-full h-screen rounded-sm z-10 border border-b bg-white p-4  justify-between max-w-sm">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 w-full ">
                        <h3 class="text-lg font-bold text-gray-900 mb-2">详细信息</h3>
                        <div v-if="catDetail" class="divide-y divide-gray-300 divide-solid">
                            <div class="py-4 flex justify-between">
                                <span class="text-gray-600">花色:</span>
                                <span class="font-sm text-gray-800">{{ colorLabel }}</span>
                            </div>
                            <div class="py-4 flex justify-between">
                                <span class="text-gray-600">性别:</span>
                                <span class="font-sm text-gray-800">{{ GenderMap[catDetail.basicInfo.gender] }}</span>
                            </div>
                            <div class="py-4 flex justify-between">
                                <span class="text-gray-600">校区:</span>
                                <span class="font-sm text-gray-800">{{ CampusMap[catDetail.basicInfo.campus] }}</span>
                            </div>
                            <div class="py-4 flex justify-between">
                                <span class="text-gray-600">绝育状态:</span>
                                <span class="font-sm text-gray-800">{{ catDetail.basicInfo.neutered?.isNeutered ? '已绝育' : '未绝育' }}</span>
                            </div>
                            <div v-if="catDetail.basicInfo.neutered?.date" class="py-4 flex justify-between">
                                <span class="text-gray-600">绝育日期:</span>
                                <span class="font-sm text-gray-800">{{ catDetail.basicInfo.neutered.date }}</span>
                            </div>
                            <div class="py-4 flex justify-between">
                                <span class="text-gray-600">健康状况:</span>
                                <span class="font-sm text-gray-800">{{ HealthStatusMap[catDetail.basicInfo.healthStatus] }}</span>
                            </div>
                            <div class="py-4 flex justify-between">
                                <span class="text-gray-600">常驻地:</span>
                                <span class="font-sm text-gray-800">{{ locationLabel }}</span>
                            </div>
                            <div class="py-4 flex justify-between">
                                <span class="text-gray-600">人气值:</span>
                                <span class="font-sm text-gray-800">{{ catDetail.popularity ?? 0 }}</span>
                            </div>
                        </div>

                    </div>
                    <div class="flex justify-end mt-4">
                        <Button
                            class="flex-1 h-12 text-lg font-bold bg-[#F3B72E] hover:bg-[#e0a82e] text-black shadow-md rounded-xl"
                            :disabled="!canAdopt"
                            :title="adoptionUnavailableReason || '申请领养此猫'"
                            @click="handleAdopt">
                            <span class="mr-2"></span> {{ adoptionUnavailableReason || '申请领养此猫' }}
                        </Button>

                    </div>
                </div>
            </aside>
        </div>

    </div>
</template>
