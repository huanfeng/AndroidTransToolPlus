/**
 * 文件或目录句柄类型
 */
export type HandleKind = 'file' | 'directory'

/**
 * 基础句柄接口
 */
export interface BaseHandle {
  name: string
  kind: HandleKind
}

/**
 * 文件句柄接口
 */
export interface FileHandle extends BaseHandle {
  kind: 'file'
  getFile(): Promise<File>
  createWritable(): Promise<WritableStream>
}

/**
 * 目录句柄接口
 */
export interface DirectoryHandle extends BaseHandle {
  kind: 'directory'
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>
  entries(): AsyncIterable<[string, FileHandle | DirectoryHandle]>
}

/**
 * 文件系统适配器接口
 */
export interface FileSystemAdapter {
  /**
   * 选择目录
   */
  selectDirectory(): Promise<DirectoryHandle | null>

  /**
   * 读取文件内容
   */
  readFile(handle: FileHandle): Promise<string>

  /**
   * 写入文件内容
   */
  writeFile(handle: FileHandle, content: string): Promise<void>

  /**
   * 创建或覆盖文件
   */
  createFile(
    dirHandle: DirectoryHandle,
    fileName: string,
    content: string
  ): Promise<FileHandle>

  /**
   * 检查文件是否存在
   */
  exists(dirHandle: DirectoryHandle, name: string): Promise<boolean>

  /**
   * 遍历目录
   */
  readDirectory(
    dirHandle: DirectoryHandle
  ): AsyncIterable<[string, FileHandle | DirectoryHandle]>
}

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  /**
   * 获取存储的值
   */
  get<T>(key: string, defaultValue?: T): Promise<T | null>

  /**
   * 设置存储的值
   */
  set<T>(key: string, value: T): Promise<void>

  /**
   * 删除存储的值
   */
  remove(key: string): Promise<void>

  /**
   * 清空所有存储
   */
  clear(): Promise<void>

  /**
   * 获取所有键
   */
  keys(): Promise<string[]>
}
