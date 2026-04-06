---
name: Mobile nav deferred
description: User wants to add mobile-friendly navbar layout but not yet
type: project
---

Mobile navbar responsiveness is deferred. When implementing, use Tailwind CSS breakpoints (not userAgent or JS width checks) to show a hamburger menu on small screens. The nav currently has logo left, links right at full width.

**Why:** User asked to keep mobile in mind but said "not yet" — they want to revisit after other work is done.
**How to apply:** When touching Nav.tsx or doing a mobile pass, proactively suggest adding the hamburger menu.
