import { Box, useColorModeValue } from "@hope-ui/solid"
import { createMemo, Show, createResource, on } from "solid-js"
import { Markdown, MaybeLoading } from "~/components"
import { useLink } from "~/hooks"
import { getSettingBool, objStore, State } from "~/store"
import { baseName, ext, fetchText } from "~/utils"

const HASH_EXTS = ["sha256", "sha1", "md5", "crc32"]
const TEXT_EXTS = ["md", "txt"]

export function Readme(props: {
  files: string[]
  fromMeta: keyof typeof objStore
}) {
  const cardBg = useColorModeValue("white", "$neutral3")
  const { proxyLink } = useLink()
  let readmeExt = "md"
  const readme = createMemo(
    on(
      () => objStore.state,
      () => {
        if (
          ![State.FetchingMore, State.Folder, State.File].includes(
            objStore.state,
          )
        ) {
          return ""
        }
        if ([State.FetchingMore, State.Folder].includes(objStore.state)) {
          const obj = objStore.objs.find((item) =>
            props.files.find(
              (file) => file.toLowerCase() === item.name.toLowerCase(),
            ),
          )
          if (obj) {
            return proxyLink(obj, true)
          }
        }
        if (
          objStore[props.fromMeta] &&
          typeof objStore[props.fromMeta] === "string"
        ) {
          return objStore[props.fromMeta] as string
        }
        // automatically find the file with the same name in related as readme
        if (
          objStore.state === State.File &&
          props.files.includes("footer.md") &&
          objStore.related.length > 0
        ) {
          const currentBase = baseName(objStore.obj.name)
          const currentExt = ext(objStore.obj.name)
          const findExts = [...TEXT_EXTS, ...HASH_EXTS]
          const obj = objStore.related.find((item) => {
            if (item.size > 1024 * 1024) {
              return false
            }
            const fileExt = ext(item.name).toLowerCase()
            const fileBase = baseName(item.name)
            if (findExts.includes(fileExt)) {
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
            readmeExt = ext(obj.name).toLowerCase()
            return proxyLink(obj, true)
          }
        }
        return ""
      },
    ),
  )
  const fetchContent = async (readme: string) => {
    let res = {
      content: readme as string | ArrayBuffer,
    }
    if (/^https?:\/\//g.test(readme)) {
      res = await fetchText(readme)
    }
    // add file type header for hash files and render in code block
    if (HASH_EXTS.includes(readmeExt) && res.content) {
      if (res.content instanceof ArrayBuffer) {
        res.content = new TextDecoder().decode(res.content)
      }
      res.content = `#### ${readmeExt.toUpperCase()}:\n\`\`\`\n${res.content}\n\`\`\`\n---\n*Fetched from [${readmeExt.toUpperCase()}](${readme}) file.*`
      readmeExt = "md"
    }
    return res
  }
  const [content] = createResource(readme, fetchContent)
  return (
    <Show when={getSettingBool("readme_autorender") && readme()}>
      <Box w="$full" rounded="$xl" p="$4" bgColor={cardBg()} shadow="$lg">
        <MaybeLoading loading={content.loading}>
          <Markdown
            children={content()?.content}
            readme
            toc={props.fromMeta === "readme"}
            ext={readmeExt}
          />
        </MaybeLoading>
      </Box>
    </Show>
  )
}
