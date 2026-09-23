import { certifications, links, profile, projects } from '../../data/portfolio'
import { assetUrl } from '../../game/assets'
import { goTo } from '../../game/engineRef'
import { PixelIcon } from '../PixelIcon'
import { Panel } from './Panel'

/** The letter waiting in the dock mailbox: a preview plus open / download. */
export function ResumePanel() {
  const href = assetUrl(links.resume)
  return (
    <Panel title="Resume" eyebrow="Found in the mailbox on the dock" icon="scroll" narrow>
      <div className="resume">
        <article className="resume-paper frame frame--paper" aria-label="Resume preview">
          <h3>{profile.name}</h3>
          <p className="sub">{profile.focus} · {profile.location}</p>
          <p>{profile.summary[0]} {profile.summary[1]}</p>
          <hr />
          <h4>CERTIFICATIONS</h4>
          <ul>
            {certifications.map((c) => <li key={c.name}>{c.name} — {c.when}</li>)}
          </ul>
          <hr />
          <h4>SELECTED PROJECTS</h4>
          <ul>
            {projects.filter((p) => ['workbench', 'chess', 'eloria', 'zeroshot'].includes(p.id)).map((p) => <li key={p.id}>{p.title} — {p.tagline}</li>)}
          </ul>
          <hr />
          <h4>EDUCATION</h4>
          <p>{profile.education.school} — {profile.education.degree}, {profile.education.when}</p>
        </article>

        <div className="resume-side">
          <p className="body-text" style={{ margin: 0 }}>
            The full one-page resume, as a PDF. Open it in a new tab or keep a copy.
          </p>
          <a className="px-btn px-btn--gold" href={href} target="_blank" rel="noreferrer" data-autofocus>
            <PixelIcon name="external" scale={2} /> Open resume
          </a>
          <a className="px-btn" href={href} download={links.resumeFileName}>
            <PixelIcon name="download" scale={2} /> Download PDF
          </a>
          <div className="seeking" style={{ marginTop: 6 }}>Like what you see? The cabin up the cliff has my contact details.</div>
          <button className="px-btn px-btn--ghost" onClick={() => goTo('contact')}>
            <PixelIcon name="house" scale={2} /> Walk to the cabin
          </button>
        </div>
      </div>
    </Panel>
  )
}
