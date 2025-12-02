import { ElMessage } from 'element-plus'

// Unified toast helper for consistent UX
export const toast = {
  success(message: string): void {
    ElMessage.success({ message, grouping: true, showClose: true, offset: 60 })
  },
  info(message: string): void {
    ElMessage.info({ message, grouping: true, showClose: true, offset: 60 })
  },
  warning(message: string): void {
    ElMessage.warning({ message, grouping: true, showClose: true, offset: 60 })
  },
  error(message: string): void {
    ElMessage.error({ message, grouping: true, showClose: true, offset: 60 })
  },
  fromError(err: any, fallback = '操作失败'): void {
    const msg = (err && (err.message || err.msg)) || fallback
    ElMessage.error({ message: msg, grouping: true, showClose: true, offset: 60 })
  },
}

export default toast
