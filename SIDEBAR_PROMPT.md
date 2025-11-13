# Floating Sidebar - Cursor Implementation Prompt

## Task: Add a Glassmorphic Floating Sidebar

Create a floating sidebar panel on the left side of the page (similar to the FinSage example) with the following specifications:

---

## Design Requirements

### 1. Position & Layout
- Fixed position on the left side of the viewport
- Width: 320px on desktop
- Top: 2rem from viewport top
- Left: 2rem from viewport left
- Should NOT scroll with the page (position: fixed)
- z-index: 50 (above background, below modals)

### 2. Glassmorphic Styling
```css
background: rgba(255, 255, 255, 0.95)
backdrop-filter: blur(20px)
-webkit-backdrop-filter: blur(20px)
border-radius: 20px
box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37)
border: 1px solid rgba(255, 255, 255, 0.3)
padding: 1.5rem
```

### 3. Animation
- Slide in from left on page load
- Delay: 0.3s (after main content)
- Duration: 0.6s
- Easing: ease-out

### 4. Content Structure

The sidebar should contain:

#### Section 1: Quick Tips Card
- Icon: 💡 (lightbulb emoji)
- Title: "Quick Tips"
- Content: A styled card with helpful tips like:
  - "Use generic names for better results"
  - "NDC format: XXXXX-XXXX-XX"
  - "SIG examples: 'Take 1 tablet daily'"

#### Section 2: Popular Drugs
- Icon: 💊 (pill emoji)
- Title: "Popular Drugs"
- Content: List of clickable drug names that auto-fill the form
  - Lisinopril 10mg
  - Metformin 500mg
  - Atorvastatin 20mg
  - Amlodipine 5mg
  - Omeprazole 20mg

#### Section 3: Calculation History (optional)
- Icon: 🕐 (clock emoji)
- Title: "Recent Searches"
- Content: Last 3 calculations (if available)
- Show drug name and timestamp

---

## Responsive Behavior

### Desktop (> 1280px)
- Visible by default
- Positioned to the left of main content
- Main content should adjust: add left padding/margin to account for sidebar

### Tablet (768px - 1280px)
- Hide sidebar by default
- Add a toggle button (hamburger icon) in the header
- Sidebar slides in/out from left when toggled
- Add backdrop overlay when open

### Mobile (< 768px)
- Same as tablet behavior
- Full width when open (minus 2rem margin)
- Higher z-index (100)

---

## Implementation Details

### Component Structure

Create a new Svelte component: `src/lib/components/Sidebar.svelte`

**Props:**
- `onDrugSelect: (drugName: string) => void` - Callback when a popular drug is clicked

**State:**
- `isOpen: boolean` - Controls visibility on mobile/tablet
- `recentSearches: string[]` - Array of recent drug searches (optional)

### Integration in +page.svelte

1. Import the Sidebar component
2. Add state for sidebar visibility on mobile
3. Pass callback to auto-fill form when popular drug is clicked
4. Adjust layout to accommodate sidebar on desktop

### Styling Considerations

1. **Toggle Button (Mobile/Tablet):**
   ```css
   position: fixed
   top: 1rem
   left: 1rem
   z-index: 60
   background: rgba(255, 255, 255, 0.9)
   backdrop-filter: blur(10px)
   border: 2px solid rgba(102, 126, 234, 0.3)
   border-radius: 12px
   padding: 0.75rem
   ```

2. **Backdrop Overlay (Mobile/Tablet when open):**
   ```css
   position: fixed
   inset: 0
   background: rgba(0, 0, 0, 0.4)
   backdrop-filter: blur(4px)
   z-index: 40
   ```

3. **Layout Adjustment (Desktop):**
   ```css
   .container {
     margin-left: 380px; /* 320px sidebar + 60px gap */
   }
   ```

---

## Example Code Structure

### Sidebar.svelte (Skeleton)

```svelte
<script lang="ts">
  export let onDrugSelect: (drugName: string) => void;

  let isOpen = $state(false);

  const popularDrugs = [
    'Lisinopril 10mg',
    'Metformin 500mg',
    'Atorvastatin 20mg',
    'Amlodipine 5mg',
    'Omeprazole 20mg'
  ];

  const quickTips = [
    'Use generic names for better results',
    'NDC format: XXXXX-XXXX-XX',
    'Include strength in drug name'
  ];

  function handleDrugClick(drug: string) {
    onDrugSelect(drug);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1280) {
      isOpen = false;
    }
  }
</script>

<!-- Toggle button for mobile/tablet -->
<button class="sidebar-toggle" class:hidden={isOpen}>
  ☰
</button>

<!-- Backdrop overlay -->
{#if isOpen}
  <div class="backdrop" onclick={() => isOpen = false}></div>
{/if}

<!-- Sidebar -->
<aside class="sidebar" class:open={isOpen}>
  <button class="close-button" onclick={() => isOpen = false}>✕</button>

  <!-- Quick Tips Section -->
  <section class="sidebar-section">
    <h3>💡 Quick Tips</h3>
    <div class="tips-card">
      <ul>
        {#each quickTips as tip}
          <li>{tip}</li>
        {/each}
      </ul>
    </div>
  </section>

  <!-- Popular Drugs Section -->
  <section class="sidebar-section">
    <h3>💊 Popular Drugs</h3>
    <div class="drug-list">
      {#each popularDrugs as drug}
        <button class="drug-item" onclick={() => handleDrugClick(drug)}>
          {drug}
        </button>
      {/each}
    </div>
  </section>
</aside>

<style>
  /* Styles here - use the CSS specifications from above */
</style>
```

---

## Interactions

1. **Popular Drug Click:**
   - Auto-fill the drug name input
   - Smooth scroll to the form
   - Add a subtle pulse animation to the input field

2. **Hover Effects:**
   - Drug items: slight scale + background color change
   - Smooth transitions (0.2s ease)

3. **Close Behaviors (Mobile):**
   - Click backdrop to close
   - Click close button to close
   - Select a drug to auto-close

---

## Advanced Features (Optional Enhancements)

### Feature 1: Collapsible Sections
- Add expand/collapse arrows to each section
- Remember state in localStorage

### Feature 2: Search History
- Store last 5 calculations in localStorage
- Display with timestamp
- Click to reload previous calculation

### Feature 3: Keyboard Shortcuts
- Alt+S: Toggle sidebar
- Numbers 1-5: Quick select popular drugs

### Feature 4: Animation Polish
- Stagger animation for list items
- Hover effect with glow
- Smooth height transitions

---

## Accessibility

1. **ARIA Labels:**
   - `aria-label="Sidebar navigation"` on aside
   - `aria-label="Toggle sidebar"` on button
   - `aria-expanded={isOpen}` on toggle button

2. **Keyboard Navigation:**
   - Tab through all interactive elements
   - Escape key closes sidebar on mobile

3. **Focus Management:**
   - Trap focus when sidebar is open on mobile
   - Return focus to toggle when closed

---

## Testing Checklist

- [ ] Sidebar appears correctly on desktop (>1280px)
- [ ] Toggle button appears on tablet/mobile (<1280px)
- [ ] Sidebar slides in/out smoothly
- [ ] Backdrop overlay works on mobile
- [ ] Popular drug click auto-fills the form
- [ ] Layout doesn't break at any breakpoint
- [ ] Animations are smooth (60fps)
- [ ] Keyboard navigation works
- [ ] Backdrop-filter works (with fallback)
- [ ] Z-index stacking is correct

---

## Performance Notes

- Use `will-change: transform` for animated elements
- Debounce any scroll or resize handlers
- Consider removing backdrop-filter on low-end devices
- Lazy load if adding many items to lists

---

## Color Palette Reference

Use these colors to match the main design:
- Primary: #667eea
- Secondary: #764ba2
- Accent: #f093fb
- Text: #2d3748
- Light text: #718096
- Background: rgba(255, 255, 255, 0.95)
- Border: rgba(102, 126, 234, 0.2)

---

## Quick Start Command

After creating the component, use this in +page.svelte:

```svelte
<script lang="ts">
  import Sidebar from '$lib/components/Sidebar.svelte';

  // existing code...

  function handleDrugSelect(drugName: string) {
    drugNameOrNDC = drugName;
    // Optional: smooth scroll to form
    document.getElementById('drugNameOrNDC')?.focus();
  }
</script>

<Sidebar onDrugSelect={handleDrugSelect} />

<!-- rest of your page -->
```

---

## Example Tips Content

You can customize the tips based on your specific needs:

### Quick Tips Ideas:
- "Generic names work best (e.g., 'Lisinopril' not 'Zestril')"
- "Include strength: 'Metformin 500mg' not just 'Metformin'"
- "NDC format: 12345-6789-01"
- "SIG examples: 'Take 1 tablet by mouth daily'"
- "Days supply typically: 30, 60, or 90 days"

### Usage Upgrade Prompt (if you have API limits):
```svelte
<div class="upgrade-prompt">
  <p>You're in Normal Mode—upgrade to keep exploring in depth</p>
  <button class="upgrade-button">Upgrade</button>
</div>
```

---

## Final Result

After implementation, you should have:
✅ Beautiful glassmorphic sidebar
✅ Responsive on all devices
✅ Smooth slide-in animation
✅ Quick access to popular drugs
✅ Helpful tips always visible
✅ Mobile-friendly with toggle
✅ Matches the overall design aesthetic

---

Happy coding! 🚀
