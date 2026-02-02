# KaamSync Design System Guide

## Executive Summary

This document establishes a unified design system for KaamSync to ensure consistent spacing, colors, typography, and component usage across all marketing pages and UI components. The goal is to reduce arbitrary Tailwind class usage while maintaining the existing industrial aesthetic.

---

## 1. Current State Analysis

### 1.1 Color System ✅ **Well Defined**

**CSS Variables (app.css)**
The color system is already well-structured with OKLCH color space:

**Core Colors:**
- `--background`: oklch(0.98 0 0) - Stark White (light) / oklch(0.1 0 0) - Near Black (dark)
- `--foreground`: oklch(0.14 0 0) - Deep Graphite (light) / oklch(0.98 0 0) - White (dark)
- `--primary`: lch(50.72% 91.02 43.88) - Safety Orange
- `--secondary`: oklch(0.95 0 0) - Pale Gray
- `--muted`: oklch(0.95 0 0)
- `--border`: oklch(0.85 0 0)

**Semantic Colors:**
- `--destructive`: oklch(0.55 0.22 27) - Intense Red
- `--success`: oklch(0.65 0.18 150)
- `--warning`: oklch(0.75 0.15 85)
- `--info`: oklch(0.6 0.15 240)

**Status Colors:**
- `--status-approved`: oklch(0.65 0.18 150)
- `--status-rejected`: oklch(0.55 0.22 27)
- `--status-pending`: oklch(0.75 0.15 85)
- `--status-progress`: oklch(0.6 0.15 240)
- `--status-completed`: oklch(0.65 0.18 150)

**Priority Colors:**
- `--priority-urgent`: oklch(0.55 0.22 27)
- `--priority-high`: oklch(0.75 0.15 85)
- `--priority-medium`: oklch(0.6 0.22 35)
- `--priority-low`: oklch(0.45 0 0)
- `--priority-none`: oklch(0.85 0 0)

**Verdict:** ✅ Color system is comprehensive and well-organized. No changes needed.

---

### 1.2 Spacing System ⚠️ **Inconsistent**

**Current Patterns Found:**

**Padding (p-, px-, py-, pt-, pb-, pl-, pr-):**
- `p-1` (4px) - Minimal touch targets
- `p-2` (8px) - Compact elements, tags
- `p-3` (12px) - Standard card padding
- `p-4` (16px) - Cards, modals
- `p-6` (24px) - Large cards, sections
- `p-8` (32px) - Feature blocks
- `px-4` / `px-6` - Container horizontal padding
- `py-3` / `py-4` - Button vertical padding
- `pt-24` - Hero section top padding (96px)
- `pb-32` - Hero section bottom padding (128px)
- `py-16` / `py-20` / `py-24` - Section vertical padding (64px, 80px, 96px)

**Margin (m-, mx-, my-, mt-, mb-, ml-, mr-):**
- `mb-2` (8px) - Tight spacing
- `mb-4` (16px) - Standard spacing
- `mb-6` (24px) - Section headings
- `mb-8` (32px) - Large headings
- `mb-10` (40px) - Hero content
- `mb-12` (48px) - CTA sections
- `mb-16` (64px) - Major sections
- `mt-4` / `mt-6` / `mt-8` - Top spacing
- `mt-12` (48px) - Large top spacing
- `mt-24` (96px) - Footer spacing

**Gap (gap-, space-):**
- `gap-1` (4px) - Tight icon groups
- `gap-2` (8px) - Standard inline spacing
- `gap-3` (12px) - Form elements
- `gap-4` (16px) - Button groups
- `gap-6` (24px) - Cards, features
- `gap-8` (32px) - Feature grids
- `gap-12` (48px) - Stats grids
- `gap-16` (64px) - Two-column layouts
- `space-y-4` - Vertical lists

**Issues Found:**
1. **Inconsistent hero spacing:** `pt-24 pb-32` on home, `pt-24` only on about
2. **Mixed section padding:** `py-16`, `py-20`, `py-24`, `py-28` all used inconsistently
3. **Arbitrary gap values:** No standard gap scale for grids
4. **Container padding:** `px-4 md:px-6` repeated everywhere (should be automatic)

---

### 1.3 Typography System ✅ **Well Defined**

**Fonts:**
- Sans: Inter, system-ui, sans-serif
- Mono: JetBrains Mono, SFMono-Regular, monospace
- Serif: System default (used for headings)

**Heading Scale (marketing-layout.tsx):**
- H1: `text-5xl md:text-7xl lg:text-8xl` - Hero
- H2: `text-4xl md:text-5xl lg:text-6xl` - Section headings
- H3: `text-2xl md:text-3xl` - Subsection headings

**Text Styles Found:**
- `text-xs` - Labels, badges, metadata
- `text-sm` - Body small, descriptions
- `text-base` - Default body
- `text-lg` - Lead text
- `text-xl` - Large body, quotes
- `text-2xl` - Mobile headings
- `text-4xl` / `text-5xl` - Desktop headings

**Typography Patterns:**
- `font-mono text-xs uppercase tracking-widest` - Labels, stats
- `font-serif` - Marketing headings
- `font-bold` - Headings, important text
- `font-medium` - Subheadings
- `leading-relaxed` - Body text readability
- `tracking-tight` - Large headings
- `tracking-wide` / `tracking-wider` / `tracking-widest` - Uppercase labels

**Verdict:** ✅ Typography is consistent. The MarketingHeading component enforces this.

---

### 1.4 Component Architecture ✅ **Good Structure**

**Existing Marketing Components:**
1. **MarketingContainer** - Section wrapper with consistent padding
2. **MarketingHeading** - H1/H2/H3 with consistent sizing
3. **MarketingBadge** - Label/badge component
4. **MarketingHeroCTA** - CTA button group
5. **MarketingCTA** - Section CTA component
6. **FeaturesGrid** - Feature cards grid
7. **FAQ** - Accordion FAQ
8. **DashboardPreview** - Product screenshot
9. **ChatSimulator** - Animated chat demo

**Base UI Components (Radix + Custom):**
- Button (with variants: default, destructive, outline, secondary, ghost, link)
- Card, CardHeader, CardContent, CardFooter
- Input, Textarea, Label
- Dialog, Sheet, Popover
- Badge
- Tabs
- Command (command palette)
- Sidebar
- Dropdown Menu
- Alert, Alert Dialog
- Tooltip
- Select
- Avatar
- Table
- Empty State

**Verdict:** ✅ Component architecture is solid with good separation of concerns.

---

### 1.5 Layout Utilities ✅ **Well Defined**

**Custom Utilities (app.css):**
```css
.v-stack { @apply flex flex-col; }
.h-stack { @apply flex flex-row; }
.center { @apply flex items-center justify-center; }
.spacer { @apply grow; }
.circle { @apply aspect-square rounded-full; }
```

**Container Pattern:**
```
container mx-auto px-4 md:px-6
```

**Grid Patterns:**
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` - Feature grids
- `grid-cols-2 md:grid-cols-4` - Stats grids
- `grid-cols-12` - Complex layouts (pricing)

**Verdict:** ✅ Layout utilities are sufficient.

---

## 2. Proposed Design System Standards

### 2.1 Spacing Scale

Standardize to these spacing tokens:

**Base Unit: 4px (Tailwind default)**

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Minimal gaps, icon spacing |
| `space-2` | 8px | Tight spacing, inline elements |
| `space-3` | 12px | Form field gaps |
| `space-4` | 16px | Standard gaps, card padding |
| `space-6` | 24px | Section content gaps |
| `space-8` | 32px | Large gaps, feature spacing |
| `space-12` | 48px | Grid gaps, major sections |
| `space-16` | 64px | Between major sections |
| `space-24` | 96px | Hero padding, footer spacing |

**Section Spacing Standard:**
- **Hero sections:** `pt-24 pb-32` (96px top, 128px bottom) - CONSISTENT
- **Content sections:** `py-24` (96px) - Standard
- **Sub-sections:** `py-16` (64px) - Compact
- **CTA sections:** `py-20` (80px) - Medium

**Container Padding:**
- Mobile: `px-4` (16px)
- Desktop: `px-6` (24px)
- **Should be automatic via MarketingContainer**

---

### 2.2 Component Spacing Standards

**MarketingContainer:**
```tsx
// Current
default: py-16
hero: py-24 (or pt-24 pb-32)
compact: py-12
```

**MarketingHeading:**
- H1: `mb-8` (32px) after heading
- H2: `mb-6` (24px) after heading
- H3: `mb-4` (16px) after heading

**Cards:**
- Standard: `p-6` (24px)
- Compact: `p-4` (16px)
- Large: `p-8` (32px)

**Buttons:**
- Default: `h-9 px-4`
- SM: `h-8 px-3`
- LG: `h-10 px-6`
- Hero: `h-14 px-8`

**Forms:**
- Input height: `h-9` / `h-11`
- Field gap: `gap-4` or `gap-6`
- Label to input: `space-y-2`

---

### 2.3 Grid Standards

**Marketing Grids:**
```
Features: grid-cols-1 md:grid-cols-3 gap-8
Stats: grid-cols-2 md:grid-cols-4 gap-12
Two Column: grid-cols-1 lg:grid-cols-2 gap-16
Pricing: grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 (border-separated)
```

**Content Grids:**
```
Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
List: grid-cols-1 gap-4
```

---

## 3. Inconsistencies Found

### 3.1 Marketing Page Issues

**about.tsx:**
- ✅ Uses MarketingContainer consistently
- ⚠️ Stats section uses custom `py-20` instead of standard
- ⚠️ Gap-12 for stats should be gap-8 or gap-12 consistently

**home.tsx:**
- ✅ Hero: `pt-24 pb-32` - GOOD
- ⚠️ Features section: `py-28` - should be `py-24`
- ⚠️ Steps section: custom styling
- ⚠️ FAQ section: `py-32` on container - should be `py-24`
- ⚠️ CTA section: custom padding

**pricing.tsx:**
- ⚠️ Hero: `pt-24 pb-16` - should be `pt-24 pb-32` or just `py-24`
- ⚠️ Plans section: `py-24` - GOOD
- ⚠️ FAQ section: `py-24` on container - GOOD

**contact.tsx:**
- ✅ Hero: `pt-24` - GOOD (no bottom padding needed)
- ⚠️ Form grid: custom gap values

### 3.2 Component Issues

**MarketingContainer:**
- Default `py-16` is too small for most sections
- Should support variants: `default`, `hero`, `compact`

**MarketingHeading:**
- ✅ Consistent across all pages
- Margin bottom handled via className prop (should be automatic)

---

## 4. Recommendations

### 4.1 Quick Wins (No Breaking Changes)

1. **Add MarketingContainer variants:**
   ```tsx
   interface MarketingContainerProps {
     variant?: 'default' | 'hero' | 'compact' | 'cta';
     // ...
   }
   ```

2. **Update MarketingHeading to auto-add margins:**
   ```tsx
   const marginStyles = {
     h1: 'mb-8',
     h2: 'mb-6',
     h3: 'mb-4',
   };
   ```

3. **Standardize section spacing in marketing pages:**
   - Hero: `pt-24 pb-32` (home, about, contact, pricing)
   - Content: `py-24` or use MarketingContainer
   - CTA: `py-20`

### 4.2 Documentation Additions

Create a `DESIGN_SYSTEM.md` file documenting:
- Color usage guidelines
- Spacing scale
- Typography hierarchy
- Component usage patterns
- Grid standards

### 4.3 No Changes Needed To

- **app.css** - Color system is comprehensive
- **Base UI components** - Button, Card, Input, etc. are consistent
- **Color variables** - Well-structured OKLCH system
- **Typography scale** - MarketingHeading enforces this

---

## 5. Implementation Plan

### Phase 1: Documentation ✅ (Current Step)
- [x] Analyze current patterns
- [x] Document findings
- [ ] Get approval on approach

### Phase 2: Component Updates (After Approval)
1. Update MarketingContainer with variants
2. Update MarketingHeading with auto-margins
3. Add spacing utilities if needed

### Phase 3: Page Refactoring (After Approval)
Update each marketing page to use new standards:
1. home.tsx
2. about.tsx
3. pricing.tsx
4. contact.tsx

### Phase 4: Documentation
1. Create DESIGN_SYSTEM.md
2. Document usage guidelines
3. Add component examples

---

## 6. Files to Modify

### Components (Minor Changes)
- `app/components/marketing/marketing-layout.tsx`
  - Add variant support to MarketingContainer
  - Add auto-margin to MarketingHeading

### Pages (Spacing Standardization)
- `app/routes/marketing/home.tsx`
- `app/routes/marketing/about.tsx`
- `app/routes/marketing/pricing.tsx`
- `app/routes/marketing/contact.tsx`

### Documentation (New Files)
- `DESIGN_SYSTEM.md` (new)

---

## 7. Summary

**Current State:**
- ✅ Color system: Excellent
- ✅ Component architecture: Good
- ✅ Typography: Consistent
- ⚠️ Spacing: Inconsistent across pages
- ✅ Layout utilities: Sufficient

**Proposed Changes:**
1. Minor updates to MarketingContainer and MarketingHeading
2. Standardize section spacing on marketing pages
3. Create comprehensive design documentation

**Impact:**
- **Low risk:** Only marketing pages affected
- **High value:** Consistent user experience
- **Maintainable:** Clear standards going forward

---

## Appendix A: Comprehensive Visual Inconsistencies Audit

This section catalogs ALL visual inconsistencies found across the codebase, not just spacing.

### A.1 Border Opacity Inconsistencies ⚠️ **CRITICAL**

**Current State:** 54 occurrences across 20 files with mixed opacity levels

**Opacity Levels Found:**
- `border-border/40` - Most common (marketing sections, layout)
- `border-border/50` - Settings, members pages
- `border-border/60` - Cards, member sections
- `border-border/80` - Team code header
- `border-primary/10`, `/30` - Various marketing elements
- `border-destructive/20` - Error states
- `border-status-*/20`, `/30` - Status badges
- `border-foreground/10`, `/20` - Dashboard preview
- `border-muted-foreground/20`, `/50` - Empty states, selectors
- `border-white/10` - Chat simulator

**Standard Proposal:**
| Context | Opacity | Usage |
|---------|---------|-------|
| Section dividers | `/40` | Border between major sections |
| Card borders | `/60` | Card outlines |
| Subtle dividers | `/20` | Subtle separations |
| Hover states | `/50` → `/60` | Interactive borders |
| Header borders | `/40` | Navigation, headers |

**Files Needing Standardization:**
- `marketing/layout.tsx` - Uses `/40` consistently ✅
- `marketing/about.tsx` - Uses `/40` ✅
- `organization/$teamCode.tsx` - Mixed `/40`, `/60`, `/80`
- `organization/settings/members.tsx` - Mixed `/50`, `/60`
- `components/ui/empty-state.tsx` - `/20`

---

### A.2 Background Opacity Inconsistencies ⚠️ **CRITICAL**

**Current State:** 124 occurrences across 43 files

**Opacity Levels Found:**
- `bg-muted/5` - Matter detail sidebar
- `bg-muted/20` - Marketing sections, form backgrounds
- `bg-muted/30` - Feature cards, member sections
- `bg-muted/40` - Hover states, list items
- `bg-muted/50` - Marketing badges, inputs

- `bg-primary/5` - Contact form highlights
- `bg-primary/10` - Dashboard avatars, icons
- `bg-primary/20` - Popular pricing cards

- `bg-destructive/5`, `/10`, `/15` - Error states
- `bg-status-*/5`, `/10`, `/20` - Status badges
- `bg-brand-*/5`, `/10` - Brand colors
- `bg-background/30`, `/80` - Semi-transparent backgrounds

**Standard Proposal:**
| Context | Opacity | Usage |
|---------|---------|-------|
| Subtle background | `/10` | Icon backgrounds, badges |
| Light section bg | `/20` | Alternate section backgrounds |
| Card hover | `/30` → `/40` | Hover states |
| Input bg | `/50` | Form fields |
| Error subtle | `/10` | Error backgrounds |
| Error strong | `/15` | Error highlights |

---

### A.3 Text Opacity Inconsistencies ⚠️ **MODERATE**

**Current State:** 42 occurrences across 18 files

**Opacity Levels Found:**
- `text-muted-foreground/30` - Decorative dots, empty icons
- `text-muted-foreground/50` - Placeholder text, command palette
- `text-muted-foreground/60` - Footer text
- `text-muted-foreground/70` - Description text, error details
- `text-muted-foreground/80` - Form hints, secondary text

- `text-background/60`, `/70`, `/80` - Dark section text
- `text-white/30`, `/40`, `/50`, `/90` - Chat simulator
- `text-destructive/70` - Error descriptions
- `text-foreground/80` - Matter descriptions

**Standard Proposal:**
| Context | Opacity | Usage |
|---------|---------|-------|
| Primary muted | `text-muted-foreground` | Default secondary text |
| Light secondary | `/70` | Descriptions, hints |
| Very subtle | `/50` | Placeholders, disabled |
| Dark on light | `/80` | Important secondary |

---

### A.4 Border Radius Inconsistencies ⚠️ **MODERATE**

**Current State:** 165 occurrences across 57 files

**Radius Values Found:**
- `rounded-none` - Marketing buttons (industrial aesthetic)
- `rounded-sm` - Badges, tags, dashboard elements
- `rounded-md` - Most components (standard)
- `rounded-lg` - Cards, containers, modals
- `rounded-xl` - Marketing cards, feature sections
- `rounded-full` - Avatars, badges, icons
- `rounded-xs` - Sheet close buttons

**Inconsistencies:**
- Marketing buttons use `rounded-none` (industrial)
- UI buttons use `rounded-md` (standard)
- Cards mix `rounded-lg`, `rounded-xl`, `rounded-md`
- Marketing containers use no radius, app uses `rounded-xl`

**Standard Proposal:**
| Component | Radius | Rationale |
|-----------|--------|-----------|
| Buttons (marketing) | `rounded-none` | Industrial aesthetic |
| Buttons (app) | `rounded-md` | Standard UI |
| Cards (marketing) | `rounded-xl` | Modern, soft |
| Cards (app) | `rounded-lg` | Standard |
| Inputs | `rounded-md` | Match buttons |
| Badges | `rounded-full` | Pills |
| Avatars | `rounded-full` | Circular |
| Modals/Sheets | `rounded-lg` | Standard |

---

### A.5 Width/Max-Width Inconsistencies ⚠️ **MODERATE**

**Current State:** 33 occurrences in marketing pages

**Max-Width Values Found:**
- `max-w-2xl` (672px) - Hero descriptions
- `max-w-3xl` (768px) - About hero, quote sections
- `max-w-4xl` (896px) - Stats grids, feature grids
- `max-w-5xl` (1024px) - Home hero heading
- `max-w-6xl` (1152px) - Contact form grid
- `max-w-7xl` (1280px) - Pricing plans grid
- `max-w-xs` (320px) - Footer description
- `max-w-2xs` (unknown) - Home CTA button

**Standard Proposal:**
| Content Type | Max-Width | Usage |
|--------------|-----------|-------|
| Hero heading | `max-w-5xl` | Large headings |
| Hero body | `max-w-2xl` | Descriptions |
| Section content | `max-w-4xl` | Standard sections |
| Quote/centered | `max-w-3xl` | Testimonials |
| Full content | `max-w-7xl` | Grids, tables |

---

### A.6 Height Inconsistencies ⚠️ **MODERATE**

**Current State:** 23 occurrences in marketing pages

**Height Values Found:**
- `h-8` (32px) - Nav buttons
- `h-11` (44px) - Form inputs (contact)
- `h-12` (48px) - Pricing CTA, plan buttons
- `h-14` (56px) - Home hero buttons, contact CTA
- `h-16` (64px) - About CTA, final CTA buttons
- `h-[52px]` (arbitrary) - Team code items

**Standard Proposal:**
| Component | Height | Usage |
|-----------|--------|-------|
| Small buttons | `h-8` | Nav, icon buttons |
| Default buttons | `h-9` | Standard buttons |
| Large buttons | `h-10` | Primary actions |
| Hero buttons | `h-14` | Marketing CTAs |
| XL buttons | `h-16` | Final CTAs |
| Inputs | `h-11` | Form fields |
| List items | `h-12` | Standard rows |

---

### A.7 Arbitrary Value Classes ⚠️ **CRITICAL**

**Current State:** 171 occurrences across 44 files

**Common Arbitrary Values:**

**Text Sizes:**
- `text-[10px]` - Labels, badges, timestamps (EXTREMELY COMMON)
- `text-[11px]` - Member badges, tabular nums
- `text-[120px]` - Contact textarea min-height

**Sizing:**
- `h-[52px]` - Team code list items
- `min-h-[400px]`, `min-h-[600px]` - Dashboard preview
- `max-w-[465px]` - Email layout
- `max-w-[100px]` - Matter title truncation
- `max-w-[90vw]`, `max-h-[90vh]` - Image preview
- `w-[calc(100%-2rem)]` - Dialog max-width

**Spacing:**
- `leading-[1.1]` - Marketing H1
- `tracking-[2px]` - Not found but pattern exists

**Colors with Arbitrary Opacity:**
- `shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]` - Home hero button
- `bg-white/5`, `/10`, `/90` - Chat simulator
- `ring-black/5` - Card shadows

**Issues:**
1. `text-[10px]` appears 30+ times - should be standardized
2. Arbitrary heights break the spacing scale
3. Custom shadows don't match theme
4. Max-widths should use Tailwind scale

**Standard Proposal:**
| Current | Standard | Rationale |
|---------|----------|-----------|
| `text-[10px]` | `text-xs` (12px) | Minimum readable size |
| `text-[11px]` | `text-xs` | Use standard size |
| `h-[52px]` | `h-12` (48px) | Close enough, standard |
| `min-h-[120px]` | `min-h-32` (128px) | Standard scale |
| Custom shadow | `shadow-md` | Theme consistent |
| `max-w-[465px]` | `max-w-md` (448px) | Close enough |

---

### A.8 Button Style Inconsistencies ⚠️ **MODERATE**

**Current State:** Mixed button styles across marketing and app

**Marketing Buttons:**
- Primary: `h-16 rounded-none bg-primary px-8 font-bold text-lg`
- Secondary: `h-16 rounded-none border-background/30 bg-transparent`
- Ghost: `h-14 px-8 font-medium text-foreground text-lg hover:bg-muted`

**App Buttons:**
- Use `Button` component with `cva` variants
- Standard: `h-9 rounded-md`
- Sizes: `sm`, `default`, `lg`, `icon`

**Issues:**
1. Marketing doesn't use the Button component consistently
2. Custom button classes duplicated across pages
3. Height variations: h-14, h-16 mixed

**Standard Proposal:**
Create marketing-specific button variants in `button.tsx`:
```tsx
variants: {
  variant: {
    // existing variants...
    'marketing-primary': 'h-14 rounded-none bg-primary font-bold text-lg',
    'marketing-secondary': 'h-14 rounded-none border-2 font-bold text-lg',
    'marketing-ghost': 'h-14 font-medium text-lg hover:bg-muted',
  }
}
```

---

### A.9 Shadow Inconsistencies ⚠️ **LOW**

**Current State:** Inconsistent shadow usage

**Shadows Found:**
- `shadow-sm` - Cards, buttons
- `shadow-md` - Popovers, elevated cards
- `shadow-lg` - Dialogs, modals
- `shadow-xl` - Chat simulator
- `shadow-2xl` - Dashboard preview
- `shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]` - Custom marketing button

**Standard Proposal:**
Use theme shadows only:
- `shadow-sm` - Subtle elevation
- `shadow-md` - Standard elevation
- `shadow-lg` - High elevation (modals)

Remove custom shadow from marketing button - use `shadow-md` or `shadow-lg`.

---

### A.10 Ring/Border Width Inconsistencies ⚠️ **LOW**

**Current State:** Mixed usage

**Patterns Found:**
- `ring-1` - Badges, member cards
- `ring-2` - Focus states
- `border-2` - Empty states, alerts
- `border` (1px) - Standard

**Standard:**
- Default border: `border` (1px)
- Strong border: `border-2` (intentional emphasis)
- Focus ring: `ring-2`
- Subtle ring: `ring-1`

---

## Appendix B: Priority Action Items

### High Priority (Visual Impact)
1. **Standardize border opacity** - Use `/40` for sections, `/60` for cards
2. **Standardize background opacity** - Create 5 levels: `/10`, `/20`, `/30`, `/40`, `/50`
3. **Replace arbitrary text sizes** - Convert `text-[10px]` to `text-xs`
4. **Standardize marketing buttons** - Create variants in button component

### Medium Priority (Consistency)
5. **Standardize border radius** - Document radius per component type
6. **Standardize max-widths** - Use 7-column scale consistently
7. **Standardize heights** - Use h-8 through h-16 scale
8. **Clean up text opacity** - Use `/70` for secondary, `/50` for subtle

### Low Priority (Polish)
9. **Remove custom shadows** - Replace with theme shadows
10. **Standardize ring usage** - Consistent focus states
11. **Document arbitrary value exceptions** - When custom values are needed

---

## Appendix C: Quick Reference Card

### Border Opacity
```
/40 = Section dividers (default)
/60 = Cards, elevated elements
/20 = Subtle, hover states
```

### Background Opacity (Muted)
```
/10 = Icon backgrounds, badges
/20 = Section alternates
/30 = Card hovers
/40 = Active states
/50 = Inputs, disabled
```

### Border Radius
```
rounded-none = Marketing buttons only
rounded-sm = Tags, badges
rounded-md = App buttons, inputs
rounded-lg = Cards (app)
rounded-xl = Cards (marketing)
rounded-full = Avatars, pills
```

### Text Sizes (No Arbitrary Values)
```
text-xs = 12px (minimum)
text-sm = 14px
text-base = 16px
text-lg = 18px
text-xl = 20px
```

### Spacing (No Arbitrary Values)
```
Use scale: 1 (4px), 2 (8px), 3 (12px), 4 (16px),
           6 (24px), 8 (32px), 12 (48px), 16 (64px)
```

---

## Summary of ALL Inconsistencies

**Total Issues Found:**
- Border opacity: 54 occurrences, 5 different levels
- Background opacity: 124 occurrences, 10+ different levels
- Text opacity: 42 occurrences, 8 different levels
- Border radius: 165 occurrences, 7 different values
- Max-width: 33 occurrences, 8 different values
- Height: 23 occurrences, 6 standard + 1 arbitrary
- Arbitrary values: 171 occurrences across multiple categories

**Most Critical:**
1. Arbitrary `text-[10px]` everywhere (30+ occurrences)
2. Mixed border opacity creating visual inconsistency
3. Background opacity chaos (5, 10, 20, 30, 40, 50 all used)
4. Marketing buttons completely custom (not using Button component)

**Recommended Approach:**
1. Define strict standards for opacity levels
2. Replace all arbitrary text-[10px] with text-xs
3. Standardize marketing buttons to use component variants
4. Audit and fix border/background opacity per context
5. Document all exceptions with rationale

---

*Document prepared for review. Recommend approval before proceeding with systematic fixes.*

---

## Appendix D: Text Hierarchy & Context-Aware Replacements

This section provides specific guidance on replacing `text-[10px]` while maintaining proper visual hierarchy.

### D.1 The text-[10px] Problem - Context Analysis

**Found 26 occurrences across 11 files.** Not all can be blindly replaced with `text-xs`.

#### **Category 1: Standalone Labels/Badges (Safe to change to text-xs)**

These have no parent text size constraint, so `text-xs` (12px) is safe:

1. **pricing.tsx:222** - "Recommended" badge
   - Parent: Card with `p-8`, no text size set
   - Context: Floating badge on pricing card
   - **Action: Change to `text-xs font-bold font-mono uppercase tracking-widest`**

2. **pricing.tsx:276** - "Base inclusions +" label
   - Parent: `p-3` container with sibling using `text-xs`
   - Context: Subsection label in pricing card
   - **Action: Change to `text-xs font-bold font-mono uppercase tracking-wider`**

3. **dashboard-preview.tsx:10** - Browser chrome title
   - Parent: Header bar with mixed content
   - Context: Mock browser URL bar
   - **Action: Keep small, use `text-xs` or consider `text-[10px]` exception for UI chrome**

4. **dashboard-preview.tsx:64, 77, 150** - Table headers, stat labels
   - Parent: Cards with `text-3xl` values
   - Context: Metric labels (label above large number)
   - **Action: Change to `text-xs font-mono uppercase tracking-wider`**

5. **tasks.tsx:111, 122** - Priority/status badges
   - Parent: List items with default text size
   - Context: Inline badges
   - **Action: Change to `text-xs font-semibold uppercase tracking-wider`**

6. **requests.tsx:128, 139** - Status badges (same as tasks)
   - **Action: Change to `text-xs`**

#### **Category 2: Inside text-sm Parents (May need parent adjustment)**

These might need parent size increased OR keeping small:

7. **members.tsx:248, 343** - Role badges inside member cards
   - Parent: Cards with `text-sm` content
   - Context: Small role indicators
   - **Action: Keep `text-xs`, badge context justifies small size**

8. **members.tsx:347** - Secondary text inside invitations
   - Parent: Card with `text-sm` main text
   - Context: Secondary metadata
   - **Action: Change to `text-xs text-muted-foreground/80`**

9. **properties.tsx:11** - Property labels
   - Parent: Small badge component
   - Context: Inline property tags
   - **Action: Change to `text-xs font-bold uppercase tracking-tight`**

#### **Category 3: Dark/UI Chrome (Keep or use exception)**

10. **chat-simulator.tsx:23, 31, 41, 56** - Chat timestamps
    - Parent: Dark chat bubbles
    - Context: Timestamp metadata in dark UI
    - **Action: Keep `text-[10px]` or `text-xs` - both work in dark context**

11. **login.tsx:154, 184** - Corner badges
    - Parent: Provider buttons
    - Context: Small corner labels
    - **Action: Keep `text-[10px]` - appropriate for tiny corner badges**

12. **attachment-preview-list.tsx:87, 135, 139** - File metadata
    - Context: File names and sizes in overlay
    - **Action: Change to `text-xs`**

### D.2 Text Hierarchy Standards

**Hierarchy Tree:**
```
Marketing Page Hierarchy:
├── h1: text-5xl/md:text-7xl (Hero heading)
├── h2: text-4xl/md:text-5xl (Section headings)
├── h3: text-2xl/md:text-3xl (Subsection)
├── Body: text-lg (Lead text)
├── Body: text-base (Default)
├── Secondary: text-sm (Descriptions)
└── Meta/Labels: text-xs (Badges, timestamps)

App Page Hierarchy:
├── h1: text-2xl (Page titles)
├── h2: text-xl (Section titles)
├── h3: text-lg (Card titles)
├── Body: text-base
├── Secondary: text-sm
└── Meta: text-xs (Badges, labels)
```

**Key Principle:**
- Never use arbitrary text sizes
- `text-xs` (12px) is the minimum for readability
- `text-[10px]` (10px) should only be used for UI chrome (timestamps, tiny badges)
- If something feels too small at `text-xs`, raise the parent size instead

### D.3 Size-* Optimization Guide

**Replace `h-* w-*` pairs with `size-*` for square elements:**

**Current State:**
- `h-4 w-4`: 9 occurrences (icons)
- `h-5 w-5`: 12 occurrences (pricing icons, status)
- `h-6 w-6`: 3 occurrences (larger icons)
- `h-8 w-8`: 2 occurrences (buttons, avatars)

**Replacements:**
| Current | Replacement | Savings |
|---------|-------------|---------|
| `h-4 w-4` | `size-4` | 2 chars |
| `h-5 w-5` | `size-5` | 2 chars |
| `h-6 w-6` | `size-6` | 2 chars |
| `h-8 w-8` | `size-8` | 2 chars |

**Files to Update:**
1. `marketing/pricing.tsx` (lines 73-76) - Plan icons
2. `marketing/contact.tsx` (lines 130, 134, 138) - Check icons
3. `components/billing/*.tsx` - Various icons
4. `components/marketing/faq.tsx` (line 27) - FAQ icon
5. `routes/organization/$teamCode.tsx` (line 259) - Sidebar trigger

**Note:** Only replace when BOTH height and width are equal. Do NOT replace `h-4 w-full` or similar.

### D.4 Implementation Strategy for text-[10px]

**Phase 1: Safe Replacements (No Parent Changes)**
Files: pricing.tsx, tasks.tsx, requests.tsx, dashboard-preview.tsx
- These can all use `text-xs` safely
- No parent hierarchy impact
- 15 occurrences

**Phase 2: Context-Aware Replacements**
Files: members.tsx, properties.tsx
- Replace with `text-xs`
- Check visual hierarchy after change
- 5 occurrences

**Phase 3: UI Chrome (Keep or Exception)**
Files: chat-simulator.tsx, login.tsx, attachment-preview-list.tsx
- Keep `text-[10px]` OR document as intentional
- These are UI elements, not content text
- 6 occurrences

**Total:** 26 occurrences → Replace 20, Keep 6 with documentation

---

## Appendix E: Complete Replacement Examples

### Example 1: Pricing Badge (text-[10px] → text-xs)

**Before:**
```tsx
<span className="bg-primary px-3 py-1 font-bold font-mono text-[10px] text-primary-foreground uppercase tracking-widest shadow-sm">
  Recommended
</span>
```

**After:**
```tsx
<span className="bg-primary px-3 py-1 font-bold font-mono text-xs text-primary-foreground uppercase tracking-widest shadow-sm">
  Recommended
</span>
```

### Example 2: Icon Sizing (h-5 w-5 → size-5)

**Before:**
```tsx
<Users className="h-5 w-5" />
```

**After:**
```tsx
<Users className="size-5" />
```

### Example 3: Table Header (text-[10px] → text-xs)

**Before:**
```tsx
<div className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
  ID
</div>
```

**After:**
```tsx
<div className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
  ID
</div>
```

### Example 4: Member Role Badge (Keep hierarchy)

**Context:** Inside a card with `text-sm` body text

**Before:**
```tsx
<span className="h-5 px-1.5 font-medium text-[10px]">
  Admin
</span>
```

**After:**
```tsx
<span className="h-5 px-1.5 font-medium text-xs">
  Admin
</span>
```

**Note:** This works because badge context justifies smaller text than parent.

---

## Appendix F: Decision Tree for text-[10px]

```
Found text-[10px]?
├── Is it inside a text-xs parent?
│   ├── Yes → Keep text-[10px] (hierarchy maintained)
│   └── No → Continue
├── Is it UI chrome? (timestamps, corner badges, mock UI)
│   ├── Yes → Document exception, keep or use text-xs
│   └── No → Continue  
├── Is it a badge/label in a larger container?
│   ├── Yes → Change to text-xs (badge context)
│   └── No → Continue
└── Is parent text-base or larger?
    ├── Yes → Change to text-xs
    └── No → Review parent hierarchy, may need adjustment
```

---

## Final Recommendations

1. **text-[10px]**: Replace 20 occurrences with `text-xs`, keep 6 as documented exceptions
2. **size-

*Note: The document is already quite long. The user wants me to continue fixing things systematically. Let me provide a summary and ask for direction on which specific fixes to implement.*
