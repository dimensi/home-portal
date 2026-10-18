# Home Portal

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user operates a private home server and needs a fast, glanceable launcher for the services currently available on it. The portal is used on desktop and mobile, often as the first stop before opening a specific service.

## Product Purpose

Home Portal turns the server's live service inventory into a practical launch surface. Success means the user can find a service, understand whether it is available and how it is exposed, and open it with minimal effort.

## Positioning

The portal is generated from the actual running environment. Docker state, routing information, optional external services, page metadata, and preview captures form the interface rather than a manually maintained bookmark list.

## Operating Context

The server API returns the current service inventory and refreshes it periodically. A user may search by service, container, category, or image; manually refresh; switch theme; inspect service state and route metadata; and open reachable services in a new tab. Some services have live preview screenshots or discovered favicons and titles. Others have no web endpoint and remain useful as visible background processes.

## Capabilities and Constraints

- Preserve the existing service API and its runtime-only data model.
- Preserve search, manual and automatic refresh, theme persistence, service links, metadata enrichment, preview fallback, and non-web service states.
- Use plain HTML, CSS, and browser JavaScript served by Express, with no new framework or dependency.
- Use system fonts and local code only: no external fonts, CDN assets, analytics, or tracking.
- Keep public source and documentation free of personal domains, addresses, credentials, and invented service data.

## Evidence on Hand

The existing implementation in `src/public/` and the API routes in `src/server.js` define the working behavior. Runtime service records are the only source of service names, states, routes, URLs, metadata, and previews.

## Product Principles

1. Show the live system truth rather than a curated fiction.
2. Optimize for recognition and launch speed.
3. Keep operational state legible without turning the launcher into a monitoring dashboard.
4. Degrade gracefully when metadata, previews, or endpoints are unavailable.
5. Keep the public implementation private-data neutral.

## Accessibility & Inclusion

The interface must support keyboard navigation, visible focus, reduced motion, sufficient light and dark contrast, semantic status text, and comfortable touch targets on mobile.
