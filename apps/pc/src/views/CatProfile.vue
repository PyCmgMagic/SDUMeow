<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { catApi } from '@/lib/api';
import type { CatDetail } from '@/types';

const route = useRoute();
const cat = ref<CatDetail | null>(null);
const loading = ref(true);

onMounted(async () => {
    const catId = route.params.id as string;
    try {
        const data = await catApi.getCatDetail(catId);
        cat.value = data;
    } catch (error) {
        console.error('获取猫咪详细信息失败:', error);
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div v-if="cat">
        <h1>{{ cat.name }}</h1>
        <p>{{ cat.basicInfo.campus }}</p>
        <p>{{ cat.description }}</p>
        <div v-for="tag in cat.tags" :key="tag">{{ tag }}</div>
    </div>
</template>