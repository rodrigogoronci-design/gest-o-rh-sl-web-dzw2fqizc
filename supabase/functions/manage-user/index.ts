import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { action, payload } = await req.json()

    if (action === 'create') {
      const { data, error } = await supabase.auth.admin.createUser({
        email: payload.email,
        password: 'Skip@Pass123!',
        email_confirm: true,
        user_metadata: { name: payload.name },
      })
      if (error) throw error

      const { error: dbErr } = await supabase.from('colaboradores').insert({
        id: data.user.id,
        user_id: data.user.id,
        email: payload.email,
        nome: payload.name,
        role: payload.role === 'admin' ? 'Admin' : 'Colaborador',
      })
      if (dbErr) throw dbErr

      return new Response(JSON.stringify({ success: true, id: data.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      const { error } = await supabase.auth.admin.deleteUser(payload.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const { id, email, name, role } = payload

      const { error: authErr } = await supabase.auth.admin.updateUserById(id, {
        email,
        user_metadata: { name },
        email_confirm: true,
      })
      if (authErr) throw authErr

      const { error: dbErr } = await supabase
        .from('colaboradores')
        .update({
          email,
          nome: name,
          role: role === 'admin' ? 'Admin' : 'Colaborador',
        })
        .eq('user_id', id)
      if (dbErr) throw dbErr

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: corsHeaders,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: corsHeaders,
    })
  }
})
