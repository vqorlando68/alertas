"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { Save, History, FileText, AlertTriangle, ChevronRight, Activity, AlignLeft, Bold, Italic, List, Link2, Mail, Phone, Plus, Search, ChevronDown, ChevronUp, Edit2, Trash2, TrendingUp, TrendingDown, BookOpen, CalendarClock, Clock, Play, XCircle, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useApp } from "@/lib/theme-context"

const schema = z.object({
  id: z.number().optional(),
  descripcion_alerta: z.string().min(1, "Descripción requerida"),
  tipo_proceso: z.string().min(1, "Tipo proceso requerido"),
  proceso: z.string().min(1, "Proceso requerido"),
  frecuencia: z.string().optional(),
  estado: z.string().min(1, "Estado requerido"),
  pasos_a_seguir: z.string().optional(),
  correo: z.string().email("Correo inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  prioridad: z.string().optional(),
})

type Alerta = {
  ID: number
  DESCRIPCION_ALERTA: string
  TIPO_PROCESO: string
  PROCESO: string
  ESTADO: string
  FRECUENCIA?: string
  PASOS_A_SEGUIR?: string
  CORREO?: string
  TELEFONO?: string
  PRIORIDAD?: string
  FECHA_ULTIMA_EJECUCION?: string
  ULTIMO_ESTADO_EJECUCION?: string
}

export default function AlertasPage() {
  const { t } = useApp()
  const [alertas, setAlertas] = React.useState<Alerta[]>([])
  const [loading, setLoading] = React.useState(true)
  
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [expandedRows, setExpandedRows] = React.useState<number[]>([])
  const [scheduleModal, setScheduleModal] = React.useState<Alerta | null>(null)
  const [jobsAlert, setJobsAlert] = React.useState<any[]>([])
  const [toggleConfirm, setToggleConfirm] = React.useState<{ show: boolean, alerta: Alerta | null, nuevoEstado: string }>({
    show: false,
    alerta: null,
    nuevoEstado: ''
  })
  const [execConfirm, setExecConfirm] = React.useState<{ show: boolean, alerta: Alerta | null }>({
    show: false,
    alerta: null
  })
  const [isExecuting, setIsExecuting] = React.useState(false)

  // Custom Toast State
  const [toast, setToast] = React.useState<{ show: boolean, type: 'error' | 'success', message: string, details?: string }>({
    show: false,
    type: 'success',
    message: ''
  })

  const showToast = (type: 'error' | 'success', message: string, details?: string) => {
    setToast({ show: true, type, message, details })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 6000)
  }

  const renderToast = () => {
    if (!toast.show) return null;
    return (
      <div className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 z-50 p-4 rounded-xl shadow-2xl border max-w-sm w-full sm:w-auto animate-in slide-in-from-top-8 duration-300",
        toast.type === 'error' ? "bg-red-950/90 border-red-500/50 text-red-100" : "bg-[#06b6d4]/10 border-[#06b6d4]/50 text-cyan-50"
      )}>
        <div className="flex items-start">
           {toast.type === 'error' ? <XCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-[#06b6d4] mr-3 mt-0.5" />}
           <div>
             <h4 className="text-sm font-bold">{toast.message}</h4>
             {toast.details && <p className="text-xs opacity-80 mt-1 leading-relaxed bg-black/20 p-2 rounded">{toast.details}</p>}
           </div>
           <button onClick={() => setToast(prev => ({...prev, show: false}))} className="ml-4 opacity-50 hover:opacity-100 uppercase text-[10px] font-bold">X</button>
        </div>
      </div>
    );
  }
  
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10

  // Filter States
  const [uiFilterAlertaId, setUiFilterAlertaId] = React.useState("ALL")
  const [isAlertDropdownOpen, setIsAlertDropdownOpen] = React.useState(false)
  const [alertSearchTerm, setAlertSearchTerm] = React.useState("")
  const [programmedAlertIds, setProgrammedAlertIds] = React.useState<number[]>([])

  const [uiFilterTipoProceso, setUiFilterTipoProceso] = React.useState("ALL")
  const [uiFilterEstado, setUiFilterEstado] = React.useState("ALL")
  const [uiFilterDateStart, setUiFilterDateStart] = React.useState("")
  const [uiFilterDateEnd, setUiFilterDateEnd] = React.useState("")

  const [appliedFilters, setAppliedFilters] = React.useState({
    alertaId: "ALL",
    tipoProceso: "ALL",
    estado: "ALL",
    dateStart: "",
    dateEnd: ""
  })

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      descripcion_alerta: "",
      tipo_proceso: "P",
      proceso: "",
      frecuencia: "",
      estado: "A",
      pasos_a_seguir: "",
      correo: "",
      telefono: "",
      prioridad: "M"
    }
  })

  React.useEffect(() => {
    fetchAlertas()
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const res = await fetch("/api/schedule")
      const data = await res.json()
      if (data.jobs) {
        setProgrammedAlertIds(data.jobs.map((j: any) => Number(j.ID_ALERTA)))
      }
    } catch(err) {}
  }

  const fetchAlertas = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/alertas")
      const data = await res.json()
      setAlertas(data.alertas || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    form.reset({
      descripcion_alerta: "",
      tipo_proceso: "P",
      proceso: "",
      frecuencia: "",
      estado: "A",
      pasos_a_seguir: "",
      correo: "",
      telefono: "",
      prioridad: "M"
    })
    setIsEditing(false)
    setIsFormOpen(true)
  }

  const openEdit = (alerta: Alerta) => {
    form.reset({
      id: alerta.ID,
      descripcion_alerta: alerta.DESCRIPCION_ALERTA,
      tipo_proceso: alerta.TIPO_PROCESO,
      proceso: alerta.PROCESO,
      frecuencia: alerta.FRECUENCIA || "",
      estado: alerta.ESTADO,
      pasos_a_seguir: alerta.PASOS_A_SEGUIR || "",
      correo: alerta.CORREO || "",
      telefono: alerta.TELEFONO || "",
      prioridad: alerta.PRIORIDAD || "M"
    })
    setIsEditing(true)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm("¿Está seguro que desea eliminar/desactivar esta alerta?")) {
      try {
        const res = await fetch(`/api/alertas/${id}`, { method: "DELETE" })
        if (res.ok) {
          showToast("success", "Alerta desactivada correctamente")
          fetchAlertas()
        } else {
          showToast("error", "Error al desactivar la alerta")
        }
      } catch (err: any) {
        console.error(err)
        showToast("error", "Error de conexión", err.message)
      }
    }
  }

  const toggleRow = (id: number) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const handleViewSchedule = async (a: Alerta) => {
    setScheduleModal(a)
    try {
      const res = await fetch(`/api/schedule?id_alerta=${a.ID}`)
      const data = await res.json()
      setJobsAlert(data.jobs || [])
    } catch(err) {
      console.error(err)
    }
  }

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const isUpdate = isEditing && values.id

      const res = await fetch(isUpdate ? `/api/alertas/${values.id}` : "/api/alertas", {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      })

      if (res.ok) {
        setIsFormOpen(false)
        fetchAlertas()
        showToast("success", isUpdate ? "Alerta actualizada correctamente" : "Alerta creada correctamente")
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast("error", "Error al guardar la alerta", errData.details || errData.error || "No se pudieron registrar los cambios.");
      }
    } catch (err: any) {
      console.error(err)
      showToast("error", "Error de conexión", err.message)
    }
  }

  // --- Always compute these (hooks must NOT be after early returns) ---
  const prioridad = form.watch("prioridad")
  const estado = form.watch("estado")

  const filteredAlertas = React.useMemo(() => {
    return alertas.filter(a => {
      if (appliedFilters.alertaId !== "ALL" && a.ID.toString() !== appliedFilters.alertaId) return false;
      if (appliedFilters.tipoProceso !== "ALL" && (a.TIPO_PROCESO || 'S') !== appliedFilters.tipoProceso) return false;
      if (appliedFilters.estado !== "ALL" && a.ESTADO !== appliedFilters.estado) return false;
      
      if (appliedFilters.dateStart && a.FECHA_ULTIMA_EJECUCION) {
         if (new Date(a.FECHA_ULTIMA_EJECUCION) < new Date(appliedFilters.dateStart)) return false;
      }
      if (appliedFilters.dateEnd && a.FECHA_ULTIMA_EJECUCION) {
         const end = new Date(appliedFilters.dateEnd)
         end.setDate(end.getDate() + 1)
         if (new Date(a.FECHA_ULTIMA_EJECUCION) >= end) return false;
      }
      if ((appliedFilters.dateStart || appliedFilters.dateEnd) && !a.FECHA_ULTIMA_EJECUCION) {
         return false;
      }
      return true;
    });
  }, [alertas, appliedFilters])

  const totalAlertas = filteredAlertas.length
  const alertasActivas = filteredAlertas.filter(a => a.ESTADO === 'A').length
  const criticas = filteredAlertas.filter(a => a.PRIORIDAD === 'A').length
  const totalPages = Math.ceil(totalAlertas / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedAlertas = filteredAlertas.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  const applyFilters = () => {
    setAppliedFilters({
      alertaId: uiFilterAlertaId,
      tipoProceso: uiFilterTipoProceso,
      estado: uiFilterEstado,
      dateStart: uiFilterDateStart,
      dateEnd: uiFilterDateEnd
    })
    setCurrentPage(1)
  }

  const handleToggleState = (alerta: Alerta) => {
    const nuevoEstado = alerta.ESTADO === 'A' ? 'I' : 'A';
    setToggleConfirm({ show: true, alerta, nuevoEstado });
  }

  const confirmToggleAction = async () => {
    if (!toggleConfirm.alerta) return;
    const { alerta, nuevoEstado } = toggleConfirm;
    setToggleConfirm({ ...toggleConfirm, show: false });
    try {
      const updatedData = { ...alerta, id: alerta.ID, estado: nuevoEstado, descripcion_alerta: alerta.DESCRIPCION_ALERTA, tipo_proceso: alerta.TIPO_PROCESO, proceso: alerta.PROCESO };
      const res = await fetch(`/api/alertas/${alerta.ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });
      if(res.ok) fetchAlertas();
    } catch(err) { console.error(err); }
  }

  const handleExecuteAlert = (alerta: Alerta) => {
    setExecConfirm({ show: true, alerta });
  }

  const confirmExecuteAction = async () => {
    if (!execConfirm.alerta) return;
    const { alerta } = execConfirm;
    setExecConfirm({ show: false, alerta: null });
    setIsExecuting(true);
    try {
      const res = await fetch(`/api/alertas/${alerta.ID}/ejecutar`, {
        method: "POST"
      });
      if (res.ok) {
        showToast("success", "Alerta ejecutada correctamente", "Se ha generado un nuevo log en el historial técnico.");
        fetchAlertas();
      } else {
        const errData = await res.json();
        showToast("error", "Error al ejecutar alerta", errData.details || errData.error || "Falla del motor de base de datos.");
      }
    } catch (err: any) {
      console.error(err);
      showToast("error", "Error de red", err.message || "No se pudo establecer conexión con el servidor.");
    } finally {
      setIsExecuting(false);
    }
  }

  // --- FORM VIEW (early return is safe because all hooks are already declared above) ---
  if (isFormOpen) {
    return (
      <div className="max-w-4xl mx-auto pb-20 font-sans relative">
        {renderToast()}
        <div className="flex items-center text-xs text-slate-500 mb-4 space-x-2">
          <span className="cursor-pointer hover:text-white transition-colors" onClick={() => setIsFormOpen(false)}>Gestión</span>
          <ChevronRight className="w-3 h-3" />
          <span className="cursor-pointer hover:text-white transition-colors" onClick={() => setIsFormOpen(false)}>Alertas</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#06b6d4] font-medium">{isEditing ? "Editar Definición" : "Nueva Definición"}</span>
        </div>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">
              {isEditing ? "Editar Definición de Alerta" : "Nueva Definición de Alerta"}
            </h1>
            <p className="text-sm text-slate-400">
              Configure los parámetros técnicos y flujos de notificación para la tabla <code className="bg-[#0f172a] text-[#06b6d4] px-1.5 py-0.5 rounded">tkr_alertas</code>.
            </p>
          </div>
          <Button variant="outline" className="bg-[#0f172a] border-[#1e293b] text-slate-300 hover:bg-[#1e293b] hover:text-white">
            <History className="w-4 h-4 mr-2" /> Historial
          </Button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-8 shadow-2xl space-y-8">
            
            {/* Descripción */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 tracking-widest flex items-center">
                <FileText className="w-4 h-4 mr-2 text-[#06b6d4]" /> DESCRIPCIÓN DE LA ALERTA (DESCRIPCION_ALERTA)
              </label>
              <Textarea 
                {...form.register("descripcion_alerta")} 
                placeholder="Ej: Falla crítica en el procesamiento de transacciones nocturnas..."
                className="bg-[#050812] border-[#1e293b] text-slate-200 placeholder:text-slate-600 focus-visible:ring-[#ff5a1f] focus-visible:border-[#ff5a1f] min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Tipo Proceso */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-[#06b6d4]" /> TIPO DE PROCESO (TIPO_PROCESO)
                </label>
                <select 
                  {...form.register("tipo_proceso")}
                  className="w-full bg-[#050812] border border-[#1e293b] text-slate-200 rounded-md h-11 px-3 focus:outline-none focus:ring-1 focus:ring-[#ff5a1f] focus:border-[#ff5a1f]"
                >
                  <option value="P">(P)rocedimiento</option>
                  <option value="F">(F)unción</option>
                  <option value="S">(S)QL Script</option>
                </select>
              </div>

              {/* Prioridad */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-[#06b6d4]" /> PRIORIDAD (PRIORIDAD)
                </label>
                <div className="flex w-full bg-[#050812] border border-[#1e293b] rounded-md overflow-hidden h-11">
                  <button 
                    type="button" 
                    onClick={() => form.setValue("prioridad", "A")}
                    className={cn("flex-1 text-xs font-bold tracking-wide transition-colors", prioridad === 'A' ? "bg-[#ff5a1f] text-white" : "text-slate-500 hover:bg-[#1e293b]")}
                  >ALTA</button>
                  <div className="w-px bg-[#1e293b]"></div>
                  <button 
                    type="button" 
                    onClick={() => form.setValue("prioridad", "M")}
                    className={cn("flex-1 text-xs font-bold tracking-wide transition-colors", prioridad === 'M' ? "bg-yellow-600 text-white" : "text-slate-500 hover:bg-[#1e293b]")}
                  >MEDIA</button>
                  <div className="w-px bg-[#1e293b]"></div>
                  <button 
                    type="button" 
                    onClick={() => form.setValue("prioridad", "B")}
                    className={cn("flex-1 text-xs font-bold tracking-wide transition-colors", prioridad === 'B' ? "bg-slate-600 text-white" : "text-slate-500 hover:bg-[#1e293b]")}
                  >BAJA</button>
                </div>
              </div>

              {/* Estado */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest flex items-center">
                  <div className="w-4 h-4 flex items-center justify-center mr-2"><div className="w-2 h-2 rounded-full bg-[#06b6d4]"></div></div> ESTADO DE LA ALERTA
                </label>
                <div className="flex w-full bg-[#050812] border border-[#1e293b] rounded-md h-11 items-center justify-center space-x-4 px-4">
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Desactivada</span>
                  <div 
                    onClick={() => form.setValue("estado", estado === 'A' ? 'I' : 'A')}
                    className={cn("w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300", estado === 'A' ? "bg-green-500" : "bg-slate-700")}
                  >
                    <div className={cn("bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300", estado === 'A' ? "translate-x-6" : "")}></div>
                  </div>
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", estado === 'A' ? "text-green-500" : "text-slate-600")}>Activa</span>
                </div>
              </div>
            </div>

            {/* Proceso Code */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 tracking-widest flex items-center">
                <AlignLeft className="w-4 h-4 mr-2 text-[#06b6d4]" /> DEFINICIÓN DEL PROCESO (PROCESO)
              </label>
              <div className="rounded-md border border-[#1e293b] overflow-hidden">
                <div className="bg-[#1e293b]/30 h-9 flex items-center px-4 space-x-2 border-b border-[#1e293b]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                  <span className="text-[10px] text-slate-500 ml-4 font-mono tracking-widest uppercase">Query Editor / Procedure Call</span>
                </div>
                <Textarea 
                  {...form.register("proceso")} 
                  placeholder="SELECT * FROM transactions WHERE status = 'ERROR';"
                  className="bg-[#050812] border-0 text-[#06b6d4] font-mono text-sm placeholder:text-slate-700 focus-visible:ring-0 min-h-[120px] rounded-none resize-y p-6"
                />
              </div>
            </div>

            {/* Pasos a seguir */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 tracking-widest flex items-center">
                <List className="w-4 h-4 mr-2 text-[#06b6d4]" /> PASOS A SEGUIR (PASOS_A_SEGUIR)
              </label>
              <div className="rounded-md border border-[#1e293b] overflow-hidden">
                <div className="bg-[#1e293b]/30 h-11 flex items-center px-4 space-x-6 border-b border-[#1e293b]">
                  <button type="button" className="text-slate-500 hover:text-white transition-colors"><Bold className="w-4 h-4" /></button>
                  <button type="button" className="text-slate-500 hover:text-white transition-colors"><Italic className="w-4 h-4" /></button>
                  <button type="button" className="text-slate-500 hover:text-white transition-colors"><List className="w-4 h-4" /></button>
                  <button type="button" className="text-slate-500 hover:text-white transition-colors"><Link2 className="w-4 h-4" /></button>
                </div>
                <Textarea 
                  {...form.register("pasos_a_seguir")} 
                  placeholder="1. Verificar logs del sistema..."
                  className="bg-[#050812] border-0 text-slate-300 placeholder:text-slate-700 focus-visible:ring-0 min-h-[120px] rounded-none resize-y p-6"
                />
              </div>
            </div>

            {/* Notificaciones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-[#06b6d4]" /> EMAILS DE NOTIFICACIÓN (CORREO)
                </label>
                <Input 
                  {...form.register("correo")} 
                  placeholder="dev-ops@empresa.com, lead@e..."
                  className="bg-[#050812] border-[#1e293b] text-slate-200 h-11 px-4 placeholder:text-slate-700 focus-visible:ring-[#ff5a1f] focus-visible:border-[#ff5a1f]"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 tracking-widest flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-[#06b6d4]" /> TELÉFONOS (TELEFONO)
                </label>
                <Input 
                  {...form.register("telefono")} 
                  placeholder="+541123456789, +541198765432"
                  className="bg-[#050812] border-[#1e293b] text-slate-200 h-11 px-4 placeholder:text-slate-700 focus-visible:ring-[#ff5a1f] focus-visible:border-[#ff5a1f]"
                />
              </div>
            </div>

            <div className="border-t border-[#1e293b] pt-8 flex items-center justify-end space-x-4">
              <Button type="button" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#ff5a1f] hover:bg-[#e04a14] text-white font-medium px-8 py-2.5 h-auto shadow-lg shadow-[#ff5a1f]/20 rounded-md" disabled={form.formState.isSubmitting}>
                <Save className="w-4 h-4 mr-2.5" />
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Alerta"}
              </Button>
            </div>

          </div>
        </form>
      </div>
    )
  }

  // --- TABLE VIEW ---

  return (
    <div className="mx-auto pb-20 font-sans space-y-8 relative">
      {renderToast()}
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">{t("alerts.title")}</h1>
          <p className="text-sm text-slate-400">{t("alerts.subtitle")}</p>
        </div>
        <Button onClick={openCreate} className="bg-[#ff5a1f] hover:bg-[#e04a14] text-white font-medium px-6 shadow-lg shadow-[#ff5a1f]/20 h-10 rounded-md">
          <Plus className="w-4 h-4 mr-2" /> {t("alerts.new")}
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-md flex justify-between items-center relative overflow-hidden group">
          <div className="z-10 relative">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">{t("alerts.total").toUpperCase()}</p>
            <h2 className="text-4xl font-bold text-white mb-2">{totalAlertas.toLocaleString()}</h2>
            <p className="text-xs text-green-500 font-medium flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> +5% vs mes anterior</p>
          </div>
          <div className="w-12 h-12 bg-[#ff5a1f]/10 rounded-lg flex items-center justify-center border border-[#ff5a1f]/20 z-10 relative">
            <BookOpen className="w-6 h-6 text-[#ff5a1f]" />
          </div>
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#ff5a1f]/5 rounded-full blur-2xl group-hover:bg-[#ff5a1f]/10 transition-colors"></div>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-md flex justify-between items-center relative overflow-hidden group">
          <div className="z-10 relative">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">{t("alerts.activeAlerts")}</p>
            <h2 className="text-4xl font-bold text-[#06b6d4] mb-2">{alertasActivas}</h2>
            <p className="text-xs text-green-500 font-medium flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> +2% hoy</p>
          </div>
          <div className="w-16 h-16 flex items-center justify-center z-10 relative opacity-20">
            <span className="text-6xl font-black italic text-[#06b6d4] leading-none">{alertasActivas}</span>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 shadow-md flex justify-between items-center relative overflow-hidden group">
          <div className="z-10 relative">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">{t("alerts.critical")}</p>
            <h2 className="text-4xl font-bold text-red-500 mb-2">{criticas}</h2>
            <p className="text-xs text-red-500/80 font-medium flex items-center"><TrendingDown className="w-3 h-3 mr-1"/> -1% esta semana</p>
          </div>
          <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20 z-10 relative">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors"></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-5 flex flex-wrap lg:flex-nowrap gap-4 items-end shadow-md">
        <div className="flex-1 space-y-2 min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest">{t("alerts.title").toUpperCase()}</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500 z-10" />
            <input 
               type="text"
               className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4] cursor-text"
               placeholder={t("alerts.allAlerts")}
               value={isAlertDropdownOpen ? alertSearchTerm : (uiFilterAlertaId === "ALL" || !uiFilterAlertaId ? "Todas las alertas" : (alertas.find(al => al.ID.toString() === uiFilterAlertaId)?.DESCRIPCION_ALERTA || uiFilterAlertaId))}
               onChange={e => {
                 setIsAlertDropdownOpen(true);
                 setAlertSearchTerm(e.target.value);
                 if (!e.target.value) setUiFilterAlertaId("ALL");
               }}
               onClick={() => setIsAlertDropdownOpen(true)}
               onBlur={() => setTimeout(() => setIsAlertDropdownOpen(false), 200)}
            />
            {isAlertDropdownOpen && (
              <div className="absolute z-20 w-full mt-1 bg-[#050812] border border-[#1e293b] rounded-md max-h-60 overflow-y-auto shadow-xl">
                <div 
                  className="p-3 cursor-pointer hover:bg-[#1e293b] text-sm text-slate-300 border-b border-[#1e293b]/50"
                  onMouseDown={() => {
                    setUiFilterAlertaId("ALL");
                    setAlertSearchTerm("");
                    setIsAlertDropdownOpen(false);
                  }}
                >
                  Todas las alertas
                </div>
                {alertas.length > 0 ? alertas.filter(al => {
                  const term = alertSearchTerm.toLowerCase();
                  const id = al.ID.toString();
                  const desc = (al.DESCRIPCION_ALERTA || "").toLowerCase();
                  return id.includes(term) || desc.includes(term);
                }).map(al => {
                  const aid = al.ID.toString()
                  const isProg = programmedAlertIds.includes(Number(aid))
                  return (
                    <div 
                      key={aid}
                      className="p-3 cursor-pointer hover:bg-[#1e293b] text-sm text-slate-300 flex items-center justify-between border-b border-[#1e293b]/50 last:border-0"
                      onMouseDown={() => {
                        setUiFilterAlertaId(aid);
                        setAlertSearchTerm("");
                        setIsAlertDropdownOpen(false);
                      }}
                    >
                      <span className="truncate pr-2">ID: {aid} - {al.DESCRIPCION_ALERTA}</span>
                      {isProg && <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap">⚡ JOB</span>}
                    </div>
                  )
                }) : <div className="p-3 text-sm text-slate-500 text-center">No hay resultados</div>}
              </div>
            )}
          </div>
        </div>
        <div className="w-full lg:w-40 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest">{t("alerts.startDate").toUpperCase()}</label>
          <input type="date" value={uiFilterDateStart} onChange={e => setUiFilterDateStart(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} style={{ colorScheme: "dark" }} className="w-full bg-[#050812] border border-[#1e293b] text-slate-400 rounded-md h-10 px-3 text-sm focus:outline-none cursor-pointer" />
        </div>
        <div className="w-full lg:w-40 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest">{t("alerts.endDate").toUpperCase()}</label>
          <input type="date" value={uiFilterDateEnd} onChange={e => setUiFilterDateEnd(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} style={{ colorScheme: "dark" }} className="w-full bg-[#050812] border border-[#1e293b] text-slate-400 rounded-md h-10 px-3 text-sm focus:outline-none cursor-pointer" />
        </div>
        <div className="w-full lg:w-48 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest">{t("alerts.processType").toUpperCase()}</label>
          <select value={uiFilterTipoProceso} onChange={e => setUiFilterTipoProceso(e.target.value)} className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none">
            <option value="ALL">{t("alerts.allTypes")}</option>
            <option value="P">{t("alerts.proc")}</option>
            <option value="F">{t("alerts.func")}</option>
            <option value="S">{t("alerts.sql")}</option>
          </select>
        </div>
        <div className="w-full lg:w-40 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 tracking-widest">{t("common.status").toUpperCase()}</label>
          <select value={uiFilterEstado} onChange={e => setUiFilterEstado(e.target.value)} className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none">
            <option value="ALL">{t("alerts.allStatus")}</option>
            <option value="A">{t("common.active")}</option>
            <option value="I">{t("common.inactive")}</option>
          </select>
        </div>
        <div className="w-full lg:w-auto pt-2 lg:pt-0">
          <Button onClick={applyFilters} className="w-full lg:w-32 bg-[#06b6d4] hover:bg-[#0891b2] text-black font-bold h-10 shadow-lg shadow-[#06b6d4]/20 rounded-md">
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
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("alerts.name")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("alerts.priority")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("alerts.processType")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{t("alerts.lastExec")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase text-center">{t("alerts.activate")}</th>
                <th className="py-4 px-6 text-[10px] font-bold text-slate-400 tracking-widest uppercase text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">{t("common.loading")}</td></tr>
              ) : alertas.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">{t("alerts.noAlerts")}</td></tr>
              ) : (
                paginatedAlertas.map(a => {
                  const isExpanded = expandedRows.includes(a.ID);
                  const isCritical = a.PRIORIDAD === 'A';
                  const isMedium = a.PRIORIDAD === 'M';
                  const isActive = a.ESTADO === 'A';
                  
                  return (
                    <React.Fragment key={a.ID}>
                      <tr className="hover:bg-[#151c2f] transition-colors group">
                        <td className="py-4 px-6 text-sm font-bold text-[#ff5a1f]">#AL-{a.ID}</td>
                        <td className="py-4 px-6 text-sm font-bold text-white max-w-xs truncate" title={a.DESCRIPCION_ALERTA}>{a.DESCRIPCION_ALERTA}</td>
                        <td className="py-4 px-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            isCritical ? "bg-red-500/10 text-red-500 border-red-500/30" : 
                            isMedium ? "bg-orange-500/10 text-orange-500 border-orange-500/30" : 
                            "bg-slate-500/10 text-slate-400 border-slate-500/30"
                          )}>
                            {isCritical ? 'Critical' : isMedium ? 'Medium' : 'Low'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-1 rounded-[4px] bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30 text-[10px] font-bold uppercase tracking-wider">
                            {a.TIPO_PROCESO === 'P' ? 'PROC' : a.TIPO_PROCESO === 'F' ? 'FUNC' : 'SQL'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[12px] font-mono text-[#06b6d4]">
                          {a.FECHA_ULTIMA_EJECUCION ? format(new Date(a.FECHA_ULTIMA_EJECUCION), "yyyy-MM-dd HH:mm:ss") : '---'}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div 
                            onClick={() => handleToggleState(a)}
                            className={cn("w-9 h-5 mx-auto flex items-center rounded-full p-1 cursor-pointer transition-colors", isActive ? "bg-[#06b6d4]" : "bg-slate-600")}
                          >
                            <div className={cn("bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform", isActive ? "translate-x-4" : "")}></div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right space-x-3 whitespace-nowrap">
                          <button title="Ejecutar Alerta" onClick={() => handleExecuteAlert(a)} className="text-slate-500 hover:text-green-500 transition-colors"><Play className="w-4 h-4 inline-block" /></button>
                          <button title="Ver Logs" onClick={() => window.location.href = `/dashboard/logs?id_alerta=${a.ID}`} className="text-slate-500 hover:text-white transition-colors"><FileText className="w-4 h-4 inline-block" /></button>
                          <button title="Ver Programaciones" onClick={() => handleViewSchedule(a)} className="text-slate-500 hover:text-[#06b6d4] transition-colors"><CalendarClock className="w-4 h-4 inline-block" /></button>
                          <button onClick={() => openEdit(a)} className="text-slate-500 hover:text-white transition-colors"><Edit2 className="w-4 h-4 inline-block" /></button>
                          <button onClick={() => handleDelete(a.ID)} className="text-slate-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4 inline-block" /></button>
                          <button onClick={() => toggleRow(a.ID)} className="text-slate-500 hover:text-[#06b6d4] transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4 inline-block" /> : <ChevronDown className="w-4 h-4 inline-block" />}
                          </button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-[#0a0e17] border-b border-[#1e293b]">
                          <td colSpan={7} className="p-6">
                            <div className="border border-[#1e293b] rounded-lg p-6 grid grid-cols-1 gap-6 text-sm">
                              
                              <div className="grid grid-cols-2 gap-8 border-b border-[#1e293b] pb-6">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-1 uppercase">Correo de Contacto</p>
                                  <p className="text-slate-200 font-medium">{a.CORREO || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-1 uppercase">Teléfono de Emergencia</p>
                                  <p className="text-slate-200 font-medium">{a.TELEFONO || 'N/A'}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-2 uppercase">Proceso (SQL/PROCEDIMIENTO)</p>
                                  <div className="bg-[#050812] border border-[#1e293b] rounded-md p-4 max-h-48 overflow-y-auto">
                                    <pre className="text-xs font-mono text-[#06b6d4] whitespace-pre-wrap">{a.PROCESO}</pre>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-500 tracking-widest mb-2 uppercase">Pasos a Seguir</p>
                                  <div className="bg-[#050812] border border-[#1e293b] rounded-md p-4 max-h-48 overflow-y-auto">
                                    <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                      {a.PASOS_A_SEGUIR ? a.PASOS_A_SEGUIR.split('\n').map((line, i) => (
                                        line.trim() ? (
                                          <div key={i} className="flex mb-2">
                                            <span className="flex-shrink-0 w-4 h-4 bg-[#06b6d4] text-black rounded text-[9px] font-bold flex items-center justify-center mr-2 mt-0.5">{i+1}</span>
                                            <span>{line.replace(/^[0-9]+\.\s*/, '')}</span>
                                          </div>
                                        ) : null
                                      )) : 'N/A'}
                                    </div>
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
        
        {totalPages > 1 && (
          <div className="bg-[#111827] border-t border-[#1e293b] p-4 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, totalAlertas)} de {totalAlertas} alertas
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
              <div className="flex items-center justify-center min-w-[32px] text-xs text-white font-medium">
                {currentPage} / {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-[#0f172a] border-[#1e293b] text-slate-300 hover:bg-[#1e293b] hover:text-white h-8 text-xs disabled:opacity-50"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {scheduleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#050812] border border-[#1e293b] rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="flex justify-between items-center p-6 border-b border-[#1e293b] bg-[#03060f]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5 text-[#06b6d4]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">Jobs de Programación Instanciados</h3>
                  <p className="text-xs text-orange-400 font-mono tracking-widest uppercase">#AL-{scheduleModal.ID}</p>
                </div>
              </div>
              <button onClick={() => setScheduleModal(null)} className="p-2 text-slate-500 hover:text-white rounded-full hover:bg-[#1e293b] transition-colors">
                <span className="font-bold text-lg hover:text-red-400">X</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gradient-to-b from-[#050812] to-[#0a0f1d]">
              {jobsAlert.length === 0 ? (
                 <div className="text-center p-12 text-slate-500 border border-dashed border-[#1e293b] rounded-xl bg-[#03060f]/50">
                    No hay Jobs de programación históricamente registrados para esta alerta.
                 </div>
              ) : (
                 jobsAlert.map(job => (
                   <div key={job.ID} className="border border-[#1e293b] bg-[#0d1323] rounded-xl overflow-hidden shadow-lg">
                     <div className="bg-[#111827] px-5 py-4 flex items-center justify-between border-b border-[#1e293b]">
                        <div className="flex items-center space-x-4">
                           <div className="w-2 h-2 rounded-full bg-[#06b6d4] shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                           <h4 className="text-sm font-bold text-[#06b6d4] tracking-wide font-mono">{job.NOMBRE_JOB}</h4>
                        </div>
                         <div className="flex items-center space-x-3 text-xs font-bold uppercase tracking-widest">
                            <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded">{job.TIPO_FRECUENCIA}</span>
                            <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded">{job.HORA_EJECUCION}</span>
                            <span className={cn(
                              "px-2 py-1 rounded transition-colors",
                              job.ESTADO === 'ACTIVO' ? "bg-cyan-500/20 text-[#06b6d4] border border-cyan-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"
                            )}>
                              {job.ESTADO === 'ACTIVO' ? 'ENABLED' : 'DISABLED'}
                            </span>
                         </div>
                     </div>
                     <div className="p-5">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center">
                         <Clock className="w-3 h-3 mr-2 text-green-500" /> ESTRUCTURA DEL MOTOR (CODIGO SCHEDULER)
                       </p>
                       <div className="bg-[#050812] border border-[#1e293b] rounded-md p-4 overflow-x-auto shadow-inner">
                         <pre className="text-[13px] font-mono text-green-400/90 whitespace-pre-wrap leading-6">
                           {job.CODIGO_SCHEDULER || '-- Script Dinámico Vacio o No Registrado --'}
                         </pre>
                       </div>
                     </div>
                   </div>
                 ))
              )}
            </div>
          </div>
        </div>
      )}

      {toggleConfirm.show && toggleConfirm.alerta && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="bg-[#050812] border border-[#1e293b] rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <AlertTriangle className={cn("w-5 h-5 mr-2", toggleConfirm.nuevoEstado === 'I' ? "text-red-500" : "text-green-500")} /> 
              Confirmar Cambio de Estado
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              {toggleConfirm.nuevoEstado === 'I' 
                ? `¿Está seguro de desactivar la alerta #${toggleConfirm.alerta.ID}? Esto también desactivará de forma permanente todos sus procesos programados (Jobs) en Oracle.`
                : `¿Desea activar nuevamente la alerta #${toggleConfirm.alerta.ID}? Los procesos programados asociados volverán a su estado de ejecución activo automáticamente.`
              }
            </p>
            <div className="flex bg-[#03060f] -mx-6 -mb-6 px-6 py-4 border-t border-[#1e293b] justify-end space-x-3 rounded-b-xl">
               <button 
                 onClick={() => setToggleConfirm({ show: false, alerta: null, nuevoEstado: '' })} 
                 className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                 Cancelar
               </button>
               <Button 
                 onClick={confirmToggleAction} 
                 className={cn(
                   "h-9 px-4 text-xs font-bold rounded-md border shadow-lg transition-all",
                   toggleConfirm.nuevoEstado === 'I' 
                     ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-red-500/20 shadow-red-500/10" 
                     : "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border-green-500/20 shadow-green-500/10"
                 )}
                >
                 {toggleConfirm.nuevoEstado === 'I' ? "Sí, Desactivar" : "Sí, Activar"}
               </Button>
            </div>
          </div>
        </div>
      )}

      {execConfirm.show && execConfirm.alerta && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="bg-[#050812] border border-[#1e293b] rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <Play className="w-5 h-5 mr-2 text-green-500" /> 
              Confirmar Ejecución de Alerta
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              ¿Está seguro que desea ejecutar manualmente la alerta <strong className="text-white">#{execConfirm.alerta.ID}</strong> ahora? 
              Se correrá la consulta o procedimiento y se generará un nuevo log en el historial técnico.
            </p>
            <div className="flex bg-[#03060f] -mx-6 -mb-6 px-6 py-4 border-t border-[#1e293b] justify-end space-x-3 rounded-b-xl">
               <button 
                 onClick={() => setExecConfirm({ show: false, alerta: null })} 
                 className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                 Cancelar
               </button>
               <Button 
                 onClick={confirmExecuteAction} 
                 className="h-9 px-4 text-xs font-bold rounded-md border shadow-lg transition-all bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border-green-500/20 shadow-green-500/10"
                >
                 Sí, Ejecutar
               </Button>
            </div>
          </div>
        </div>
      )}

      {isExecuting && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="bg-[#050812] border border-[#1e293b] rounded-xl p-6 flex flex-col items-center space-y-4 shadow-2xl">
            <Activity className="w-8 h-8 text-green-500 animate-spin" />
            <span className="text-sm font-medium text-slate-300">Ejecutando proceso en base de datos...</span>
          </div>
        </div>
      )}

    </div>
  )
}
