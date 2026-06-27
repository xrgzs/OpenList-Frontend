import { IconButton, Tooltip, useColorMode } from "@hope-ui/solid"
import { createShortcut } from "@solid-primitives/keyboard"
import { TbDeviceFloppy } from "solid-icons/tb"
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js"
import { BoxWithFullScreen, Error as Erro, FullLoading } from "~/components"
import { useRouter, useT } from "~/hooks"
import { StreamUpload } from "~/pages/home/uploads/stream"
import { objStore, userCan } from "~/store"
import { notify } from "~/utils"

// https://github.com/jgraph/drawio-integration/blob/master/examples/embed-mode/diagram-editor.js
const DRAWIO_ORIGIN = "https://embed.diagrams.net"

const DrawioPreview = () => {
  const t = useT()
  const { pathname } = useRouter()
  const { colorMode } = useColorMode()
  const [loading, setLoading] = createSignal(true)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal(false)
  let iframeRef: HTMLIFrameElement | undefined
  let modified = false

  const canSave = createMemo(
    () =>
      (userCan("write_content") || objStore.write_content_bypass) &&
      objStore.write !== false,
  )

  const drawioUrl = () => {
    let url = `${DRAWIO_ORIGIN}/?proto=json&spin=1&libraries=1`
    if (!canSave()) {
      url += "&noSaveBtn=1&noExitBtn=1&saveAndExit=0"
    }
    return url
  }

  if (canSave()) {
    createShortcut(["Control", "S"], (e: KeyboardEvent | null) => {
      e?.preventDefault()
      doSave()
    })
    createShortcut(["Meta", "S"], (e: KeyboardEvent | null) => {
      e?.preventDefault()
      doSave()
    })
  }

  const postMessage = (msg: object) => {
    iframeRef?.contentWindow?.postMessage(JSON.stringify(msg), DRAWIO_ORIGIN)
  }

  const doSave = () => {
    if (!iframeRef || saving() || !canSave()) return
    postMessage({ action: "export", format: "xml" })
  }

  const handleMessage = async (e: MessageEvent) => {
    if (e.origin !== DRAWIO_ORIGIN) return

    let msg: any
    try {
      msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data
    } catch {
      return
    }

    if (msg.event === "init") {
      // draw.io is ready — load diagram following official protocol
      const fileUrl = objStore.raw_url
      if (fileUrl) {
        try {
          const response = await fetch(fileUrl)
          if (response.ok) {
            const xml = await response.text()
            postMessage({
              action: "load",
              xml,
              title: objStore.obj.name,
              dark: colorMode() === "dark" ? 1 : 0,
              ...(canSave() ? { autosave: 1, modified: "unsavedChanges" } : {}),
            })
          } else {
            postMessage({ action: "template", noExitOnCancel: true })
          }
        } catch {
          postMessage({ action: "template", noExitOnCancel: true })
        }
      } else {
        postMessage({ action: "template", noExitOnCancel: true })
      }
      setLoading(false)
      if (!canSave()) {
        notify.warning(t("global.read_only"))
      }
    } else if (msg.event === "load") {
      // Diagram loaded — fit to viewport
      postMessage({ action: "fit", border: 16, maxScale: 1 })
    } else if (msg.event === "save") {
      // User clicked Save inside draw.io
      modified = true
      await handleSave(msg.xml)
      if (!msg.exit) {
        postMessage({
          action: "status",
          messageKey: "allChangesSaved",
          modified: false,
        })
        modified = false
      }
    } else if (msg.event === "autosave" && msg.xml) {
      // Autosave draft — silent, no toast
      modified = true
      await handleSave(msg.xml, true)
    } else if (msg.event === "export" && msg.xml) {
      // Response to our doSave() export request
      await handleSave(msg.xml)
      postMessage({
        action: "status",
        messageKey: "allChangesSaved",
        modified: false,
      })
      modified = false
    } else if (msg.event === "exit") {
      // User clicked Exit — save if modified
      if (canSave() && modified && msg.xml) {
        await handleSave(msg.xml)
      }
    }
  }

  async function handleSave(xml: string, silent?: boolean) {
    if (!canSave()) {
      notify.warning(t("global.read_only"))
      return
    }
    setSaving(true)
    try {
      const file = new File([xml], objStore.obj.name, {
        type: "application/xml",
      })
      await StreamUpload(pathname(), file, () => {}, false, true, false)
      if (!silent) notify.success(t("global.save_success"))
    } catch (e: any) {
      if (!silent) notify.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  onMount(() => {
    window.addEventListener("message", handleMessage)
  })

  onCleanup(() => {
    window.removeEventListener("message", handleMessage)
  })

  return (
    <BoxWithFullScreen
      w="$full"
      h="70vh"
      pos="relative"
      extraButtons={
        <Show when={canSave()}>
          <Tooltip label={`${t("global.save")} (Ctrl+S)`} withArrow>
            <IconButton
              aria-label={t("global.save")}
              loading={saving()}
              icon={<TbDeviceFloppy />}
              onClick={doSave}
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
        <Erro msg={t("home.preview.drawio_error")} h="70vh" />
      </Show>
      <Show when={objStore.raw_url !== undefined}>
        <iframe
          ref={iframeRef}
          src={drawioUrl()}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: loading() || error() ? "none" : "block",
          }}
          onError={() => {
            setError(true)
            setLoading(false)
          }}
          allow="clipboard-read *; clipboard-write *; fullscreen *"
        />
      </Show>
    </BoxWithFullScreen>
  )
}

export default DrawioPreview
