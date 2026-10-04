import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { announcementApi } from '@pc/lib/api'
import { AnnouncementTypeMap, type Announcement } from '@pc/types'
import { Button } from '@pc/components/ui/button'
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  ImageOff,
  LoaderCircle,
  Megaphone,
  RefreshCw,
  UserRound,
} from 'lucide-react'

export function DesktopLayout() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [imageFailed, setImageFailed] = useState(false)

  const typeLabel = (type: Announcement['type']) => {
    return AnnouncementTypeMap[String(type)] || '系统公告'
  }

  const formatDate = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' }).format(date)
  }

  const loadAnnouncement = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    setImageFailed(false)
    setAnnouncement(null)
    try {
      setAnnouncement(await announcementApi.getAnnouncement(String(id)))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '公告加载失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  const goBack = async () => {
    // vue-router wrote a `back` path into history.state; react-router keeps an
    // `idx` instead. Both mean "there is in-app history to go back to".
    if (((window.history.state as { idx?: number } | null)?.idx ?? -1) > 0) {
      navigate(-1)
      return
    }
    await navigate('/')
  }

  useEffect(() => {
    void loadAnnouncement()
  }, [loadAnnouncement])

  return (
    <div className="min-h-full rounded-xl bg-gray-50 p-4 shadow-sm md:p-6">
      <div className="mx-auto w-full max-w-4xl">
        <Button
          variant="outline"
          size="sm"
          className="group mb-5 h-10 border-gray-200 bg-white px-3 text-gray-700 shadow-sm hover:border-primary hover:bg-primary/15 hover:text-gray-900"
          aria-label="返回上一页"
          onClick={() => void goBack()}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          返回上一页
        </Button>

        {loading ? (
          <div className="rounded-xl bg-white px-6 py-20 text-center shadow-sm">
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-amber-500" />
            <p className="mt-3 text-sm text-gray-500">正在加载公告...</p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-xl bg-white px-6 py-20 text-center shadow-sm">
            <Megaphone className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 font-medium text-gray-700">公告加载失败</p>
            <p className="mt-1 text-sm text-gray-500">{errorMessage}</p>
            <Button variant="outline" className="mt-5" onClick={() => void loadAnnouncement()}>
              <RefreshCw className="h-4 w-4" />
              重新加载
            </Button>
          </div>
        ) : announcement ? (
          <article className="overflow-hidden rounded-xl bg-white shadow-sm">
            {announcement.coverImage ? (
              <div className="h-48 bg-primary/10 sm:h-64">
                {!imageFailed ? (
                  <img
                    src={announcement.coverImage}
                    alt={announcement.title}
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-amber-700">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/40">
                      <ImageOff className="h-6 w-6" />
                    </div>
                    <span className="mt-3 text-sm font-medium">封面暂不可用</span>
                  </div>
                )}
              </div>
            ) : null}

            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                  {typeLabel(announcement.type)}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Megaphone className="h-3.5 w-3.5" />
                  校园公告
                </span>
              </div>

              <h1 className="mt-4 break-words text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                {announcement.title}
              </h1>

              {announcement.summary ? (
                <p className="mt-5 border-l-4 border-primary bg-amber-50/70 px-4 py-3 text-sm leading-7 text-gray-600 sm:text-base">
                  {announcement.summary}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-b border-gray-100 pb-6 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" />
                  {announcement.authorName || '管理员'}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(announcement.createTime)}
                </span>
                {announcement.viewCount !== undefined ? (
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    {announcement.viewCount} 次浏览
                  </span>
                ) : null}
              </div>

              <div className="whitespace-pre-wrap break-words py-7 text-base leading-8 text-gray-700">
                {announcement.content || '暂无正文内容。'}
              </div>
            </div>
          </article>
        ) : (
          <div className="rounded-xl bg-white px-6 py-20 text-center text-gray-500 shadow-sm">
            公告不存在或已被删除。
          </div>
        )}
      </div>
    </div>
  )
}
