import { Box, useColorModeValue } from "@hope-ui/solid"
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
          props.files.includes("footer.md") &&
          objStore.related.length > 0
        ) {
          const currentBase = baseName(objStore.obj.name)
          const currentExt = ext(objStore.obj.name)
          const obj = objStore.related.find((item) => {
            if (item.size > 1024 * 1024) {
              return false
            }
            const fileExt = ext(item.name).toLowerCase()
            const fileBase = baseName(item.name)
            if (HASH_EXTS.includes(fileExt) || ObjType.TEXT === item.type) {
              if (
                fileBase === currentBase ||
                fileBase === `${currentBase}.${currentExt}`
              ) {
                return true
              }
            }
            return false
          })
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
    let resultExt = data.ext

    if (/^https?:\/\//g.test(data.url)) {
      const res = await fetchText(data.url)
      content = res.content
    }

    // add file type header for hash files and render in code block
    if (HASH_EXTS.includes(data.ext) && content) {
      if (content instanceof ArrayBuffer) {
        content = new TextDecoder().decode(content)
      }
      content = `#### ${data.ext.toUpperCase()}:\n\`\`\`\n${content}\n\`\`\`\n---\n*Fetched from [${data.ext.toUpperCase()}](${data.url}) file.*`
      resultExt = "md" // Convert to md since content is now in markdown format
    }

    return { content, ext: resultExt }
  }
  const [content] = createResource(readmeData, fetchContent)
  return (
    <Show when={getSettingBool("readme_autorender") && readmeData().url}>
      <Box w="$full" rounded="$xl" p="$4" bgColor={cardBg()} shadow="$lg">
        <MaybeLoading loading={content.loading}>
          <Markdown
            children={content()?.content}
            readme
            toc={props.fromMeta === "readme"}
            ext={content()?.ext}
          />
        </MaybeLoading>
      </Box>
    </Show>
  )
}
