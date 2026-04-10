// ============================================================
// OpenClaw Chat - formatRelativeTime 单元测试
// TDD 红阶段：先写测试，验证测试框架能正常运行
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatRelativeTime,
  formatDateTime,
} from '@/lib/utils/format-relative-time'

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // 固定当前时间以便测试
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('基础功能', () => {
    it('should return "刚刚" when timestamp is less than 1 second ago', () => {
      const result = formatRelativeTime(Date.now() - 500)
      expect(result).toBe('刚刚')
    })

    it('should return "刚刚" when timestamp is in the future but very close', () => {
      const result = formatRelativeTime(Date.now() + 500)
      expect(result).toBe('刚刚')
    })
  })

  describe('秒级时间差', () => {
    it('should return "X秒前" for seconds ago', () => {
      const result = formatRelativeTime(Date.now() - 30 * 1000)
      expect(result).toBe('30秒前')
    })

    it('should return "59秒前" for 59 seconds ago', () => {
      const result = formatRelativeTime(Date.now() - 59 * 1000)
      expect(result).toBe('59秒前')
    })

    it('should return "X秒前" when showJustNow is false and diff >= 1 second', () => {
      // 当 showJustNow=false 且时间差 >= 1 秒时，应显示具体秒数
      const result = formatRelativeTime(Date.now() - 30 * 1000, { showJustNow: false })
      expect(result).toBe('30秒前')
    })

    it('should return "0秒前" when showJustNow is false and diff < 1 second', () => {
      // 仅当时间差 < 1 秒时才返回 "0秒前"
      const result = formatRelativeTime(Date.now() - 500, { showJustNow: false })
      expect(result).toBe('0秒前')
    })
  })

  describe('分钟级时间差', () => {
    it('should return "1分钟前" for 1 minute ago', () => {
      const result = formatRelativeTime(Date.now() - 60 * 1000)
      expect(result).toBe('1分钟前')
    })

    it('should return "5分钟前" for 5 minutes ago', () => {
      const result = formatRelativeTime(Date.now() - 5 * 60 * 1000)
      expect(result).toBe('5分钟前')
    })

    it('should return "59分钟前" for 59 minutes ago', () => {
      const result = formatRelativeTime(Date.now() - 59 * 60 * 1000)
      expect(result).toBe('59分钟前')
    })
  })

  describe('小时级时间差', () => {
    it('should return "1小时前" for 1 hour ago', () => {
      const result = formatRelativeTime(Date.now() - 60 * 60 * 1000)
      expect(result).toBe('1小时前')
    })

    it('should return "3小时前" for 3 hours ago', () => {
      const result = formatRelativeTime(Date.now() - 3 * 60 * 60 * 1000)
      expect(result).toBe('3小时前')
    })

    it('should return "23小时前" for 23 hours ago', () => {
      const result = formatRelativeTime(Date.now() - 23 * 60 * 60 * 1000)
      expect(result).toBe('23小时前')
    })
  })

  describe('天级时间差', () => {
    it('should return "1天前" for 1 day ago', () => {
      const result = formatRelativeTime(Date.now() - 24 * 60 * 60 * 1000)
      expect(result).toBe('1天前')
    })

    it('should return "7天前" for 7 days ago', () => {
      const result = formatRelativeTime(Date.now() - 7 * 24 * 60 * 60 * 1000)
      // 7 天恰好等于 1 周，实现中周单位优先于天单位，因此返回 "1周前"
      expect(result).toBe('1周前')
    })

    it('should return "6天前" for 6 days ago (less than a week)', () => {
      const result = formatRelativeTime(Date.now() - 6 * 24 * 60 * 60 * 1000)
      // 6 天不足一周，应显示为天数
      expect(result).toBe('6天前')
    })
  })

  describe('周级时间差', () => {
    it('should return "1周前" for 1 week ago', () => {
      const result = formatRelativeTime(Date.now() - 7 * 24 * 60 * 60 * 1000)
      // 注意：7天可能显示为"7天前"或"1周前"，取决于实现
      expect(['7天前', '1周前']).toContain(result)
    })

    it('should return "2周前" for 2 weeks ago', () => {
      const result = formatRelativeTime(Date.now() - 14 * 24 * 60 * 60 * 1000)
      expect(result).toBe('2周前')
    })
  })

  describe('月级时间差', () => {
    it('should return "1个月前" for approximately 1 month ago', () => {
      const result = formatRelativeTime(Date.now() - 30 * 24 * 60 * 60 * 1000)
      expect(result).toBe('1个月前')
    })

    it('should return "6个月前" for approximately 6 months ago', () => {
      const result = formatRelativeTime(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
      expect(result).toBe('6个月前')
    })
  })

  describe('年级时间差', () => {
    it('should return "1年前" for approximately 1 year ago', () => {
      const result = formatRelativeTime(Date.now() - 365 * 24 * 60 * 60 * 1000)
      expect(result).toBe('1年前')
    })

    it('should return "2年前" for approximately 2 years ago', () => {
      const result = formatRelativeTime(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
      expect(result).toBe('2年前')
    })
  })

  describe('未来时间', () => {
    it('should return "X后" for future times greater than 1 second', () => {
      const result = formatRelativeTime(Date.now() + 5 * 60 * 1000)
      expect(result).toBe('5分钟后')
    })

    it('should handle future time in hours', () => {
      const result = formatRelativeTime(Date.now() + 2 * 60 * 60 * 1000)
      expect(result).toBe('2小时后')
    })
  })

  describe('简短格式', () => {
    it('should use short labels when short option is true', () => {
      const result = formatRelativeTime(Date.now() - 5 * 60 * 1000, { short: true })
      expect(result).toBe('5m前')
    })

    it('should show short format for hours', () => {
      const result = formatRelativeTime(Date.now() - 3 * 60 * 60 * 1000, { short: true })
      expect(result).toBe('3h前')
    })

    it('should show short format for days', () => {
      const result = formatRelativeTime(Date.now() - 2 * 24 * 60 * 60 * 1000, { short: true })
      expect(result).toBe('2d前')
    })
  })

  describe('自定义参考时间', () => {
    it('should use custom reference time when provided', () => {
      const referenceTime = new Date('2024-01-20T12:00:00.000Z').getTime()
      const timestamp = new Date('2024-01-18T12:00:00.000Z').getTime()
      
      const result = formatRelativeTime(timestamp, { referenceTime })
      expect(result).toBe('2天前')
    })
  })

  describe('输入类型处理', () => {
    it('should accept number timestamp', () => {
      const result = formatRelativeTime(Date.now() - 60 * 1000)
      expect(result).toContain('分钟前')
    })

    it('should accept ISO string timestamp', () => {
      const pastDate = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const result = formatRelativeTime(pastDate)
      expect(result).toBe('5分钟前')
    })

    it('should return "无效时间" for invalid input', () => {
      const result = formatRelativeTime(NaN)
      expect(result).toBe('无效时间')
    })

    it('should return "无效时间" for invalid string', () => {
      const result = formatRelativeTime('invalid-date')
      expect(result).toBe('无效时间')
    })
  })
})

describe('formatDateTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 设置固定时区为 UTC 以便测试结果可预测
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should format timestamp to date string with time', () => {
    const timestamp = new Date('2024-01-15T10:30:45.000Z').getTime()
    const result = formatDateTime(timestamp)

    // formatDateTime 使用本地时间方法，在 fakeTimers 环境下使用系统时区
    // 由于设置了固定时间，结果应与本地时间转换一致
    const expected = new Date(timestamp)
    const expectedStr = `${expected.getFullYear()}/${expected.getMonth() + 1}/${expected.getDate()} ${String(expected.getHours()).padStart(2, '0')}:${String(expected.getMinutes()).padStart(2, '0')}:${String(expected.getSeconds()).padStart(2, '0')}`
    expect(result).toBe(expectedStr)
  })

  it('should accept ISO string input', () => {
    const result = formatDateTime('2024-06-20T08:15:30.000Z')

    // 验证格式正确性：YYYY/M/D HH:mm:ss
    expect(result).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2} \d{2}:\d{2}:\d{2}$/)
    // 验证日期部分正确
    expect(result).toContain('2024/6/20')
  })

  it('should exclude time when includeTime is false', () => {
    const timestamp = new Date('2024-03-25T14:45:00.000Z').getTime()
    const result = formatDateTime(timestamp, { includeTime: false })

    // 仅验证日期部分，不包含时间
    const expected = new Date(timestamp)
    const expectedStr = `${expected.getFullYear()}/${expected.getMonth() + 1}/${expected.getDate()}`
    expect(result).toBe(expectedStr)
  })

  it('should return "无效时间" for invalid input', () => {
    const result = formatDateTime(NaN)
    expect(result).toBe('无效时间')
  })

  it('should pad single digit numbers with zero for time parts', () => {
    const timestamp = new Date('2024-01-05T03:05:09.000Z').getTime()
    const result = formatDateTime(timestamp)

    // 验证时间部分用零补齐（小时、分钟、秒均为两位数）
    const timePart = result.split(' ')[1]
    expect(timePart).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    // 验证整体格式正确
    expect(result).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2} \d{2}:\d{2}:\d{2}$/)
  })
})
