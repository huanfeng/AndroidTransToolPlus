import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 日志级别
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARNING = 3,
  ERROR = 4,
}

/**
 * 日志条目
 */
export interface LogEntry {
  id: number
  timestamp: Date
  level: LogLevel
  message: string
  context?: any
}

/**
 * 日志级别名称映射
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARNING]: 'WARNING',
  [LogLevel.ERROR]: 'ERROR',
}

/**
 * 日志级别颜色映射
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'grey',
  [LogLevel.DEBUG]: 'blue',
  [LogLevel.INFO]: 'green',
  [LogLevel.WARNING]: 'orange',
  [LogLevel.ERROR]: 'red',
}

/**
 * 日志 Store
 */
export const useLogStore = defineStore('log', () => {
  // 状态
  const logs = ref<LogEntry[]>([])
  const maxLogs = ref(1000)
  const minLevel = ref<LogLevel>(LogLevel.INFO)
  const nextId = ref(1)

  // 计算属性
  const filteredLogs = computed(() => {
    return logs.value.filter(log => log.level >= minLevel.value)
  })

  const logCount = computed(() => logs.value.length)

  // 添加日志
  function add(level: LogLevel, message: string, context?: any): void {
    const entry: LogEntry = {
      id: nextId.value++,
      timestamp: new Date(),
      level,
      message,
      context,
    }

    logs.value.push(entry)

    // 限制日志数量
    if (logs.value.length > maxLogs.value) {
      logs.value.shift()
    }

    // 同时输出到控制台
    logToConsole(entry)
  }

  // 输出到控制台
  function logToConsole(entry: LogEntry): void {
    const levelName = LOG_LEVEL_NAMES[entry.level]
    const time = entry.timestamp.toLocaleTimeString()
    const message = `[${time}] [${levelName}] ${entry.message}`

    switch (entry.level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(message, entry.context)
        break
      case LogLevel.INFO:
        console.info(message, entry.context)
        break
      case LogLevel.WARNING:
        console.warn(message, entry.context)
        break
      case LogLevel.ERROR:
        console.error(message, entry.context)
        break
    }
  }

  // 便捷方法
  function trace(message: string, context?: any): void {
    add(LogLevel.TRACE, message, context)
  }

  function debug(message: string, context?: any): void {
    add(LogLevel.DEBUG, message, context)
  }

  function info(message: string, context?: any): void {
    add(LogLevel.INFO, message, context)
  }

  function warning(message: string, context?: any): void {
    add(LogLevel.WARNING, message, context)
  }

  function error(message: string, context?: any): void {
    add(LogLevel.ERROR, message, context)
  }

  // 清空日志
  function clear(): void {
    logs.value = []
    nextId.value = 1
  }

  // 导出日志
  function exportLogs(): string {
    return filteredLogs.value
      .map(log => {
        const time = log.timestamp.toLocaleString()
        const level = LOG_LEVEL_NAMES[log.level]
        return `[${time}] [${level}] ${log.message}`
      })
      .join('\n')
  }

  return {
    // 状态
    logs,
    maxLogs,
    minLevel,
    // 计算属性
    filteredLogs,
    logCount,
    // 方法
    add,
    trace,
    debug,
    info,
    warning,
    error,
    clear,
    exportLogs,
    // 常量
    LOG_LEVEL_NAMES,
    LOG_LEVEL_COLORS,
  }
})
