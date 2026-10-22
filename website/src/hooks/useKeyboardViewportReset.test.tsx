/**
 * useKeyboardViewportReset — after the iOS keyboard hides, the page must be
 * scrolled back to 0,0 (only while the dashboard shell is mounted).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardViewportReset } from './useKeyboardViewportReset'

type Listener = () => void

function installVisualViewport(height: number) {
  const listeners: Record<string, Listener[]> = {}
  const vv = {
    height,
    offsetTop: 0,
    addEventListener: (t: string, l: Listener) => { (listeners[t] ||= []).push(l) },
    removeEventListener: (t: string, l: Listener) => { listeners[t] = (listeners[t] || []).filter((x) => x !== l) },
  }
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: vv })
  return { vv, fire: (t: string) => (listeners[t] || []).forEach((l) => l()) }
}

describe('useKeyboardViewportReset', () => {
  let scrollTo: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    scrollTo = vi.fn()
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 40 })
    document.body.innerHTML = '<div data-testid="dashboard-shell"></div>'
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('resets scroll once the keyboard closes', () => {
    const { vv, fire } = installVisualViewport(500) // keyboard open
    renderHook(() => useKeyboardViewportReset())
    fire('resize')
    vi.advanceTimersByTime(1000)
    expect(scrollTo).not.toHaveBeenCalled() // never fight the pan while open

    vv.height = 800 // keyboard closed
    fire('resize')
    vi.advanceTimersByTime(1000)
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('does nothing while the keyboard is open, even on focusout', () => {
    installVisualViewport(500)
    renderHook(() => useKeyboardViewportReset())
    document.dispatchEvent(new Event('focusout'))
    vi.advanceTimersByTime(1000)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('leaves document scroll alone on routes without the dashboard shell', () => {
    const { vv, fire } = installVisualViewport(500)
    document.body.innerHTML = ''
    renderHook(() => useKeyboardViewportReset())
    fire('resize')
    vv.height = 800
    fire('resize')
    vi.advanceTimersByTime(1000)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('removes its listeners on unmount', () => {
    const { vv, fire } = installVisualViewport(500)
    const { unmount } = renderHook(() => useKeyboardViewportReset())
    fire('resize')
    unmount()
    vv.height = 800
    fire('resize')
    vi.advanceTimersByTime(1000)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
