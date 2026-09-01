import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Grid2X2, List } from 'lucide-react'
import { ViewToggle } from '@/components/layout/ViewToggle'

describe('ViewToggle', () => {
  const options = [
    { value: 'list' as const, label: 'List', icon: List },
    { value: 'grid' as const, label: 'Grid', icon: Grid2X2 },
  ]

  it('marks the active option with aria-pressed=true and others false', () => {
    render(<ViewToggle value="grid" onValueChange={vi.fn()} options={options} />)
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onValueChange with the clicked option value', () => {
    const onValueChange = vi.fn()
    render(<ViewToggle value="grid" onValueChange={onValueChange} options={options} />)
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
    expect(onValueChange).toHaveBeenCalledWith('list')
  })

  it('is keyboard accessible (each option is a real, focusable button)', () => {
    render(<ViewToggle value="list" onValueChange={vi.fn()} options={options} />)
    for (const option of options) {
      const button = screen.getByRole('button', { name: option.label })
      expect(button.tagName).toBe('BUTTON')
      expect(button).not.toHaveAttribute('tabindex', '-1')
    }
  })
})
