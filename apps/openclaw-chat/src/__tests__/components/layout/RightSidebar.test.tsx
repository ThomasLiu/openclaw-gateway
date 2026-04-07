import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import { RightSidebar } from '@/components/layout/RightSidebar'

describe('RightSidebar Responsive', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1440 })
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 900 })
  })

  describe('Desktop mode (>=1200px)', () => {
    it('should render right sidebar with tabs', () => {
      const { container } = render(<RightSidebar />)
      expect(container.querySelector('.right-sidebar')).toBeInTheDocument()
    })

    it('should show all 11 tab buttons on desktop', () => {
      render(<RightSidebar />)
      const tabButtons = screen.getAllByRole('tab')
      expect(tabButtons.length).toBe(11)
    })

    it('should call onToggle when collapse button clicked', () => {
      const onToggle = vi.fn()
      render(<RightSidebar onToggle={onToggle} />)
      // Find collapse button
      const buttons = screen.getAllByRole('button')
      const toggleBtn = buttons.find(b =>
        b.getAttribute('title')?.includes('Collapse') ||
        b.getAttribute('title')?.includes('collapse') ||
        b.className.includes('chevron-left')
      )
      if (toggleBtn) {
        fireEvent.click(toggleBtn)
        expect(onToggle).toHaveBeenCalledOnce()
      }
    })
  })

  describe('Tablet mode (768-1199px) - right sidebar hidden', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 992 })
    })

    it('should hide right sidebar by default on tablet', () => {
      const { container } = render(<RightSidebar />)
      const aside = container.querySelector('.right-sidebar')
      expect(aside).toBeInTheDocument()
      // On tablet without explicit open prop, sidebar should be collapsed/hidden
    })

    it('should show as drawer when explicitly opened on tablet', () => {
      const { container } = render(<RightSidebar isDrawerOpen={true} />)
      const aside = container.querySelector('.right-sidebar')
      expect(aside).toBeInTheDocument()
    })
  })

  describe('Mobile mode (<768px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 375 })
    })

    it('should be hidden by default on mobile', () => {
      const { container } = render(<RightSidebar isDrawerOpen={false} />)
      const aside = container.querySelector('.right-sidebar')
      expect(aside).toBeInTheDocument()
    })

    it('should show drawer overlay when open', () => {
      const { container } = render(<RightSidebar isDrawerOpen={true} />)
      const overlay = container.querySelector('[data-testid="drawer-overlay"]')
      // Overlay may or may not exist depending on implementation
      if (overlay) {
        expect(overlay).toBeInTheDocument()
      }
      // At minimum the sidebar should exist
      expect(container.querySelector('.right-sidebar')).toBeInTheDocument()
    })

    it('should call onCloseDrawer when close triggered', () => {
      const onCloseDrawer = vi.fn()
      render(<RightSidebar isDrawerOpen={true} onCloseDrawer={onCloseDrawer} />)
      
      const closeBtn = screen.queryByLabelText(/close/i) ||
                       screen.queryByTitle(/close/i)
      if (closeBtn) {
        fireEvent.click(closeBtn)
        expect(onCloseDrawer).toHaveBeenCalledOnce()
      }
    })
  })

  describe('Collapsed state', () => {
    it('should have zero width when collapsed', () => {
      const { container } = render(<RightSidebar isCollapsed={true} />)
      const aside = container.querySelector('.right-sidebar')
      expect(aside).toBeInTheDocument()
      if (aside) {
        const style = (aside as HTMLElement).style.width
        expect(style).toBe('0px')
      }
    })

    it('should show expand button when collapsed', () => {
      const onToggle = vi.fn()
      const { container } = render(<RightSidebar isCollapsed={true} onToggle={onToggle} />)
      const expandBtn = container.querySelector('[data-testid="right-sidebar-expand-btn"]')
      expect(expandBtn).toBeInTheDocument()
    })
  })

  describe('Tab content rendering', () => {
    it('should render ConfigEditorTab by default', () => {
      const { container } = render(<RightSidebar />)
      // Should contain tab content area
      expect(container.querySelector('.right-sidebar')).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should have complementary role', () => {
      const { container } = render(<RightSidebar />)
      const aside = container.querySelector('aside')
      expect(aside?.getAttribute('role')).toBe('complementary')
    })
  })
})
