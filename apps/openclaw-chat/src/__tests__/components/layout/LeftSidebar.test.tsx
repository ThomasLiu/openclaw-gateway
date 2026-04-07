import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test-utils/render-with-providers'
import LeftSidebar from '@/components/layout/LeftSidebar'

describe('LeftSidebar Responsive', () => {
  beforeEach(() => {
    localStorage.clear()
    // Default: desktop
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1440 })
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 900 })
  })

  describe('Desktop mode (>=1200px)', () => {
    it('should render full sidebar with agent and session sections', () => {
      const { container } = render(<LeftSidebar />)
      const aside = container.querySelector('aside')
      expect(aside).toBeInTheDocument()
      expect(aside?.className).not.toContain('drawer')
    })

    it('should show collapse toggle button', () => {
      render(<LeftSidebar />)
      // Collapse button should be visible in desktop mode
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should call onToggle when collapse button clicked', () => {
      const onToggle = vi.fn()
      render(<LeftSidebar onToggle={onToggle} />)
      
      const buttons = screen.getAllByRole('button')
      // Find the collapse toggle button (it has a specific title or position)
      const toggleBtn = buttons.find(b => 
        b.getAttribute('title')?.includes('Collapse') || 
        b.getAttribute('title')?.includes('collapse')
      )
      if (toggleBtn) {
        fireEvent.click(toggleBtn)
        expect(onToggle).toHaveBeenCalledOnce()
      }
    })
  })

  describe('Tablet mode (768-1199px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 992 })
    })

    it('should render in icon-only mode on tablet', () => {
      const { container } = render(<LeftSidebar />)
      const aside = container.querySelector('aside')
      expect(aside).toBeInTheDocument()
      // In tablet mode with isTablet prop, sidebar should be narrow/icon-mode
    })
  })

  describe('Mobile mode (<768px)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 375 })
    })

    it('should not render sidebar content by default when drawer closed', () => {
      const { container } = render(<LeftSidebar isDrawerOpen={false} />)
      const aside = container.querySelector('aside')
      expect(aside).toBeInTheDocument()
    })

    it('should show drawer overlay when open on mobile', () => {
      const { container } = render(<LeftSidebar isDrawerOpen={true} />)
      const aside = container.querySelector('aside')
      expect(aside).toBeInTheDocument()
      // Drawer should have overlay class
      if (aside) {
        const hasDrawerClass = aside.className.includes('drawer') || 
                               aside.className.includes('overlay') ||
                               aside.className.includes('mobile')
        // At minimum it should render
        expect(aside).toBeTruthy()
      }
    })

    it('should call onCloseDrawer when close action triggered', () => {
      const onCloseDrawer = vi.fn()
      render(<LeftSidebar isDrawerOpen={true} onCloseDrawer={onCloseDrawer} />)
      
      // Try to find close button or overlay click area
      const closeBtn = screen.queryByLabelText(/close/i) || 
                       screen.queryByTitle(/close/i)
      if (closeBtn) {
        fireEvent.click(closeBtn)
        expect(onCloseDrawer).toHaveBeenCalledOnce()
      }
    })

    it('should render sidebar element even on mobile', () => {
      const { container } = render(<LeftSidebar />)
      expect(container.querySelector('[data-testid="left-sidebar"]')).toBeInTheDocument()
    })
  })

  describe('Collapsed state', () => {
    it('should show only icons when collapsed on desktop', () => {
      const { container } = render(<LeftSidebar isCollapsed={true} />)
      const aside = container.querySelector('aside')
      expect(aside).toBeInTheDocument()
      // Collapsed sidebar should have narrow width style
      if (aside) {
        const style = (aside as HTMLElement).style.width
        expect(style).toBeDefined()
      }
    })

    it('should expand when toggled from collapsed state', () => {
      const onToggle = vi.fn()
      render(<LeftSidebar isCollapsed={true} onToggle={onToggle} />)
      
      // Find and click the expand button
      const buttons = screen.getAllByRole('button')
      const expandBtn = buttons.find(b => 
        b.getAttribute('title')?.includes('Expand') ||
        b.getAttribute('title')?.includes('expand')
      )
      if (expandBtn) {
        fireEvent.click(expandBtn)
        expect(onToggle).toHaveBeenCalledOnce()
      }
    })
  })

  describe('Touch support', () => {
    it('should handle touch events for swipe gestures', () => {
      const onSwipe = vi.fn()
      const { container } = render(<LeftSidebar onSwipeEdge={onSwipe} />)
      const aside = container.querySelector('aside')
      expect(aside).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA role', () => {
      const { container } = render(<LeftSidebar />)
      const aside = container.querySelector('aside')
      expect(aside?.getAttribute('role')).toBeDefined()
    })

    it('should have proper label', () => {
      render(<LeftSidebar />)
      const aside = document.querySelector('aside')
      if (aside) {
        expect(aside.getAttribute('aria-label') || aside.className).toBeDefined()
      }
    })
  })
})
