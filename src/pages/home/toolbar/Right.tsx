import { Box, createDisclosure, VStack } from "@hope-ui/solid"
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js"
import { RightIcon } from "./Icon"
import { CgMoreO } from "solid-icons/cg"
import { TbCheckbox, TbGripHorizontal } from "solid-icons/tb"
import {
  objStore,
  selectAll,
  State,
  toggleCheckbox,
  userCan,
  getMainColor,
} from "~/store"
import { bus } from "~/utils"
import { operations } from "./operations"
import { IoMagnetOutline } from "solid-icons/io"
import { AiOutlineCloudUpload, AiOutlineSetting } from "solid-icons/ai"
import { RiSystemRefreshLine } from "solid-icons/ri"
import { usePath, useRouter } from "~/hooks"
import { Motion } from "solid-motionone"
import { isTocVisible, setTocDisabled } from "~/components"
import { BiSolidBookContent } from "solid-icons/bi"

const STORAGE_KEY_POS = "toolbar-right-pos"

// mode: "free" = left/top绝对定位, "right" = right/top锚定右侧
type PosState =
  | { mode: "free"; x: number; y: number }
  | { mode: "right"; right: number; y: number }

const SNAP_THRESHOLD = 20

const getSavedPosition = (): PosState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_POS)
    if (saved) {
      const pos = JSON.parse(saved)
      if (
        pos.mode === "right" &&
        typeof pos.right === "number" &&
        typeof pos.y === "number"
      ) {
        return pos
      }
      if (
        pos.mode === "free" &&
        typeof pos.x === "number" &&
        typeof pos.y === "number"
      ) {
        return pos
      }
      // 兼容旧格式
      if (typeof pos.x === "number" && typeof pos.y === "number") {
        return { mode: "free", x: pos.x, y: pos.y }
      }
    }
  } catch {}
  return null
}

export const Right = () => {
  const { isOpen, onToggle } = createDisclosure({
    defaultIsOpen: localStorage.getItem("more-open") === "true",
    onClose: () => localStorage.setItem("more-open", "false"),
    onOpen: () => localStorage.setItem("more-open", "true"),
  })
  const savedPos = getSavedPosition()
  const [position, setPosition] = createSignal<PosState | null>(savedPos)
  const [isDragging, setIsDragging] = createSignal(false)
  let dragRef: HTMLDivElement | undefined
  let startPos = { x: 0, y: 0 }
  let startMouse = { x: 0, y: 0 }

  const margin = createMemo(() => (isOpen() ? "$4" : "$5"))
  const isFolder = createMemo(() => objStore.state === State.Folder)
  const { refresh } = usePath()
  const { isShare } = useRouter()

  const TOOLBAR_WIDTH = 52

  const clampY = (y: number) =>
    Math.max(0, Math.min(y, window.innerHeight - TOOLBAR_WIDTH))

  // 拖拽中用 left/top 实时更新
  const [dragPos, setDragPos] = createSignal<{ x: number; y: number } | null>(
    null,
  )

  // 判断是否靠近边缘
  const isNearRightEdge = (x: number) => {
    return x >= window.innerWidth - TOOLBAR_WIDTH - SNAP_THRESHOLD
  }
  const isNearLeftEdge = (x: number) => {
    return x <= SNAP_THRESHOLD
  }

  // 松手时决定最终位置
  const finalizePosition = (x: number, y: number) => {
    const clampedY = clampY(y)
    if (isNearRightEdge(x)) {
      const right = Math.max(0, window.innerWidth - x - TOOLBAR_WIDTH)
      const pos: PosState = { mode: "right", right, y: clampedY }
      setPosition(pos)
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(pos))
    } else if (isNearLeftEdge(x)) {
      const pos: PosState = { mode: "free", x: 0, y: clampedY }
      setPosition(pos)
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(pos))
    } else {
      const clampedX = Math.max(
        0,
        Math.min(x, window.innerWidth - TOOLBAR_WIDTH),
      )
      const pos: PosState = { mode: "free", x: clampedX, y: clampedY }
      setPosition(pos)
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(pos))
    }
  }

  // 窗口大小改变时，确保工具栏在可视区域内
  const handleResize = () => {
    const pos = position()
    if (!pos) return
    if (pos.mode === "right") {
      const clampedY = clampY(pos.y)
      if (clampedY !== pos.y) {
        const newPos: PosState = { ...pos, y: clampedY }
        setPosition(newPos)
        localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(newPos))
      }
    } else {
      const clampedX = Math.max(
        0,
        Math.min(pos.x, window.innerWidth - TOOLBAR_WIDTH),
      )
      const clampedY = clampY(pos.y)
      if (clampedX !== pos.x || clampedY !== pos.y) {
        const newPos: PosState = { x: clampedX, y: clampedY, mode: "free" }
        setPosition(newPos)
        localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(newPos))
      }
    }
  }

  onMount(() => {
    window.addEventListener("resize", handleResize)
  })

  onCleanup(() => {
    window.removeEventListener("resize", handleResize)
  })

  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    if (!(e.target as HTMLElement).closest("[data-drag-handle]")) {
      return
    }
    e.preventDefault()
    setIsDragging(true)
    const rect = dragRef!.getBoundingClientRect()
    startPos = { x: rect.left, y: rect.top }
    startMouse = { x: e.clientX, y: e.clientY }
    setDragPos({ x: rect.left, y: rect.top })
    dragRef?.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging()) return
    e.preventDefault()
    const newX = startPos.x + (e.clientX - startMouse.x)
    const newY = startPos.y + (e.clientY - startMouse.y)
    const clampedX = Math.max(
      0,
      Math.min(newX, window.innerWidth - TOOLBAR_WIDTH),
    )
    const clampedY = clampY(newY)
    setDragPos({ x: clampedX, y: clampedY })
  }

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDragging()) return
    setIsDragging(false)
    dragRef?.releasePointerCapture(e.pointerId)
    const pos = dragPos()
    if (pos) {
      finalizePosition(pos.x, pos.y)
    }
    setDragPos(null)
  }

  const posStyle = createMemo(() => {
    // 拖拽中用绝对 left/top
    const dp = dragPos()
    if (dp) {
      return {
        left: `${dp.x}px`,
        top: `${dp.y}px`,
        right: "auto",
        bottom: "auto",
        transition: "none",
      }
    }
    const pos = position()
    if (!pos) {
      return {
        right: margin(),
        bottom: margin(),
        left: "auto",
        top: "auto",
        transition: "right 0.15s, top 0.15s",
      }
    }
    if (pos.mode === "right") {
      return {
        left: "auto",
        right: `${pos.right}px`,
        top: `${pos.y}px`,
        bottom: "auto",
        transition: "right 0.15s, top 0.15s",
      }
    }
    return {
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      right: "auto",
      bottom: "auto",
      transition: "left 0.15s, top 0.15s",
    }
  })

  return (
    <Box
      ref={dragRef}
      class="left-toolbar-box"
      pos="fixed"
      left={posStyle().left}
      top={posStyle().top}
      right={posStyle().right}
      bottom={posStyle().bottom}
      zIndex="calc($modal - 1)"
      minW="$10"
      flexShrink={0}
      style={{
        cursor: isDragging() ? "grabbing" : "grab",
        transition: posStyle().transition,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Show
        when={isOpen()}
        fallback={
          <VStack spacing="$1">
            <Box
              data-drag-handle
              color={getMainColor()}
              cursor={isDragging() ? "grabbing" : "grab"}
              p="$1"
              rounded="$md"
              _hover={{ opacity: 0.8 }}
            >
              <TbGripHorizontal size={16} />
            </Box>
            <RightIcon
              class="toolbar-toggle"
              data-toolbar-btn
              as={CgMoreO}
              onClick={() => {
                onToggle()
              }}
            />
          </VStack>
        }
      >
        <VStack
          class="left-toolbar"
          p="$1"
          rounded="$lg"
          spacing="$1"
          // shadow="0px 10px 30px -5px rgba(0, 0, 0, 0.3)"
          // bgColor={useColorModeValue("white", "$neutral4")()}
          bgColor="$neutral1"
          as={Motion.div}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          // @ts-ignore
          transition={{ duration: 0.2 }}
        >
          <Box
            data-drag-handle
            color={getMainColor()}
            cursor={isDragging() ? "grabbing" : "grab"}
            p="$0_5"
            rounded="$md"
            _hover={{ opacity: 0.8 }}
            alignSelf="center"
          >
            <TbGripHorizontal size={14} />
          </Box>
          <VStack spacing="$1" class="left-toolbar-in">
            <Show
              when={
                isFolder() &&
                !isShare() &&
                (userCan("write_content") || objStore.write_content_bypass) &&
                objStore.write
              }
            >
              <RightIcon
                as={RiSystemRefreshLine}
                data-toolbar-btn
                tips="refresh"
                onClick={() => {
                  refresh(undefined, true)
                }}
              />
              <RightIcon
                as={operations.new_file.icon}
                data-toolbar-btn
                tips="new_file"
                onClick={() => {
                  bus.emit("tool", "new_file")
                }}
              />
              <RightIcon
                as={operations.mkdir.icon}
                data-toolbar-btn
                p="$1_5"
                tips="mkdir"
                onClick={() => {
                  bus.emit("tool", "mkdir")
                }}
              />
            </Show>
            <Show
              when={
                isFolder() && !isShare() && userCan("move") && objStore.write
              }
            >
              <RightIcon
                as={operations.recursive_move.icon}
                data-toolbar-btn
                tips="recursive_move"
                onClick={() => {
                  bus.emit("tool", "recursiveMove")
                }}
              />
            </Show>
            <Show
              when={
                isFolder() && !isShare() && userCan("delete") && objStore.write
              }
            >
              <RightIcon
                as={operations.remove_empty_directory.icon}
                data-toolbar-btn
                tips="remove_empty_directory"
                onClick={() => {
                  bus.emit("tool", "removeEmptyDirectory")
                }}
              />
            </Show>
            <Show
              when={
                isFolder() && !isShare() && userCan("rename") && objStore.write
              }
            >
              <RightIcon
                as={operations.batch_rename.icon}
                data-toolbar-btn
                tips="batch_rename"
                onClick={() => {
                  selectAll(true)
                  bus.emit("tool", "batchRename")
                }}
              />
            </Show>
            <Show
              when={
                isFolder() &&
                !isShare() &&
                (userCan("write_content") || objStore.write_content_bypass) &&
                objStore.write
              }
            >
              <RightIcon
                as={AiOutlineCloudUpload}
                data-toolbar-btn
                tips="upload"
                onClick={() => {
                  bus.emit("tool", "upload")
                }}
              />
            </Show>
            <Show
              when={
                isFolder() &&
                !isShare() &&
                userCan("offline_download") &&
                objStore.write
              }
            >
              <RightIcon
                as={IoMagnetOutline}
                data-toolbar-btn
                pl="0"
                tips="offline_download"
                onClick={() => {
                  bus.emit("tool", "offline_download")
                }}
              />
            </Show>
            <Show when={isTocVisible()}>
              <RightIcon
                as={BiSolidBookContent}
                data-toolbar-btn
                tips="toggle_markdown_toc"
                onClick={() => {
                  setTocDisabled((disabled) => !disabled)
                }}
              />
            </Show>
            <RightIcon
              tips="toggle_checkbox"
              data-toolbar-btn
              as={TbCheckbox}
              onClick={toggleCheckbox}
            />
            <RightIcon
              as={AiOutlineSetting}
              data-toolbar-btn
              tips="local_settings"
              onClick={() => {
                bus.emit("tool", "local_settings")
              }}
            />
          </VStack>
          <RightIcon
            tips="more"
            data-toolbar-btn
            as={CgMoreO}
            onClick={onToggle}
          />
        </VStack>
      </Show>
    </Box>
  )
}
