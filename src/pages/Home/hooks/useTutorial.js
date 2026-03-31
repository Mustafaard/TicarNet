import { useCallback, useEffect } from 'react'
import {
  TUTORIAL_COMPLETED_KEY,
  TUTORIAL_PENDING_KEY,
  TUTORIAL_SPOTLIGHT_CLASS,
  TUTORIAL_STEPS,
  TUTORIAL_STEP_KEY,
  TUTORIAL_TASKS_KEY,
} from '../constants.js'
import {
  buildTutorialTasksForStep,
  clamp,
  num,
} from '../utils.js'

export function useTutorial({
  openTabRef,
  setNotice,
  setNoticeIsSuccess,
  setTab,
  setTutorialActive,
  setTutorialCompleted,
  setTutorialEnabled,
  setTutorialNavPending,
  setTutorialPending,
  setTutorialStepIndex,
  setTutorialTaskState,
  tab,
  tutorialActive,
  tutorialAutoTriedRef,
  tutorialCompleted,
  tutorialEnabled,
  tutorialNavPending,
  tutorialPending,
  tutorialSpotlightTimerRef,
  tutorialStepIndex,
  tutorialTaskState,
}) {
const clearTutorialPendingFlag = useCallback(() => {
  try {
    window.localStorage.removeItem(TUTORIAL_PENDING_KEY)
    window.localStorage.removeItem('ticarnet_live_narrator_welcome')
  } catch {
    // ignore storage errors
  }
  setTutorialEnabled(true)
  setTutorialPending(false)
}, [])

const markTutorialCompleted = useCallback(() => {
  try {
    window.localStorage.setItem(TUTORIAL_COMPLETED_KEY, '1')
    window.localStorage.removeItem(TUTORIAL_PENDING_KEY)
    window.localStorage.removeItem(TUTORIAL_STEP_KEY)
    window.localStorage.removeItem(TUTORIAL_TASKS_KEY)
    window.localStorage.removeItem('ticarnet_live_narrator_welcome')
  } catch {
    // ignore storage errors
  }
  setTutorialTaskState({})
  setTutorialEnabled(true)
  setTutorialCompleted(true)
  setTutorialPending(false)
  setTutorialActive(false)
}, [])

const getTutorialStepMetaByIndex = useCallback((index) => {
  const safeIndex = clamp(Math.trunc(num(index || 0)), 0, Math.max(0, TUTORIAL_STEPS.length - 1))
  const step = TUTORIAL_STEPS[safeIndex] || TUTORIAL_STEPS[0] || {}
  const rawStepId = String(step?.id || `step-${safeIndex + 1}`).trim()
  const stepId = rawStepId || `step-${safeIndex + 1}`
  const tasks = buildTutorialTasksForStep(step)
  return { safeIndex, step, stepId, tasks }
}, [])

const startTutorial = useCallback((options = {}) => {
  const lastIndex = Math.max(0, TUTORIAL_STEPS.length - 1)
  const initialStep = clamp(Math.trunc(num(options?.step || 0)), 0, lastIndex)
  const resetProgress = options?.resetProgress !== false
  try {
    window.localStorage.removeItem(TUTORIAL_COMPLETED_KEY)
    window.localStorage.removeItem(TUTORIAL_PENDING_KEY)
    window.localStorage.setItem(TUTORIAL_STEP_KEY, String(initialStep))
    if (resetProgress) {
      window.localStorage.removeItem(TUTORIAL_TASKS_KEY)
    }
    window.localStorage.removeItem('ticarnet_live_narrator_welcome')
  } catch {
    // ignore storage errors
  }
  if (resetProgress) {
    setTutorialTaskState({})
  }
  setTutorialEnabled(true)
  setTutorialPending(false)
  setTutorialCompleted(false)
  setTutorialStepIndex(initialStep)
  setTutorialActive(true)
  tutorialAutoTriedRef.current = true
}, [])

const closeTutorial = useCallback(() => {
  setTutorialActive(false)
}, [])

const focusTutorialTarget = useCallback((target) => {
  if (typeof document === 'undefined') return
  const selector = String(target?.selector || '').trim()
  if (!selector) return
  clearTimeout(tutorialSpotlightTimerRef.current)
  let attempts = 0
  const tryFocus = () => {
    const node = document.querySelector(selector)
    if (!node) {
      if (attempts >= 14) return
      attempts += 1
      tutorialSpotlightTimerRef.current = window.setTimeout(tryFocus, 130)
      return
    }
    if (node?.scrollIntoView) {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }
    node.classList.add(TUTORIAL_SPOTLIGHT_CLASS)
    tutorialSpotlightTimerRef.current = window.setTimeout(() => {
      node.classList.remove(TUTORIAL_SPOTLIGHT_CLASS)
    }, 1700)
  }
  tryFocus()
}, [])

const openTutorialTargetForStep = useCallback(async (stepIndex, options = {}) => {
  const { step } = getTutorialStepMetaByIndex(stepIndex)
  const target = step?.target
  if (!target?.tab || tutorialNavPending) return false
  setTutorialNavPending(true)
  try {
    await openTabRef.current(target.tab, target)
    if (options.closeOverlay === true) {
      setTutorialActive(false)
    }
    focusTutorialTarget(target)
    if (options.announce !== false) {
      const focusLabel = String(target?.focusLabel || '').trim()
      const focusText = focusLabel ? `${focusLabel} odağına yönlendirildin.` : 'Hedef bölüme yönlendirildin.'
      setNotice(
        `${step?.title || 'Rehber'} adımı açıldı. ${focusText} Bu bölümdeki adımları tamamladıktan sonra üstteki "Sonraki" düğmesiyle devam edebilirsin.`,
      )
      setNoticeIsSuccess(true)
    }
    return true
  } finally {
    setTutorialNavPending(false)
  }
}, [
  focusTutorialTarget,
  getTutorialStepMetaByIndex,
  tutorialNavPending,
])

const goTutorialPrev = useCallback(() => {
  const prevIndex = Math.max(0, tutorialStepIndex - 1)
  if (prevIndex === tutorialStepIndex) return
  setTutorialStepIndex(prevIndex)
  void openTutorialTargetForStep(prevIndex, { closeOverlay: false, announce: true })
}, [openTutorialTargetForStep, tutorialStepIndex])

const goTutorialNext = useCallback(() => {
  const lastIndex = Math.max(0, TUTORIAL_STEPS.length - 1)
  if (tutorialStepIndex >= lastIndex) {
    markTutorialCompleted()
    setNotice('Rehber başarıyla tamamlandı.')
    return
  }
  const nextIndex = Math.min(lastIndex, tutorialStepIndex + 1)
  setTutorialStepIndex(nextIndex)
  void openTutorialTargetForStep(nextIndex, { closeOverlay: false, announce: true })
}, [
  markTutorialCompleted,
  openTutorialTargetForStep,
  tutorialStepIndex,
])

useEffect(() => {
  if (!tutorialEnabled || tutorialCompleted) return
  try {
    const safe = clamp(Math.trunc(num(tutorialStepIndex)), 0, Math.max(0, TUTORIAL_STEPS.length - 1))
    window.localStorage.setItem(TUTORIAL_STEP_KEY, String(safe))
  } catch {
    // ignore storage errors
  }
}, [tutorialCompleted, tutorialEnabled, tutorialStepIndex])

useEffect(() => {
  if (!tutorialEnabled || tutorialCompleted) return
  try {
    window.localStorage.setItem(TUTORIAL_TASKS_KEY, JSON.stringify(tutorialTaskState || {}))
  } catch {
    // ignore storage errors
  }
}, [tutorialCompleted, tutorialEnabled, tutorialTaskState])

useEffect(() => {
  if (!tutorialPending || tutorialCompleted) return undefined
  if (tutorialAutoTriedRef.current) return undefined
  tutorialAutoTriedRef.current = true
  const timeoutId = window.setTimeout(() => {
    if (tab !== 'home') {
      setTab('home')
    }
    setTutorialStepIndex(0)
    setTutorialActive(true)
    clearTutorialPendingFlag()
  }, 120)
  return () => window.clearTimeout(timeoutId)
}, [clearTutorialPendingFlag, tab, tutorialCompleted, tutorialPending])

useEffect(() => {
  if (!tutorialActive || typeof window === 'undefined') return undefined
  const onKeyDown = (event) => {
    const targetTag = String(event?.target?.tagName || '').toLowerCase()
    const isTypingField = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select'
    if (isTypingField) return
    if (event.key === 'Escape') {
      event.preventDefault()
      closeTutorial()
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      goTutorialNext()
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goTutorialPrev()
    }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [closeTutorial, goTutorialNext, goTutorialPrev, tutorialActive])

  return {
    clearTutorialPendingFlag,
    closeTutorial,
    focusTutorialTarget,
    getTutorialStepMetaByIndex,
    goTutorialNext,
    goTutorialPrev,
    markTutorialCompleted,
    openTutorialTargetForStep,
    startTutorial,
  }
}
