import { IconButton, Tooltip, useColorMode } from "@hope-ui/solid"
import { createShortcut } from "@solid-primitives/keyboard"
import { useBeforeLeave } from "@solidjs/router"
import { TbDeviceFloppy } from "solid-icons/tb"
import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js"
import { BoxWithFullScreen, Error as Erro, FullLoading } from "~/components"
import { useCDN, useRouter, useT } from "~/hooks"
import { StreamUpload } from "~/pages/home/uploads/stream"
import { objStore, userCan } from "~/store"
import { loadCSS, notify } from "~/utils"

const ExcalidrawEditor = () => {
  const t = useT()
  const { colorMode } = useColorMode()
  const { npm } = useCDN()
  const { pathname } = useRouter()
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const [modified, setModified] = createSignal(false)
  const [saving, setSaving] = createSignal(false)
  let containerRef: HTMLDivElement | undefined
  let reactRoot: { unmount: () => void; render: (el: any) => void } | undefined
  let latestElements: any[] = []
  let latestAppState: any = {}
  let latestFiles: any = {}
  let excalidrawApiRef: any = null
  let serializeAsJSON: ((elements: any[], appState: any) => string) | null =
    null

  const canWrite = createMemo(
    () =>
      (userCan("write_content") || objStore.write_content_bypass) &&
      objStore.write !== false,
  )

  if (canWrite()) {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      if (modified()) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", beforeUnloadHandler)
    onCleanup(() =>
      window.removeEventListener("beforeunload", beforeUnloadHandler),
    )

    useBeforeLeave((e) => {
      if (modified()) {
        if (!window.confirm(t("global.unsaved_changes_confirm"))) {
          e.preventDefault()
        }
      }
    })

    createShortcut(["Control", "S"], (e: KeyboardEvent | null) => {
      e?.preventDefault()
      onSave()
    })
    createShortcut(["Meta", "S"], (e: KeyboardEvent | null) => {
      e?.preventDefault()
      onSave()
    })
  }

  async function onSave() {
    if (!canWrite() || !modified() || saving()) return
    setSaving(true)
    try {
      const json = serializeAsJSON
        ? serializeAsJSON(latestElements, latestAppState)
        : JSON.stringify({ elements: latestElements }, null, 2)
      const file = new File([json], objStore.obj.name, {
        type: "application/json",
      })
      await StreamUpload(pathname(), file, () => {}, false, true, false)
      notify.success(t("global.save_success"))
      setModified(false)
    } catch (e: any) {
      notify.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  onMount(async () => {
    if (!containerRef) return
    try {
      setLoading(true)
      setError(null)

      await loadCSS(
        npm("@excalidraw/excalidraw", "0.18.0", "dist/dev/index.css"),
        "excalidraw-css",
      )

      // Hide the built-in help icon and library (no official props for these;
      // library import is broken in CDN mode — #addLibrary callback chain is missing)
      if (!document.getElementById("excalidraw-custom-css")) {
        const style = document.createElement("style")
        style.id = "excalidraw-custom-css"
        style.textContent = [
          `.excalidraw .help-icon { display: none !important; }`,
          `.excalidraw .sidebar-trigger { display: none !important; }`,
        ].join("\n")
        document.head.appendChild(style)
      }

      window.EXCALIDRAW_ASSET_PATH = npm(
        "@excalidraw/excalidraw",
        "0.18.0",
        "dist/prod",
      )

      const React = await import(
        // @ts-ignore
        /* @vite-ignore */ "https://esm.sh/react@19.0.0"
      )
      const ReactDOM = await import(
        // @ts-ignore
        /* @vite-ignore */ "https://esm.sh/react-dom@19.0.0/client"
      )
      // @ts-ignore external ESM CDN
      const ExcalidrawModule = await import(
        // @ts-ignore
        /* @vite-ignore */ "https://esm.sh/@excalidraw/excalidraw@0.18.0?deps=react@19.0.0,react-dom@19.0.0"
      )

      const { Excalidraw, serializeAsJSON: _serialize } =
        ExcalidrawModule as any
      if (!Excalidraw) {
        throw new Error("Excalidraw component not found in module")
      }
      serializeAsJSON = _serialize

      // Load file content
      const fileUrl = objStore.raw_url
      if (fileUrl) {
        try {
          const response = await fetch(fileUrl)
          if (response.ok) {
            const data = await response.json()
            latestElements = data.elements || []
            // appState contains runtime-only fields like collaborators (a Map),
            // which break when round-tripped through JSON. Only keep serialisable bits.
            const { collaborators, ...safeAppState } = data.appState || {}
            latestAppState = safeAppState
            latestFiles = data.files || {}
          }
        } catch {
          // invalid json, start empty
        }
      }

      reactRoot = ReactDOM.createRoot(containerRef)
      reactRoot!.render(
        React.createElement(Excalidraw, {
          initialData: {
            elements: latestElements,
            ...(Object.keys(latestAppState).length
              ? { appState: latestAppState }
              : {}),
            ...(Object.keys(latestFiles).length ? { files: latestFiles } : {}),
          },
          excalidrawAPI: (api: any) => {
            excalidrawApiRef = api
          },
          onChange: (elements: any[], appState: any, files: any) => {
            latestElements = elements
            latestAppState = appState
            latestFiles = files
            if (!modified()) setModified(true)
          },
          langCode: navigator.language?.startsWith("zh") ? "zh-CN" : "en",
          theme: colorMode() === "dark" ? "dark" : "light",
        }),
      )

      // Switch theme without re-rendering when color mode changes
      createEffect(() => {
        const theme = colorMode() === "dark" ? "dark" : "light"
        if (excalidrawApiRef) {
          excalidrawApiRef.updateScene({ appState: { theme } })
        }
      })
      setLoading(false)
    } catch (e: any) {
      console.error("Excalidraw init failed:", e)
      setError(e?.message || "Failed to load Excalidraw")
      setLoading(false)
    }
  })

  onCleanup(() => {
    if (reactRoot) {
      try {
        reactRoot.unmount()
      } catch {
        // ignore
      }
      reactRoot = undefined
    }
    document.getElementById("excalidraw-css")?.remove()
    document.getElementById("excalidraw-custom-css")?.remove()
  })

  return (
    <BoxWithFullScreen
      w="$full"
      h="70vh"
      pos="relative"
      extraButtons={
        <Show when={canWrite()}>
          <Tooltip label={`${t("global.save")} (Ctrl+S)`} withArrow>
            <IconButton
              aria-label={t("global.save")}
              loading={saving()}
              disabled={!modified()}
              icon={<TbDeviceFloppy />}
              onClick={onSave}
              colorScheme="neutral"
              size="sm"
            />
          </Tooltip>
        </Show>
      }
    >
      <Show when={loading()}>
        <FullLoading />
      </Show>
      <Show when={error()}>
        <Erro msg={error()!} h="70vh" />
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

export default ExcalidrawEditor
