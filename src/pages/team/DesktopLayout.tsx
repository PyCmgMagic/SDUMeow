import { Heart } from 'lucide-react'
import logo from '@/assets/猫猫图鉴-logo.png'
import { GroupQrCode } from '@pc/components/GroupQrCode'

const disciplines = [
  { name: '产品', description: '从校园需求出发，让每一次相遇更有意义。' },
  { name: '视觉', description: '用清晰的设计，连接人与校园里的猫咪。' },
  { name: '美术', description: '描绘每一只猫咪，记录它们独特的模样。' },
  { name: '前端', description: '让猫咪档案与校园故事触手可及。' },
  { name: '后端', description: '守护每一份记录，让信息可靠流转。' },
  { name: '移动', description: '把校园里的温暖，放进口袋。' },
]

export function DesktopLayout() {
  return (
    <div className="team-page mx-auto flex w-full max-w-6xl flex-col gap-6 text-foreground lg:gap-8">
        <header className="flex items-center justify-end">
          <p className="text-sm text-muted-foreground">用代码守护每一只喵</p>
        </header>
    
        <section className="team-panel flex flex-col gap-6 rounded-2xl border border-border bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:p-8 lg:gap-10 lg:p-10" aria-labelledby="team-title">
          <div className="team-logo-tile flex size-28 shrink-0 items-center justify-center rounded-2xl border border-border bg-white/70 p-3 sm:size-40 lg:size-44">
            <img src={logo} alt="猫猫图鉴" className="size-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-sm font-semibold tracking-widest">校园猫咪管理平台 </p>
            <h1 id="team-title" className="text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">学生在线（软件园校区）</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 lg:text-lg">建立流浪猫电子档案，普及科学喂养，提升救助效率，让每一份善意都有迹可循。</p>
          </div>
        </section>
    
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:gap-8">
          <section className="team-panel overflow-hidden rounded-2xl border border-border bg-card text-card-foreground" aria-labelledby="disciplines-title">
            <header className="team-panel-header flex flex-wrap items-center justify-between gap-3 border-b border-border p-6 sm:p-8">
              <h2 id="disciplines-title" className="text-xl font-bold">团队分工</h2>
              <p className="text-sm  font-bold ">学生在线（软件园校区）</p>
            </header>
            <div className="grid sm:grid-cols-2">
              {disciplines.map((discipline) => (
                <article key={discipline.name} className="team-discipline border-b border-border p-6 last:border-b-0 sm:p-8">
                  <h3 className="text-lg font-semibold">{discipline.name}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{discipline.description}</p>
                </article>
              ))}
            </div>
          </section>
    
          <aside className="flex flex-col gap-6">
            <section className="team-panel rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8" aria-labelledby="contact-title">
              <h2 id="contact-title" className="text-xl font-bold">联系我们</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">加入群聊，和我们一起记录校园里的温暖。</p>
              <GroupQrCode />
            </section>
            <section className="team-panel rounded-2xl border border-border bg-card p-6 text-card-foreground sm:p-8" aria-labelledby="thanks-title">
              <Heart className="mb-4 size-6 text-destructive" aria-hidden="true" />
              <h2 id="thanks-title" className="text-xl font-bold">特别感谢</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">感谢每一位为校园猫咪救助与领养事业付出努力的同学、志愿者与铲屎官们。</p>
            </section>
          </aside>
        </div>
        <footer className="pb-2 text-center text-xs leading-6 text-muted-foreground">学生在线网络文化工作室 · 用代码守护每一只喵</footer>
      </div>
  )
}
