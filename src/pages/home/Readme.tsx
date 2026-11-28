import { Anchor, Box, useColorModeValue } from "@hope-ui/solid"
import { createMemo, Show, createResource, on } from "solid-js"
import { Markdown, MaybeLoading } from "~/components"
import { useLink } from "~/hooks"
import { getSettingBool, objStore, State } from "~/store"
import { ObjType } from "~/types"
import { baseName, ext, fetchText } from "~/utils"

const HASH_EXTS = [
  "md5",
  "sha1",
  "sha256",
  "sha512",
  "sfv",
  "hash",
  "checksum",
  "md5sum",
  "sha256sum",
]

export function Readme(props: {
  files: string[]
  fromMeta: keyof typeof objStore
}) {
  const cardBg = useColorModeValue("white", "$neutral3")
  const { proxyLink, getLinkByObj } = useLink()
  const readmeData = createMemo(
    on(
      () => objStore.state,
      () => {
        if (
          ![State.FetchingMore, State.Folder, State.File].includes(
            objStore.state,
          )
        ) {
          return { url: "", ext: "" }
        }
        if ([State.FetchingMore, State.Folder].includes(objStore.state)) {
          const obj = objStore.objs.find((item) =>
            props.files.find(
              (file) => file.toLowerCase() === item.name.toLowerCase(),
            ),
          )
          if (obj) {
            return { url: proxyLink(obj, true), ext: "md" }
          }
        }
        if (
          objStore[props.fromMeta] &&
          typeof objStore[props.fromMeta] === "string"
        ) {
          return { url: objStore[props.fromMeta] as string, ext: "md" }
        }
        // automatically find the file with the same name in related as readme
        if (
          objStore.state === State.File &&
          objStore.obj.type !== ObjType.TEXT &&
          props.files.includes("footer.md")
        ) {
          const currentBase = baseName(objStore.obj.name)
          const currentExt = ext(objStore.obj.name)
          const currentBaseLower = currentBase.toLowerCase()
          const currentFileBaseLower =
            `${currentBase}.${currentExt}`.toLowerCase()
          const siblings = objStore.objs.some(
            (item) => !item.is_dir && item.name === objStore.obj.name,
          )
            ? objStore.objs
            : []
          const candidates = [...siblings, ...objStore.related]
          const matches = candidates.filter((item) => {
            if (item.is_dir || item.size > 1024 * 1024) {
              return false
            }
            const fileExt = ext(item.name).toLowerCase()
            const fileBase = baseName(item.name).toLowerCase()
            return (
              (HASH_EXTS.includes(fileExt) || item.type === ObjType.TEXT) &&
              (fileBase === currentBaseLower ||
                fileBase === currentFileBaseLower)
            )
          })
          const obj =
            matches.find((item) =>
              ["md", "markdown", "txt"].includes(ext(item.name).toLowerCase()),
            ) ?? matches[0]
          if (obj) {
            const readmeExt = ext(obj.name).toLowerCase()
            if (obj.type === ObjType.TEXT) {
              return { url: proxyLink(obj, true), ext: readmeExt }
            }
            return { url: getLinkByObj(obj, "direct", true), ext: readmeExt }
          }
        }
        return { url: "", ext: "" }
      },
    ),
  )
  const fetchContent = async (data: { url: string; ext: string }) => {
    let content: string | ArrayBuffer = data.url
    const isHash = HASH_EXTS.includes(data.ext)

    if (/^https?:\/\//g.test(data.url)) {
      const res = await fetchText(data.url)
      content = res.content
    }

    if (isHash && content instanceof ArrayBuffer) {
      content = new TextDecoder().decode(content)
    }

    return {
      content,
      ext: isHash ? "text" : data.ext,
      hashExt: isHash ? data.ext : "",
      sourceUrl: data.url,
    }
  }
  const [content] = createResource(readmeData, fetchContent)
  return (
    <Show when={getSettingBool("readme_autorender") && readmeData().url}>
      <Box w="$full" rounded="$xl" p="$4" bgColor={cardBg()} shadow="$lg">
        <MaybeLoading loading={content.loading}>
          <Show when={content()?.hashExt}>
            <h4>{content()?.hashExt.toUpperCase()}:</h4>
          </Show>
          <Markdown
            children={content()?.content}
            readme
            toc={props.fromMeta === "readme"}
            ext={content()?.ext}
          />
          <Show when={content()?.hashExt}>
            <p>
              <em>
                Fetched from{" "}
                <Anchor href={content()?.sourceUrl}>
                  {content()?.hashExt.toUpperCase()}
                </Anchor>{" "}
                file.
              </em>
            </p>
          </Show>
        </MaybeLoading>
      </Box>
    </Show>
  )
}
