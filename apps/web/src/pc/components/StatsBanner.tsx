import { useEffect, useState } from 'react';
import { statsApi } from '@pc/lib/api';
import type { PublicStatsData } from '@pc/types';

export type StatsBannerProps = Record<string, never>

export function StatsBanner() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PublicStatsData>({
    totalCats: 0,
    residentCats: 0,
    adoptedCats: 0,
    neuteredCats: 0
  });
  const getStats = async () => {
    setLoading(true);
    try {
        const data = await statsApi.getPublicStats();
        setStats(data);
    } catch (error) {
        console.error('获取统计数据失败:', error);
    } finally {
        setLoading(false);
    }

  }
  useEffect(() => {
    getStats();
  }, [])

  return (
    <div
        className="w-full rounded-xl p-8 text-white shadow-lg relative overflow-hidden bg-gradient-to-r from-[#FFB74D] to-[#FF9800]">
        <div className="flex flex-col relative z-10 justify-between gap-8 md:flex-row">
            <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold mb-2 traking-wide text-white drop-shadow-md">
                    欢迎来到山大猫猫图鉴
                </h2>
                <p className="text-white/80 text-sm font-medium p-2">
                    发现校园里的每一只可爱猫咪，记录它们的成长故事
                </p>

                {loading ? <div className="flex gap-8 animate-pule">
                    <div className="h-16 w-16 bg-white/20 rounded"></div>
                    <div className="h-16 w-16 bg-white/20 rounded"></div>
                    <div className="h-16 w-16 bg-white/20 rounded"></div>
                    <div className="h-16 w-16 bg-white/20 rounded"></div>
                </div>
                : <div className="flex gap-8 md:gap-4 text-center p-2 ">
                    <div className="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span className="text-2xl font-bold">{stats.totalCats}</span>
                        <span className="text-sm text-white/80">喵校友总计</span>
                    </div>
                    <div className="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span className="text-2xl font-bold">{stats.residentCats}</span>
                        <span className="text-sm text-white/80">留园观察</span>
                    </div>
                    <div className="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span className="text-2xl font-bold">{stats.residentCats}</span>
                        <span className="text-sm text-white/80">待领养</span>
                    </div>
                    <div className="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span className="text-2xl font-bold">{stats.adoptedCats}</span>
                        <span className="text-sm text-white/80">已领养</span>
                    </div>
                    <div className="flex flex-col w-48 items-center border-b rounded-xl bg-white/20 p-3 transition-transform hover:scale-110 group cursor-pointer">
                        <span className="text-2xl font-bold">{stats.neuteredCats}</span>
                        <span className="text-sm text-white/80">已绝育</span>
                    </div>
                </div>}
            </div>
        </div>


    </div>
  )
}

export default StatsBanner
