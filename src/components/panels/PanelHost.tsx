import { useStore } from '../../state/store'
import { AboutPanel } from './AboutPanel'
import { ContactPanel } from './ContactPanel'
import { ProjectBoard } from './ProjectBoard'
import { ResumePanel } from './ResumePanel'
import { SkillsPanel } from './SkillsPanel'

/** Renders whichever section the player opened in the world. */
export function PanelHost() {
  const panel = useStore((s) => s.panel)
  const arg = useStore((s) => s.panelArg)
  switch (panel) {
    case 'about': return <AboutPanel />
    case 'projects': return <ProjectBoard key={arg ?? 'board'} />
    case 'skills': return <SkillsPanel />
    case 'contact': return <ContactPanel />
    case 'resume': return <ResumePanel />
    default: return null
  }
}
