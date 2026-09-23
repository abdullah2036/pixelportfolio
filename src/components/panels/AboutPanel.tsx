import { links, profile } from '../../data/portfolio'
import { goTo } from '../../game/engineRef'
import { PixelIcon } from '../PixelIcon'
import { portraitURL } from '../pixelArt'
import { Panel } from './Panel'

export function AboutPanel() {
  return (
    <Panel title="About Me" eyebrow="The camp journal" icon="journal">
      <div className="journal">
        <aside className="journal-id">
          <div className="portrait frame--slot frame">
            <img src={portraitURL()} alt="Pixel-art portrait of the developer" className="pixelated" />
          </div>
          <div>
            <h3 className="id-name">{profile.name}</h3>
            <p className="id-role">{profile.focus}</p>
          </div>
          <ul className="id-meta">
            <li><PixelIcon name="location" scale={3} />{profile.location}</li>
            {profile.languages.map((l) => (
              <li key={l.name}><PixelIcon name="star" scale={2} />{l.name} — {l.level}</li>
            ))}
          </ul>
          <p className="seeking"><b>Looking for:</b> {profile.lookingFor}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="px-btn px-btn--gold" onClick={() => goTo('projects')} data-autofocus>
              <PixelIcon name="board" scale={2} /> See my work
            </button>
            <a className="px-btn" href={links.github} target="_blank" rel="noreferrer">
              <PixelIcon name="github" scale={2} /> GitHub
            </a>
          </div>
        </aside>

        <div>
          <h3 className="section-label">Hello</h3>
          <div className="body-text">
            {profile.summary.map((p, i) => (
              <p key={i} style={{ margin: '0 0 10px' }}>{p}</p>
            ))}
          </div>

          <div className="two-col" style={{ marginTop: 18 }}>
            <section>
              <h3 className="section-label">Education</h3>
              <div className="body-text">
                <strong>{profile.education.school}</strong>
                <div>{profile.education.degree}</div>
                <div style={{ color: 'var(--gold-hi)' }}>{profile.education.when}</div>
              </div>
              <div className="coursework">
                {profile.education.coursework.map((c) => <span className="chip" key={c}>{c}</span>)}
              </div>
            </section>
            <section>
              <h3 className="section-label">Side quests</h3>
              <ul className="achievements">
                {profile.achievements.map((a) => (
                  <li key={a.title}>
                    <PixelIcon name="star" scale={2} />
                    <div><b>{a.title}</b><span>{a.detail}</span></div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Panel>
  )
}
