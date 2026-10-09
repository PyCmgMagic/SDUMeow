import { useEffect, useRef, useState } from 'react'
import { adoptionApi } from '@pc/lib/api'
import {
  AdoptionExperienceMap,
  AdoptionHousingMap,
  AdminAdoptionStatusMap,
  isAdminAdoptionAuditableStatus,
  normalizeAdminAdoptionStatus,
  type AdoptionAuditStatus,
  type AdoptionItem,
  type AdminAdoptionStatus
} from '@pc/types'
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@pc/components/ui/avatar'
import { Badge } from '@pc/components/ui/badge'
import { Button } from '@pc/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@pc/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@pc/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@pc/components/ui/table'
import { Textarea } from '@pc/components/ui/textarea'
import { AdminPageHeader } from '@pc/components/admin/AdminPageHeader'
import { AdminPanel } from '@pc/components/admin/AdminPanel'
import { AdminStatusTabs } from '@pc/components/admin/AdminStatusTabs'
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  HeartHandshake,
  Ban,
  XCircle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function DesktopLayout() {
  const pageSize = 10
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [adoptionList, setAdoptionList] = useState<AdoptionItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedStatus, setSelectedStatus] = useState<AdminAdoptionStatus | ''>('')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [auditDialogOpen, setAuditDialogOpen] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<AdoptionItem | null>(null)
  const [selectedAdoption, setSelectedAdoption] = useState<AdoptionItem | null>(null)
  const [auditing, setAuditing] = useState(false)
  const [auditStatus, setAuditStatus] = useState<AdoptionAuditStatus>('INTERVIEW')
  const [auditReason, setAuditReason] = useState('')
  const latestRequestIdRef = useRef(0)

  const statusTabs: Array<{ label: string; value: AdminAdoptionStatus | '' }> = [
    { label: '全部申请', value: '' },
    { label: '待审核', value: 0 },
    { label: '面试中', value: 1 },
    { label: '已通过', value: 2 },
    { label: '已拒绝', value: 3 },
    { label: '已完成', value: 4 },
    { label: '已取消', value: 5 }
  ]

  const hasExistingSuccessfulAdoption = (adoption: AdoptionItem | null) => Boolean(
    adoption && adoptionList.some((item) => (
      item.id !== adoption.id &&
      item.catId === adoption.catId &&
      [2, 4].includes(normalizeAdminAdoptionStatus(item.status) ?? -1)
    ))
  )

  const auditStatusOptions: Array<{ label: string; value: AdoptionAuditStatus }> = (() => {
    const currentStatus = normalizeAdminAdoptionStatus(selectedAdoption?.status)
    if (currentStatus === 0) {
      return [
        { label: '进入面试', value: 'INTERVIEW' },
        { label: '拒绝申请', value: 'REJECTED' }
      ]
    }
    if (currentStatus === 2) {
      return [{ label: '完成领养', value: 'COMPLETED' }]
    }
    if (hasExistingSuccessfulAdoption(selectedAdoption)) {
      return [{ label: '拒绝申请', value: 'REJECTED' }]
    }
    return [
      { label: '审核通过', value: 'APPROVED' },
      { label: '拒绝申请', value: 'REJECTED' }
    ]
  })()

  const statusConfig: Record<AdminAdoptionStatus, { label: string; class: string; icon: LucideIcon }> = {
    0: {
      label: AdminAdoptionStatusMap[0],
      class: 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]',
      icon: Clock3
    },
    1: {
      label: AdminAdoptionStatusMap[1],
      class: 'border-blue-300 bg-blue-50 text-blue-700',
      icon: Clock3
    },
    2: {
      label: AdminAdoptionStatusMap[2],
      class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]',
      icon: CheckCircle2
    },
    3: {
      label: AdminAdoptionStatusMap[3],
      class: 'border-red-300 bg-red-50 text-red-700',
      icon: XCircle
    },
    4: {
      label: AdminAdoptionStatusMap[4],
      class: 'border-gray-300 bg-gray-100 text-gray-700',
      icon: ClipboardCheck
    },
    5: {
      label: AdminAdoptionStatusMap[5],
      class: 'border-gray-300 bg-gray-100 text-gray-600',
      icon: Ban
    }
  }

  const statusInfo = (status: unknown) => {
    const key = normalizeAdminAdoptionStatus(status) ?? 0
    return statusConfig[key]
  }

  const adoptionActionLabel = (status: unknown) =>
    normalizeAdminAdoptionStatus(status) === 2 ? '完成领养' : '审核'

  const paginationPages: Array<number | '...'> = (() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1)
    }
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages]
    if (currentPage >= totalPages - 2) {
      return [
        1,
        '...',
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      ]
    }
    return [
      1,
      '...',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      '...',
      totalPages
    ]
  })()

  const [failedApplicantAvatarIds, setFailedApplicantAvatarIds] = useState(new Set<string>())

  const hasApplicantAvatar = (item: AdoptionItem): item is AdoptionItem & { avatar: string } => (
    Boolean(item.avatar && !failedApplicantAvatarIds.has(item.id))
  )

  const markApplicantAvatarFailed = (item: AdoptionItem) => {
    setFailedApplicantAvatarIds((current) => new Set([...current, item.id]))
  }

  const formatTime = (value?: string) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const fetchList = async () => {
    const requestId = ++latestRequestIdRef.current
    setLoading(true)
    setLoadError('')

    try {
      const response = await adoptionApi.getAdoptionList({
        page: currentPage,
        size: pageSize,
        ...(selectedStatus !== '' ? { status: selectedStatus } : {})
      })
      if (requestId !== latestRequestIdRef.current) return

      setAdoptionList(response.items || [])
      setTotal(Number(response.total || 0))
      setTotalPages(Math.max(Number(response.pages || 1), 1))
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) return
      setAdoptionList([])
      setTotal(0)
      setTotalPages(1)
      setLoadError(error instanceof Error ? error.message : '领养申请暂时无法加载')
    } finally {
      if (requestId === latestRequestIdRef.current) setLoading(false)
    }
  }

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page)
    }
  }

  const openDetails = (item: AdoptionItem) => {
    setSelectedDetail(item)
    setDetailDialogOpen(true)
  }

  const closeDetails = () => {
    setDetailDialogOpen(false)
    setSelectedDetail(null)
  }

  const openAudit = (item: AdoptionItem) => {
    setSelectedAdoption(item)
    const currentStatus = normalizeAdminAdoptionStatus(item.status)
    setAuditStatus(currentStatus === 0
      ? 'INTERVIEW'
      : currentStatus === 2
        ? 'COMPLETED'
        : hasExistingSuccessfulAdoption(item)
          ? 'REJECTED'
          : 'APPROVED')
    setAuditReason('')
    setAuditDialogOpen(true)
  }

  const closeAudit = () => {
    setAuditDialogOpen(false)
    setSelectedAdoption(null)
    setAuditStatus('INTERVIEW')
    setAuditReason('')
  }

  const auditFromDetails = () => {
    if (!selectedDetail) return
    const item = selectedDetail
    closeDetails()
    openAudit(item)
  }

  const submitAudit = async () => {
    if (!selectedAdoption || !auditReason.trim()) {
      toast.warning('请填写审核说明')
      return
    }

    if (
      auditStatus === 'APPROVED' &&
      hasExistingSuccessfulAdoption(selectedAdoption)
    ) {
      toast.warning('该猫咪已有通过或完成的领养申请，不能再次通过')
      return
    }

    setAuditing(true)
    try {
      await adoptionApi.auditAdoption(selectedAdoption.id, {
        status: auditStatus,
        reason: auditReason.trim()
      })
      toast.success('领养申请已更新')
      closeAudit()
      await fetchList()
    } finally {
      setAuditing(false)
    }
  }

  const skipSelectedStatusWatch = useRef(true)
  useEffect(() => {
    if (skipSelectedStatusWatch.current) {
      skipSelectedStatusWatch.current = false
      return
    }
    if (currentPage === 1) void fetchList()
    else setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus])

  const skipCurrentPageWatch = useRef(true)
  useEffect(() => {
    if (skipCurrentPageWatch.current) {
      skipCurrentPageWatch.current = false
      return
    }
    void fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  useEffect(() => {
    void fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const detailStatusInfo = statusInfo(selectedDetail?.status)
  const DetailStatusIcon = detailStatusInfo.icon

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow="ADOPTION REVIEW"
        title="领养申请"
        description="集中查看申请条件、联系方式和喂养计划，维护每一步审核结论。"
        icon={HeartHandshake}
        tone="mint"
        summary={
          <div className="admin-summary-card flex items-center gap-3 border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <ClipboardCheck className="size-5 text-[#116B5E]" />
            <div>
              <p className="text-xs font-bold text-gray-500">申请总数</p>
              <p className="text-lg font-black text-gray-950">{total}</p>
            </div>
          </div>
        }
      />

      <AdminPanel>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminStatusTabs
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value as AdminAdoptionStatus | '')}
            ariaLabel="领养申请状态"
            options={statusTabs}
            tone="mint"
          />
          <p className="text-sm text-gray-600">
            当前第 <strong className="text-black">{currentPage}</strong> / {totalPages} 页
          </p>
        </div>
      </AdminPanel>

      <AdminPanel
        title="申请队列"
        meta={`每页 ${pageSize} 条`}
        footer={
          <>
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">
                  共 <strong className="text-black">{total}</strong> 条领养申请
                </p>
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => changePage(currentPage - 1)}
                  >
                    上一页
                  </Button>
                  {paginationPages.map((page, index) =>
                    page === '...' ? (
                      <span key={`${page}-${index}`} className="px-1 text-gray-500">...</span>
                    ) : (
                      <Button
                        key={`${page}-${index}`}
                        size="sm"
                        variant={page === currentPage ? 'default' : 'outline'}
                        className={page === currentPage ? 'border-2 border-black bg-[#5CD6C2] text-black hover:bg-[#5CD6C2]' : ''}
                        onClick={() => changePage(page)}
                      >
                        {page}
                      </Button>
                    )
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => changePage(currentPage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </>
        }
      >
        {loadError && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
            <span>{loadError}</span>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 bg-white text-red-800 hover:bg-red-100"
              onClick={() => void fetchList()}
            >
              重试
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="min-w-[1080px] text-left text-sm">
            <TableHeader className="admin-data-table-header bg-[#DDF8F2] [&_tr]:border-black">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-5 font-bold text-gray-700">申请人</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">目标猫咪</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">联系方式</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">居住与经验</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">提交时间</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">状态</TableHead>
                <TableHead className="px-5 text-right font-bold text-gray-700">操作</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="px-5 py-14 text-center text-gray-500">
                    正在加载领养申请...
                  </TableCell>
                </TableRow>
              ) : adoptionList.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="px-5 py-14 text-center text-gray-500">
                    当前筛选下没有领养申请
                  </TableCell>
                </TableRow>
              ) : (
                adoptionList.map((item) => {
                  const info = statusInfo(item.status)
                  const StatusIcon = info.icon
                  return (
                    <TableRow
                      key={item.id}
                      className="admin-data-table-row border-gray-200 hover:bg-[#F6FFFC]"
                    >
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="admin-data-avatar size-9 rounded-none border-2 border-black">
                            {hasApplicantAvatar(item) ? (
                              <AvatarImage
                                src={item.avatar}
                                alt={item.userName}
                                onError={() => markApplicantAvatarFailed(item)}
                              />
                            ) : null}
                            <AvatarFallback className="rounded-none bg-[#FACC15] font-black text-black">
                              {item.userName?.slice(0, 1) || '用'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-black text-gray-950">{item.userName || '-'}</p>
                            <p className="mt-1 text-xs text-gray-500">ID {item.userId}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {item.catAvatar ? (
                            <img
                              src={item.catAvatar}
                              alt={item.catName}
                              className="size-9 rounded-none border-2 border-black object-cover"
                            />
                          ) : (
                            <span className="size-9 border-2 border-black bg-gray-100" />
                          )}
                          <p className="font-black text-gray-950">{item.catName || '-'}</p>
                        </div>
                      </TableCell>

                      <TableCell className="px-5 py-4">
                        <p className="font-bold text-gray-800">电话：{item.contact?.phone || '-'}</p>
                        <p className="mt-1 text-xs text-gray-500">微信：{item.contact?.wechat || '-'}</p>
                      </TableCell>

                      <TableCell className="px-5 py-4">
                        <p className="font-bold text-gray-800">
                          {AdoptionHousingMap[item.info?.housing] || item.info?.housing || '-'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {AdoptionExperienceMap[item.info?.experience] || item.info?.experience || '-'}
                        </p>
                      </TableCell>

                      <TableCell className="px-5 py-4 text-gray-600">
                        {formatTime(item.createTime)}
                      </TableCell>

                      <TableCell className="px-5 py-4">
                        <Badge variant="outline" className={cn('gap-1 font-bold', info.class)}>
                          <StatusIcon className="size-3.5" />
                          {info.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="admin-secondary-action border-2 border-black font-bold hover:bg-[#DDF8F2]"
                            onClick={() => openDetails(item)}
                          >
                            <Eye className="size-4" />
                            详情
                          </Button>
                          {isAdminAdoptionAuditableStatus(item.status) && (
                            <Button
                              size="sm"
                              className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
                              onClick={() => openAudit(item)}
                            >
                              {adoptionActionLabel(item.status)}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AdminPanel>

      <Dialog
        open={auditDialogOpen}
        onOpenChange={(open) => {
          setAuditDialogOpen(open)
          if (!open) closeAudit()
        }}
      >
        <DialogContent className="admin-dialog border-2 border-black p-0 sm:max-w-xl">
          <DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#DDF8F2] px-6 py-5 pr-14">
            <DialogTitle className="text-xl font-black">处理领养申请</DialogTitle>
            <DialogDescription>选择下一步状态，并填写将向申请人展示的处理说明。</DialogDescription>
          </DialogHeader>

          {selectedAdoption && (
            <div className="grid gap-5 px-6 py-5">
              <div className="relative grid gap-3 border-2 border-black bg-gray-50 p-4 pl-16 sm:grid-cols-2">
                <Avatar className="absolute left-4 top-4 size-10 rounded-none border-2 border-black">
                  {hasApplicantAvatar(selectedAdoption) ? (
                    <AvatarImage
                      src={selectedAdoption.avatar}
                      alt={selectedAdoption.userName}
                      onError={() => markApplicantAvatarFailed(selectedAdoption)}
                    />
                  ) : null}
                  <AvatarFallback className="rounded-none bg-[#FACC15] font-black text-black">
                    {selectedAdoption.userName?.slice(0, 1) || '用'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-bold text-gray-500">申请人</p>
                  <p className="mt-1 font-black">{selectedAdoption.userName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500">目标猫咪</p>
                  <p className="mt-1 font-black">{selectedAdoption.catName}</p>
                </div>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-black">处理结果</span>
                <Select
                  value={auditStatus}
                  onValueChange={(value) => setAuditStatus(value as AdoptionAuditStatus)}
                >
                  <SelectTrigger className="border-2 border-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {auditStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-2" htmlFor="audit-reason">
                <span className="text-sm font-black">审核说明</span>
                <Textarea
                  id="audit-reason"
                  value={auditReason}
                  onChange={(event) => setAuditReason(event.target.value)}
                  rows={5}
                  maxLength={500}
                  placeholder="说明处理条件或拒绝原因"
                  className="border-2 border-black focus-visible:ring-[#5CD6C2]"
                />
              </label>
            </div>
          )}

          <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4">
            <Button
              variant="outline"
              className="border-2 border-black"
              disabled={auditing}
              onClick={closeAudit}
            >
              取消
            </Button>
            <Button
              className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
              disabled={auditing}
              onClick={() => void submitAudit()}
            >
              {auditing ? '正在保存...' : '保存审核结果'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open)
          if (!open) closeDetails()
        }}
      >
        <DialogContent className="admin-dialog max-h-[90vh] overflow-y-auto border-2 border-black p-0 sm:max-w-2xl">
          <DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#F3F4F6] px-6 py-5 pr-14">
            <DialogTitle className="text-xl font-black">领养申请详情</DialogTitle>
            <DialogDescription>申请编号 {selectedDetail?.id}</DialogDescription>
          </DialogHeader>

          {selectedDetail && (
            <div className="grid gap-6 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#F6FFFC] p-4">
                <Badge variant="outline" className={cn('gap-1 font-bold', detailStatusInfo.class)}>
                  <DetailStatusIcon className="size-3.5" />
                  {detailStatusInfo.label}
                </Badge>
                <p className="text-sm text-gray-600">{formatTime(selectedDetail.createTime)}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <section className="relative border-2 border-black p-4 pl-20">
                  <Avatar className="absolute left-4 top-4 size-12 rounded-none border-2 border-black">
                    {hasApplicantAvatar(selectedDetail) ? (
                      <AvatarImage
                        src={selectedDetail.avatar}
                        alt={selectedDetail.userName}
                        onError={() => markApplicantAvatarFailed(selectedDetail)}
                      />
                    ) : null}
                    <AvatarFallback className="rounded-none bg-[#FACC15] font-black text-black">
                      {selectedDetail.userName?.slice(0, 1) || '用'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-sm font-black">申请人与联系</h3>
                  <p className="mt-3 font-bold">{selectedDetail.userName}</p>
                  <p className="mt-1 text-sm text-gray-600">电话：{selectedDetail.contact?.phone || '-'}</p>
                  <p className="mt-1 text-sm text-gray-600">微信：{selectedDetail.contact?.wechat || '-'}</p>
                </section>

                <section className="border-2 border-black p-4">
                  <h3 className="text-sm font-black">目标猫咪</h3>
                  <p className="mt-3 font-bold">{selectedDetail.catName}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    居住：{AdoptionHousingMap[selectedDetail.info?.housing] || selectedDetail.info?.housing || '-'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    经验：{AdoptionExperienceMap[selectedDetail.info?.experience] || selectedDetail.info?.experience || '-'}
                  </p>
                </section>
              </div>

              <section className="border-2 border-black p-4">
                <h3 className="text-sm font-black">喂养计划</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {selectedDetail.info?.plan || '未填写'}
                </p>
              </section>
            </div>
          )}

          <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4">
            <Button
              variant="outline"
              className="admin-secondary-action border-2 border-black bg-white font-bold text-black hover:bg-[#FACC15]"
              onClick={closeDetails}
            >
              关闭
            </Button>
            {selectedDetail && isAdminAdoptionAuditableStatus(selectedDetail.status) && (
              <Button
                className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
                onClick={auditFromDetails}
              >
                {adoptionActionLabel(selectedDetail?.status)}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
