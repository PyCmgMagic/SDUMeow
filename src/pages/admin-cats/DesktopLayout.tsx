import { invalidateRelatedQueries } from '@shared/mutationSync'
import { useRetainedState } from '@shared/drafts'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Cat, FileText, PenSquare, Plus, Trash2 } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pc/components/ui/table'
import { Button } from '@pc/components/ui/button'
import { Badge } from '@pc/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@pc/components/ui/avatar'
import { AdminPageHeader } from '@pc/components/admin/AdminPageHeader'
import { AdminPanel } from '@pc/components/admin/AdminPanel'
import { AdminStatusTabs } from '@pc/components/admin/AdminStatusTabs'
import { catApi, typeApi } from '@pc/lib/api'
import { EditCatDialog } from '@pc/components/EditCatDialog'
import { ConfirmDialog } from '@pc/components/ui/confirm-dialog'
import { CatStatusMap, type AdminCatItem, type CatListItem, type Status, type TypeOption } from '@pc/types'
import { toast } from '@pc/lib/toast'

const statusOptions: Array<{ label: string; value: Status | null }> = [
  { label: '全部', value: null },
  { label: '在校', value: 0 },
  { label: '已领养', value: 1 },
  { label: '喵星', value: 2 },
  { label: '住院', value: 3 },
  { label: '领养处理中', value: 4 },
]

const PAGE_SIZE = 10

const positiveInteger = (value: unknown, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const enumFilter = <T extends number>(value: unknown, allowed: readonly T[]): T | null => {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return allowed.includes(numeric as T) ? numeric as T : null
}

// 辅助函数：状态颜色映射
const getStatusColorClass = (status: Status) => {
  if (status === 0) return 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]'
  if (status === 1) return 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]'
  if (status === 2) return 'border-gray-300 bg-gray-100 text-gray-700'
  if (status === 3) return 'border-red-300 bg-red-50 text-red-700'
  return 'border-amber-300 bg-amber-50 text-amber-800'
}

const getNeuteredColorClass = (isNeutered: boolean) => {
  return isNeutered
    ? 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]'
    : 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]'
}

export function DesktopLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useRetainedState('admin-cats-dialog', 'editDialogOpen', false)
  const [selectedCatForEdit, setSelectedCatForEdit] = useRetainedState<AdminCatItem | null>('admin-cats-dialog', 'selectedCatForEdit', null)

  // 删除确认弹窗
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteCatId, setDeleteCatId] = useState('')
  const [deleteCatName, setDeleteCatName] = useState('')

  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [cats, setCats] = useState<CatListItem[]>([])
  const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const latestRequestIdRef = useRef(0)

  const queryParams = new URLSearchParams(location.search)
  const currentPage = positiveInteger(queryParams.get('page'))
  const selectedStatus = enumFilter<Status>(queryParams.get('status'), [0, 1, 2, 3, 4])
  const selectedColor = (() => {
    const value = Number(queryParams.get('color'))
    return Number.isInteger(value) && value > 0 ? value : null
  })()
  const searchText = String(queryParams.get('search') || '').trim()

  const withQuery = (mutations: (search: URLSearchParams) => void) => {
    const next = new URLSearchParams(location.search)
    mutations(next)
    const queryString = next.toString()
    return queryString ? `${location.pathname}?${queryString}` : location.pathname
  }

  const updateFilter = (key: 'status' | 'color', value: number | null) => {
    navigate(withQuery((search) => {
      if (value === null) search.delete(key)
      else search.set(key, String(value))
      search.set('page', '1')
    }))
  }

  const updateStatusFilter = (value: string | number | null) => {
    updateFilter('status', typeof value === 'number' ? value : null)
  }

  const updateColorFilter = (value: string | number | null) => {
    updateFilter('color', typeof value === 'number' ? value : null)
  }

  const fetchCats = async () => {
    const requestId = ++latestRequestIdRef.current
    setLoading(true)
    setLoadError('')
    try {
      const res = await catApi.getCatList({
        page: currentPage,
        pageSize: PAGE_SIZE,
        ...(selectedStatus !== null && { status: selectedStatus }),
        ...(selectedColor !== null && { color: selectedColor }),
        ...(searchText && { search: searchText }),
      })
      if (requestId !== latestRequestIdRef.current) return

      setCats(res.items)
      setTotal(res.total)
      const resolvedPages = Math.max(res.totalPage, 1)
      setTotalPages(resolvedPages)

      if (res.total > 0 && currentPage > resolvedPages) {
        navigate(withQuery((search) => search.set('page', String(resolvedPages))), { replace: true })
      }
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) return
      setCats([])
      setTotal(0)
      setTotalPages(1)
      setLoadError(error instanceof Error ? error.message : '猫咪列表加载失败')
    } finally {
      if (requestId === latestRequestIdRef.current) setLoading(false)
    }
  }

  const colorLabels = new Map(colorOptions.map((item) => [item.id, item.label]))
  const locationLabels = new Map(locationOptions.map((item) => [item.id, item.label]))
  const colorTabOptions = [
    { label: '全部花色', value: null },
    ...colorOptions.map((item) => ({ label: item.label, value: item.id })),
  ]
  const colorLabel = (id: number) => colorLabels.get(id) || `#${id}`
  const locationLabel = (id: number | null) => id === null ? '-' : locationLabels.get(id) || `地点 #${id}`

  // 事件处理
  const handleAddCat = () => {
    setSelectedCatForEdit(null)
    setEditDialogOpen(true)
  }

  const handleEdit = async (cat: CatListItem) => {
    const baseCat: AdminCatItem = { ...cat, hauntLocation: cat.location }
    setSelectedCatForEdit(baseCat)
    setEditDialogOpen(true)

    try {
      const fullCatData = await catApi.getCatDetail(cat.id)
      setSelectedCatForEdit((current) => {
        if (current?.id !== cat.id) return current
        const info = fullCatData.basicInfo
        return {
          ...baseCat,
          color: info.color,
          campus: info.campus,
          location: info.hauntLocation ?? cat.location,
          status: info.status,
          role: info.role,
          isNeutered: info.neutered.isNeutered,
          gender: info.gender,
          healthStatus: info.healthStatus,
          hauntLocation: info.hauntLocation,
          birthYear: info.birthYear,
          admissionDate: info.admissionDate,
          description: fullCatData.description || '',
          attributes: fullCatData.attributes,
          aliases: fullCatData.aliases,
          avatar: fullCatData.avatar,
          images: fullCatData.images,
          neuteredDate: fullCatData.basicInfo.neutered.date,
          neuteredType: fullCatData.basicInfo.neutered.type,
          tags: fullCatData.tags,
        }
      })
    } catch (error) {
      console.warn('获取猫咪详情失败，使用列表数据', error)
    }
  }

  const handleEditSuccess = async () => {
      invalidateRelatedQueries('cat')
    // 编辑成功后，关闭对话框并刷新列表
    setEditDialogOpen(false)
    setSelectedCatForEdit(null)
    await fetchCats()
  }

  const handleDelete = (id: string, name: string) => {
    setDeleteCatId(id)
    setDeleteCatName(name)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    setDeleteDialogOpen(false)
    try {
      await catApi.deleteCat(deleteCatId)
      invalidateRelatedQueries('cat', deleteCatId)
      toast.success('删除成功')
      await fetchCats()
    } catch {
      toast.error('删除失败')
    } finally {
      setDeleteCatId('')
      setDeleteCatName('')
    }
  }

  const handlePageChange = (page: number) => {
    navigate(withQuery((search) => search.set('page', String(page))))
  }

  useEffect(() => {
    void (async () => {
      try {
        const [colors, locations] = await Promise.all([typeApi.getColors(), typeApi.getLocations()])
        setColorOptions(colors)
        setLocationOptions(locations)
      } catch (error) {
        console.warn('猫咪类型选项加载失败', error)
      }
    })()
  }, [])

  useEffect(() => {
    void fetchCats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedStatus, selectedColor, searchText])

  useEffect(() => {
    return () => {
      latestRequestIdRef.current += 1
    }
  }, [])

  return (
    <>
      <div className="flex flex-col gap-6">
        <AdminPageHeader eyebrow="CAT DIRECTORY" title="猫咪档案" description="维护校园猫咪档案、状态与常驻地信息。" icon={Cat}
          summary={
            <div className="admin-summary-card flex items-center gap-3 border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              <Cat className="size-5 text-[#116B5E]" aria-hidden="true" />
              <div><p className="text-xs font-bold text-gray-500">档案总数</p><p className="text-lg font-black text-gray-950">{total}</p></div>
            </div>
          }
          action={
            <Button className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" onClick={handleAddCat}>
              <Plus className="size-4" aria-hidden="true" />
              新建档案
            </Button>
          }
        />

        <section className="admin-filter-panel flex flex-col gap-4 border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="shrink-0 text-sm font-black text-gray-900">状态</p>
            <AdminStatusTabs ariaLabel="猫咪状态筛选" value={selectedStatus} options={statusOptions} onChange={updateStatusFilter} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="shrink-0 text-sm font-black text-gray-900">花色</p>
            <AdminStatusTabs ariaLabel="猫咪花色筛选" value={selectedColor} options={colorTabOptions} onChange={updateColorFilter} />
          </div>
        </section>

        {/* 表格区域 */}
        <AdminPanel title="猫咪档案" meta={`共 ${total} 条`}>
          <div className="overflow-x-auto">
            <Table className="admin-data-table min-w-[860px] text-left text-sm">
              <TableHeader className="admin-data-table-header bg-[#FFF8DE] [&_tr]:border-black">
                <TableRow>
                  <TableHead className="w-[80px] font-bold">头像</TableHead>
                  <TableHead className="font-bold">姓名</TableHead>
                  <TableHead className="font-bold">花色</TableHead>
                  <TableHead className="font-bold">状态</TableHead>
                  <TableHead className="font-bold">常驻地</TableHead>
                  <TableHead className="font-bold">绝育</TableHead>
                  <TableHead className="text-right font-bold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : loadError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-red-600">
                      <div className="flex flex-col items-center gap-3">
                        <span>{loadError}</span>
                        <Button variant="outline" size="sm" onClick={() => void fetchCats()}>重新加载</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : cats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  cats.map((cat) => (
                    <TableRow key={cat.id} className="admin-data-table-row border-gray-200 hover:bg-[#FFFDF5]">
                      <TableCell>
                        <Avatar className="admin-data-avatar size-10 border-2 border-black">
                          <AvatarImage src={cat.avatar} alt={cat.name} className="object-cover" />
                          <AvatarFallback className="font-bold">{cat.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-bold">{cat.name}</TableCell>
                      <TableCell className="font-bold">{colorLabel(cat.color)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`border px-2 py-0.5 font-bold ${getStatusColorClass(cat.status)}`}>
                          {CatStatusMap[cat.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">{locationLabel(cat.location)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`border px-2 py-0.5 font-bold ${getNeuteredColorClass(cat.isNeutered)}`}>
                          {cat.isNeutered ? '已绝育' : '未绝育'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" className="admin-icon-action size-8 border-2 border-black hover:bg-[#FACC15]" onClick={() => handleEdit(cat)} title="编辑">
                            <PenSquare className="size-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="admin-icon-action size-8 border-2 border-black hover:bg-[#FACC15]" onClick={() => navigate(`/admin/cats/${cat.id}`)}
                            title="查看详情">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon"
                            className="size-8 border-2 border-black hover:border-red-300 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(cat.id, cat.name)}
                            title="删除">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </AdminPanel>

        {/* 分页 */}
        <div className="admin-pagination flex flex-col gap-3 border-2 border-black bg-white px-5 py-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center sm:justify-between">
          {!loadError && total > 0 ? (
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" disabled={loading || currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="border-2 border-black bg-white font-bold hover:bg-[#FACC15]">
                上一页
              </Button>

              <div className="text-sm text-gray-600">
                第 {currentPage} 页 / 共 {totalPages} 页 (共 {total} 条)
              </div>

              <Button variant="outline" size="sm" disabled={loading || currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="border-2 border-black bg-white font-bold hover:bg-[#FACC15]">
                下一页
              </Button>
            </div>
          ) : (
            <div className="text-xs text-gray-400">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* 编辑猫咪对话框 */}
      {editDialogOpen && <EditCatDialog
        open={editDialogOpen}
        catData={selectedCatForEdit}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除猫咪"
        description={`确定要删除猫咪「${deleteCatName}」吗？此操作不可恢复。`}
        confirmText="删除"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </>
  )
}
