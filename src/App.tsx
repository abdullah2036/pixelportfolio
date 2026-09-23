import { AudioController } from './components/AudioController'
import { DialogueBox } from './components/DialogueBox'
import { GameWorld } from './components/GameWorld'
import { HUD } from './components/HUD'
import { NavMenu } from './components/NavMenu'
import { InteractionPrompt, ThoughtBubble } from './components/Overlays'
import { PanelHost } from './components/panels/PanelHost'
import { PixelIcon } from './components/PixelIcon'
import { TouchControls } from './components/TouchControls'
import { links, profile, projects } from './data/portfolio'
import { useStore } from './state/store'

function Loading() {
  const ready = useStore((s) => s.ready)
  return (
    <div className={`loading ${ready ? 'is-done' : ''}`} aria-hidden={ready}>
      <div className="inner">
        <div className="flame"><PixelIcon name="fire" scale={6} /></div>
        <p>Lighting the campfire…</p>
      </div>
    </div>
  )
}

/** Plain-text version of the portfolio for screen readers and search engines. */
function ScreenReaderSummary() {
  return (
    <div className="sr-only">
      <h1>{profile.name} — {profile.role}</h1>
      <p>{profile.summary.join(' ')}</p>
      <h2>Projects</h2>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            {p.title}: {p.tagline}. {p.demo && <a href={p.demo}>Live demo</a>} {p.github && <a href={p.github}>Source</a>}
          </li>
        ))}
      </ul>
      <p>
        Contact: <a href={`mailto:${links.email}`}>{links.email}</a>, <a href={links.github}>GitHub</a>, <a href={links.linkedin}>LinkedIn</a>.
      </p>
    </div>
  )
}

export default function App() {
  const ready = useStore((s) => s.ready)
  return (
    <>
      <GameWorld />
      <div className="vignette" />
      {ready && (
        <div className="hud">
          <HUD />
          <div className="corner">
            <NavMenu />
            <AudioController />
          </div>
        </div>
      )}
      {ready && <InteractionPrompt />}
      {ready && <ThoughtBubble />}
      <TouchControls />
      <DialogueBox />
      <PanelHost />
      <ScreenReaderSummary />
      <Loading />
    </>
  )
}
