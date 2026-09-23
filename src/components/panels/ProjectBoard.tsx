import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { projectCategories, projects, type Project, type ProjectCategory } from '../../data/portfolio'
import { assetUrl } from '../../game/assets'
import { useStore } from '../../state/store'
import { PixelIcon } from '../PixelIcon'
import { projectArtURL } from '../pixelArt'
import { Panel } from './Panel'

const KIND: Record<ProjectCategory, string> = {
  worlds: 'Interactive world',
  tools: 'Tool for real people',
  lab: 'AI & security lab',
}

/** Real screenshot if there is one, otherwise the quest's pixel illustration. */
function QuestImage({ p, className }: { p: Project; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (p.image && !failed)
    return <img className={className} src={assetUrl(p.image)} alt={`Screenshot of ${p.title}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
  return <img className={`${className ?? ''} pixelated`} src={projectArtURL(p.art)} alt={`Pixel illustration for ${p.title}`} />
}

export function ProjectBoard() {
  const arg = useStore((s) => s.panelArg)
  const [filter, setFilter] = useState<ProjectCategory | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(arg)
  const lastFocus = useRef<string | null>(null)
  const list = useMemo(() => (filter === 'all' ? projects : projects.filter((p) => p.category === filter)), [filter])
  const current = projects.find((p) => p.id === openId) ?? null
  const idx = current ? list.findIndex((p) => p.id === current.id) : -1

  useEffect(() => {
    if (openId) {
      document.querySelector<HTMLElement>('.detail-nav [data-autofocus]')?.focus({ preventScroll: true })
      document.querySelector('.panel-body')?.scrollTo({ top: 0 })
      return
    }
    const id = lastFocus.current
    if (id) document.querySelector<HTMLElement>(`[data-quest="${id}"]`)?.focus({ preventScroll: true })
  }, [openId])

  const step = (d: number) => {
    const pool = idx >= 0 ? list : projects
    const i = pool.findIndex((p) => p.id === current?.id)
    const next = pool[(i + d + pool.length) % pool.length]
    setOpenId(next.id)
  }

  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onGridKey = (e: ReactKeyboardEvent) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']
    if (!keys.includes(e.key)) return
    const items = [...document.querySelectorAll<HTMLElement>('[data-quest]')]
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    e.preventDefault()
    const cols = Math.max(1, Math.round((e.currentTarget as HTMLElement).clientWidth / (items[0].offsetWidth + 18)))
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? cols : -cols
    items[Math.max(0, Math.min(items.length - 1, i + d))]?.focus()
  }

  return (
    <Panel
      title={current ? current.title : 'Quest Board'}
      eyebrow={current ? KIND[current.category] : 'Projects · pinned by the fire'}
      icon="board"
      onEscape={() => {
        if (current) { setOpenId(null); return true }
        return false
      }}
    >
      {!current && (
        <>
          <div className="quest-tabs" role="toolbar" aria-label="Filter quests">
            {projectCategories.map((c) => (
              <button key={c.id} className="px-btn" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="corkboard">
            <div className="quests" onKeyDown={onGridKey}>
              {list.map((p, i) => (
                <button
                  key={p.id}
                  className="quest frame frame--paper"
                  data-quest={p.id}
                  data-autofocus={i === 0 ? true : undefined}
                  onClick={() => { lastFocus.current = p.id; setOpenId(p.id) }}
                >
                  <span className="pin"><PixelIcon name="pin" scale={3} /></span>
                  <QuestImage p={p} className="thumb" />
                  <span className="kind">{KIND[p.category]}</span>
                  <h3>{p.title}</h3>
                  <p>{p.tagline}</p>
                  <span className="go">Read quest →</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {current && (
        <article>
          <div className="detail-nav">
            <button className="px-btn" onClick={() => setOpenId(null)} data-autofocus>
              <PixelIcon name="back" scale={2} /> Board
            </button>
            <span className="count">{(idx >= 0 ? idx : projects.indexOf(current)) + 1} / {idx >= 0 ? list.length : projects.length}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="px-btn px-btn--icon" onClick={() => step(-1)} aria-label="Previous quest">◀</button>
              <button className="px-btn px-btn--icon" onClick={() => step(1)} aria-label="Next quest">▶</button>
            </div>
          </div>
          <div className="quest-detail">
            <figure className="shot" style={{ margin: 0 }}>
              <QuestImage p={current} key={current.id} />
              <figcaption>{current.image ? 'Screenshot from the live site' : 'Field sketch'} · {current.year}</figcaption>
            </figure>
            <div className="quest-meta">
              <h3>{current.title}</h3>
              <p className="tag">{current.tagline}</p>
              <p className="body-text" style={{ margin: 0 }}>{current.description}</p>
              <ul className="bullets">
                {current.highlights.map((h) => <li key={h}>{h}</li>)}
              </ul>
              <h4 className="section-label">Equipment</h4>
              <div className="tech">
                {current.tech.map((t) => <span className="chip" key={t}>{t}</span>)}
              </div>
              <div className="actions">
                {current.demo && (
                  <a className="px-btn px-btn--gold" href={current.demo} target="_blank" rel="noreferrer">
                    <PixelIcon name="external" scale={2} /> Live demo
                  </a>
                )}
                {current.github && (
                  <a className="px-btn" href={current.github} target="_blank" rel="noreferrer">
                    <PixelIcon name="github" scale={2} /> Source
                  </a>
                )}
              </div>
            </div>
          </div>
        </article>
      )}
    </Panel>
  )
}
