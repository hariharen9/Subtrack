/**
 * SUBTRACK // UPDATE PROMPT (PWA)
 *
 * The service worker registers itself and, when a new build lands, the console
 * offers a deliberate reload instead of swapping the app underneath the user.
 */
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence, motion } from 'motion/react'
import { useUI } from '@/store/ui'
import { Led } from '@/components/ui/Signal'
import { CyberButton } from '@/components/ui/CyberButton'
import { IconClose } from '@/components/ui/Icons'

export function UpdatePrompt() {
  const pushToast = useUI((s) => s.pushToast)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for a new build every 30 minutes while the console is open.
      if (!registration) return
      window.setInterval(() => {
        void registration.update()
      }, 30 * 60 * 1000)
    },
    onRegisterError(error) {
      pushToast({
        kind: 'warn',
        label: 'OFFLINE SHELL UNAVAILABLE',
        text: error instanceof Error ? error.message : 'Service worker registration failed',
      })
    },
  })

  return (
    <AnimatePresence>
      {(needRefresh || offlineReady) && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
          className="fixed bottom-[86px] left-3 right-3 z-[65] border border-line2 bg-surface/95 backdrop-blur-[2px] md:left-auto md:right-5 md:w-[380px] lg:bottom-5"
          role="status"
        >
          <div className="flex items-start gap-3 p-3">
            <span className="mt-1">
              <Led signal={needRefresh ? 'magenta' : 'acid'} size="sm" pulse />
            </span>
            <div className="min-w-0 flex-1">
              <p className="micro text-fg">
                {needRefresh ? 'SYSTEM UPDATE AVAILABLE' : 'OFFLINE SHELL READY'}
              </p>
              <p className="meta mt-1 text-dim">
                {needRefresh
                  ? 'A newer build is cached. Reload to run it.'
                  : 'SUBTRACK will open without a network connection.'}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                {needRefresh && (
                  <CyberButton
                    variant="solid"
                    size="sm"
                    onClick={() => {
                      void updateServiceWorker(true)
                    }}
                  >
                    RELOAD CONSOLE
                  </CyberButton>
                )}
                <CyberButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNeedRefresh(false)
                    setOfflineReady(false)
                  }}
                >
                  DISMISS
                </CyberButton>
              </div>
            </div>
            <button
              type="button"
              className="p-1 text-faint transition-colors hover:text-fg"
              aria-label="Dismiss update notice"
              onClick={() => {
                setNeedRefresh(false)
                setOfflineReady(false)
              }}
            >
              <IconClose size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
