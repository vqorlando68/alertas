"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Download, 
  Filter, 
  Calendar, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText,
  Terminal,
  MessageSquare,
  Save,
  X,
  ArrowLeft,
  ShieldAlert,
  Eye,
  UserCheck
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApp } from "@/lib/theme-context"

type LogEntry = {
  ID: number
  ID_ALERTA: number
  DESCRIPCION_ALERTA: string
  LOG: string
  FECHA: string
  ESTADO: string
  ID_PERSONA_ASIGNADA: number | null
  NOMBRE_ASIGNADO: string
  SOLUCIONADO: string
  FECHA_SOLUCION: string
  COMENTARIOS_SOLUCION: string
  LOG_ESTADO: string
  PASOS_A_SEGUIR: string
}

type UsuarioAsignable = {
  id: number
  nombre_completo: string
}

const isHtml = (str: string) => {
  if (!str) return false
  return /<[a-z][\s\S]*>/i.test(str)
}

const getEstadoBadge = (estado: string) => {
  switch (estado) {
    case "P":
      return {
        label: "Pendiente",
        classes: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        dot: "bg-orange-500",
      }
    case "A":
      return {
        label: "Asignado",
        classes: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        dot: "bg-blue-400",
      }
    case "S":
      return {
        label: "Solucionado",
        classes: "bg-green-500/10 text-green-500 border-green-500/20",
        dot: "bg-green-500",
      }
    default:
      return {
        label: estado,
        classes: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        dot: "bg-slate-400",
      }
  }
}

export default function LogsPage() {
  const { t, theme } = useApp()
  const [logs, setLogs] = React.useState<LogEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [expandedRows, setExpandedRows] = React.useState<number[]>([])
  
  // Expanded rows view modes: solo para HTML si aplica
  const [rowViewModes, setRowViewModes] = React.useState<Record<number, 'text' | 'html'>>({})
  
  const getRowViewMode = (logId: number, logContent: string): 'text' | 'html' => {
    if (rowViewModes[logId]) return rowViewModes[logId]
    return isHtml(logContent) ? 'html' : 'text'
  }

  // Filters
  const [fechaIni, setFechaIni] = React.useState("")
  const [fechaFin, setFechaFin] = React.useState("")
  const [searchAlerta, setSearchAlerta] = React.useState("")
  const [estadoFilter, setEstadoFilter] = React.useState("Todas")

  // Alert selector state
  const [alertasList, setAlertasList] = React.useState<{ ID: number; DESCRIPCION_ALERTA: string }[]>([])
  const [programmedAlertIds, setProgrammedAlertIds] = React.useState<number[]>([])
  const [isAlertDropdownOpen, setIsAlertDropdownOpen] = React.useState(false)
  const [alertSearchTerm, setAlertSearchTerm] = React.useState("")
  
  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10

  // Edit Solucion
  const [editingLog, setEditingLog] = React.useState<LogEntry | null>(null)
  const [editEstado, setEditEstado] = React.useState("P")
  const [editIdPersonaAsignada, setEditIdPersonaAsignada] = React.useState<number | null>(null)
  const [editSolucion, setEditSolucion] = React.useState("") // Solo texto NUEVO a agregar
  const [editingLogViewMode, setEditingLogViewMode] = React.useState<'text' | 'html'>('text')
  const [saveError, setSaveError] = React.useState("")

  // Usuarios asignables (rol 13)
  const [usuariosAsignables, setUsuariosAsignables] = React.useState<UsuarioAsignable[]>([])

  React.useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const initialAlertId = queryParams.get("id_alerta") || queryParams.get("alerta") || ""
    if (initialAlertId) {
      setSearchAlerta(initialAlertId)
    }

    fetchLogs(initialAlertId)
    // Fetch alerts list and jobs for the smart selector
    fetch("/api/alertas").then(r => r.json()).then(d => setAlertasList(d.alertas || []))
    fetch("/api/schedule").then(r => r.json()).then(d => {
      if (d.jobs) setProgrammedAlertIds(d.jobs.map((j: any) => Number(j.ID_ALERTA)))
    })
    // Cargar usuarios asignables
    fetch("/api/usuarios/asignables").then(r => r.json()).then(d => setUsuariosAsignables(d.usuarios || []))
  }, [])

  const fetchLogs = async (overrideIdAlert?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (fechaIni) params.append("fecha_ini", fechaIni)
      if (fechaFin) params.append("fecha_fin", fechaFin)
      
      const alertIdToUse = overrideIdAlert !== undefined ? overrideIdAlert : searchAlerta
      if (alertIdToUse) params.append("id_alerta", alertIdToUse)
      if (estadoFilter !== "Todas") params.append("estado", estadoFilter)
      
      const res = await fetch(`/api/logs?${params.toString()}`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleRow = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const handleExport = () => {
    const headers = ["ID", "Alerta", "Fecha", "Estado", "Asignado"]
    const rows = logs.map(l => [
      l.ID,
      l.DESCRIPCION_ALERTA,
      l.FECHA,
      l.ESTADO === "P" ? "Pendiente" : l.ESTADO === "A" ? "Asignado" : "Solucionado",
      l.NOMBRE_ASIGNADO || "",
    ])
    const csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map(e => e.join(",")).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "reporte_logs.csv")
    document.body.appendChild(link)
    link.click()
  }

  const openEditSolucion = (log: LogEntry) => {
    setEditingLog(log)
    setEditEstado(log.ESTADO || "P")
    setEditIdPersonaAsignada(log.ID_PERSONA_ASIGNADA || null)
    setEditSolucion("") // Siempre inicia vacío: el usuario solo agrega texto nuevo
    setEditingLogViewMode(isHtml(log.LOG) ? 'html' : 'text')
    setSaveError("")
  }

  const handleSaveSolucion = async () => {
    if (!editingLog) return

    // Validar: estado A requiere usuario asignado
    if (editEstado === "A" && !editIdPersonaAsignada) {
      setSaveError("Debe seleccionar un Usuario Asignado cuando el estado es 'Asignado'.")
      return
    }
    setSaveError("")

    try {
      const res = await fetch(`/api/logs/${editingLog.ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comentarios_solucion: editSolucion,
          estado: editEstado,
          id_persona_asignada: editIdPersonaAsignada,
        }),
      })
      if (res.ok) {
        setEditingLog(null)
        fetchLogs()
      } else {
        const data = await res.json()
        setSaveError(data.error || "Error al guardar los cambios.")
      }
    } catch (err) {
      console.error(err)
      setSaveError("Error de conexión al guardar.")
    }
  }

  const totalPages = Math.ceil(logs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = logs.slice(startIndex, startIndex + itemsPerPage)

  // =====================================================================
  // PANTALLA DE EDICIÓN
  // =====================================================================
  if (editingLog) {
    const logIsHtml = isHtml(editingLog.LOG)
    return (
      <div className="mx-auto max-w-6xl pb-20 font-sans space-y-8 animate-in fade-in duration-500">
        <div className="mb-8">
          <button onClick={() => setEditingLog(null)} className="flex items-center text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("logs.backToLogs")}
          </button>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white flex items-center">
            {t("logs.editTitle")} <span className="text-[#ff5a1f] ml-2">#{editingLog.ID}</span>
          </h1>
          <p className="text-sm text-slate-400">{t("logs.editSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0b101e] border border-red-500/20 rounded-xl p-6 shadow-lg shadow-black/50">
              <div className="flex items-start mb-4">
                 <div className="bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 mr-4">
                   <ShieldAlert className="w-6 h-6 text-red-500" />
                 </div>
                 <div>
                   <h2 className="text-lg font-bold text-white mb-1">
                     {editingLog.DESCRIPCION_ALERTA} <span className="text-[#ff5a1f] ml-2 font-mono">#{editingLog.ID_ALERTA}</span>
                   </h2>
                   <p className="text-xs text-slate-400 uppercase tracking-widest font-bold text-balance">Información de la Alerta Relacionada</p>
                 </div>
              </div>
              <div className="bg-[#050812] border border-[#1e293b] rounded-lg p-5">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                  <FileText className="w-3 h-3 mr-1.5" /> Pasos a Seguir:
                </h3>
                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed mt-2">
                  {editingLog.PASOS_A_SEGUIR ? editingLog.PASOS_A_SEGUIR.split('\n').map((line, i) => (
                    line.trim() ? (
                      <div key={i} className="flex mb-2">
                        <span className="flex-shrink-0 w-4 h-4 bg-[#06b6d4] text-black rounded text-[9px] font-bold flex items-center justify-center mr-2 mt-0.5">{i+1}</span>
                        <span>{line.replace(/^[0-9]+\.\s*/, '')}</span>
                      </div>
                    ) : null
                  )) : 'No hay pasos definidos para la solución de esta alerta.'}
                </div>
              </div>
            </div>

            {/* Log de Error */}
            <div className="bg-[#0b101e] border border-[#1e293b] rounded-xl p-6 shadow-lg shadow-black/50 relative group">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <Terminal className="w-4 h-4 mr-2 text-[#ff5a1f]" /> Stack Trace / Log de Error
                </h3>
                <div className="flex items-center space-x-3">
                  {/* Toggle Código/HTML: solo visible si el log es HTML */}
                  {logIsHtml && (
                    <div className="flex bg-[#050812] border border-[#1e293b] p-0.5 rounded-lg">
                      <button
                        onClick={() => setEditingLogViewMode('text')}
                        className={cn(
                          "flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all duration-200",
                          editingLogViewMode === 'text'
                            ? "bg-[#ff5a1f] text-white shadow-md shadow-[#ff5a1f]/20"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Texto</span>
                      </button>
                      <button
                        onClick={() => setEditingLogViewMode('html')}
                        className={cn(
                          "flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all duration-200",
                          editingLogViewMode === 'html'
                            ? "bg-[#ff5a1f] text-white shadow-md shadow-[#ff5a1f]/20"
                            : "text-slate-400 hover:text-white"
                        )}
                      >
                        <Eye className="w-3 h-3" />
                        <span>HTML</span>
                      </button>
                    </div>
                  )}
                  <span className="text-[10px] font-mono bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20 px-2.5 py-1 rounded-md">
                    FECHA: {editingLog.FECHA ? format(new Date(editingLog.FECHA), "yyyy-MM-dd HH:mm:ss") : 'N/A'}
                  </span>
                </div>
              </div>
              
              {logIsHtml && editingLogViewMode === 'html' ? (
                <div className="border border-[#1e293b] rounded-lg overflow-hidden h-80 bg-[#050812]">
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <style>
                            body {
                              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                              background-color: transparent;
                              color: ${theme === 'light' ? '#04354d' : '#cbd5e1'};
                              margin: 0;
                              padding: 16px;
                              font-size: 13px;
                            }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid ${theme === 'light' ? 'rgba(0, 170, 225, 0.25)' : '#1e293b'}; }
                            th { background-color: ${theme === 'light' ? 'rgba(0, 170, 225, 0.1)' : '#0f172a'}; color: ${theme === 'light' ? '#0177ab' : '#38bdf8'}; font-weight: 600; text-align: left; padding: 10px 12px; border: 1px solid ${theme === 'light' ? 'rgba(0, 170, 225, 0.25)' : '#1e293b'}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
                            td { padding: 10px 12px; border: 1px solid ${theme === 'light' ? 'rgba(0, 170, 225, 0.25)' : '#1e293b'}; }
                            tr:nth-child(even) { background-color: ${theme === 'light' ? 'rgba(0, 170, 225, 0.04)' : '#0a0f1d'}; }
                            tr:hover { background-color: ${theme === 'light' ? 'rgba(0, 170, 225, 0.08)' : '#0f172a'}; }
                          </style>
                        </head>
                        <body>${editingLog.LOG || ''}</body>
                      </html>
                    `}
                    className="w-full h-full border-0"
                    title="HTML Log Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <div className="bg-black/80 border border-red-500/20 rounded-lg p-5 overflow-auto max-h-80">
                  <pre className="text-xs font-mono text-red-400/90 whitespace-pre-wrap leading-relaxed">
                    {editingLog.LOG || '-- Sin traza de error capturada --'}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Panel de Resolución */}
          <div className="lg:col-span-1">
            <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 sticky top-8 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-6 flex items-center pb-4 border-b border-[#1e293b]">
                <Edit2 className="w-4 h-4 mr-2 text-[#ff5a1f]" /> {t("logs.resolution")}
              </h3>
              
              <div className="space-y-5">
                {/* Estado */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado de la Alerta</label>
                  <select 
                    value={editEstado}
                    onChange={(e) => {
                      setEditEstado(e.target.value)
                      // Si cambia de A a otro, limpiar asignado
                      if (e.target.value !== "A") setEditIdPersonaAsignada(null)
                      setSaveError("")
                    }}
                    className="w-full bg-[#050812] border border-[#1e293b] text-slate-200 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]"
                  >
                    <option value="P">Pendiente</option>
                    <option value="A">Asignado</option>
                    <option value="S">Solucionado</option>
                  </select>
                </div>

                {/* Usuario Asignado — solo si estado = A */}
                {editEstado === "A" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center">
                      <UserCheck className="w-3 h-3 mr-1.5" />
                      Usuario Asignado <span className="text-red-400 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                      <select
                        value={editIdPersonaAsignada ?? ""}
                        onChange={(e) => {
                          setEditIdPersonaAsignada(e.target.value ? Number(e.target.value) : null)
                          setSaveError("")
                        }}
                        className="w-full bg-[#050812] border border-blue-500/30 text-slate-200 rounded-md h-10 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- Seleccionar usuario --</option>
                        {usuariosAsignables.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Error de validación */}
                {saveError && (
                  <div className="flex items-start bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-400">{saveError}</p>
                  </div>
                )}

                {/* Solución Aplicada */}
                <div className="space-y-2">
                  <label className={cn(
                    "text-[10px] font-bold uppercase tracking-widest",
                    theme === 'light' ? "text-slate-500" : "text-slate-400"
                  )}>Solución Aplicada</label>

                  {/* Texto existente — solo lectura */}
                  {editingLog.COMENTARIOS_SOLUCION && (
                    <div className="relative">
                      <div className={cn(
                        "absolute top-2 right-2 flex items-center space-x-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                        theme === 'light'
                          ? "bg-slate-200 border-slate-300 text-slate-500"
                          : "bg-slate-800/80 border-slate-700 text-slate-500"
                      )}>
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        <span>Solo lectura</span>
                      </div>
                      <div className={cn(
                        "w-full rounded-md p-4 pr-24 text-sm min-h-[80px] whitespace-pre-wrap leading-relaxed italic",
                        theme === 'light'
                          ? "bg-slate-100 border border-slate-300 text-slate-500"
                          : "bg-[#030509] border border-slate-700/50 text-slate-400 opacity-70"
                      )}>
                        {editingLog.COMENTARIOS_SOLUCION}
                      </div>
                    </div>
                  )}

                  {/* Nuevo texto a adicionar */}
                  <div className="relative">
                    {editingLog.COMENTARIOS_SOLUCION && (
                      <span className={cn(
                        "absolute -top-2.5 left-3 px-1.5 text-[9px] font-bold uppercase tracking-wider",
                        theme === 'light'
                          ? "bg-white text-green-600"
                          : "bg-[#111827] text-green-400"
                      )}>
                        Adicionar texto
                      </span>
                    )}
                    <textarea
                      placeholder={editingLog.COMENTARIOS_SOLUCION
                        ? "Escriba aquí el nuevo texto a agregar..."
                        : "Describa la solución técnica aplicada..."
                      }
                      value={editSolucion}
                      onChange={(e) => setEditSolucion(e.target.value)}
                      className={cn(
                        "w-full rounded-md p-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] min-h-[100px] resize-none",
                        theme === 'light'
                          ? "bg-white border border-slate-300 text-slate-700 placeholder:text-slate-400"
                          : "bg-[#050812] border border-[#1e293b] text-slate-200 placeholder:text-slate-600"
                      )}
                    />
                  </div>
                </div>

                {/* Historial de Estado — LOG_ESTADO */}
                {editingLog.LOG_ESTADO && (
                  <div className="space-y-2">
                    <label className={cn(
                      "text-[10px] font-bold uppercase tracking-widest flex items-center",
                      theme === 'light' ? "text-slate-500" : "text-slate-400"
                    )}>
                      <Clock className="w-3 h-3 mr-1.5 text-[#06b6d4]" /> Historial de Estado
                    </label>
                    <div className={cn(
                      "rounded-md p-3 max-h-40 overflow-y-auto space-y-1.5 border",
                      theme === 'light'
                        ? "bg-slate-50 border-slate-200"
                        : "bg-[#050812] border-[#1e293b]"
                    )}>
                      {editingLog.LOG_ESTADO.split('\n').filter(l => l.trim()).map((entry, idx) => (
                        <div key={idx} className="flex items-start text-[11px]">
                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#06b6d4] mt-1 mr-2" />
                          <span className={cn(
                            "font-mono leading-relaxed",
                            theme === 'light' ? "text-[#0177ab]" : "text-[#06b6d4]/80"
                          )}>{entry}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex flex-col space-y-3">
                  <Button 
                    onClick={handleSaveSolucion} 
                    className="w-full bg-[#ff5a1f] hover:bg-[#e04a14] text-white font-bold h-11 shadow-lg shadow-[#ff5a1f]/20 rounded-md"
                  >
                    <Save className="w-4 h-4 mr-2" /> {t("logs.saveChanges")}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setEditingLog(null)} 
                    className="w-full text-slate-400 hover:text-white hover:bg-white/5 h-10"
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =====================================================================
  // PANTALLA PRINCIPAL (LISTA)
  // =====================================================================
  return (
    <div className="mx-auto pb-20 font-sans space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">{t("logs.title")}</h1>
          <p className="text-sm text-slate-400">{t("logs.subtitle")}</p>
        </div>
        <Button onClick={handleExport} className="bg-[#ff5a1f] hover:bg-[#e04a14] text-white font-medium px-6 shadow-lg shadow-[#ff5a1f]/20 h-10 rounded-md">
          <Download className="w-4 h-4 mr-2" /> {t("common.export")}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 flex flex-wrap lg:flex-nowrap gap-4 items-end shadow-md">
        <div className="w-full lg:w-48 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase flex items-center">
            <Calendar className="w-3 h-3 mr-1.5 text-[#06b6d4]" /> {t("alerts.startDate")}
          </label>
          <input 
            type="date" 
            value={fechaIni}
            onChange={(e) => setFechaIni(e.target.value)}
            className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]" 
          />
        </div>
        <div className="w-full lg:w-48 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase flex items-center">
            <Calendar className="w-3 h-3 mr-1.5 text-[#06b6d4]" /> {t("alerts.endDate")}
          </label>
          <input 
            type="date" 
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff5a1f]" 
          />
        </div>
        <div className="flex-1 space-y-2 min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase flex items-center">
            <Search className="w-3 h-3 mr-1.5 text-[#06b6d4]" /> {t("logs.alert")}
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500 z-10" />
            <input
              type="text"
              className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] cursor-text"
              placeholder="Todas las alertas..."
              value={isAlertDropdownOpen
                ? alertSearchTerm
                : (searchAlerta === "" 
                  ? "Todas las alertas"
                  : (alertasList.find(al => al.ID.toString() === searchAlerta)?.DESCRIPCION_ALERTA || searchAlerta))
              }
              onChange={e => {
                setIsAlertDropdownOpen(true)
                setAlertSearchTerm(e.target.value)
                if (!e.target.value) setSearchAlerta("")
              }}
              onClick={() => setIsAlertDropdownOpen(true)}
              onBlur={() => setTimeout(() => setIsAlertDropdownOpen(false), 200)}
            />
            {isAlertDropdownOpen && (
              <div className="absolute z-20 w-full mt-1 bg-[#050812] border border-[#1e293b] rounded-md max-h-60 overflow-y-auto shadow-xl">
                <div
                  className="p-3 cursor-pointer hover:bg-[#1e293b] text-sm text-slate-300 border-b border-[#1e293b]/50"
                  onMouseDown={() => { setSearchAlerta(""); setAlertSearchTerm(""); setIsAlertDropdownOpen(false) }}
                >
                  {t("alerts.allAlerts")}
                </div>
                {alertasList.filter(al => {
                  const term = alertSearchTerm.toLowerCase()
                  return al.ID.toString().includes(term) || (al.DESCRIPCION_ALERTA || "").toLowerCase().includes(term)
                }).map(al => {
                  const isProg = programmedAlertIds.includes(al.ID)
                  return (
                    <div
                      key={al.ID}
                      className="p-3 cursor-pointer hover:bg-[#1e293b] text-sm text-slate-300 flex items-center justify-between border-b border-[#1e293b]/50 last:border-0"
                      onMouseDown={() => { setSearchAlerta(al.ID.toString()); setAlertSearchTerm(""); setIsAlertDropdownOpen(false) }}
                    >
                      <span className="truncate pr-2">ID: {al.ID} - {al.DESCRIPCION_ALERTA}</span>
                      {isProg && <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap">⚡ JOB</span>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="w-full lg:w-44 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase flex items-center">
            <Filter className="w-3 h-3 mr-1.5 text-[#06b6d4]" /> {t("logs.stateFilter")}
          </label>
          <select 
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none"
          >
            <option value="Todas">{t("logs.allStatus")}</option>
            <option value="P">{t("logs.pending")}</option>
            <option value="A">Asignado</option>
            <option value="S">{t("logs.solved")}</option>
          </select>
        </div>
        <div className="w-full lg:w-auto pt-2 lg:pt-0">
          <Button onClick={() => fetchLogs()} className="w-full lg:w-32 bg-[#06b6d4] hover:bg-[#0891b2] text-black font-bold h-10 shadow-lg shadow-[#06b6d4]/20 rounded-md">
            <Search className="w-4 h-4 mr-2" /> {t("common.filter")}
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-[#0d1323] border border-[#1e293b] rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111827] border-b border-[#1e293b]">
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("common.id")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("logs.alertDesc")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("common.date")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("common.status")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("logs.assigned")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Activity className="w-10 h-10 text-[#ff5a1f] animate-pulse" />
                    <span className="text-slate-500 font-medium">Cargando bitácora de logs...</span>
                  </div>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-slate-500 font-medium">{t("logs.noLogs")}</td></tr>
              ) : (
                paginatedLogs.map(log => {
                  const isExpanded = expandedRows.includes(log.ID)
                  const isPending = log.ESTADO === "P"
                  const isAsignado = log.ESTADO === "A"
                  const canEdit = isPending || isAsignado
                  const badge = getEstadoBadge(log.ESTADO)
                  
                  return (
                    <React.Fragment key={log.ID}>
                      <tr 
                        className={cn(
                          "group transition-colors cursor-pointer",
                          isExpanded ? "bg-[#151c2f]" : "hover:bg-[#151c2f]/50"
                        )}
                        onClick={() => toggleRow(log.ID)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                            <span className="text-sm font-bold text-slate-400">{log.ID}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-bold text-[#06b6d4] group-hover:text-white transition-colors">{log.DESCRIPCION_ALERTA}</span>
                        </td>
                        <td className="py-4 px-6 font-mono text-[12px] text-slate-400">
                          {log.FECHA ? format(new Date(log.FECHA), "yyyy-MM-dd HH:mm:ss") : '---'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            badge.classes
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", badge.dot)} />
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-300">
                          {log.NOMBRE_ASIGNADO || '---'}
                        </td>
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <button 
                            disabled={!canEdit}
                            onClick={() => canEdit && openEditSolucion(log)}
                            title={!canEdit ? "No se puede editar un log solucionado" : "Editar"}
                            className={cn(
                              "p-2 rounded-lg transition-colors inline-flex",
                              canEdit ? "text-slate-500 hover:text-white hover:bg-[#1e293b]" : "text-slate-700 cursor-not-allowed"
                            )}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-[#0a0e17]">
                          <td colSpan={6} className="px-10 py-8 border-b border-[#1e293b]">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                              
                              {/* Meta Info */}
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-[#050812] border border-[#1e293b] rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">ID Alerta</p>
                                    <p className="text-sm font-mono text-[#ff5a1f]">AL-{log.ID_ALERTA}</p>
                                  </div>
                                  <div className="bg-[#050812] border border-[#1e293b] rounded-lg p-3">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Responsable</p>
                                    <div className="flex items-center">
                                      <User className="w-3 h-3 mr-1.5 text-slate-600" />
                                      <p className="text-sm text-slate-300">{log.NOMBRE_ASIGNADO || 'Sin asignar'}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-2 text-[#06b6d4]" /> Pasos a Seguir
                                  </h4>
                                  <div className="bg-[#050812] border border-[#1e293b] rounded-lg p-4 min-h-[80px]">
                                    <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                      {log.PASOS_A_SEGUIR ? log.PASOS_A_SEGUIR.split('\n').map((line, i) => (
                                        line.trim() ? (
                                          <div key={i} className="flex mb-2">
                                            <span className="flex-shrink-0 w-4 h-4 bg-[#06b6d4] text-black rounded text-[9px] font-bold flex items-center justify-center mr-2 mt-0.5">{i+1}</span>
                                            <span>{line.replace(/^[0-9]+\.\s*/, '')}</span>
                                          </div>
                                        ) : null
                                      )) : 'No hay pasos definidos para esta alerta.'}
                                    </div>
                                  </div>
                                </div>

                                {/* Log de Error en vista expandida */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                      <Terminal className="w-3.5 h-3.5 mr-2 text-red-500" /> Log de Error / Ejecución
                                    </h4>
                                    {/* Toggle solo si log es HTML */}
                                    {isHtml(log.LOG) && (
                                      <div className="flex bg-[#050812] border border-[#1e293b] p-0.5 rounded-lg">
                                        <button
                                          onClick={() => setRowViewModes(prev => ({ ...prev, [log.ID]: 'text' }))}
                                          className={cn(
                                            "flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all duration-200",
                                            getRowViewMode(log.ID, log.LOG) === 'text'
                                              ? "bg-[#ff5a1f] text-white shadow-sm"
                                              : "text-slate-400 hover:text-white"
                                          )}
                                        >
                                          <Eye className="w-2.5 h-2.5" />
                                          <span>Texto</span>
                                        </button>
                                        <button
                                          onClick={() => setRowViewModes(prev => ({ ...prev, [log.ID]: 'html' }))}
                                          className={cn(
                                            "flex items-center space-x-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase transition-all duration-200",
                                            getRowViewMode(log.ID, log.LOG) === 'html'
                                              ? "bg-[#ff5a1f] text-white shadow-sm"
                                              : "text-slate-400 hover:text-white"
                                          )}
                                        >
                                          <Eye className="w-2.5 h-2.5" />
                                          <span>HTML</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {isHtml(log.LOG) && getRowViewMode(log.ID, log.LOG) === 'html' ? (
                                    <div className="border border-[#1e293b] rounded-lg overflow-hidden h-60 bg-[#050812]">
                                      <iframe
                                        srcDoc={`
                                          <!DOCTYPE html>
                                          <html>
                                            <head>
                                              <meta charset="utf-8">
                                              <style>
                                                body { font-family: ui-sans-serif, system-ui, sans-serif; background-color: transparent; color: ${theme === 'light' ? '#04354d' : '#cbd5e1'}; margin: 0; padding: 12px; font-size: 12px; }
                                                table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border: 1px solid ${theme === 'light' ? 'rgba(0, 170, 225, 0.25)' : '#1e293b'}; }
                                                th { background-color: ${theme === 'light' ? 'rgba(0, 170, 225, 0.1)' : '#0f172a'}; color: ${theme === 'light' ? '#0177ab' : '#38bdf8'}; font-weight: 600; text-align: left; padding: 8px 10px; border: 1px solid ${theme === 'light' ? 'rgba(0, 170, 225, 0.25)' : '#1e293b'}; font-size: 10px; text-transform: uppercase; }
                                                td { padding: 8px 10px; border: 1px solid ${theme === 'light' ? 'rgba(0, 170, 225, 0.25)' : '#1e293b'}; }
                                                tr:nth-child(even) { background-color: ${theme === 'light' ? 'rgba(0, 170, 225, 0.04)' : '#0a0f1d'}; }
                                              </style>
                                            </head>
                                            <body>${log.LOG || ''}</body>
                                          </html>
                                        `}
                                        className="w-full h-full border-0"
                                        title="HTML Log Preview"
                                        sandbox="allow-same-origin"
                                      />
                                    </div>
                                  ) : (
                                    <div className="bg-[#050812] border border-[#1e293b] rounded-lg p-4 overflow-hidden relative group/code">
                                      <pre className="text-[11px] font-mono text-cyan-500/80 overflow-x-auto whitespace-pre-wrap max-h-60">
                                        {log.LOG || '-- Sin detalles de log --'}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Solution Section */}
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                    <MessageSquare className="w-3.5 h-3.5 mr-2 text-green-500" /> Solución del Incidente
                                  </h4>
                                  <div className={cn(
                                    "bg-[#050812] border border-[#1e293b] rounded-lg p-6 relative min-h-[120px]",
                                    !log.COMENTARIOS_SOLUCION && "flex items-center justify-center border-dashed border-slate-700"
                                  )}>
                                    {log.SOLUCIONADO && (
                                      <div className="flex items-center mb-4">
                                        <div className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mr-3">
                                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cerrada por</p>
                                          <p className="text-xs text-slate-300 font-medium">{log.SOLUCIONADO} <span className="text-slate-600 mx-2 text-[10px]">•</span> {log.FECHA_SOLUCION ? format(new Date(log.FECHA_SOLUCION), "MMM dd, yyyy HH:mm") : ''}</p>
                                        </div>
                                      </div>
                                    )}
                                    {log.COMENTARIOS_SOLUCION ? (
                                      <p className="text-sm text-slate-300 italic leading-relaxed whitespace-pre-wrap">
                                        "{log.COMENTARIOS_SOLUCION}"
                                      </p>
                                    ) : (
                                      <div className="text-center">
                                        <p className="text-xs text-slate-600">No se ha registrado una solución para este incidente.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Auditoría LOG_ESTADO */}
                                {log.LOG_ESTADO && (
                                  <div className="space-y-2">
                                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                                      <Clock className="w-3.5 h-3.5 mr-2 text-[#06b6d4]" /> Historial de Estado
                                    </h4>
                                    <div className="bg-[#050812] border border-[#1e293b] rounded-lg p-4 space-y-2">
                                      {log.LOG_ESTADO.split('\n').filter(l => l.trim()).map((entry, idx) => (
                                        <div key={idx} className="flex items-start text-xs">
                                          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#06b6d4] mt-1.5 mr-2" />
                                          <span className="font-mono text-[#06b6d4]/80">{entry}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                  <div className="flex items-start">
                                    <AlertCircle className="w-4 h-4 text-blue-500 mr-2.5 mt-0.5" />
                                    <p className="text-[11px] text-blue-400/80 leading-relaxed font-medium">
                                      Este registro es inmutable una vez guardado. Asegúrese de que la documentación técnica sea clara para futuros análisis de causa raíz.
                                    </p>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-[#111827] border-t border-[#1e293b] p-4 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, logs.length)} de {logs.length} registros
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#0f172a] border-[#1e293b] text-slate-300 hover:bg-[#1e293b] hover:text-white h-8 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            {[...Array(totalPages)].map((_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, i, arr) => (
              <React.Fragment key={p}>
                {i > 0 && p - arr[i-1] > 1 && <span className="text-slate-600">...</span>}
                <button
                  onClick={() => setCurrentPage(p)}
                  className={cn(
                    "min-w-[32px] h-8 rounded text-xs font-bold transition-colors",
                    currentPage === p ? "bg-[#ff5a1f] text-white" : "text-slate-500 hover:text-white hover:bg-[#1e293b]"
                  )}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[#0f172a] border-[#1e293b] text-slate-300 hover:bg-[#1e293b] hover:text-white h-8 text-xs disabled:opacity-50"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
