import { useState, type FormEvent } from 'react'
import { links, profile } from '../../data/portfolio'
import { PixelIcon } from '../PixelIcon'
import type { IconName } from '../pixelArt'
import { Panel } from './Panel'

export function ContactPanel() {
  const [copied, setCopied] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const rows: { icon: IconName; label: string; text: string; href: string }[] = [
    { icon: 'mail', label: 'Email', text: links.email, href: `mailto:${links.email}` },
    { icon: 'github', label: 'GitHub', text: links.github.replace(/^https?:\/\//, ''), href: links.github },
    { icon: 'linkedin', label: 'LinkedIn', text: 'Abdullah Bokhary', href: links.linkedin },
    { icon: 'globe', label: 'Previous portfolio', text: links.portfolio.replace(/^https?:\/\//, '').replace(/\/$/, ''), href: links.portfolio },
    ...links.social.map((s) => ({ icon: 'globe' as IconName, label: s.label, text: s.url.replace(/^https?:\/\//, ''), href: s.url })),
  ]
  if (links.phone) rows.push({ icon: 'house', label: 'Phone', text: links.phone, href: `tel:${links.phone.replace(/\s/g, '')}` })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(links.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${links.email}`
    }
  }

  const send = (e: FormEvent) => {
    e.preventDefault()
    const body = `${message}\n\n— ${name || 'A visitor from the campsite'}`
    const url = `mailto:${links.email}?subject=${encodeURIComponent(subject || 'Hello from your campsite')}&body=${encodeURIComponent(body)}`
    window.location.href = url
  }

  return (
    <Panel title="The Cabin" eyebrow="Contact · the lights are on" icon="house">
      <div className="contact">
        <section>
          <h3 className="section-label">Say hello</h3>
          <p className="body-text" style={{ marginTop: 0 }}>
            Open to <strong>{profile.lookingFor.replace(/\.$/, '')}</strong>. Based in {profile.location}.
          </p>
          <ul className="links">
            {rows.map((r, i) => (
              <li className="link-row" key={r.label}>
                <PixelIcon name={r.icon} scale={3} />
                <div className="grow">
                  <span className="lbl">{r.label}</span>
                  <a href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" data-autofocus={i === 0 ? true : undefined}>{r.text}</a>
                </div>
                {r.label === 'Email' && (
                  <button className="px-btn px-btn--icon" onClick={copy} aria-label="Copy email address" title="Copy">
                    <PixelIcon name={copied ? 'check' : 'copy'} scale={2} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p aria-live="polite" style={{ minHeight: 20, margin: '8px 0 0', fontFamily: 'var(--font-mono)', fontSize: 17, color: 'var(--teal)' }}>
            {copied ? 'Email copied to your clipboard.' : ''}
          </p>
        </section>

        <form className="letter frame frame--paper" onSubmit={send}>
          <h3 className="section-label" style={{ color: '#6e3a2a' }}>Write a letter</h3>
          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label>
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Hello from your campsite" />
          </label>
          <label>
            Message
            <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </label>
          <div className="sig">
            <span className="note">Opens your email app with the letter ready.</span>
            <button className="px-btn px-btn--gold" type="submit">
              <PixelIcon name="mail" scale={2} /> Send
            </button>
          </div>
        </form>
      </div>
    </Panel>
  )
}
