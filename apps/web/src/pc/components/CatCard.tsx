import { useNavigate } from 'react-router-dom'
import { CampusMap, CatStatusMap, type CatListItem, type Status } from '@pc/types'
import { Button } from '@pc/components/ui/button'
import LocationIcon from '@pc/assets/icons/location.svg'
import { cn } from '@pc/lib/utils'

export interface CatCardProps {
  cat: CatListItem
  colorLabel?: string
}

const statusMap: Record<Status, {label: string; color: string; dot: string; ringColor: string}> = {
    0:{label:CatStatusMap[0],color:'bg-green-100 text-green-600',dot:'bg-green-500',ringColor:'ring-green-300'},
    1:{label:CatStatusMap[1],color:'bg-blue-100 text-blue-600',dot:'bg-blue-500',ringColor:'ring-blue-300'},
    2:{label:CatStatusMap[2],color:'bg-gray-100 text-gray-600',dot:'bg-gray-500',ringColor:'ring-gray-300'},
    3:{label:CatStatusMap[3],color:'bg-red-100 text-red-600',dot:'bg-red-500',ringColor:'ring-red-300'},
    4:{label:CatStatusMap[4],color:'bg-amber-100 text-amber-700',dot:'bg-amber-500',ringColor:'ring-amber-300'},
}

const defaultStatus={label:'未知',color:'bg-gray-100 text-gray-600',dot:'bg-gray-500',ringColor:'ring-gray-300'};

export function CatCard(props: CatCardProps) {
  const router=useNavigate();

  //接受父组件数据
  const { cat, colorLabel } = props;

  //计算当前状态标签
  const currentStatus = statusMap[cat.status] || defaultStatus;

  const campusLabel = CampusMap[cat.campus] || `校区 #${cat.campus}`

  //点击详情
  const goToDetail=()=>{
      router(`/cats/${cat.id}`);
  }

  return (
    <article className="public-card group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
        {/*图片部分*/}
        <div className="relative w-full aspect-[5/4] overflow-hidden bg-gray-100">
          <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        {/*信息部分*/}
        <div className="p-4 flex flex-col gap-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
                <h3 className="flex min-w-0 flex-1 items-baseline gap-2 text-lg font-semibold text-gray-800">
                    <span className="min-w-0 truncate" title={cat.name}>{cat.name}</span>
                    <span className="max-w-[45%] shrink-0 truncate text-sm font-normal text-gray-400">{colorLabel || `花色 #${cat.color}`}</span>
                </h3>
                {/*状态呼吸灯*/}
                <span className={cn('relative flex h-3 w-3 shrink-0 rounded-full ring-1 ring-offset-2 ring-offset-white', currentStatus.ringColor)}>
                    <span className={cn('animate-pulse relative inline-flex rounded-full h-3 w-3', currentStatus.dot)}></span>
                </span>

            </div>
            {/*状态标签*/}
            <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-1 text-gray-400">
                    <img src={LocationIcon} alt="" className="h-4 w-4 shrink-0"/>
                    <span className="truncate">{campusLabel}</span>


                </div>
                <span className={cn('flex shrink-0 items-end rounded px-1 py-1 text-xs font-medium', currentStatus.color)}>
                    {currentStatus.label}
                </span>
            </div>
            {/*详情按钮*/}
            <Button variant="outline" size="sm" className="public-card-action mt-2 h-8 w-full bg-primary p-2 text-xs font-bold tracking-wider text-black transition-transform duration-300 hover:scale-[1.02] hover:bg-primary"
            onClick={goToDetail}>
                查看详情
            </Button>
        </div>

    </article>
  )
}

export default CatCard
