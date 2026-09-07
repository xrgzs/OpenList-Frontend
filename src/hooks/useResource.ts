import type { Accessor } from "solid-js"
import { objStore, password } from "~/store"
import { ObjType } from "~/types"
import {
  encodePath,
  fsGet,
  handleRespWithoutNotify,
  log,
  pathBase,
  pathDir,
  pathResolve,
  standardizePath,
} from "~/utils"
import { getLinkByDirAndObj } from "./useLink"
import { useRouter } from "./useRouter"

type UseResourceResolverOptions = {
  currentDir: Accessor<string>
  needsSign?: Accessor<boolean>
}

export function useResource(options: UseResourceResolverOptions) {
  const { isShare } = useRouter()
  const fileRawUrlCache = new Map<string, Promise<string | undefined>>()

  const buildResourceLink = (dir: string, name: string, sign?: string) => {
    return getLinkByDirAndObj(
      dir,
      {
        name,
        size: 0,
        is_dir: false,
        created: "",
        modified: "",
        thumb: "",
        type: ObjType.UNKNOWN,
        sign,
      },
      "direct",
      isShare(),
      true,
    )
  }

  const getFileRawUrl = (path: string) => {
    const normalizedPath = standardizePath(path)
    const cacheKey = encodePath(normalizedPath, true)
    const cached = fileRawUrlCache.get(cacheKey)
    if (cached) {
      log("[resource] use cached file raw_url", { path: normalizedPath })
      return cached
    }

    log("[resource] fetch file raw_url", { path: normalizedPath })

    const request = fsGet(normalizedPath, password()).then((resp) => {
      let rawUrl: string | undefined
      handleRespWithoutNotify(
        resp,
        (data) => {
          rawUrl = data.raw_url
          log("[resource] fetched file raw_url success", {
            path: normalizedPath,
            hasRawUrl: Boolean(rawUrl),
          })
        },
        () => {
          rawUrl = undefined
          log("[resource] fetched file raw_url failed", {
            path: normalizedPath,
          })
        },
      )
      return rawUrl
    })

    fileRawUrlCache.set(cacheKey, request)
    return request
  }

  const resolveResourceUrl = async (rawUrl: string) => {
    if (
      rawUrl.startsWith("data:") ||
      rawUrl.startsWith("http://") ||
      rawUrl.startsWith("https://") ||
      rawUrl.startsWith("//")
    ) {
      log("[resource] skip external resource", { rawUrl })
      return rawUrl
    }

    const resolvedPath = rawUrl.startsWith("/")
      ? encodePath(rawUrl, true)
      : pathResolve(options.currentDir(), rawUrl)
    const rawResolvedPath = (() => {
      try {
        return decodeURIComponent(resolvedPath)
      } catch {
        return resolvedPath
      }
    })()
    const currentDir = standardizePath(options.currentDir())
    const encodedCurrentDir = standardizePath(
      encodePath(options.currentDir(), true),
    )
    const targetDir = standardizePath(pathDir(resolvedPath))
    const targetName = pathBase(rawResolvedPath) || ""
    const needsSign = options.needsSign?.() ?? Boolean(objStore.obj.sign)

    log("[resource] resolve start", {
      rawUrl,
      rawResolvedPath,
      resolvedPath,
      currentDir,
      encodedCurrentDir,
      targetDir,
      targetName,
      needsSign,
    })

    if (!targetName) return rawUrl

    if (!needsSign || rawUrl.startsWith("/")) {
      log("[resource] use direct link without signed lookup", {
        rawUrl,
        rawResolvedPath,
        resolvedPath,
        reason: !needsSign ? "parent-not-signed" : "absolute-path",
      })
      return buildResourceLink(targetDir, targetName)
    }

    if (targetDir === encodedCurrentDir) {
      const targetObj = objStore.objs.find(
        (obj) => !obj.is_dir && obj.name === targetName,
      )
      if (targetObj?.sign) {
        log("[resource] hit current dir signed resource", {
          targetDir,
          targetName,
        })
        return getLinkByDirAndObj(
          targetDir,
          targetObj,
          "direct",
          isShare(),
          true,
        )
      }
      log(
        "[resource] current dir resource not found in objStore or missing sign",
        {
          targetDir,
          targetName,
        },
      )
      return buildResourceLink(targetDir, targetName)
    }

    if (resolvedPath.startsWith(`${encodedCurrentDir}/`)) {
      log("[resource] try fetch child path raw_url by fsGet", {
        currentDir,
        encodedCurrentDir,
        rawResolvedPath,
        resolvedPath,
        targetDir,
        targetName,
      })
      const fileRawUrl = await getFileRawUrl(rawResolvedPath)
      if (fileRawUrl) {
        log("[resource] hit child path raw_url", {
          rawResolvedPath,
          resolvedPath,
          targetName,
        })
        return fileRawUrl
      }
      log("[resource] fsGet did not return raw_url", {
        rawResolvedPath,
        resolvedPath,
        targetName,
      })
    }

    log("[resource] fallback to direct resource link", {
      targetDir,
      targetName,
    })
    return buildResourceLink(targetDir, targetName)
  }

  return {
    resolveResourceUrl,
  }
}
