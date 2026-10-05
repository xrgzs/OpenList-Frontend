import { createSignal, onCleanup, onMount, Show } from "solid-js"
import { BoxWithFullScreen, Error as Erro, FullLoading } from "~/components"
import { objStore } from "~/store"
import { loadCSS } from "~/utils"

const OFV_CSS_URL =
  "https://esm.sh/@open-file-viewer/core@latest/dist/style.css"
const OFV_CORE_URL = "https://esm.sh/@open-file-viewer/core@latest"
const PDF_WORKER_URL =
  "https://esm.sh/pdfjs-dist@latest/build/pdf.worker.mjs?url"

const OpenFileViewerPreview = () => {
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  let containerRef: HTMLDivElement | undefined
  let viewerInstance: any = null

  const initViewer = async () => {
    try {
      setLoading(true)
      setError(null)

      // 加载 CSS
      await loadCSS(OFV_CSS_URL, "open-file-viewer-style")

      // 动态导入 core 模块
      const core = await import(/* @vite-ignore */ OFV_CORE_URL)

      const fileName = objStore.obj.name
      const fileUrl = objStore.raw_url

      if (!fileUrl) {
        throw new Error("No file URL available")
      }

      // 获取文件
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }
      const blob = await response.blob()
      const file = new File([blob], fileName, { type: blob.type })

      // 加载所有插件
      const plugins: any[] = [
        core.imagePlugin(),
        core.videoPlugin(),
        core.audioPlugin(),
        core.textPlugin(),
        core.pdfPlugin(),
        core.epubPlugin(),
        core.xpsPlugin(),
        core.officePlugin(),
        core.ofdPlugin(),
        core.archivePlugin(),
        core.assetPlugin(),
        core.emailPlugin(),
        core.drawingPlugin(),
        core.cadPlugin(),
        core.model3dPlugin(),
        core.gisPlugin(),
        core.assetPlugin(),
      ]

      try {
        plugins.push(core.pdfPlugin({ workerSrc: PDF_WORKER_URL }))
      } catch {
        /* skip */
      }

      // 创建 viewer
      if (containerRef) {
        viewerInstance = core.createViewer({
          container: containerRef,
          file,
          fileName,
          width: "100%",
          height: "100%",
          fit: "contain",
          toolbar: true,
          theme: "auto",
          plugins,
        })
      }

      setLoading(false)
    } catch (e) {
      console.error("OpenFileViewer init failed:", e)
      setError(e instanceof Error ? e.message : "Unknown error")
      setLoading(false)
    }
  }

  onMount(() => {
    initViewer()
  })

  onCleanup(() => {
    try {
      viewerInstance?.destroy?.()
    } catch {
      /* ignore */
    }
  })

  return (
    <BoxWithFullScreen w="$full" h="70vh" pos="relative">
      {/* 预览容器 */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
          position: "relative",
          display: loading() || error() ? "none" : "block",
        }}
      />

      {/* 加载状态 */}
      <Show when={loading()}>
        <FullLoading />
      </Show>

      {/* 错误状态 */}
      <Show when={error()}>
        <Erro msg={error()!} />
      </Show>
    </BoxWithFullScreen>
  )
}

export default OpenFileViewerPreview
