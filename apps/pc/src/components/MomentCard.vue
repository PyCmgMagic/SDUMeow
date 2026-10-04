<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PostItem } from '@/types'
import { Heart, Trash2 } from 'lucide-vue-next'
import { postApi } from '@/lib/api'
import { useUserStore } from '@/stores/user'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/lib/toast'

const props = defineProps<{
  data: PostItem
}>()
const emit = defineEmits<{ deleted: [id: string] }>()
const userStore = useUserStore()

const isLiked = ref(props.data.isLiked)
const likeCount = ref(props.data.likeCount)
const isLoading = ref(false)
const deleteDialogOpen = ref(false)
const deleteLoading = ref(false)
const canDelete = computed(() => String(userStore.userInfo?.uid || '') === String(props.data.user?.id || ''))

// 时间格式化
const timeAgo = computed(() => {
  if (!props.data.createTime) return ''
  const now = new Date().getTime()
  const date = new Date(props.data.createTime).getTime()
  const diff = (now - date) / 1000

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return new Date(props.data.createTime).toLocaleDateString()
})

// 点赞逻辑
const handleLike = async () => {
  if (isLoading.value) return
  
  try {
    isLoading.value = true
    
    // 根据当前状态决定点赞还是取消点赞
    if (isLiked.value) {
      // 已点赞，执行取消点赞
      await postApi.unlikePost(props.data.id)
    } else {
      // 未点赞，执行点赞
      await postApi.likePost(props.data.id)
    }
    
    // 切换点赞状态
    isLiked.value = !isLiked.value
    likeCount.value += isLiked.value ? 1 : -1
    
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '操作失败，请重试')
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async () => {
  if (deleteLoading.value) return
  deleteLoading.value = true
  try {
    await postApi.deletePost(props.data.id)
    deleteDialogOpen.value = false
    emit('deleted', props.data.id)
    toast.success('动态已删除')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '删除失败，请重试')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <article class="public-card mb-6 break-inside-avoid p-5 transition-all duration-300 hover:-translate-y-0.5">
    
    <!-- 用户 & 关联猫咪 -->
    <div class="flex justify-between items-start mb-3">
      <div class="flex gap-3">
        <!-- 用户头像 -->
        <img 
          :src="data.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'" 
          class="w-10 h-10 rounded-full object-cover border border-gray-100"
        />
        <div class="flex flex-col">
          <span class="text-sm font-bold text-gray-800">{{ data.user?.name || `用户${data.user?.id || ''}` }}</span>
          <span class="text-xs text-gray-400">{{ timeAgo }}</span>
        </div>
      </div>
      <button
        v-if="canDelete"
        type="button"
        class="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
        title="删除动态"
        @click="deleteDialogOpen = true"
      >
        <Trash2 class="h-4 w-4" />
      </button>
    </div>

    <!-- 内容文本 (保留换行符、可选) -->
    <p v-if="data.content" class="text-gray-700 text-sm mb-3 whitespace-pre-wrap leading-relaxed">
      {{ data.content }}
    </p>

    <!--  图片网格 -->
    <div v-if="data.media && data.media.length > 0" class="mb-4">
      <!-- 单图 -->
      <div v-if="data.media.length === 1" class="w-full rounded-lg overflow-hidden border border-gray-100">
        <img :src="data.media[0]" class="w-full h-auto object-cover max-h-64" loading="lazy" />
      </div>
      <!-- 多图 (Grid 2列或3列) -->
      <div v-else class="grid grid-cols-3 gap-2">
        <div 
          v-for="(img, idx) in data.media" 
          :key="idx" 
          class="aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-100"
        >
          <img :src="img" class="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>
    </div>

    <!--  底部互动栏 -->
    <div class="flex items-center justify-between pt-3 border-t border-gray-50 text-gray-400 text-xs">
      <div class="flex gap-4">
        <!-- 点赞 -->
        <button 
          @click="handleLike"
          :disabled="isLoading"
          class="flex items-center gap-1 hover:text-red-500 transition-colors group disabled:opacity-50"
        >
          <Heart 
            class="w-4 h-4 transition-all group-active:scale-125" 
            :class="isLiked ? 'fill-red-500 text-red-500' : ''"
          />
          <span>{{ likeCount || '赞' }}</span>
        </button>
        
      </div>
    </div>

    <ConfirmDialog
      v-model:open="deleteDialogOpen"
      title="删除动态"
      description="删除后无法恢复，确定继续吗？"
      confirm-text="删除"
      variant="danger"
      :loading="deleteLoading"
      @confirm="handleDelete"
    />

  </article>
</template>
