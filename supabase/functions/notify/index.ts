// Supabase Edge Function: notify
// Sends email via Resend when a new match or message occurs.
//
// Setup:
//   1. supabase secrets set RESEND_API_KEY=re_xxxx FROM_EMAIL=noreply@yourdomain.com
//   2. supabase functions deploy notify
//   3. In Supabase dashboard → Database → Webhooks, create two webhooks:
//      - Table: matches, Event: INSERT  → POST https://<project>.supabase.co/functions/v1/notify
//      - Table: messages, Event: INSERT → POST https://<project>.supabase.co/functions/v1/notify

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL') ?? 'blindspot <noreply@example.com>',
      to,
      subject,
      html,
    }),
  })
  return res.ok
}

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const record = body.record
    const table = body.table

    if (table === 'matches') {
      // New match — notify both users
      const { data: userA } = await supabase.auth.admin.getUserById(record.user_a)
      const { data: userB } = await supabase.auth.admin.getUserById(record.user_b)
      const { data: profileA } = await supabase.from('profiles').select('name').eq('id', record.user_a).single()
      const { data: profileB } = await supabase.from('profiles').select('name').eq('id', record.user_b).single()

      if (userA.user?.email && profileB) {
        await sendEmail(
          userA.user.email,
          `You matched with ${profileB.name} on blindspot`,
          `<p>You and <strong>${profileB.name}</strong> both liked each other on blindspot.</p>
           <p>Start chatting before the match expires!</p>
           <p><a href="${Deno.env.get('SITE_URL') ?? 'https://blindspot.app'}/matches">Open blindspot →</a></p>`
        )
      }
      if (userB.user?.email && profileA) {
        await sendEmail(
          userB.user.email,
          `You matched with ${profileA.name} on blindspot`,
          `<p>You and <strong>${profileA.name}</strong> both liked each other on blindspot.</p>
           <p>Start chatting before the match expires!</p>
           <p><a href="${Deno.env.get('SITE_URL') ?? 'https://blindspot.app'}/matches">Open blindspot →</a></p>`
        )
      }
    }

    if (table === 'messages' && record.type !== 'system') {
      // New message — notify recipient (not sender)
      const { data: match } = await supabase
        .from('matches').select('user_a, user_b').eq('id', record.match_id).single()
      if (!match) return new Response('ok')

      const recipientId = match.user_a === record.sender_id ? match.user_b : match.user_a
      const { data: recipient } = await supabase.auth.admin.getUserById(recipientId)
      const { data: sender } = await supabase.from('profiles').select('name').eq('id', record.sender_id).single()

      if (recipient.user?.email && sender) {
        await sendEmail(
          recipient.user.email,
          `New message from ${sender.name}`,
          `<p><strong>${sender.name}</strong> sent you a message on blindspot.</p>
           <p><a href="${Deno.env.get('SITE_URL') ?? 'https://blindspot.app'}/matches">Read it →</a></p>`
        )
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('error', { status: 500 })
  }
})
