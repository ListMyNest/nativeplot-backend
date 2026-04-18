// ListMyNest — ISR Revalidation Webhook
// Called by backend when a property is updated to trigger Next.js cache revalidation
// TODO: Implement with revalidateTag/revalidatePath + secret token check
import { NextRequest } from 'next/server'
export async function POST(req: NextRequest) {
  return Response.json({ revalidated: false, message: 'TODO: implement' })
}
