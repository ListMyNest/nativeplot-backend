// ListMyNest — Wati Inbound Webhook Proxy (optional edge function)
// Proxies Wati webhook to Spring Boot backend
// TODO: Implement or remove if backend handles directly
import { NextRequest } from 'next/server'
export async function POST(req: NextRequest) {
  return Response.json({ received: true })
}
