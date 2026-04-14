import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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
        password: payload.password || 'Skip@Pass123!',
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
      const { data: colab } = await supabase
        .from('colaboradores')
        .select('user_id')
        .eq('id', payload.id)
        .single()
      const authUserId = colab?.user_id || payload.id

      const { error: dbErr } = await supabase.from('colaboradores').delete().eq('id', payload.id)
      if (dbErr) throw dbErr

      if (authUserId) {
        const { error } = await supabase.auth.admin.deleteUser(authUserId)
        if (error && !error.message.toLowerCase().includes('user not found')) {
          console.error('Error deleting auth user:', error)
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const { id, email, name, role, password } = payload

      const { data: colab } = await supabase
        .from('colaboradores')
        .select('user_id')
        .eq('id', id)
        .single()
      const authUserId = colab?.user_id || id

      const updateData: any = {
        email,
        user_metadata: { name },
        email_confirm: true,
      }

      if (password) {
        updateData.password = password
      }

      if (authUserId) {
        const { error: authErr } = await supabase.auth.admin.updateUserById(authUserId, updateData)
        if (authErr) {
          if (authErr.message.toLowerCase().includes('user not found')) {
            if (password) {
              const { data: newAuth, error: createErr } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name },
              })
              if (createErr) throw createErr

              await supabase.from('colaboradores').update({ user_id: newAuth.user.id }).eq('id', id)
            }
          } else {
            throw authErr
          }
        }
      }

      const { error: dbErr } = await supabase
        .from('colaboradores')
        .update({
          email,
          nome: name,
          role: role === 'admin' ? 'Admin' : 'Colaborador',
        })
        .eq('id', id)
      if (dbErr) throw dbErr

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
