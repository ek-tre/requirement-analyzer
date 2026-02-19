# UI Guidelines

Design and development standards for maintaining a consistent, accessible, and modern interface.

## Core Principles

### 1. Simplicity First
- Clean, uncluttered interfaces
- Progressive disclosure of complexity
- Clear visual hierarchy
- Minimal cognitive load

### 2. Accessibility (WCAG 2.1 AA)
- Proper contrast ratios
- Keyboard navigation support
- Semantic HTML
- Screen reader compatibility
- Touch target sizing (min 44×44px)

### 3. Consistency
- Reusable component patterns
- Predictable interactions
- Uniform spacing and sizing
- Cohesive visual language

## Icon Usage

### Vector SVG Icons Only
**Always use simple vector SVG icons** - never use emoji characters or unicode symbols.

**Why:**
- Consistent rendering across all platforms and browsers
- Scalable at any resolution
- Can be styled with CSS (color, size)
- Better accessibility with proper ARIA labels
- Professional, modern appearance

**Examples:**

✅ **Correct:**
```jsx
<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
</svg>
```

❌ **Avoid:**
```jsx
<span>✓</span>  {/* Emoji/unicode */}
<span>▶</span>  {/* Unicode triangle */}
```

### Icon Libraries
Consider using:
- Heroicons (recommended - already used in app)
- Feather Icons
- Material Icons
- Custom SVG icons

## Color System

### Dark Mode Support

The application uses Tailwind's class-based dark mode strategy (`darkMode: 'class'`). The `dark` class is toggled on the `<html>` element.

**All components MUST include dark mode color variants** to maintain WCAG AA contrast compliance.

**Text Colors:**
```jsx
// Light mode → Dark mode
text-slate-900 → dark:text-slate-100
text-slate-800 → dark:text-slate-200
text-slate-700 → dark:text-slate-300
text-slate-600 → dark:text-slate-400
text-slate-500 → dark:text-slate-400
text-slate-400 → dark:text-slate-500
```

**Background Colors:**
```jsx
bg-white → dark:bg-slate-800 or dark:bg-slate-700
bg-slate-50 → dark:bg-slate-800
bg-slate-100 → dark:bg-slate-700
```

**Border Colors:**
```jsx
border-slate-100 → dark:border-slate-700
border-slate-200 → dark:border-slate-600
border-slate-300 → dark:border-slate-600
```

### Slate (Neutral)
- `slate-50` to `slate-900` - Primary neutral scale
- Used for text, borders, backgrounds
- Maintains readability at all levels

### Semantic Colors
- **Blue** (`blue-50` to `blue-700`) - Overview/informational
- **Purple** (`purple-50` to `purple-700`) - Problem section
- **Green** (`green-50` to `green-700`) - Context, success states
- **Orange** (`orange-50` to `orange-700`) - Assumptions, warnings
- **Pink** (`pink-50` to `pink-700`) - Questions
- **Indigo** (`indigo-50` to `indigo-700`) - Actions
- **Yellow** (`yellow-50` to `yellow-700`) - Warnings, fallback states
- **Red** (`red-300` to `red-800`) - Destructive actions, errors

### Usage
- Use semantic colors to categorize content
- Color-code sections for quick scanning
- Ensure sufficient contrast (4.5:1 for text)
- Use lighter shades for backgrounds, darker for borders and text

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### Text Sizes
- `text-xs` (0.75rem) - Labels, captions, badges
- `text-sm` (0.875rem) - Body text, form inputs
- `text-base` (1rem) - Default paragraph text
- `text-lg` (1.125rem) - Section headings, input titles
- `text-xl` to `text-2xl` - Page titles

### Font Weights
- `font-normal` - Body text
- `font-medium` - Emphasis, labels
- `font-semibold` - Subheadings
- `font-bold` - Primary headings

## Spacing

### Standard Scale
Use Tailwind's spacing scale consistently:
- `gap-1`, `gap-2`, `gap-3` - Element spacing
- `px-3`, `py-2` - Button/input padding
- `px-4`, `py-4` - Card/section padding
- `px-6`, `py-4` - Modal/panel padding
- `mb-2`, `mb-3`, `mb-4` - Vertical rhythm

### Layout
- Use flexbox (`flex`) for alignment
- Use grid (`grid`) for structured layouts
- Consistent gap spacing between related elements

## Components

### Buttons

All buttons MUST have dark mode variants to ensure WCAG AA contrast compliance (4.5:1 minimum for text).

**Primary Action:**
```jsx
<button className="px-4 py-2 text-sm font-medium bg-slate-800 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-500 transition-colors">
  Primary Action
</button>
```

**Secondary Action (Bordered):**
```jsx
<button className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
  Secondary Action
</button>
```

**Dashed Border (Add buttons):**
```jsx
<button className="text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
  + Add Item
</button>
```

**Destructive Action:**
```jsx
<button className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600 rounded transition-colors">
  Delete
</button>
```

**Small Delete Button (×):**
```jsx
<button className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500 text-lg px-1">
  ×
</button>
```

**Modal Close Button:**
```jsx
<button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-2xl">
  ×
</button>
```

**Filter/Pill Buttons (Toggle):**
```jsx
<button className={`px-2 py-1 text-xs rounded ${
  isActive 
    ? "bg-slate-800 dark:bg-slate-600 text-white" 
    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
}`}>
  Filter Label
</button>
```

**Icon Buttons:**
```jsx
<button className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg hover:border-slate-300 dark:hover:border-slate-500 transition-colors">
  <IconSVG className="w-4 h-4" />
</button>
```

### Button Contrast Requirements

**Light Mode:**
- Primary text on button: `text-slate-700` or darker (not slate-600 or lighter)
- Borders: `border-slate-300` minimum
- Hover text: `hover:text-slate-900`

**Dark Mode:**
- Primary text on button: `dark:text-slate-200` or lighter (not slate-300 or darker)
- Borders: `dark:border-slate-600` minimum
- Hover text: `dark:hover:text-white`
- Delete buttons: `dark:text-slate-600` for × symbols

**Never use these combinations (fail contrast):**
- ❌ `text-slate-500` or `text-slate-600` without dark mode variants
- ❌ `text-slate-300` in dark mode for primary text
- ❌ `border-slate-200` in light mode for important buttons without proper text color

### Form Inputs

**Text Input:**
```jsx
<input
  type="text"
  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
/>
```

**Textarea:**
```jsx
<textarea
  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
  rows={4}
/>
```

**Password Input:**
```jsx
<input
  type="password"
  className="w-full px-3 py-2 text-sm border border-blue-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
/>
```

### Cards & Containers

**Standard Card:**
```jsx
<div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
  {/* Content */}
</div>
```

**Semantic Card (e.g., info/warning):**
```jsx
<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
  {/* Content */}
</div>
```

### Modals

**Structure:**
```jsx
<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8">
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-full flex flex-col">
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Modal Title</h3>
      <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-2xl">×</button>
    </div>
    
    {/* Content */}
    <div className="flex-1 overflow-y-auto p-6">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Modal content with proper dark mode support
      </p>
    </div>
    
    {/* Footer */}
    <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
      <button className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
        Cancel
      </button>
      <button className="px-4 py-2 text-sm font-medium bg-slate-800 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-500 transition-colors">
        Confirm
      </button>
    </div>
  </div>
</div>
```

### Badges

```jsx
<span className="text-xs font-semibold text-blue-700 px-2 py-0.5 bg-blue-100 rounded">
  Badge Text
</span>
```

## Interactive States

### Hover Effects
Always include hover states for interactive elements:
```jsx
hover:bg-slate-700
hover:text-slate-800
hover:border-slate-400
```

### Transitions
Add smooth transitions for state changes:
```jsx
transition-colors  // For color changes
transition-all     // For multiple properties
```

### Focus States
Ensure keyboard navigation visibility:
```jsx
focus:outline-none focus:ring-2 focus:ring-slate-400
```

### Disabled States
```jsx
disabled:opacity-50 disabled:cursor-not-allowed
```

## Layout Patterns

### Three-Column Layout
```
[Sidebar] [Main Content] [Actions Panel]
```
- Collapsible sidebar (left)
- Scrollable main content (center)
- Collapsible actions panel (right)

### Responsive Behavior
- Sidebar/panels collapse on smaller screens
- Use `shrink-0` to prevent flex items from shrinking
- Use `overflow-y-auto` for scrollable regions

## Best Practices

### Do's ✅
- Use vector SVG icons for all icons
- Implement proper focus states for accessibility
- Include hover states on interactive elements
- Use semantic color coding for content categories
- Keep consistent spacing throughout
- Add meaningful tooltips (`title` attribute)
- Use `transition-colors` for smooth state changes

### Don'ts ❌
- Never use emoji characters in UI (💡 ✨ ✓ etc.)
- Don't use unicode symbols (▶ ◀ → ✓ etc.)
- Avoid inconsistent spacing between similar elements
- Don't skip disabled/loading states
- Don't use colors without sufficient contrast
- Avoid deeply nested elements when flatter structure works

## Performance

### SVG Optimization
- Keep paths simple
- Use currentColor for color inheritance
- Inline small icons; load large icon sets separately
- Use consistent viewBox dimensions (e.g., `0 0 24 24`)

### CSS Classes
- Leverage Tailwind's utility-first approach
- Use consistent class ordering (layout → spacing → colors → typography)
- Extract repeated patterns into components

## Maintenance

### When Adding New Features
1. Check if existing components can be reused
2. Follow established color and spacing patterns
3. Use vector SVG icons only
4. Test keyboard navigation
5. Verify color contrast meets WCAG AA
6. Add hover/focus/disabled states
7. Ensure responsive behavior

### Code Review Checklist
- [ ] No emoji or unicode symbols in UI
- [ ] Vector SVG icons used consistently
- [ ] Proper semantic HTML
- [ ] Accessible color contrast
- [ ] Keyboard navigation works
- [ ] Hover states implemented
- [ ] Focus states visible
- [ ] Consistent spacing applied
- [ ] Mobile/responsive behavior tested
