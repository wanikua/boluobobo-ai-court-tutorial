# Quadrants + Openclaw Setup Guide

## 1. Vercel Environment Variables

Add these to the Quadrants Vercel project:

```
QUADRANTS_SERVICE_KEY=f21657b9317f3873ad14cc6e21ad88f5f0bf3c73c3d9cbb7ac7e95c8aa9f26a9
QUADRANTS_SERVICE_USER_ID=<your-clerk-user-id>
```

For the chat widget (optional):
```
NEXT_PUBLIC_OPENCLAW_GATEWAY_URL=http://100.125.166.54:18789
NEXT_PUBLIC_OPENCLAW_GATEWAY_TOKEN=45371aba4d03c1a3e7faf31ed6f5dc778c8069ec04e2c98f
```

## 2. Openclaw Environment

Export or add to agent env:
```
QUADRANTS_API_URL=https://quadrants.ch
QUADRANTS_API_KEY=f21657b9317f3873ad14cc6e21ad88f5f0bf3c73c3d9cbb7ac7e95c8aa9f26a9
```

## 3. Quadrants Code Deployment

The following new files need to be committed and deployed:

### New API Routes:
- `app/api/service/route.ts` — Service API (all CRUD operations via API key)
- `app/api/webhooks/openclaw/route.ts` — Webhook receiver

### New Component:
- `components/openclaw-chat-widget.tsx` — Floating chat widget

### To embed the widget in Quadrants:
Add to `app/layout.tsx` or the projects page:
```tsx
import { OpenclawChatWidget } from '@/components/openclaw-chat-widget'

// In JSX:
<OpenclawChatWidget projectId={currentProjectId} />
```

## 4. Heartbeat Integration

Add to `HEARTBEAT.md`:
```
Check Quadrants for overdue high-priority tasks (Q1) and remind user
```

## 5. Cron Job for Daily Briefing

```
Every morning at 8:00 AM: Fetch Quadrants priority tasks and send summary to Discord #quadrants channel
```

## Architecture

```
┌─────────────────┐     Service API      ┌──────────────────┐
│   Openclaw      │ ──────────────────── │   Quadrants      │
│   (Skill/CLI)   │     /api/service     │   (Vercel)       │
│                 │ ◄────────────────── │                  │
│                 │     Webhook          │   /api/webhooks/ │
└────────┬────────┘     /openclaw        └────────┬─────────┘
         │                                        │
    Discord/Signal                          Chat Widget
    (user commands)                    (embedded in Quadrants UI)
```
