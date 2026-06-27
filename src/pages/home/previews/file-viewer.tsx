import { createSignal, onMount, onCleanup, Show } from "solid-js"
import { useColorMode } from "@hope-ui/solid"
import { objStore } from "~/store"
import { BoxWithFullScreen, FullLoading, Error as Erro } from "~/components"
import { useT } from "~/hooks"
import { loadScriptIIFE } from "~/utils"

const CDN_URL =
  "https://cdn.jsdelivr.net/npm/@file-viewer/web-full@latest/dist/flyfish-file-viewer-web-full.iife.js"

interface ViewerController {
  destroy: () => void
}

declare global {
  interface Window {
    FlyfishFileViewerWebFull?: {
      mountViewer: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => ViewerController
    }
  }
}

const FileViewerPreview = () => {
  const t = useT()
  const { colorMode } = useColorMode()
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal(false)
  let containerRef: HTMLDivElement | undefined
  let controller: ViewerController | undefined

  onMount(async () => {
    if (!containerRef) return
    try {
      setLoading(true)
      setError(false)

      const src = objStore.raw_url
      if (!src) {
        throw new Error("No file URL available")
      }

      await loadScriptIIFE(CDN_URL, "flyfish-file-viewer-web-full")

      if (!window.FlyfishFileViewerWebFull) {
        throw new Error(
          "FlyfishFileViewerWebFull not available after script load",
        )
      }

      controller = window.FlyfishFileViewerWebFull.mountViewer(containerRef, {
        url: src,
        options: {
          theme: colorMode(),
        },
      })

      setLoading(false)
    } catch (e) {
      console.error("FileViewer init failed:", e)
      setError(true)
      setLoading(false)
    }
  })

  onCleanup(() => {
    controller?.destroy()
  })

  return (
    <BoxWithFullScreen w="$full" h="70vh" pos="relative">
      <Show when={loading()}>
        <FullLoading />
      </Show>
      <Show when={error()}>
        <Erro msg={t("home.preview.file_viewer_error")} h="70vh" />
      </Show>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          display: loading() || error() ? "none" : "block",
        }}
      />
    </BoxWithFullScreen>
  )
}

export default FileViewerPreview
