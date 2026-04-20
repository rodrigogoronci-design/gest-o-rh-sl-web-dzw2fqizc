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
    
    let workbook;
    const result: any = {}
    let rawText = '';

    try {
      try {
        workbook = XLSX.read(uint8Array, { type: 'array', cellDates: true, cellNF: false, cellText: false })
      } catch (e) {
        const text = new TextDecoder('iso-8859-1').decode(uint8Array)
        workbook = XLSX.read(text, { type: 'string', cellDates: true })
      }
      
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { 
          header: 1, 
          defval: '',
          blankrows: true,
          raw: false 
        })
        result[sheetName] = rows
      }
    } catch (parseError) {
      console.error('XLSX parse error, falling back to raw text', parseError)
    }

    // Sempre extrair o texto bruto como fallback para o frontend
    rawText = new TextDecoder('utf-8').decode(uint8Array);
    if (rawText.includes('')) {
      rawText = new TextDecoder('iso-8859-1').decode(uint8Array);
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
