"use client"
import * as React from "react"
import { 
  Clock, 
  Target, 
  Calendar, 
  CalendarDays, 
  Database,
  Search,
  Info,
  Trash2,
  Save,
  AlertCircle,
  XCircle,
  CheckCircle2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/theme-context"

export default function ScheduleAlertPage() {
  const { t } = useApp()
  const [frequency, setFrequency] = React.useState("Diario")
  const [executionTime, setExecutionTime] = React.useState("09:00")
  const [repeatEvery, setRepeatEvery] = React.useState(1)
  const [selectedDays, setSelectedDays] = React.useState(["LUN", "MAR", "MIE", "JUE", "VIE"])
  const [dayOfMonth, setDayOfMonth] = React.useState(1)
  const [startDate, setStartDate] = React.useState("2024-05-20")
  const [endDate, setEndDate] = React.useState("")
  const [alertProcess, setAlertProcess] = React.useState("")
  const [isAlertDropdownOpen, setIsAlertDropdownOpen] = React.useState(false)
  const [alertSearchTerm, setAlertSearchTerm] = React.useState("")
  const [alertas, setAlertas] = React.useState<any[]>([])
  const [allJobs, setAllJobs] = React.useState<any[]>([])
  const [selectedJobIds, setSelectedJobIds] = React.useState<number[]>([])
  
  const [saving, setSaving] = React.useState(false)
  const [confirmDialog, setConfirmDialog] = React.useState({ show: false, count: 0 })
  
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

  const daysList = [
    { label: "L", id: "LUN" },
    { label: "M", id: "MAR" },
    { label: "M", id: "MIE" },
    { label: "J", id: "JUE" },
    { label: "V", id: "VIE" },
    { label: "S", id: "SAB" },
    { label: "D", id: "DOM" },
  ]

  React.useEffect(() => {
     Promise.all([
       fetch("/api/alertas").then(r => r.json()),
       fetch("/api/schedule").then(r => r.json())
     ]).then(([alertasData, jobsData]) => {
         if (alertasData.alertas) setAlertas(alertasData.alertas)
         if (jobsData.jobs) setAllJobs(jobsData.jobs)
     }).catch(e => console.error("Error al obtener configuraciones:", e))
  }, [])

  const fetchJobs = async () => {
     try {
       const res = await fetch("/api/schedule").then(r => r.json())
       if (res.jobs) setAllJobs(res.jobs)
     } catch(e) { console.error(e) }
  }

  const handleSave = async () => {
    if (!alertProcess) {
      alert("Seleccione una alerta antes de continuar.")
      return;
    }

    setSaving(true)
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_alerta: alertProcess,
          tipo_frecuencia: frequency,
          hora_ejecucion: executionTime,
          repetir_cada: repeatEvery,
          dia_del_mes: frequency === "Mensual" ? dayOfMonth : null,
          dias_operacion: frequency === "Mensual" ? null : selectedDays.join(","),
          fecha_inicio: startDate,
          fecha_fin: endDate || null
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        showToast("success", "Job de programación creado exitosamente")
        fetchJobs()
      } else {
        showToast("error", "Error al guardar la programación", data.details || data.error || "Falla desconocida del motor de BD")
      }
    } catch(e: any) {
      console.error(e)
      showToast("error", "Error de conexión o validación", e.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(d => d !== dayId))
    } else {
      setSelectedDays([...selectedDays, dayId])
    }
  }

  const handleDeleteSelected = () => {
    if (selectedJobIds.length === 0) {
      showToast("error", "Ninguno seleccionado", "Debe marcar al menos un Job con el checkbox para poder eliminarlo.");
      return;
    }
    setConfirmDialog({ show: true, count: selectedJobIds.length });
  };

  const confirmDeleteAction = async () => {
    setConfirmDialog({ show: false, count: 0 });
    setSaving(true);
    try {
      const res = await fetch(`/api/schedule?ids=${selectedJobIds.join(',')}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast("success", "Job(s) eliminados exitosamente");
        setSelectedJobIds([]);
        fetchJobs(); // Update the visual list
      } else {
        showToast("error", "Error al borrar", data.details || "Falló la eliminación en BD");
      }
    } catch(e: any) {
       showToast("error", "Error de conexión", e.message);
    } finally {
      setSaving(false);
    }
  };

  const programmedAlertIds = allJobs.map(j => Number(j.ID_ALERTA))
  const filteredJobs = alertProcess ? allJobs.filter(j => Number(j.ID_ALERTA) === Number(alertProcess)) : []
  const selectedAlert = alertProcess ? alertas.find(a => Number(a.ID || a[0]) === Number(alertProcess)) : null;

  return (
    <div className="mx-auto max-w-4xl font-sans space-y-8 pb-20 animate-in fade-in duration-500 relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={cn(
          "fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl border max-w-sm animate-in slide-in-from-right-8 duration-300",
          toast.type === 'error' ? "bg-red-950/90 border-red-500/50 text-red-100" : "bg-[#06b6d4]/10 border-[#06b6d4]/50 text-cyan-50"
        )}>
          <div className="flex items-start">
             {toast.type === 'error' ? <XCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-[#06b6d4] mr-3 mt-0.5" />}
             <div>
               <h4 className="text-sm font-bold">{toast.message}</h4>
               {toast.details && <p className="text-xs opacity-80 mt-1 mt-1 leading-relaxed bg-black/20 p-2 rounded">{toast.details}</p>}
             </div>
             <button onClick={() => setToast(prev => ({...prev, show: false}))} className="ml-4 opacity-50 hover:opacity-100 uppercase text-[10px] font-bold">X</button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 px-4">
          <div className="bg-[#050812] border border-[#1e293b] rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" /> 
              Confirmar Eliminación
            </h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              ¿Está seguro de eliminar <strong className="text-white bg-slate-800 px-1 rounded">{confirmDialog.count} Job(s)</strong> de programación? Esta acción borrará el registro y los desvinculará del Scheduler de Oracle permanentemente.
            </p>
            <div className="flex bg-[#03060f] -mx-6 -mb-6 px-6 py-4 border-t border-[#1e293b] justify-end space-x-3 rounded-b-xl">
               <Button onClick={() => setConfirmDialog({ show: false, count: 0 })} variant="outline" className="border-[#1e293b] bg-transparent text-slate-300 hover:text-white hover:bg-white/5">
                 Cancelar
               </Button>
               <Button onClick={confirmDeleteAction} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]">
                 Sí, Eliminar
               </Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold text-[#06b6d4] tracking-widest uppercase flex items-center mb-2">
          <Clock className="w-3.5 h-3.5 mr-1.5" /> {t("schedule.engine")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">{t("schedule.title")}</h1>
        <p className="text-sm text-slate-400">{t("schedule.subtitle")}</p>
      </div>

      <div className="bg-[#0a0f1c] border border-[#1e293b] rounded-xl p-8 shadow-xl shadow-black/50 space-y-10">
        
        {/* Target Configuration */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold tracking-wide text-white flex items-center border-b border-[#1e293b] pb-3">
            <Target className="w-4 h-4 mr-2 text-[#06b6d4]" /> {t("schedule.targetConfig")}
          </h2>
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t("schedule.selectProcess")}</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500 z-10" />
              <input 
                 type="text"
                 className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4] cursor-text"
                 placeholder="Buscar o seleccionar proceso de alerta..."
                 value={isAlertDropdownOpen ? alertSearchTerm : (alertProcess ? (alertas.find(al => (al.ID || al[0]).toString() === alertProcess.toString())?.DESCRIPCION_ALERTA || alertas.find(al => (al.ID || al[0]).toString() === alertProcess.toString())?.[1] || alertProcess) : "")}
                 onChange={e => {
                   setIsAlertDropdownOpen(true);
                   setAlertSearchTerm(e.target.value);
                   if (!e.target.value) setAlertProcess("");
                 }}
                 onClick={() => setIsAlertDropdownOpen(true)}
                 onBlur={() => setTimeout(() => setIsAlertDropdownOpen(false), 200)}
              />
              {isAlertDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-[#050812] border border-[#1e293b] rounded-md max-h-60 overflow-y-auto shadow-xl">
                  {alertas.length > 0 ? alertas.filter(al => {
                    const term = alertSearchTerm.toLowerCase();
                    const id = (al.ID || al[0]).toString();
                    const desc = (al.DESCRIPCION_ALERTA || al[1] || "").toLowerCase();
                    return id.includes(term) || desc.includes(term);
                  }).map(al => {
                    const aid = (al.ID || al[0]).toString()
                    const isProg = programmedAlertIds.includes(Number(aid))
                    return (
                      <div 
                        key={aid}
                        className="p-3 cursor-pointer hover:bg-[#1e293b] text-sm text-slate-300 flex items-center justify-between border-b border-[#1e293b]/50 last:border-0"
                        onMouseDown={() => {
                          setAlertProcess(aid);
                          setAlertSearchTerm("");
                          setIsAlertDropdownOpen(false);
                        }}
                      >
                        <span className="truncate pr-2">ID: {aid} - {al.DESCRIPCION_ALERTA || al[1]}</span>
                        {isProg && <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap">⚡ JOB</span>}
                      </div>
                    )
                  }) : <div className="p-3 text-sm text-slate-500 text-center">Sin resultados</div>}
                </div>
              )}
            </div>
          </div>
          
          {selectedAlert && (
            <div className="mt-6 border border-[#1e293b] rounded-xl bg-[#03060f] overflow-hidden animate-in zoom-in-95 duration-200">
               {/* Header Row */}
               <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-[#1e293b] text-[10px] font-bold text-slate-500 tracking-widest uppercase items-center">
                 <div>ID</div>
                 <div className="col-span-1">Alert Name</div>
                 <div className="text-center">Priority</div>
                 <div className="text-right">Tipo de Proceso</div>
               </div>
               
               {/* Main Values */}
               <div className="grid grid-cols-4 gap-4 px-6 py-4 items-center">
                 <div className="font-bold text-orange-500">
                   #AL-{(selectedAlert.ID || selectedAlert[0] || '0000').toString().padStart(4, '0')}
                 </div>
                 <div className="col-span-1 font-bold text-white text-base truncate">
                   {selectedAlert.DESCRIPCION_ALERTA || selectedAlert[1]}
                 </div>
                 <div className="text-center">
                   <span className={cn(
                     "px-3 py-1 text-xs font-bold rounded-full border",
                     (selectedAlert.PRIORIDAD || selectedAlert[9])?.toUpperCase() === 'ALTA' || (selectedAlert.PRIORIDAD || selectedAlert[9])?.toUpperCase() === 'CRITICAL' 
                       ? "bg-red-500/10 text-red-400 border-red-500/20" 
                       : (selectedAlert.PRIORIDAD || selectedAlert[9])?.toUpperCase() === 'MEDIA'
                         ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                         : "bg-green-500/10 text-green-400 border-green-500/20"
                   )}>
                     {selectedAlert.PRIORIDAD || selectedAlert[9] || 'Normal'}
                   </span>
                 </div>
                 <div className="text-right">
                   <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded border border-[#1e293b] text-xs font-bold">
                     {selectedAlert.TIPO_PROCESO || selectedAlert[2]}
                   </span>
                 </div>
               </div>

               {/* Details Panel */}
               <div className="m-4 border border-[#06b6d4]/20 rounded-lg bg-transparent p-6 space-y-6">
                 <div className="grid grid-cols-2 gap-8 border-b border-[#1e293b] pb-6">
                   <div className="space-y-1">
                     <p className="text-[10px] uppercase font-bold text-slate-500">Correo de Contacto</p>
                     <p className="text-sm font-bold text-white">{selectedAlert.CORREO || selectedAlert[7] || 'Sin especificar'}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[10px] uppercase font-bold text-slate-500">Teléfono de Emergencia</p>
                     <p className="text-sm font-bold text-white">{selectedAlert.TELEFONO || selectedAlert[8] || 'Sin especificar'}</p>
                   </div>
                 </div>
                 
                 <div className="space-y-3">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Proceso (SQL/Procedimiento)</p>
                   <pre className="bg-[#050812] border border-[#1e293b] rounded-lg p-4 text-xs font-mono text-green-400/90 whitespace-pre-wrap">
                     {selectedAlert.PROCESO || selectedAlert[3] || '-- Nada definido --'}
                   </pre>
                 </div>
               </div>
            </div>
          )}

        </div>

        {/* Frequency Settings */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold tracking-wide text-white flex items-center border-b border-[#1e293b] pb-3">
            <Calendar className="w-4 h-4 mr-2 text-[#06b6d4]" /> Ajustes de Frecuencia
          </h2>
          
          <div className="inline-flex bg-[#050812] border border-[#1e293b] rounded-lg p-1">
             {["Minutos", "Diario", "Semanal", "Mensual"].map(f => (
               <button 
                 key={f}
                 onClick={() => setFrequency(f)}
                 className={cn(
                   "px-6 py-1.5 text-xs font-bold rounded-md transition-colors",
                   frequency === f ? "bg-[#06b6d4] text-black shadow-sm" : "text-slate-400 hover:text-white"
                 )}
               >
                 {f}
               </button>
             ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={cn(
                  "text-[11px] font-bold uppercase tracking-wide flex items-center gap-2",
                  frequency === "Minutos" ? "text-slate-600" : "text-slate-400"
                )}>
                  Hora de Ejecución
                  {frequency === "Minutos"
                    ? <span className="text-slate-600 font-normal normal-case">(no aplica para minutos)</span>
                    : <span className="text-[10px] font-bold bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/30 rounded px-1.5 py-0.5 normal-case tracking-normal">🕐 Hora Colombia (UTC-5)</span>
                  }
                </label>
                <div className="relative">
                  <Clock className={cn("w-4 h-4 absolute left-3 top-3", frequency === "Minutos" ? "text-slate-700" : "text-slate-500")} />
                  <input 
                    type="time" 
                    value={executionTime} 
                    onChange={e => setExecutionTime(e.target.value)} 
                    disabled={frequency === "Minutos"}
                    className={cn(
                      "w-full border rounded-md h-10 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4] transition-opacity",
                      frequency === "Minutos" 
                        ? "bg-[#050812]/50 border-[#1e293b]/50 text-slate-600 cursor-not-allowed opacity-50" 
                        : "bg-[#050812] border-[#1e293b] text-slate-300"
                    )}
                  />
                </div>
              </div>
              
              {/* Días Operativos — se oculta en modo Mensual */}
              {frequency !== "Mensual" && (
                <div className="space-y-2">
                  <label className={cn(
                    "text-[11px] font-bold uppercase tracking-wide",
                    frequency === "Minutos" ? "text-slate-600" : "text-slate-400"
                  )}>Días Operativos {frequency === "Minutos" && <span className="text-slate-600 font-normal normal-case">(no aplica)</span>}</label>
                  <div className="flex space-x-2">
                    {daysList.map((day, idx) => {
                      const isSel = selectedDays.includes(day.id)
                      return (
                        <button
                          key={idx}
                          onClick={() => frequency !== "Minutos" && toggleDay(day.id)}
                          className={cn(
                            "w-8 h-8 rounded border flex items-center justify-center text-xs font-bold transition-colors",
                            frequency === "Minutos" 
                              ? "border-[#1e293b]/50 text-slate-700 cursor-not-allowed opacity-40"
                              : isSel ? "border-[#06b6d4] text-[#06b6d4] bg-[#06b6d4]/10" : "border-[#1e293b] text-slate-500 hover:border-slate-400"
                          )}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Día del Mes — solo en modo Mensual */}
              {frequency === "Mensual" && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Día del Mes
                    <span className="ml-2 text-slate-500 font-normal normal-case">(1 – 31)</span>
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      value={dayOfMonth}
                      onChange={e => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value))))}
                      min={1}
                      max={31}
                      className="w-20 bg-[#050812] border border-[#1e293b] text-center text-slate-300 rounded-md h-10 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4]"
                    />
                    <span className="text-sm text-slate-400 font-medium">
                      {dayOfMonth === 1 ? 'Primer día del mes' :
                       dayOfMonth === 15 ? 'Día 15 (quincena)' :
                       dayOfMonth === 28 ? 'Último día seguro (todos los meses)' :
                       `Día ${dayOfMonth} de cada mes`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Repetir Cada</label>
                <div className="flex items-center">
                  <input type="number" value={repeatEvery} onChange={e => setRepeatEvery(Number(e.target.value))} min={1} className="w-20 bg-[#050812] border border-[#1e293b] text-center text-slate-300 rounded-md h-10 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4]" />
                  <span className="ml-3 text-sm text-slate-400 font-medium">
                    {frequency === "Minutos" ? "Minuto(s)" : frequency === "Mensual" ? "Mes(es)" : "Ciclo(s)"}
                  </span>
                </div>
              </div>
              
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4 flex items-start mt-2">
                <Info className="w-4 h-4 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-900 dark:text-orange-200 leading-relaxed font-semibold">
                  {frequency === "Minutos"
                    ? `El sistema correrá el DBMS_SCHEDULER de esta alerta cada ${repeatEvery} minuto(s).`
                    : frequency === "Mensual"
                    ? `El sistema correrá el día ${dayOfMonth} de cada ${repeatEvery === 1 ? 'mes' : `${repeatEvery} meses`} a las ${executionTime}.`
                    : `El sistema correrá el DBMS_SCHEDULER de esta alerta a las ${executionTime} en los días seleccionados.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Validity Period */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold tracking-wide text-white flex items-center border-b border-[#1e293b] pb-3">
            <CalendarDays className="w-4 h-4 mr-2 text-[#06b6d4]" /> Periodo de Validez
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fecha de Inicio</label>
                <div className="relative">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} style={{ colorScheme: "dark" }} className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4] cursor-pointer" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fecha Fin (Opcional)</label>
                <div className="relative">
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} style={{ colorScheme: "dark" }} className="w-full bg-[#050812] border border-[#1e293b] text-slate-300 rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#06b6d4] cursor-pointer" />
                </div>
             </div>
          </div>
        </div>

        {/* Jobs Programados */}
        <div className="space-y-4">
           <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
             <h2 className="text-sm font-bold tracking-wide text-white flex items-center">
               <Database className="w-4 h-4 mr-2 text-[#06b6d4]" /> Jobs Programados (Oracle Scheduler)
             </h2>
             <div className="flex space-x-12 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
               <span>Instrucción de Creación</span>
               <span>Status</span>
             </div>
           </div>

           <div className="space-y-3">
             {filteredJobs.length === 0 ? (
               <div className="text-center p-6 text-slate-500 text-sm border border-dashed border-[#1e293b] rounded-lg">
                 {alertProcess ? "No hay jobs programados para esta alerta." : "Seleccione una alerta para visualizar sus jobs programados."}
               </div>
             ) : (
               filteredJobs.map((job) => {
                  const tProc = selectedAlert?.TIPO_PROCESO || selectedAlert?.[2] || 'S';
                  const proc = selectedAlert?.PROCESO || selectedAlert?.[3] || '';
                  
                  const isPLSQL = ['P', 'PROCEDIMIENTO', 'F', 'FUNCION', 'FUNCIÓN'].includes(tProc.toUpperCase());
                  
                  return (
                  <div key={job.ID} className="flex flex-col items-stretch p-4 bg-[#050812] border border-[#1e293b] rounded-lg">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1e293b]/50">
                      <div className="flex items-center space-x-4 w-1/3">
                        <input 
                           type="checkbox" 
                           className="w-4 h-4 bg-transparent border-[#1e293b] rounded cursor-pointer" 
                           checked={selectedJobIds.includes(job.ID)}
                           onChange={(e) => {
                             if (e.target.checked) setSelectedJobIds([...selectedJobIds, job.ID]);
                             else setSelectedJobIds(selectedJobIds.filter(id => id !== job.ID));
                           }}
                        />
                        <span className="text-sm font-bold text-[#06b6d4] truncate" title={job.NOMBRE_JOB}>
                          {job.NOMBRE_JOB}
                        </span>
                      </div>
                      
                      <div className="flex space-x-4 items-center w-1/3 justify-center">
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800/50 px-3 py-1 rounded-sm border border-[#1e293b]">
                          {job.TIPO_FRECUENCIA} • {job.HORA_EJECUCION}
                        </span>
                      </div>

                      <div className="w-1/3 flex justify-end items-center space-x-3">
                        <span className={cn(
                          "text-[9px] font-black tracking-tighter uppercase",
                          job.ESTADO === "ACTIVO" ? "text-[#06b6d4]" : "text-slate-600"
                        )}>
                          {job.ESTADO === "ACTIVO" ? "ENABLED" : "DISABLED"}
                        </span>
                        <div className={cn(
                          "inline-flex w-9 h-5 rounded-full relative border items-center px-0.5",
                          job.ESTADO === "ACTIVO" 
                            ? "bg-[#06b6d4]/20 border-[#06b6d4]/30" 
                            : "bg-slate-700/50 border-slate-600"
                        )}>
                           <div className={cn(
                             "w-3.5 h-3.5 rounded-full absolute transition-all",
                             job.ESTADO === "ACTIVO" ? "bg-[#06b6d4] right-0.5" : "bg-slate-500 left-0.5"
                           )}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-start">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest px-2">Estructura Interna Creada:</p>
                      <pre className="text-[13px] font-mono text-cyan-400 bg-black/60 p-4 rounded-md border border-[#1e293b]/80 w-full overflow-x-auto whitespace-pre-wrap leading-6 shadow-inner">
                        BEGIN{'\n'}
                        {'  '}DBMS_SCHEDULER.CREATE_JOB({'\n'}
                        {'    '}job_name   ={'>'} '{job.NOMBRE_JOB}',{'\n'}
                        {'    '}job_type   ={'>'} '{isPLSQL ? "PLSQL_BLOCK" : "STORED_PROCEDURE"}',{'\n'}
                        {'    '}job_action ={'>'} '{isPLSQL ? proc.replace(/'/g, "''") : "pkgln_alertas.p_ejecutar_job"}',{'\n'}
                        {'    '}start_date ={'>'} '{job.FECHA_INICIO}',{'\n'}
                        {'    '}repeat_int ={'>'} '{job.TIPO_FRECUENCIA === 'Diario' ? 'FREQ=DAILY...' : 'FREQ=...'}',{'\n'}
                        {'    '}enabled    ={'>'} TRUE{'\n'}
                        {'  '});{'\n'}
                        {isPLSQL ? "" : `  DBMS_SCHEDULER.SET_JOB_ARGUMENT_VALUE('${job.NOMBRE_JOB}', 1, '${job.ID_ALERTA}');\n`}
                        END;
                      </pre>
                    </div>
                  </div>
               )})
             )}
           </div>
           
           <div className="pt-2">
             <Button onClick={handleDeleteSelected} disabled={saving} variant="outline" className="border-[#1e293b] bg-transparent text-slate-400 hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 text-xs h-9">
               <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar Seleccionado
             </Button>
           </div>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-[#1e293b] flex items-center justify-end space-x-4">
           <Button variant="ghost" className="text-slate-400 hover:text-white">
             Cancelar
           </Button>
           <Button onClick={handleSave} disabled={saving} className="bg-[#06b6d4] hover:bg-[#0891b2] text-black font-bold h-10 px-8 shadow-lg shadow-[#06b6d4]/20 rounded-md">
             <Save className="w-4 h-4 mr-2" /> {saving ? "Guardando..." : "Guardar Job"}
           </Button>
        </div>

      </div>
    </div>
  )
}
