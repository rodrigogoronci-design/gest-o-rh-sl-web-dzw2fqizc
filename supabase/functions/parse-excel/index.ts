import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import * as XLSX from 'npm:xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      throw new Error('Nenhum arquivo enviado.')
    }

    const arrayBuffer = await file.arrayBuffer()
    if (arrayBuffer.byteLength === 0) {
      throw new Error('Arquivo vazio.')
    }

    const uint8Array = new Uint8Array(arrayBuffer)

    let workbook
    try {
      workbook = XLSX.read(uint8Array, {
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
      })
    } catch (e) {
      const text = new TextDecoder('iso-8859-1').decode(uint8Array)
      workbook = XLSX.read(text, { type: 'string', cellDates: true })
    }

    const result: any = {}
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        blankrows: true,
        raw: false,
      })
      result[sheetName] = rows
    }

    // Se o resultado da biblioteca estiver vazio, enviar o texto bruto como fallback
    let rawText = ''
    if (
      Object.keys(result).length === 0 ||
      Object.values(result).every((arr: any) => arr.length === 0)
    ) {
      rawText = new TextDecoder('utf-8').decode(uint8Array)
      // Tentar iso-8859-1 se houver muitos erros de decodificação no utf-8
      if (rawText.includes('')) {
        rawText = new TextDecoder('iso-8859-1').decode(uint8Array)
      }
    }

    return new Response(JSON.stringify({ success: true, data: result, rawText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
