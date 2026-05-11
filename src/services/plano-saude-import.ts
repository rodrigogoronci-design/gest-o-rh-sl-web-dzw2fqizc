import { supabase } from '@/lib/supabase/client'
import { savePlano, saveBeneficiariosBatch, saveFaturamentoBatch } from './plano-saude'

const parseExcelDate = (val: any) => {
  if (!val) return null
  if (typeof val === 'number') {
    const date = new Date((val - (25567 + 2)) * 86400 * 1000)
    if (isNaN(date.getTime())) return null
    return date.toISOString().split('T')[0]
  }
  if (typeof val === 'string') {
    if (val.includes('GMT') || val.includes('T')) {
      const d = new Date(val)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
    const parts = val.split('/')
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
    return val.split(' ')[0]
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0]
  }
  return null
}

const parseMonetaryValue = (val: any) => {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const clean = String(val)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  return parseFloat(clean) || 0
}

export const processImportBeneficiarios = async (file: File, planosAtuais: any[]) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await supabase.functions.invoke('parse-excel', { body: formData })
  if (res.error) throw res.error

  const data = res.data.data

  let targetRows: any[] = []
  let headerRowIdx = -1
  let headers: string[] = []

  for (const sheetName of Object.keys(data)) {
    const rows = data[sheetName]
    for (let i = 0; i < Math.min(50, rows.length); i++) {
      const row = rows[i]
      if (row && row.length > 3) {
        const rowStr = row.join(' ').toLowerCase()
        if (
          rowStr.includes('beneficiario') ||
          rowStr.includes('nome') ||
          rowStr.includes('plano')
        ) {
          headerRowIdx = i
          headers = row.map((c: any) => String(c).toLowerCase().trim())
          targetRows = rows
          break
        }
      }
    }
    if (headerRowIdx !== -1) break
  }

  let isStructuralFallback = false
  if (headerRowIdx === -1) {
    for (const sheetName of Object.keys(data)) {
      const rows = data[sheetName]
      for (let i = 0; i < Math.min(20, rows.length); i++) {
        const row = rows[i]
        if (row && row.length >= 8) {
          const c0 = String(row[0] || '')
          const c2 = String(row[2] || '')
            .trim()
            .toUpperCase()
          if (c0.includes('-') && (c2 === 'T' || c2 === 'D')) {
            targetRows = rows
            headerRowIdx = i - 1
            isStructuralFallback = true
            break
          }
        }
      }
      if (isStructuralFallback) break
    }
  }

  if (!targetRows.length) {
    throw new Error('Não foi possível identificar os dados no Relatório de Beneficiários.')
  }

  let colBenef = -1,
    colOperadora = -1,
    colTipo = -1,
    colSexo = -1,
    colNascimento = -1,
    colIdade = -1,
    colVigencia = -1,
    colPlano = -1

  if (isStructuralFallback) {
    colBenef = 0
    colOperadora = 1
    colTipo = 2
    colSexo = 3
    colNascimento = 4
    colIdade = 5
    colVigencia = 6
    colPlano = 8
  } else {
    colBenef = headers.findIndex((h) => h.includes('benefici'))
    colOperadora = headers.findIndex(
      (h) => h.includes('operadora') || h.includes('registro') || h.includes('numero da operadora'),
    )
    colTipo = headers.findIndex((h) => h === 'tipo' || h.includes('tp'))
    colSexo = headers.findIndex((h) => h === 'sexo')
    colNascimento = headers.findIndex((h) => h.includes('nascimento') || h.includes('nasc'))
    colIdade = headers.findIndex((h) => h === 'idade' || h.includes('idade'))
    colVigencia = headers.findIndex(
      (h) => h.includes('vigencia') || h.includes('início') || h.includes('inicio'),
    )
    colPlano = headers.findIndex((h) => h === 'plano' || h.includes('plano'))
  }

  let novosPlanos = 0
  const records = []
  const planCodesSet = new Set(planosAtuais.map((p) => p.codigo))

  for (let i = headerRowIdx + 1; i < targetRows.length; i++) {
    const row = targetRows[i]
    if (!row || row.length === 0) continue

    const benefStr = colBenef >= 0 ? String(row[colBenef] || '') : ''
    if (!benefStr) continue
    let numero = ''
    let nome = benefStr
    const benefMatch = benefStr.match(/^(\d+)[-\s]+(.*)$/)
    if (benefMatch) {
      numero = benefMatch[1]
      nome = benefMatch[2].trim()
    } else if (benefStr.includes('-')) {
      const parts = benefStr.split('-')
      numero = parts[0].trim()
      nome = parts.slice(1).join('-').trim()
    }

    const planoStr = String(row[colPlano] || '')
    let planoCodigo = ''
    let planoDesc = planoStr
    const planoMatch = planoStr.match(/^(\d+)[-\s]+(.*)$/)
    if (planoMatch) {
      planoCodigo = planoMatch[1]
      planoDesc = planoMatch[2].trim()
    } else if (planoStr.includes('-')) {
      const parts = planoStr.split('-')
      planoCodigo = parts[0].trim()
      planoDesc = parts.slice(1).join('-').trim()
    } else {
      planoCodigo = planoStr.substring(0, 10)
    }

    if (planoCodigo && !planCodesSet.has(planoCodigo)) {
      await savePlano({
        codigo: planoCodigo,
        descricao: planoDesc || 'Plano Importado',
        valor_titular: 0,
        valor_dependente: 0,
        com_coparticipacao: false,
        padrao: false,
      })
      planCodesSet.add(planoCodigo)
      novosPlanos++
    }

    records.push({
      numero,
      nome,
      registro_operadora: colOperadora >= 0 ? String(row[colOperadora] || '') : '',
      tipo: colTipo >= 0 ? String(row[colTipo] || '') : '',
      sexo: colSexo >= 0 ? String(row[colSexo] || '') : '',
      data_nascimento: colNascimento >= 0 ? parseExcelDate(row[colNascimento]) : null,
      idade: colIdade >= 0 ? parseInt(row[colIdade]) || null : null,
      inicio_vigencia: colVigencia >= 0 ? parseExcelDate(row[colVigencia]) : null,
      plano_codigo: planoCodigo,
      plano_descricao: planoDesc,
    })
  }

  if (records.length > 0) {
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      await saveBeneficiariosBatch(records.slice(i, i + batchSize))
    }
  }

  return { imported: records.length, novosPlanos }
}

export const processImportFaturamento = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await supabase.functions.invoke('parse-excel', { body: formData })
  if (res.error) throw res.error

  const data = res.data.data

  let targetRows: any[] = []
  let headerRowIdx = -1
  let headers: string[] = []

  for (const sheetName of Object.keys(data)) {
    const rows = data[sheetName]
    for (let i = 0; i < Math.min(50, rows.length); i++) {
      const row = rows[i]
      if (row && row.length > 3) {
        const rowStr = row.join(' ').toLowerCase()
        if (
          (rowStr.includes('beneficiario') || rowStr.includes('cpf')) &&
          (rowStr.includes('valor') || rowStr.includes('plano') || rowStr.includes('rubrica'))
        ) {
          headerRowIdx = i
          headers = row.map((c: any) => String(c).toLowerCase().trim())
          targetRows = rows
          break
        }
      }
    }
    if (headerRowIdx !== -1) break
  }

  let isStructuralFallback = false
  if (headerRowIdx === -1) {
    for (const sheetName of Object.keys(data)) {
      const rows = data[sheetName]
      for (let i = 0; i < Math.min(50, rows.length); i++) {
        const row = rows[i]
        if (row && row.length >= 10) {
          const hasCpf = row.some((c: any) => String(c).match(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/))
          if (hasCpf) {
            targetRows = rows
            headerRowIdx = i - 1
            isStructuralFallback = true
            break
          }
        }
      }
      if (isStructuralFallback) break
    }
  }

  if (!targetRows.length)
    throw new Error('Cabeçalho ou dados não encontrados no Demonstrativo Analítico de Faturamento.')

  let colNum = -1,
    colBenef = -1,
    colCpf = -1,
    colPlano = -1,
    colTipo = -1,
    colId = -1,
    colDep = -1,
    colLimite = -1,
    colInclusao = -1,
    colRubrica = -1,
    colValor = -1,
    colTotal = -1

  if (isStructuralFallback) {
    throw new Error('Não foi possível mapear as colunas pois o cabeçalho não foi identificado.')
  } else {
    colNum = headers.findIndex(
      (h) =>
        h === 'numero beneficiario' ||
        h === 'número beneficiário' ||
        h.includes('numero') ||
        h.includes('número'),
    )
    colBenef = headers.findIndex(
      (h) =>
        h === 'beneficiario' ||
        h === 'beneficiário' ||
        h === 'nome' ||
        (h.includes('benefici') && !h.includes('numero')),
    )
    colCpf = headers.findIndex((h) => h === 'cpf' || h.includes('cpf'))
    colPlano = headers.findIndex((h) => h === 'plano' || h.includes('plano'))
    colTipo = headers.findIndex(
      (h) => h === 'tipo' || h === 'tp' || h === 'tipo (tp)' || h.includes('tipo'),
    )
    colId = headers.findIndex((h) => h === 'id' || h === 'código' || h === 'codigo')
    colDep = headers.findIndex((h) => h.includes('dependencia') || h.includes('dependência'))
    colLimite = headers.findIndex((h) => h.includes('limite'))
    colInclusao = headers.findIndex((h) => h.includes('inclusão') || h.includes('inclusao'))
    colRubrica = headers.findIndex((h) => h.includes('rubrica') || h.includes('rublica'))
    colValor = headers.findIndex(
      (h) => h === 'valor' || h === 'valor unitário' || h === 'valor unitario',
    )
    colTotal = headers.findIndex((h) => h.includes('total') && h.includes('valor'))
    if (colTotal === -1) colTotal = headers.findIndex((h) => h.includes('total'))
  }

  const records = []
  const mes_ano = new Date().toISOString().slice(0, 7)

  for (let i = headerRowIdx + 1; i < targetRows.length; i++) {
    const row = targetRows[i]
    if (!row || row.length === 0) continue

    const c0 = String(row[0] || '').toLowerCase()
    if (c0.includes('subtotal') || c0.includes('total')) continue

    const benef = colBenef >= 0 ? String(row[colBenef] || '') : ''
    const num = colNum >= 0 ? String(row[colNum] || '') : ''

    if (!benef && !num) continue
    if (benef.toLowerCase().includes('total') || num.toLowerCase().includes('total')) continue

    records.push({
      mes_ano,
      numero_beneficiario: colNum >= 0 ? String(row[colNum] || '') : '',
      beneficiario_nome: colBenef >= 0 ? String(row[colBenef] || '') : '',
      cpf: colCpf >= 0 ? String(row[colCpf] || '') : '',
      plano: colPlano >= 0 ? String(row[colPlano] || '') : '',
      tipo: colTipo >= 0 ? String(row[colTipo] || '') : '',
      id_dependencia: colId >= 0 ? String(row[colId] || '') : '',
      dependencia: colDep >= 0 ? String(row[colDep] || '') : '',
      data_limite: colLimite >= 0 ? parseExcelDate(row[colLimite]) : null,
      dt_inclusao: colInclusao >= 0 ? parseExcelDate(row[colInclusao]) : null,
      rubrica: colRubrica >= 0 ? String(row[colRubrica] || '') : '',
      valor: colValor >= 0 ? parseMonetaryValue(row[colValor]) : 0,
      valor_total: colTotal >= 0 ? parseMonetaryValue(row[colTotal]) : 0,
    })
  }

  if (records.length > 0) {
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      await saveFaturamentoBatch(records.slice(i, i + batchSize))
    }
  }

  return { imported: records.length }
}
