// ============================================================
// OpenClaw Chat - 时间格式化工具
// 统一时间格式化函数
// ============================================================

/**
 * 时间单位定义
 */
interface TimeUnit {
  label: string
  milliseconds: number
}

/** 支持的时间单位 */
const TIME_UNITS: TimeUnit[] = [
  { label: '年', milliseconds: 365 * 24 * 60 * 60 * 1000 },
  { label: '个月', milliseconds: 30 * 24 * 60 * 60 * 1000 },
  { label: '周', milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { label: '天', milliseconds: 24 * 60 * 60 * 1000 },
  { label: '小时', milliseconds: 60 * 60 * 1000 },
  { label: '分钟', milliseconds: 60 * 1000 },
  { label: '秒', milliseconds: 1000 },
]

/**
 * 将时间戳格式化为相对时间字符串
 * 
 * @param timestamp 要格式化的时间戳（毫秒或 ISO 字符串）
 * @param options 格式化选项
 * @returns 相对时间字符串，例如 "3分钟前"、"刚刚"
 * 
 * @example
 * formatRelativeTime(Date.now() - 5 * 60 * 1000) // "5分钟前"
 * formatRelativeTime('2024-01-01T00:00:00.000Z') // "X年前"
 */
export function formatRelativeTime(
  timestamp: number | string,
  options?: {
    /** 是否显示"刚刚"而不是"0秒前"，默认 true */
    showJustNow?: boolean
    /** 是否使用简短格式（如 "5m前" 而不是 "5分钟前"），默认 false */
    short?: boolean
    /** 参考时间点，默认为当前时间 */
    referenceTime?: number
  }
): string {
  const {
    showJustNow = true,
    short = false,
    referenceTime = Date.now(),
  } = options ?? {}

  // 解析时间戳
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp

  if (isNaN(time)) {
    return '无效时间'
  }

  // 计算时间差
  const diff = Math.abs(referenceTime - time)
  const isPast = time < referenceTime

  // 处理未来时间
  if (!isPast && diff < TIME_UNITS[TIME_UNITS.length - 1].milliseconds) {
    return '刚刚'
  }

  // 刚刚（小于1分钟）
  if (diff < TIME_UNITS[TIME_UNITS.length - 1].milliseconds) {
    return showJustNow ? '刚刚' : `0${short ? 's' : '秒'}${isPast ? '前' : '后'}`
  }

  // 遍历时间单位找到最合适的
  for (let i = 0; i < TIME_UNITS.length; i++) {
    const unit = TIME_UNITS[i]
    const value = Math.floor(diff / unit.milliseconds)

    if (value >= 1) {
      // 检查是否应该使用更小的单位（如果值小于某个阈值）
      if (i < TIME_UNITS.length - 1) {
        const nextUnit = TIME_UNITS[i + 1]
        const nextValue = Math.floor((diff % unit.milliseconds) / nextUnit.milliseconds)
        
        // 如果下一个单位的值大于等于阈值，使用更精确的表示
        if (nextValue >= 1 && i < 2) {
          // 对于较大的单位（年、月），如果剩余部分较大，可以显示更详细的信息
          // 这里简化处理，直接返回主要单位
        }
      }

      const suffix = isPast ? '前' : '后'
      const label = short ? getShortLabel(unit.label) : unit.label
      
      return `${value}${label}${suffix}`
    }
  }

  return '无效时间'
}

/**
 * 获取简短格式的标签
 */
function getShortLabel(label: string): string {
  const shortLabels: Record<string, string> = {
    '年': 'y',
    '个月': 'mo',
    '周': 'w',
    '天': 'd',
    '小时': 'h',
    '分钟': 'm',
    '秒': 's',
  }

  return shortLabels[label] ?? label
}

/**
 * 将时间戳格式化为本地化的日期时间字符串
 * 
 * @param timestamp 要格式化的时间戳
 * @param options 格式化选项
 * @returns 格式化后的日期时间字符串
 * 
 * @example
 * formatDateTime(1704067200000) // "2024/1/1 00:00:00"
 */
export function formatDateTime(
  timestamp: number | string,
  options?: {
    /** 日期格式，默认 'YYYY/MM/DD HH:mm:ss' */
    format?: string
    /** 是否包含时间部分，默认 true */
    includeTime?: boolean
  }
): string {
  const {
    includeTime = true,
  } = options ?? {}

  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp

  if (isNaN(time)) {
    return '无效时间'
  }

  const date = new Date(time)
  
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  let result = `${year}/${month}/${day}`
  
  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    result += ` ${hours}:${minutes}:${seconds}`
  }
  
  return result
}
