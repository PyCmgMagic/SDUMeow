<script setup lang="ts">
import {computed}from 'vue';
import { CampusMap, CatStatusMap, type CatListItem, type Status } from '@/types';
import {Button} from './ui/button';
import LocationIcon from '@/assets/icons/location.svg';
import { useRouter } from 'vue-router';

const router=useRouter();

//接受父组件数据
const props=defineProps<{
    cat:CatListItem
    colorLabel?: string
}>();

const statusMap: Record<Status, {label: string; color: string; dot: string; ringColor: string}> = {
    0:{label:CatStatusMap[0],color:'bg-green-100 text-green-600',dot:'bg-green-500',ringColor:'ring-green-300'},
    1:{label:CatStatusMap[1],color:'bg-blue-100 text-blue-600',dot:'bg-blue-500',ringColor:'ring-blue-300'},
    2:{label:CatStatusMap[2],color:'bg-gray-100 text-gray-600',dot:'bg-gray-500',ringColor:'ring-gray-300'},
    3:{label:CatStatusMap[3],color:'bg-red-100 text-red-600',dot:'bg-red-500',ringColor:'ring-red-300'},
    4:{label:CatStatusMap[4],color:'bg-amber-100 text-amber-700',dot:'bg-amber-500',ringColor:'ring-amber-300'},
}

const defaultStatus={label:'未知',color:'bg-gray-100 text-gray-600',dot:'bg-gray-500',ringColor:'ring-gray-300'};

//计算当前状态标签
const currentStatus=computed(()=>{
    return statusMap[props.cat.status] || defaultStatus;
});

const campusLabel = computed(() => CampusMap[props.cat.campus] || `校区 #${props.cat.campus}`)

//点击详情
const goToDetail=()=>{
    router.push({name:'cat-detail',params:{id:props.cat.id}});
}
</script>

<template>
    <article class="public-card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
        <!--图片部分-->
        <div class="relative w-full aspect-[5/4] overflow-hidden bg-gray-100">
          <img :src="props.cat.avatar" :alt="props.cat.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        </div>
        <!--信息部分-->
        <div class="p-4 flex flex-col gap-3">
            <div class="flex min-w-0 items-center justify-between gap-3">
                <h3 class="flex min-w-0 flex-1 items-baseline gap-2 text-lg font-semibold text-gray-800">
                    <span class="min-w-0 truncate" :title="props.cat.name">{{ props.cat.name }}</span>
                    <span class="max-w-[45%] shrink-0 truncate text-sm font-normal text-gray-400">{{ props.colorLabel || `花色 #${props.cat.color}` }}</span>
                </h3>
                <!--状态呼吸灯-->
                <span class="relative flex h-3 w-3 shrink-0 rounded-full ring-1 ring-offset-2 ring-offset-white" :class="currentStatus.ringColor">
                    <span class="animate-pulse relative inline-flex rounded-full h-3 w-3" :class="currentStatus.dot"></span>
                </span>

            </div>
            <!--状态标签-->
            <div class="flex min-w-0 items-center justify-between gap-3 text-sm">
                <div class="flex min-w-0 items-center gap-1 text-gray-400">
                    <img :src="LocationIcon" alt="" class="h-4 w-4 shrink-0"/>
                    <span class="truncate">{{ campusLabel }}</span>


                </div>
                <span class="flex shrink-0 items-end rounded px-1 py-1 text-xs font-medium" :class="currentStatus.color">
                    {{currentStatus.label}}
                </span>
            </div>
            <!--详情按钮-->
            <Button variant="outline" size="sm" class="public-card-action mt-2 h-8 w-full bg-primary p-2 text-xs font-bold tracking-wider text-black transition-transform duration-300 hover:scale-[1.02] hover:bg-primary"
            @click="goToDetail">
                查看详情
            </Button>
        </div>

    </article>
</template>
