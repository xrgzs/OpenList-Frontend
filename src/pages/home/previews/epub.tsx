import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  Show,
  For,
} from "solid-js"
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Tooltip,
  useColorMode,
  Badge,
  Center,
} from "@hope-ui/solid"
import {
  TbArrowLeft,
  TbArrowRight,
  TbMenu2,
  TbTextSize,
  TbSun,
  TbMoon,
} from "solid-icons/tb"
import { BoxWithFullScreen, Error as Erro, FullLoading } from "~/components"
import { objStore } from "~/store"
import { useT } from "~/hooks"
import { loadScriptIIFE } from "~/utils/load_external"

const EPUBJS_URL = "https://npm.elemecdn.com/epubjs@0.3.93/dist/epub.min.js"

const EpubPreview = () => {
  const t = useT()
  const { colorMode, toggleColorMode } = useColorMode()
  const [loading, setLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const [tocOpen, setTocOpen] = createSignal(false)
  const [toc, setToc] = createSignal<any[]>([])
  const [progress, setProgress] = createSignal(0)
  const [locationText, setLocationText] = createSignal("")
  const [fontSize, setFontSize] = createSignal(100)

  let viewerRef: HTMLDivElement | undefined
  let book: any = null
  let rendition: any = null

  const isDark = () => colorMode() === "dark"

  // Apply font size to the rendition
  const applyFontSize = (size: number) => {
    if (!rendition) return
    rendition.themes.fontSize(`${size}%`)
  }

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(Math.max(prev + delta, 60), 200)
      applyFontSize(next)
      return next
    })
  }

  onMount(async () => {
    try {
      await loadScriptIIFE(EPUBJS_URL, "epubjs-script")

      if (!viewerRef) return

      const src = objStore.raw_url
      if (!src) {
        setError("No file URL available")
        setLoading(false)
        return
      }

      const response = await fetch(src)
      if (!response.ok) {
        throw new Error(`Failed to fetch epub: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()

      // @ts-ignore
      book = ePub(arrayBuffer)

      // Load navigation / TOC
      const nav = await book.loaded.navigation
      if (nav && nav.toc) {
        setToc(nav.toc)
      }

      rendition = book.renderTo(viewerRef, {
        width: "100%",
        height: "100%",
        spread: "none",
        flow: "paginated",
      })

      // Register themes
      rendition.themes.register("dark", {
        body: {
          background: "#1a1a2e !important",
          color: "#e0e0e0 !important",
        },
        "::-webkit-scrollbar": {
          background: "#1a1a2e",
        },
      })
      rendition.themes.register("light", {
        body: {
          background: "#fff !important",
          color: "#333 !important",
        },
      })
      rendition.themes.select(isDark() ? "dark" : "light")
      rendition.themes.fontSize(`${fontSize()}%`)

      await rendition.display()

      setLoading(false)

      // Track location changes for progress
      rendition.on("relocated", (location: any) => {
        if (location && location.start) {
          const { start, atEnd } = location.start
          if (book) {
            const total = book.spine.length
            const current = start ? start.index + 1 : 0
            const pct = total > 0 ? Math.round((current / total) * 100) : 0
            setProgress(atEnd ? 100 : Math.min(pct, 99))
            setLocationText(`${current} / ${total}`)
          }
        }
      })

      // Keyboard navigation
      const keyListener = (e: KeyboardEvent) => {
        if (!rendition) return
        if (e.key === "ArrowLeft" || e.key === "PageUp") {
          rendition.prev()
          e.preventDefault()
        }
        if (e.key === "ArrowRight" || e.key === "PageDown") {
          rendition.next()
          e.preventDefault()
        }
        if (e.key === "Escape") {
          setTocOpen(false)
        }
      }

      document.addEventListener("keyup", keyListener)

      onCleanup(() => {
        document.removeEventListener("keyup", keyListener)
        if (book) {
          book.destroy()
          book = null
          rendition = null
        }
      })
    } catch (e: any) {
      console.error("EPUB viewer error:", e)
      setError(e.message || "Failed to load EPUB viewer")
      setLoading(false)
    }
  })

  // Reactively watch color mode
  createEffect(() => {
    const dark = isDark()
    if (rendition) {
      rendition.themes.select(dark ? "dark" : "light")
    }
  })

  // Navigate to a TOC item
  const goToChapter = async (href: string) => {
    if (!rendition) return
    try {
      await rendition.display(href)
      setTocOpen(false)
    } catch (e) {
      console.error("Failed to navigate:", e)
    }
  }

  // Recursive TOC rendering
  const renderTocItems = (items: any[], depth: number = 0) => {
    return (
      <For each={items}>
        {(item: any) => (
          <>
            <Box
              as="button"
              display="block"
              w="$full"
              textAlign="left"
              px="$3"
              py="$2"
              cursor="pointer"
              fontSize="$sm"
              color={isDark() ? "$neutral3" : "$neutral8"}
              bg="transparent"
              border="none"
              _hover={{
                bg: isDark() ? "$whiteAlpha4" : "$blackAlpha4",
              }}
              css={{
                paddingLeft: `${16 + depth * 16}px`,
                borderBottom: isDark()
                  ? "1px solid rgba(255,255,255,0.06)"
                  : "1px solid rgba(0,0,0,0.06)",
              }}
              onClick={() => goToChapter(item.href)}
            >
              {item.label}
            </Box>
            {item.subitems && renderTocItems(item.subitems, depth + 1)}
          </>
        )}
      </For>
    )
  }

  return (
    <BoxWithFullScreen w="$full" h="80vh" extraButtons={<></>}>
      <Show when={loading()}>
        <FullLoading />
      </Show>
      <Show when={error()}>
        <Erro msg={error()!} />
      </Show>

      {/* Main viewer area */}
      <Flex
        w="$full"
        h="$full"
        pos="relative"
        display={loading() || error() ? "none" : "flex"}
      >
        {/* TOC Sidebar */}
        <Show when={tocOpen()}>
          <Box
            w="260px"
            h="$full"
            overflowY="auto"
            flexShrink={0}
            bg={isDark() ? "#16162a" : "#f8f8fa"}
            borderRight={
              isDark()
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid rgba(0,0,0,0.1)"
            }
            css={{
              "&::-webkit-scrollbar": {
                width: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: isDark()
                  ? "rgba(255,255,255,0.15)"
                  : "rgba(0,0,0,0.15)",
                borderRadius: "4px",
              },
            }}
          >
            <Box
              px="$3"
              py="$2"
              fontWeight="bold"
              fontSize="$sm"
              color={isDark() ? "$neutral2" : "$neutral9"}
              borderBottom={
                isDark()
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "1px solid rgba(0,0,0,0.1)"
              }
            >
              {t("home.preview.epub_toc")}
            </Box>
            <Show
              when={toc().length > 0}
              fallback={
                <Center h="100px" color="$neutral8" fontSize="$sm">
                  {t("home.preview.epub_no_toc")}
                </Center>
              }
            >
              {renderTocItems(toc())}
            </Show>
          </Box>
        </Show>

        {/* EPUB viewer */}
        <Flex direction="column" flex={1} h="$full" minW={0}>
          {/* Top toolbar */}
          <HStack
            px="$2"
            py="$1"
            bg={isDark() ? "rgba(22,22,42,0.9)" : "rgba(248,248,250,0.9)"}
            borderBottom={
              isDark()
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(0,0,0,0.08)"
            }
            spacing="$1"
            flexShrink={0}
          >
            <Tooltip label={t("home.preview.epub_toc")} placement="bottom">
              <IconButton
                aria-label={t("home.preview.epub_toc")}
                icon={<TbMenu2 />}
                size="sm"
                variant="ghost"
                colorScheme={tocOpen() ? "primary" : "neutral"}
                onClick={() => setTocOpen((v) => !v)}
              />
            </Tooltip>

            <Box flex={1} />

            <Tooltip
              label={t("home.preview.epub_font_decrease")}
              placement="bottom"
            >
              <IconButton
                aria-label={t("home.preview.epub_font_decrease")}
                icon={<TbTextSize />}
                size="sm"
                variant="ghost"
                colorScheme="neutral"
                transform="scaleX(-1)"
                onClick={() => changeFontSize(-10)}
              />
            </Tooltip>

            <Badge
              fontSize="10px"
              px="$1"
              colorScheme="neutral"
              variant="subtle"
            >
              {fontSize()}%
            </Badge>

            <Tooltip
              label={t("home.preview.epub_font_increase")}
              placement="bottom"
            >
              <IconButton
                aria-label={t("home.preview.epub_font_increase")}
                icon={<TbTextSize />}
                size="sm"
                variant="ghost"
                colorScheme="neutral"
                onClick={() => changeFontSize(10)}
              />
            </Tooltip>

            <Box
              w="1px"
              h="20px"
              bg={isDark() ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}
              mx="$1"
            />

            <Tooltip
              label={
                isDark()
                  ? t("home.preview.epub_theme_light")
                  : t("home.preview.epub_theme_dark")
              }
              placement="bottom"
            >
              <IconButton
                aria-label={
                  isDark()
                    ? t("home.preview.epub_theme_light")
                    : t("home.preview.epub_theme_dark")
                }
                icon={isDark() ? <TbSun /> : <TbMoon />}
                size="sm"
                variant="ghost"
                colorScheme="neutral"
                onClick={() => toggleColorMode()}
              />
            </Tooltip>
          </HStack>

          {/* Book viewer container */}
          <Box
            ref={viewerRef}
            flex={1}
            minH={0}
            w="$full"
            css={{
              "& .epub-container": {
                background: isDark() ? "#1a1a2e" : "#fff",
              },
              "& .epub-view > iframe": {
                background: isDark() ? "#1a1a2e" : "#fff",
              },
            }}
          />

          {/* Bottom navigation bar */}
          <HStack
            px="$3"
            py="$2"
            bg={isDark() ? "rgba(22,22,42,0.9)" : "rgba(248,248,250,0.9)"}
            borderTop={
              isDark()
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(0,0,0,0.08)"
            }
            spacing="$2"
            flexShrink={0}
          >
            <Tooltip label={t("home.preview.epub_prev")} placement="top">
              <IconButton
                aria-label={t("home.preview.epub_prev")}
                icon={<TbArrowLeft />}
                size="sm"
                variant="ghost"
                colorScheme="neutral"
                onClick={() => rendition?.prev()}
              />
            </Tooltip>

            <Box flex={1} px="$2">
              <Box
                as="input"
                type="range"
                min={0}
                max={100}
                step={1}
                value={progress()}
                onChange={(e: Event) => {
                  if (!book || !rendition) return
                  const val = parseInt((e.target as HTMLInputElement).value)
                  const total = book.spine.length
                  const target = Math.max(
                    0,
                    Math.min(total - 1, Math.round((val / 100) * (total - 1))),
                  )
                  const spineItem = book.spine.get(target)
                  if (spineItem) {
                    rendition.display(spineItem.href)
                  }
                }}
                css={{
                  width: "100%",
                  height: "4px",
                  cursor: "pointer",
                  accentColor: isDark() ? "#7c7cf0" : "#5b5bd6",
                }}
              />
            </Box>

            <Tooltip label={t("home.preview.epub_next")} placement="top">
              <IconButton
                aria-label={t("home.preview.epub_next")}
                icon={<TbArrowRight />}
                size="sm"
                variant="ghost"
                colorScheme="neutral"
                onClick={() => rendition?.next()}
              />
            </Tooltip>

            <Badge
              fontSize="11px"
              px="$2"
              py="$1"
              colorScheme="neutral"
              variant="subtle"
              css={{ whiteSpace: "nowrap" }}
            >
              {locationText()}
              <Box as="span" mx="$1" opacity={0.5}>
                ·
              </Box>
              {progress()}%
            </Badge>
          </HStack>
        </Flex>
      </Flex>
    </BoxWithFullScreen>
  )
}

export default EpubPreview
