import { createSignal, createMemo, onMount, onCleanup, Show } from "solid-js"
import { IconButton, Tooltip } from "@hope-ui/solid"
import { useColorMode } from "@hope-ui/solid"
import { objStore, userCan } from "~/store"
import { BoxWithFullScreen, FullLoading, Error as Erro } from "~/components"
import { useRouter, useT } from "~/hooks"
import { ext, notify } from "~/utils"
import { StreamUpload } from "~/pages/home/uploads/stream"
import { TbDeviceFloppy } from "solid-icons/tb"
// https://github.com/electroluxcode/onlyoffice-web-comp
const CDN_BASE = "https://xrgzs-onlyoffice-build.pages.dev"

function getFileType(fileName: string): string {
  const e = ext(fileName).toLowerCase()
  if (["docx", "doc", "odt", "rtf", "txt", "html", "epub"].includes(e))
    return "DOCX"
  if (["xlsx", "xls", "csv", "ods"].includes(e)) return "XLSX"
  if (["pptx", "ppt", "odp", "ppsx"].includes(e)) return "PPTX"
  return "DOCX"
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(",")[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}

const OnlyOfficePreview = () => {
  const t = useT()
  const { colorMode } = useColorMode()
  const { pathname } = useRouter()
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal(false)
  const [saving, setSaving] = createSignal(false)
  let iframeRef: HTMLIFrameElement | undefined

  const canSave = createMemo(
    () =>
      (userCan("write_content") || objStore.write_content_bypass) &&
      objStore.write !== false,
  )

  const handleMessage = (e: MessageEvent) => {
    const { type, payload } = e.data || {}
    if (type === "iframe-ready") {
      iframeRef?.contentWindow?.postMessage(
        {
          type: "open",
          payload: {
            url: objStore.raw_url,
            fileName: objStore.obj.name,
            fileType: getFileType(objStore.obj.name),
            readOnly: !canSave(),
            theme: colorMode() === "dark" ? "theme-dark" : "theme-white",
            lang: "zh",
          },
        },
        "*",
      )
    } else if (type === "ready") {
      setLoading(false)
      if (!canSave()) {
        notify.warning(t("global.read_only"))
      }
    } else if (type === "error") {
      console.error("OnlyOffice error:", payload)
      setError(true)
      setLoading(false)
    } else if (type === "export-result" || type === "save-result") {
      // Receive exported file from iframe and upload to server
      const { data, fileName } = payload
      const mimeType = `application/vnd.openxmlformats-officedocument.${
        getFileType(fileName).toLowerCase() === "docx"
          ? "wordprocessingml.document"
          : getFileType(fileName).toLowerCase() === "xlsx"
            ? "spreadsheetml.sheet"
            : "presentationml.presentation"
      }`
      const blob = base64ToBlob(data, mimeType)
      handleSave(blob)
    }
  }

  async function handleSave(blob: Blob) {
    if (!canSave()) return
    setSaving(true)
    try {
      const file = new File([blob], objStore.obj.name, {
        type: blob.type || "application/octet-stream",
      })
      await StreamUpload(pathname(), file, () => {}, false, true, false)
      notify.success(t("global.save_success"))
    } catch (e: any) {
      notify.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  function onSave() {
    // Request export from iframe
    if (!canSave() || saving()) return
    iframeRef?.contentWindow?.postMessage({ type: "export" }, "*")
  }

  onMount(() => {
    window.addEventListener("message", handleMessage)
  })

  onCleanup(() => {
    window.removeEventListener("message", handleMessage)
    iframeRef?.contentWindow?.postMessage({ type: "destroy" }, "*")
  })

  return (
    <BoxWithFullScreen
      w="$full"
      h="70vh"
      pos="relative"
      extraButtons={
        <Show when={canSave()}>
          <Tooltip label={t("global.save")} withArrow>
            <IconButton
              aria-label={t("global.save")}
              loading={saving()}
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
        <Erro msg={t("home.preview.onlyoffice_error")} h="70vh" />
      </Show>
      <iframe
        ref={iframeRef}
        src={`${CDN_BASE}/index.html`}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: loading() || error() ? "none" : "block",
        }}
        allow="local-network-access *; clipboard-read *; clipboard-write *; fullscreen *"
      />
    </BoxWithFullScreen>
  )
}

export default OnlyOfficePreview
