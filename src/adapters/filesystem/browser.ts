import type { FileSystemAdapter, DirectoryHandle, FileHandle } from '../types'

/**
 * 浏览器 File System Access API 适配器
 */
export class BrowserFileSystem implements FileSystemAdapter {
  async selectDirectory(): Promise<DirectoryHandle | null> {
    // 检测浏览器是否支持 File System Access API
    // @ts-ignore - File System Access API
    if (typeof window.showDirectoryPicker !== 'function') {
      throw new Error(
        '您的浏览器不支持 File System Access API。请使用 Chrome 86+、Edge 86+ 或 Opera 72+ 浏览器。Firefox 和 Safari 暂不支持此功能。'
      )
    }

    try {
      // @ts-ignore - File System Access API
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      })
      return this.wrapDirectoryHandle(handle)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null
      }
      throw error
    }
  }

  async readFile(handle: FileHandle): Promise<string> {
    const file = await handle.getFile()
    return await file.text()
  }

  async writeFile(handle: FileHandle, content: string): Promise<void> {
    const writable = await handle.createWritable()
    // @ts-ignore - FileSystemWritableFileStream has write method
    await writable.write(content)
    await writable.close()
  }

  async createFile(
    dirHandle: DirectoryHandle,
    fileName: string,
    content: string
  ): Promise<FileHandle> {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
    await this.writeFile(fileHandle, content)
    return fileHandle
  }

  async exists(dirHandle: DirectoryHandle, name: string): Promise<boolean> {
    try {
      const nativeHandle = (dirHandle as any)._native
      // @ts-ignore
      await nativeHandle.getFileHandle(name)
      return true
    } catch {
      try {
        const nativeHandle = (dirHandle as any)._native
        // @ts-ignore
        await nativeHandle.getDirectoryHandle(name)
        return true
      } catch {
        return false
      }
    }
  }

  async *readDirectory(
    dirHandle: DirectoryHandle
  ): AsyncIterable<[string, FileHandle | DirectoryHandle]> {
    for await (const entry of dirHandle.entries()) {
      yield entry
    }
  }

  /**
   * 包装原生的目录句柄
   */
  private wrapDirectoryHandle(nativeHandle: any): DirectoryHandle {
    const self = this
    return {
      name: nativeHandle.name,
      kind: 'directory',
      _native: nativeHandle, // 保存原生句柄

      async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle> {
        const handle = await nativeHandle.getFileHandle(name, options)
        return self.wrapFileHandle(handle)
      },

      async getDirectoryHandle(
        name: string,
        options?: { create?: boolean }
      ): Promise<DirectoryHandle> {
        const handle = await nativeHandle.getDirectoryHandle(name, options)
        return self.wrapDirectoryHandle(handle)
      },

      async *entries(): AsyncIterable<[string, FileHandle | DirectoryHandle]> {
        for await (const [name, handle] of nativeHandle.entries()) {
          if (handle.kind === 'file') {
            yield [name, self.wrapFileHandle(handle)]
          } else {
            yield [name, self.wrapDirectoryHandle(handle)]
          }
        }
      },
    } as any
  }

  /**
   * 包装原生的文件句柄
   */
  private wrapFileHandle(nativeHandle: any): FileHandle {
    return {
      name: nativeHandle.name,
      kind: 'file',
      _native: nativeHandle, // 保存原生句柄

      async getFile(): Promise<File> {
        return await nativeHandle.getFile()
      },

      async createWritable(): Promise<WritableStream> {
        return await nativeHandle.createWritable()
      },
    } as any
  }
}
