import { useState } from 'react'
import type { PostItem } from '@pc/types'
import { Heart, Trash2 } from 'lucide-react'
import { postApi } from '@pc/lib/api'
import { useUserStore } from '@pc/stores/user'
import { ConfirmDialog } from '@pc/components/ui/confirm-dialog'
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'

export interface MomentCardProps {
  data: PostItem
  onDeleted?: (id: string) => void
}

export function MomentCard(props: MomentCardProps) {
  const { data, onDeleted } = props
  const userInfo = useUserStore((state) => state.userInfo)

  const [isLiked, setIsLiked] = useState(props.data.isLiked)
  const [likeCount, setLikeCount] = useState(props.data.likeCount)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const canDelete = String(userInfo?.uid || '') === String(props.data.user?.id || '')

  // 时间格式化
  const timeAgo = () => {
    if (!props.data.createTime) return ''
    const now = new Date().getTime()
    const date = new Date(props.data.createTime).getTime()
    const diff = (now - date) / 1000

    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    return new Date(props.data.createTime).toLocaleDateString()
  }

  // 点赞逻辑
  const handleLike = async () => {
    if (isLoading) return

    try {
      setIsLoading(true)

      // 根据当前状态决定点赞还是取消点赞
      if (isLiked) {
        // 已点赞，执行取消点赞
        await postApi.unlikePost(props.data.id)
      } else {
        // 未点赞，执行点赞
        await postApi.likePost(props.data.id)
      }

      // 切换点赞状态
      const nextLiked = !isLiked
      setIsLiked(nextLiked)
      setLikeCount(likeCount + (nextLiked ? 1 : -1))

    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (deleteLoading) return
    setDeleteLoading(true)
    try {
      await postApi.deletePost(props.data.id)
      setDeleteDialogOpen(false)
      onDeleted?.(props.data.id)
      toast.success('动态已删除')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败，请重试')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <article className="public-card mb-6 break-inside-avoid p-5 transition-all duration-300 hover:-translate-y-0.5">

      {/* 用户 & 关联猫咪 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {/* 用户头像 */}
          <img
            src={data.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
            className="w-10 h-10 rounded-full object-cover border border-gray-100"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-800">{data.user?.name || `用户${data.user?.id || ''}`}</span>
            <span className="text-xs text-gray-400">{timeAgo()}</span>
          </div>
        </div>
        {canDelete && <button
          type="button"
          className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="删除动态"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </button>}
      </div>

      {/* 内容文本 (保留换行符、可选) */}
      {data.content && <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap leading-relaxed">
        {data.content}
      </p>}

      {/*  图片网格 */}
      {data.media && data.media.length > 0 && <div className="mb-4">
        {/* 单图 */}
        {data.media.length === 1 ? <div className="w-full rounded-lg overflow-hidden border border-gray-100">
          <img src={data.media[0]} className="w-full h-auto object-cover max-h-64" loading="lazy" />
        </div>
        /* 多图 (Grid 2列或3列) */
        : <div className="grid grid-cols-3 gap-2">
          {data.media.map((img, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-lg overflow-hidden bg-gray-50 border border-gray-100"
            >
              <img src={img} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>}
      </div>}

      {/*  底部互动栏 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-gray-400 text-xs">
        <div className="flex gap-4">
          {/* 点赞 */}
          <button
            onClick={() => void handleLike()}
            disabled={isLoading}
            className="flex items-center gap-1 hover:text-red-500 transition-colors group disabled:opacity-50"
          >
            <Heart
              className={cn('w-4 h-4 transition-all group-active:scale-125',
              isLiked ? 'fill-red-500 text-red-500' : '')}
            />
            <span>{likeCount || '赞'}</span>
          </button>

        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除动态"
        description="删除后无法恢复，确定继续吗？"
        confirmText="删除"
        variant="danger"
        loading={deleteLoading}
        onConfirm={() => void handleDelete()}
      />

    </article>
  )
}

export default MomentCard
