import { useState } from 'react'
import { certifications, projects, skillBags } from '../../data/portfolio'
import { store } from '../../state/store'
import { PixelIcon } from '../PixelIcon'
import { Panel } from './Panel'

/** Skills as an RPG inventory: bags (categories) → item slots → item card. */
export function SkillsPanel() {
  const [bagId, setBagId] = useState(skillBags[0].id)
  const bag = skillBags.find((b) => b.id === bagId) ?? skillBags[0]
  const [itemName, setItemName] = useState(bag.items[0].name)
  const item = bag.items.find((i) => i.name === itemName) ?? bag.items[0]
  const found = (item.usedIn ?? []).map((id) => projects.find((p) => p.id === id)).filter(Boolean)

  const pickBag = (id: string) => {
    const b = skillBags.find((x) => x.id === id)!
    setBagId(id)
    setItemName(b.items[0].name)
  }

  return (
    <Panel title="Workshop Inventory" eyebrow="Skills · tools of the trade" icon="hammer">
      <div className="inventory">
        <div className="bags" role="tablist" aria-label="Skill categories">
          {skillBags.map((b, i) => (
            <button
              key={b.id}
              role="tab"
              className="bag"
              aria-selected={b.id === bagId}
              onClick={() => pickBag(b.id)}
              data-autofocus={i === 0 ? true : undefined}
            >
              <PixelIcon name={b.icon} scale={3} tint={b.color} />
              <span>{b.name}</span>
              <span className="count">{b.items.length}</span>
            </button>
          ))}
        </div>

        <div className="slots" role="listbox" aria-label={`${bag.name} items`}>
          {bag.items.map((it) => (
            <button
              key={it.name}
              role="option"
              aria-selected={it.name === item.name}
              className="slot frame frame--slot"
              onClick={() => setItemName(it.name)}
              onFocus={() => setItemName(it.name)}
            >
              <PixelIcon name={bag.icon} scale={4} tint={bag.color} />
              <span className="glyph">{it.glyph}</span>
              <span className="name">{it.name}</span>
            </button>
          ))}
        </div>

        <aside className="item-card frame frame--dim" aria-live="polite">
          <div className="big">
            <PixelIcon name={bag.icon} scale={6} tint={bag.color} />
            <div>
              <h3>{item.name}</h3>
              <span className="type">{bag.name}</span>
            </div>
          </div>
          {item.note && <p className="body-text" style={{ margin: 0 }}>{item.note}</p>}
          {found.length > 0 ? (
            <div className="found">
              <span className="section-label" style={{ margin: '4px 0 2px' }}>Found in quests</span>
              {found.map((p) => (
                <button key={p!.id} onClick={() => store.openPanel('projects', p!.id)}>
                  <PixelIcon name="board" scale={2} /> {p!.title}
                </button>
              ))}
            </div>
          ) : (
            !item.note && <p className="body-text" style={{ margin: 0, fontSize: 16 }}>Carried on every trip — part of the everyday kit.</p>
          )}
        </aside>
      </div>

      <h3 className="section-label" style={{ marginTop: 22 }}>Badges earned</h3>
      <div className="badges">
        {certifications.map((c) => (
          <div className="badge-card frame frame--dim" key={c.name}>
            <span className={`badge-medal ${c.when === 'In progress' ? 'is-progress' : ''}`}>{c.when === 'In progress' ? '…' : '★'}</span>
            <div>
              <b>{c.name}</b>
              <span>{c.issuer} · {c.when}</span>
              <span style={{ color: 'var(--ink-dim)', margin: '4px 0' }}>{c.detail}</span>
              {c.url && <a href={c.url} target="_blank" rel="noreferrer">Verify credential ↗</a>}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}
