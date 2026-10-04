<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { statsApi } from '@/lib/api';
import type { PublicStatsData } from '@/types';

const loading = ref(true)
const stats = ref<PublicStatsData>({
    totalCats: 0,
    residentCats: 0,
    adoptedCats: 0,
    neuteredCats: 0
});
const getStats = async () => {
    loading.value = true;
    try {
        const data = await statsApi.getPublicStats();
        stats.value = data;
    } catch (error) {
        console.error('获取统计数据失败:', error);
    } finally {
        loading.value = false;
    }

}
onMounted(() => {
    getStats();
})
</script>

<template>
    <div
        class="w-full rounded-xl p-8 text-white shadow-lg relative overflow-hidden bg-gradient-to-r from-[#FFB74D] to-[#FF9800]">
        <div class="flex flex-col relative z-10 justify-between gap-8 md:flex-row">
            <div class="text-center md:text-left">
                <h2 class="text-3xl font-bold mb-2 traking-wide text-white drop-shadow-md">
                    欢迎来到山大猫猫图鉴
                </h2>
                <p class="text-white/80 text-sm font-medium p-2">
                    发现校园里的每一只可爱猫咪，记录它们的成长故事
                </p>

                <div v-if="loading" class="flex gap-8 animate-pule">
                    <div class="h-16 w-16 bg-white/20 rounded"></div>
                    <div class="h-16 w-16 bg-white/20 rounded"></div>
                    <div class="h-16 w-16 bg-white/20 rounded"></div>
                    <div class="h-16 w-16 bg-white/20 rounded"></div>
                </div>
                <div v-else class="flex gap-8 md:gap-4 text-center p-2 ">
                    <div class="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span class="text-2xl font-bold">{{ stats.totalCats }}</span>
                        <span class="text-sm text-white/80">喵校友总计</span>
                    </div>
                    <div class="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span class="text-2xl font-bold">{{ stats.residentCats }}</span>
                        <span class="text-sm text-white/80">留园观察</span>
                    </div>
                    <div class="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span class="text-2xl font-bold">{{ stats.residentCats }}</span>
                        <span class="text-sm text-white/80">待领养</span>
                    </div>
                    <div class="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span class="text-2xl font-bold">{{ stats.adoptedCats }}</span>
                        <span class="text-sm text-white/80">已领养</span>
                    </div>
                    <div class="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span class="text-2xl font-bold">{{ stats.neuteredCats }}</span>
                        <span class="text-sm text-white/80">已绝育</span>
                    </div>
                </div>
            </div>
        </div>


    </div>

</template>