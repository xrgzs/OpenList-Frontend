import { createSignal, createMemo, onMount, onCleanup, Show } from "solid-js"
import {
  Button,
  HStack,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Icon,
  Tooltip,
} from "@hope-ui/solid"
import { objStore, userCan } from "~/store"
import { BoxWithFullScreen, FullLoading, Error as Erro } from "~/components"
import { useRouter, useT } from "~/hooks"
import { ext, notify } from "~/utils"
import { StreamUpload } from "~/pages/home/uploads/stream"
import { FaSolidAngleDown } from "solid-icons/fa"
import { TbDeviceFloppy } from "solid-icons/tb"
import { createShortcut } from "@solid-primitives/keyboard"

const PHOTOPEA_ORIGIN = "https://www.photopea.com"
const PHOTOPEA_URL =
  "https://www.photopea.com#%7B%22environment%22%3A%7B%22customIO%22%3A%7B%22save%22%3A%22app.echoToOE(%5C%22SAVE%5C%22)%3B%22%2C%22saveAsPSD%22%3A%22app.echoToOE(%5C%22SAVEPSD%5C%22)%3B%22%7D%7D%7D"
const SAVE_COMMAND = "SAVE"
const SAVE_PSD_COMMAND = "SAVEPSD"

const SAVE_MODE = {
  NONE: 0,
  SAVE: 1,
  SAVE_AS: 2,
} as const

function appendBuffer(buffer1: ArrayBuffer, buffer2: ArrayBuffer): ArrayBuffer {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength)
  tmp.set(new Uint8Array(buffer1), 0)
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength)
  return tmp.buffer
}

const PhotopeaPreview = () => {
  const t = useT()
  const { pathname } = useRouter()
  const [loading, setLoading] = createSignal(true)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal(false)
  let iframeRef: HTMLIFrameElement | undefined
  let doneCount = 0
  let saveMode: number = SAVE_MODE.NONE
  let buffer = new ArrayBuffer(0)

  const canSave = createMemo(
    () =>
      (userCan("write_content") || objStore.write_content_bypass) &&
      objStore.write !== false,
  )

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

  const doSave = (saveExt?: string, asNew?: boolean) => {
    if (!iframeRef || saving()) return
    if (!canSave()) {
      notify.warning(t("global.read_only"))
      return
    }

    setSaving(true)
    if (!saveExt) {
      saveExt = ext(objStore.obj.name).toLowerCase() || "jpg"
      if (saveExt === "psd") {
        saveExt += ":true"
      }
    }

    iframeRef.contentWindow?.postMessage(
      `app.activeDocument.saveToOE("${saveExt}")`,
      "*",
    )
    saveMode = asNew ? SAVE_MODE.SAVE_AS : SAVE_MODE.SAVE
  }

  const handleMessage = (e: MessageEvent) => {
    if (e.origin !== PHOTOPEA_ORIGIN) return

    if (e.data === "done") {
      if (doneCount === 0) {
        // First "done": Photopea is ready, open the file
        iframeRef?.contentWindow?.postMessage(
          `app.open("${objStore.raw_url}", "", false)`,
          "*",
        )
      } else if (doneCount === 2) {
        // Third "done": file loaded, set document name
        iframeRef?.contentWindow?.postMessage(
          `app.activeDocument.name="${objStore.obj.name.replace(/"/g, '\\"')}"`,
          "*",
        )
        setLoading(false)
        if (!canSave()) {
          notify.warning(t("global.read_only"))
        }
      } else if (saveMode > 0) {
        // Save completed, upload the buffer
        const blob = new Blob([buffer])
        handleSave(blob)
      }
      doneCount++
    } else if (e.data === SAVE_COMMAND) {
      doSave()
    } else if (e.data === SAVE_PSD_COMMAND) {
      doSave("psd:true", true)
    } else if (e.data instanceof ArrayBuffer && saveMode > 0) {
      buffer = appendBuffer(buffer, e.data)
    }
  }

  async function handleSave(blob: Blob) {
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
      saveMode = SAVE_MODE.NONE
      buffer = new ArrayBuffer(0)
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
          <HStack spacing="$1">
            <Tooltip label={`${t("global.save")} (Ctrl+S)`} withArrow>
              <IconButton
                aria-label={t("global.save")}
                loading={saving()}
                icon={<TbDeviceFloppy />}
                onClick={() => doSave()}
                colorScheme="neutral"
                size="sm"
              />
            </Tooltip>
            <Menu placement="bottom-end">
              <MenuTrigger
                as={Button}
                loading={saving()}
                px="$2"
                minW="auto"
                size="sm"
              >
                <Icon as={FaSolidAngleDown} />
              </MenuTrigger>
              <MenuContent minW="150px">
                <MenuItem onClick={() => doSave(undefined, true)}>
                  {t("global.save_as")}
                </MenuItem>
              </MenuContent>
            </Menu>
          </HStack>
        </Show>
      }
    >
      <Show when={loading()}>
        <FullLoading />
      </Show>
      <Show when={error()}>
        <Erro msg={t("home.preview.photopea_error")} h="70vh" />
      </Show>
      <Show when={objStore.raw_url}>
        <iframe
          ref={iframeRef}
          src={PHOTOPEA_URL}
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
          allow="local-network-access *; clipboard-read *; clipboard-write *; fullscreen *"
        />
      </Show>
    </BoxWithFullScreen>
  )
}

export default PhotopeaPreview
