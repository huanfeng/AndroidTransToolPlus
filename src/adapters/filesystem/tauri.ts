import type {
  FileSystemAdapter,
  DirectoryHandle,
  FileHandle,
} from '../types'

/**
 * Tauri 文件系统适配器
 * 注意：需要安装 @tauri-apps/plugin-fs 和 @tauri-apps/plugin-dialog
 */
export class TauriFileSystem implements FileSystemAdapter {
  private open: any
  private readTextFile: any
  private writeTextFile: any
  private readDir: any
  private exists: any
  private createDir: any

  constructor() {
    // 动态导入 Tauri API（避免在浏览器环境中报错）
    this.init()
  }

  private async init() {
    try {
      const dialog = await import('@tauri-apps/plugin-dialog')
      const fs = await import('@tauri-apps/plugin-fs')

      this.open = dialog.open
      this.readTextFile = fs.readTextFile
      this.writeTextFile = fs.writeTextFile
      this.readDir = fs.readDir
      this.exists = fs.exists
      this.createDir = fs.mkdir
    } catch (error) {
      console.error('Failed to load Tauri APIs:', error)
    }
  }

  async selectDirectory(): Promise<DirectoryHandle | null> {
    if (!this.open) {
      await this.init()
    }

    const selected = await this.open({
      directory: true,
      multiple: false,
    })

    if (!selected) return null

    return this.createDirectoryHandle(selected as string)
  }

  async readFile(handle: FileHandle): Promise<string> {
    const path = (handle as any).path
    return await this.readTextFile(path)
  }

  async writeFile(handle: FileHandle, content: string): Promise<void> {
    const path = (handle as any).path
    await this.writeTextFile(path, content)
  }

  async createFile(
    dirHandle: DirectoryHandle,
    fileName: string,
    content: string
  ): Promise<FileHandle> {
    const dirPath = (dirHandle as any).path
    const filePath = `${dirPath}/${fileName}`
    await this.writeTextFile(filePath, content)
    return this.createFileHandle(filePath)
  }

  async exists(dirHandle: DirectoryHandle, name: string): Promise<boolean> {
    const dirPath = (dirHandle as any).path
    const path = `${dirPath}/${name}`
    return await this.exists(path)
  }

  async *readDirectory(
    dirHandle: DirectoryHandle
  ): AsyncIterable<[string, FileHandle | DirectoryHandle]> {
    const dirPath = (dirHandle as any).path
    const entries = await this.readDir(dirPath)

    for (const entry of entries) {
      const name = entry.name
      if (entry.isDirectory) {
        yield [name, this.createDirectoryHandle(`${dirPath}/${name}`)]
      } else {
        yield [name, this.createFileHandle(`${dirPath}/${name}`)]
      }
    }
  }

  /**
   * 创建目录句柄
   */
  private createDirectoryHandle(path: string): DirectoryHandle {
    const self = this
    const name = path.split(/[\\/]/).pop() || ''

    return {
      name,
      kind: 'directory',
      path, // 保存路径

      async getFileHandle(
        name: string,
        options?: { create?: boolean }
      ): Promise<FileHandle> {
        const filePath = `${path}/${name}`
        if (options?.create && !(await self.exists(filePath))) {
          await self.writeTextFile(filePath, '')
        }
        return self.createFileHandle(filePath)
      },

      async getDirectoryHandle(
        name: string,
        options?: { create?: boolean }
      ): Promise<DirectoryHandle> {
        const dirPath = `${path}/${name}`
        if (options?.create && !(await self.exists(dirPath))) {
          await self.createDir(dirPath)
        }
        return self.createDirectoryHandle(dirPath)
      },

      async *entries(): AsyncIterable<[string, FileHandle | DirectoryHandle]> {
        for await (const entry of self.readDirectory(this)) {
          yield entry
        }
      },
    } as any
  }

  /**
   * 创建文件句柄
   */
  private createFileHandle(path: string): FileHandle {
    const self = this
    const name = path.split(/[\\/]/).pop() || ''

    return {
      name,
      kind: 'file',
      path, // 保存路径

      async getFile(): Promise<File> {
        const content = await self.readTextFile(path)
        return new File([content], name, { type: 'text/plain' })
      },

      async createWritable(): Promise<WritableStream> {
        // 创建一个自定义的 WritableStream
        return new WritableStream({
          async write(chunk: string) {
            await self.writeTextFile(path, chunk)
          },
        })
      },
    } as any
  }
}
