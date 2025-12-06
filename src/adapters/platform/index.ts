/**
 * 检测是否支持 File System Access API
 */
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

/**
 * 获取浏览器平台信息
 */
export function getBrowserPlatform(): string {
  return navigator.platform
}

/**
 * 获取浏览器名称
 */
export function getBrowserName(): string {
  const ua = navigator.userAgent
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  return 'Unknown'
}

/**
 * 获取操作系统类型
 */
export function getOS(): 'windows' | 'macos' | 'linux' | 'unknown' {
  const platform = navigator.platform.toLowerCase()
  const ua = navigator.userAgent.toLowerCase()

  if (platform.includes('win')) return 'windows'
  if (platform.includes('mac') || ua.includes('macintosh')) return 'macos'
  if (platform.includes('linux')) return 'linux'
  return 'unknown'
}

/**
 * 检查当前环境的能力
 */
export interface PlatformCapabilities {
  isFileSystemAccessSupported: boolean
  canAccessFileSystem: boolean
  browserName: string
  os: string
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const fsaSupported = isFileSystemAccessSupported()

  return {
    isFileSystemAccessSupported: fsaSupported,
    canAccessFileSystem: fsaSupported,
    browserName: getBrowserName(),
    os: getOS(),
  }
}
