<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Theme conventions

- Every new page and component must support light, dark, and system themes.
- Prefer semantic Tailwind colors: `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, and `border-input`.
- Form controls should normally use `border-input bg-background text-foreground placeholder:text-muted-foreground`.
- Avoid hardcoded light-only surfaces such as `bg-white`, `bg-slate-50`, and `text-slate-900` unless the color is an intentional part of a branded design. When it is intentional, include an appropriate `dark:` variant.
- Test newly added UI in the System, Light, and Dark appearance settings.
