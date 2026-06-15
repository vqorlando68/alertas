"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, FileText, LogOut, Activity, Clock, Sun, Moon, Globe, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/theme-context"
import { cn } from "@/lib/utils"

function DocModalListener() {
  const [open, setOpen] = React.useState(false)
  const [docContent, setDocContent] = React.useState<{
    title: string
    method: string
    example: string
    output: string
    notes?: { label: string; rows: { col1: string; col2: string; col3: string }[] } | null
  }>({
    title: "Documentación PL/SQL",
    method: "N/A",
    example: "-- No hay ejemplo disponible",
    output: "-- No hay salida esperada",
    notes: null
  })

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === "d") {
        e.preventDefault()
        
        const path = window.location.pathname
        if (path.includes("/alertas") && path.includes("/logs")) {
          const isResolving = document.body.innerText.includes("Resolver Incidente") || 
                              document.body.innerText.includes("Resolve Incident") ||
                              document.body.innerText.includes("Detalles de Solución") ||
                              document.body.innerText.includes("Solution Details");

          if (isResolving) {
            setDocContent({
              title: "Resolver Incidente (Logs de Alerta)",
              method: "pkgln_alertas.p_save_log_solucion",
              example: `-- ► SOLUCIONAR INCIDENTE (S) — POST /api/alertas/{id}/logs
-- Body JSON enviado desde la UI:
-- {
--   "id_log": 154,
--   "comentarios_solucion": "Se reinició el servicio y se liberó espacio."
-- }

BEGIN
  pkgln_alertas.p_save_log_solucion(
    p_id_log               => 154,
    p_estado               => 'S',        -- Por defecto 'S' (Solucionado) en esta ruta
    p_id_persona_asignada  => NULL,
    p_solucionado          => 'admin',    -- Usuario de sesión (session.username)
    p_comentarios_solucion => 'Se reinició el servicio y se liberó espacio.' -- Obligatorio
  );
END;`,
              output: `-- Cambios aplicados en TKR_LOG_ALERTAS:
- Estado pasa a 'S' (Solucionado).
- Guarda SOLUCIONADO y FECHA_SOLUCION (Sysdate).
- COMENTARIOS_SOLUCION se concatena de forma acumulativa (append) con marca de tiempo y usuario.
- Se registra la auditoría correspondiente en la columna LOG_ESTADO.`,
              notes: {
                label: "Referencia de campos del formulario → parámetros Oracle",
                rows: [
                  { col1: "Comentarios de Solución", col2: "Texto descriptivo de la solución técnica aplicada (obligatorio).", col3: "p_comentarios_solucion CLOB" }
                ]
              }
            })
          } else {
            setDocContent({
              title: "Logs Específicos de Alerta",
              method: "pkgln_alertas.p_get_logs_alerta",
              example: `DECLARE\n  v_cursor pkgln_alertas.cur_type;\n  v_rec TKR_LOG_ALERTAS%ROWTYPE;\nBEGIN\n  pkgln_alertas.p_get_logs_alerta(1, v_cursor);\n  LOOP\n    FETCH v_cursor INTO v_rec;\n    EXIT WHEN v_cursor%NOTFOUND;\n    DBMS_OUTPUT.PUT_LINE('Log: ' || v_rec.LOG);\n  END LOOP;\n  CLOSE v_cursor;\nEND;`,
              output: `// Salida en consola DBMS:\nLog: Falla conexión... | Estado: F`,
              notes: null
            })
          }
        } else if (path.includes("/logs")) {
          const isEditing = document.body.innerText.includes("Editar Log de Incidente") || 
                            document.body.innerText.includes("Edit Incident Log") ||
                            document.body.innerText.includes("Volver a Logs") ||
                            document.body.innerText.includes("Back to Logs");

          if (isEditing) {
            setDocContent({
              title: "Editar Log de Incidente (Resolución)",
              method: "pkgln_alertas.p_save_log_solucion",
              example: `-- ► ESCENARIO 1: ASIGNAR INCIDENTE (A) — PUT /api/logs/{id}
-- Body JSON enviado desde la UI:
-- {
--   "estado": "A",
--   "id_persona_asignada": 12,
--   "comentarios_solucion": ""
-- }

BEGIN
  pkgln_alertas.p_save_log_solucion(
    p_id_log               => 154,        -- ID del log (TKR_LOG_ALERTAS)
    p_estado               => 'A',        -- A = Asignado
    p_id_persona_asignada  => 12,         -- FK de TKR_USUARIOS (Obligatorio si estado='A')
    p_solucionado          => 'admin',    -- Usuario de sesión (session.username)
    p_comentarios_solucion => NULL
  );
END;

-- ► ESCENARIO 2: SOLUCIONAR INCIDENTE (S) — PUT /api/logs/{id}
-- Body JSON enviado desde la UI:
-- {
--   "estado": "S",
--   "id_persona_asignada": null,
--   "comentarios_solucion": "Se reinició el servicio y se liberó espacio."
-- }

BEGIN
  pkgln_alertas.p_save_log_solucion(
    p_id_log               => 154,
    p_estado               => 'S',        -- S = Solucionado
    p_id_persona_asignada  => NULL,
    p_solucionado          => 'admin',    -- Registrado en SOLUCIONADO y FECHA_SOLUCION
    p_comentarios_solucion => 'Se reinició el servicio y se liberó espacio.' -- Obligatorio si estado='S'
  );
END;

-- ► ESCENARIO 3: REGRESAR A PENDIENTE (P) — PUT /api/logs/{id}
BEGIN
  pkgln_alertas.p_save_log_solucion(
    p_id_log               => 154,
    p_estado               => 'P',        -- P = Pendiente
    p_id_persona_asignada  => NULL,
    p_solucionado          => 'admin',
    p_comentarios_solucion => 'Se descarta solución por reincidencia.'
  );
END;`,
              output: `-- Cambios aplicados en TKR_LOG_ALERTAS:
- Actualiza ESTADO, ID_PERSONA_ASIGNADA.
- Si es estado='S', guarda SOLUCIONADO y FECHA_SOLUCION (Sysdate).
- COMENTARIOS_SOLUCION se concatena de forma acumulativa (append) con marca de tiempo y usuario.
- LOG_ESTADO guarda la traza de auditoría de cambios de estado y asignación.
- Si p_estado='A' y tiene correo, envía email automático con pasos a seguir e información de traza.`,
              notes: {
                label: "Referencia rápida: campos UI → parámetros Oracle",
                rows: [
                  { col1: "Estado de la Alerta",  col2: "P = Pendiente · A = Asignado · S = Solucionado",             col3: "p_estado VARCHAR2" },
                  { col1: "Usuario Asignado",     col2: "ID de usuario (Rol 13). Requerido si el estado es 'Asignado'.", col3: "p_id_persona_asignada NUMBER" },
                  { col1: "Solución Aplicada",    col2: "Texto descriptivo de solución. Requerido si es 'Solucionado'. Concatena al historial.", col3: "p_comentarios_solucion CLOB" }
                ]
              }
            })
          } else {
            setDocContent({
              title: "Reporte Global de Logs",
              method: "pkgln_alertas.p_get_all_logs",
              example: `DECLARE\n  v_cursor pkgln_alertas.cur_type;\nBEGIN\n  pkgln_alertas.p_get_all_logs(p_estado => 'P', p_resultado => v_cursor);\nEND;`,
              output: `// Salida de cursor:\nAlerta: Usuarios bloqueados... | Estado: P`,
              notes: null
            })
          }
        } else if (path.includes("/alertas/schedule")) {
          setDocContent({
            title: "Programación de Jobs — Oracle Scheduler",
            method: "pkgln_alertas.p_save_programacion",
            example: `-- Job DIARIO a las 08:00 (L-V)\nBEGIN\n  pkgln_alertas.p_save_programacion(\n    p_id_alerta       => 5,\n    p_tipo_frecuencia => 'Diario',\n    p_hora_ejecucion  => '08:00',\n    p_repetir_cada    => 1,        -- cada 1 día\n    p_dia_del_mes     => NULL,     -- no aplica en Diario\n    p_dias_operacion  => 'LUN,MAR,MIE,JUE,VIE',\n    p_fecha_inicio    => DATE '2025-01-01',\n    p_fecha_fin       => NULL\n  );\nEND;\n\n-- Job MENSUAL el día 1 de cada mes a las 09:00\nBEGIN\n  pkgln_alertas.p_save_programacion(\n    p_id_alerta       => 5,\n    p_tipo_frecuencia => 'Mensual',\n    p_hora_ejecucion  => '09:00',\n    p_repetir_cada    => 1,        -- cada 1 mes\n    p_dia_del_mes     => 1,        -- día 1 del mes\n    p_dias_operacion  => NULL,     -- ignorado en Mensual\n    p_fecha_inicio    => DATE '2025-01-01',\n    p_fecha_fin       => NULL\n  );\nEND;\n\n-- Job por MINUTOS cada 15 minutos\nBEGIN\n  pkgln_alertas.p_save_programacion(\n    p_id_alerta       => 5,\n    p_tipo_frecuencia => 'Minutos',\n    p_hora_ejecucion  => '00:00',  -- ignorado\n    p_repetir_cada    => 15,\n    p_dia_del_mes     => NULL,\n    p_dias_operacion  => NULL,\n    p_fecha_inicio    => DATE '2025-01-01',\n    p_fecha_fin       => NULL\n  );\nEND;`,
            output: `-- repeat_interval generado por DBMS_SCHEDULER:\n\nDiario  (cada 1 día)       => FREQ=DAILY; INTERVAL=1; BYHOUR=8; BYMINUTE=0; BYSECOND=0\nMinutos (cada 15 min)      => FREQ=MINUTELY; INTERVAL=15\nSemanal (cada 2 semanas)   => FREQ=WEEKLY; BYDAY=MON,WED,FRI; INTERVAL=2; BYHOUR=8; ...\nMensual (día 1, cada mes)  => FREQ=MONTHLY; BYMONTHDAY=1; INTERVAL=1; BYHOUR=9; BYMINUTE=0; BYSECOND=0\nMensual (día 15, c/3 meses)=> FREQ=MONTHLY; BYMONTHDAY=15; INTERVAL=3; BYHOUR=9; BYMINUTE=0; BYSECOND=0`,
            notes: {
              label: "Referencia rápida: parámetros por tipo de frecuencia",
              rows: [
                { col1: "Minutos",  col2: "Usa: repetir_cada (N min). Hora y días ignorados.",      col3: "FREQ=MINUTELY; INTERVAL=N" },
                { col1: "Diario",   col2: "Usa: hora + días operativos + repetir_cada.",            col3: "FREQ=DAILY; INTERVAL=N" },
                { col1: "Semanal",  col2: "Usa: hora + días operativos + repetir_cada.",            col3: "FREQ=WEEKLY; BYDAY=...; INTERVAL=N" },
                { col1: "Mensual",  col2: "Usa: día del mes + hora + repetir_cada. Días ignorados.", col3: "FREQ=MONTHLY; BYMONTHDAY=D; INTERVAL=N" },
              ]
            }
          })
        } else if (path.includes("/alertas")) {
          setDocContent({
            title: "Editar / Crear Definición de Alerta",
            method: "pkgln_alertas.p_save_alerta",
            example: `-- ► CREAR (Nueva Alerta) — POST /api/alertas\n-- Body JSON enviado desde la UI:\n-- {\n--   "descripcion_alerta": "Falla crítica en cierres nocturnos",\n--   "tipo_proceso": "P",          -- P=Procedimiento, F=Función, S=SQL\n--   "proceso": "pkg_cierres.p_validar_cierre",\n--   "frecuencia": "Diario",\n--   "estado": "A",               -- A=Activa, I=Inactiva\n--   "pasos_a_seguir": "1. Verificar logs...",\n--   "correo": "ops@empresa.com",\n--   "telefono": "+573001234567",\n--   "prioridad": "A"             -- A=Alta, M=Media, B=Baja\n-- }\n\nBEGIN\n  pkgln_alertas.p_save_alerta(\n    p_id                 => NULL,  -- NULL = INSERT nuevo registro\n    p_descripcion_alerta => 'Falla crítica en cierres nocturnos',\n    p_tipo_proceso       => 'P',\n    p_proceso            => 'pkg_cierres.p_validar_cierre',\n    p_frecuencia         => 'Diario',\n    p_estado             => 'A',\n    p_pasos_a_seguir     => '1. Verificar logs del sistema...',\n    p_correo             => 'ops@empresa.com',\n    p_telefono           => '+573001234567',\n    p_prioridad          => 'A',\n    p_usuario            => 'admin',\n    p_new_id             => :v_new_id   -- OUT: ID generado\n  );\nEND;\n\n-- ► EDITAR (Actualizar Alerta) — PUT /api/alertas/{id}\n-- Mismos parámetros pero p_id = ID existente.\n-- Además ejecuta automáticamente:\n--   pkgln_alertas.p_toggle_jobs_alerta(p_id_alerta=>5, p_estado=>'A')\n-- para sincronizar el estado de los Jobs del Scheduler.\n\nBEGIN\n  pkgln_alertas.p_save_alerta(\n    p_id                 => 5,     -- ID existente = UPDATE\n    p_descripcion_alerta => 'Falla crítica en cierres nocturnos',\n    p_tipo_proceso       => 'P',\n    p_proceso            => 'pkg_cierres.p_validar_cierre',\n    p_frecuencia         => 'Diario',\n    p_estado             => 'I',   -- Desactivar alerta\n    p_pasos_a_seguir     => '1. Verificar logs del sistema...',\n    p_correo             => 'ops@empresa.com',\n    p_telefono           => '+573001234567',\n    p_prioridad          => 'M',\n    p_usuario            => 'admin',\n    p_new_id             => :v_id\n  );\n  -- Se desactivan también los Jobs del Scheduler:\n  pkgln_alertas.p_toggle_jobs_alerta(p_id_alerta => 5, p_estado => 'I');\nEND;`,
            output: `-- Salida (p_new_id OUT):\nCrear => v_new_id = 25   (nuevo ID generado)\nEditar => v_id    = 5    (mismo ID actualizado)\n\n-- Columnas actualizadas en TKR_ALERTAS:\nDESCRIPCION_ALERTA, TIPO_PROCESO, PROCESO, FRECUENCIA,\nESTADO, PASOS_A_SEGUIR, CORREO, TELEFONO, PRIORIDAD,\nFECHA_MODIFICACION, MODIFICADO_POR`,
            notes: {
              label: "Referencia de campos del formulario → parámetros Oracle",
              rows: [
                { col1: "descripcion_alerta", col2: "Nombre descriptivo de la alerta",           col3: "p_descripcion_alerta VARCHAR2" },
                { col1: "tipo_proceso",       col2: "P=Procedimiento · F=Función · S=SQL",       col3: "p_tipo_proceso VARCHAR2" },
                { col1: "proceso",            col2: "Código SQL o nombre del proc/función",      col3: "p_proceso VARCHAR2" },
                { col1: "estado",             col2: "A=Activa · I=Inactiva (toggle en UI)",      col3: "p_estado VARCHAR2" },
                { col1: "prioridad",          col2: "A=Alta · M=Media · B=Baja",                col3: "p_prioridad VARCHAR2" },
                { col1: "correo / telefono",  col2: "Notificaciones de incidente",              col3: "p_correo / p_telefono VARCHAR2" },
                { col1: "pasos_a_seguir",     col2: "Guía de resolución (se envía en correo)",  col3: "p_pasos_a_seguir CLOB" },
              ]
            }
          })
        } else {
          setDocContent({
            title: "Login / Seguridad",
            method: "pkgln_seguridad.f_validar_clave",
            example: `DECLARE\n  v_ret NUMBER;\nBEGIN\n  v_ret := pkgln_seguridad.f_validar_clave('admin', '123', 1);\nEND;`,
            output: `// Resultado: 1`,
            notes: null
          })
        }
        
        setOpen(true)
      }
    }
    
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (!open) return null

  const copyToClipboard = () => {
    navigator.clipboard.writeText(docContent.example)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={() => setOpen(false)} />
      <div className="relative z-[100] w-full max-w-3xl border bg-background p-6 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Documentación PL/SQL · Ctrl+Alt+D</p>
            <h2 className="text-xl font-bold">{docContent.title}</h2>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wide border border-border rounded px-2 py-1 hover:bg-muted transition-colors ml-4 flex-shrink-0">ESC / Cerrar</button>
        </div>

        {/* Método */}
        <div className="mb-4">
          <p className="text-sm font-semibold mb-1">Método de Base de Datos:</p>
          <code className="text-sm bg-muted px-2 py-1 rounded">{docContent.method}</code>
        </div>

        {/* Tabla REPETIR_CADA si aplica */}
        {docContent.notes && (
          <div className="mb-4">
            <p className="text-sm font-semibold mb-2">{docContent.notes.label}:</p>
            <table className="w-full text-xs border-collapse rounded overflow-hidden">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="text-left px-3 py-2 border border-border font-bold uppercase tracking-wide">Frecuencia</th>
                  <th className="text-left px-3 py-2 border border-border font-bold uppercase tracking-wide">Significado</th>
                  <th className="text-left px-3 py-2 border border-border font-bold uppercase tracking-wide">repeat_interval generado</th>
                </tr>
              </thead>
              <tbody>
                {docContent.notes.rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    <td className="px-3 py-2 border border-border font-bold text-primary">{row.col1}</td>
                    <td className="px-3 py-2 border border-border text-foreground">{row.col2}</td>
                    <td className="px-3 py-2 border border-border font-mono text-[11px] text-green-500">{row.col3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ejemplo */}
        <div className="mb-4 relative">
          <p className="text-sm font-semibold mb-1">Ejemplo (Bloque Anónimo):</p>
          <pre className="text-sm bg-muted p-4 rounded overflow-x-auto pr-16">
            {docContent.example}
          </pre>
          <Button size="sm" variant="outline" className="absolute top-8 right-2 h-8" onClick={copyToClipboard}>
            Copiar
          </Button>
        </div>

        {/* Salida */}
        <div className="mb-6">
          <p className="text-sm font-semibold mb-1">Salida Esperada / repeat_interval:</p>
          <code className="text-sm bg-muted px-3 py-3 rounded block whitespace-pre-wrap font-mono leading-relaxed">{docContent.output}</code>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme, lang, toggleLang, t } = useApp()

  // Avatar dropdown state
  const [avatarOpen, setAvatarOpen] = React.useState(false)
  const [username, setUsername] = React.useState<string | null>(null)
  const avatarRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.username) setUsername(data.username) })
      .catch(() => {})
  }, [])

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <DocModalListener />
      
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <Bell className="w-6 h-6 text-primary mr-2" />
          <h1 className="text-lg font-bold">Alertas App</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard/alertas" className="w-full">
             <Button 
               type="button"
               variant={pathname.includes("/alertas") && !pathname.includes("/alertas/schedule") ? "secondary" : "ghost"} 
               className="w-full justify-start cursor-pointer"
             >
                <FileText className="mr-2 h-4 w-4" />
                {t("Gestión de Alertas", "Alert Management")}
             </Button>
          </Link>
          <Link href="/dashboard/alertas/schedule" className="w-full">
             <Button 
               type="button"
               variant={pathname.includes("/alertas/schedule") ? "secondary" : "ghost"} 
               className="w-full justify-start cursor-pointer"
             >
                <Clock className="mr-2 h-4 w-4" />
                {t("Programación Jobs", "Job Scheduling")}
             </Button>
          </Link>
          <Link href="/dashboard/logs" className="w-full">
             <Button 
               type="button"
               variant={pathname.includes("/logs") ? "secondary" : "ghost"} 
               className="w-full justify-start cursor-pointer"
             >
                <Activity className="mr-2 h-4 w-4" />
                {t("Logs de Ejecución", "Execution Logs")}
             </Button>
          </Link>
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t("Cerrar Sesión", "Log Out")}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b flex items-center px-8 bg-card justify-between">
          <h2 className="text-lg font-semibold truncate">
            {pathname.includes("/alertas") 
              ? t("Módulo de Alertas", "Alerts Module") 
              : t("Dashboard", "Dashboard")}
          </h2>
          <div className="flex items-center space-x-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              title={t("Cambiar a Inglés", "Cambiar a Español")}
              className={cn(
                "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                "border-border text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5"
              )}
            >
              <Globe className="w-4 h-4" />
              <span>{lang === "es" ? "ES / EN" : "EN / ES"}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" 
                ? t("Cambiar a Tema Claro", "Switch to Light Theme") 
                : t("Cambiar a Tema Oscuro", "Switch to Dark Theme")}
              className={cn(
                "w-9 h-9 rounded-lg border flex items-center justify-center transition-all",
                theme === "dark"
                  ? "border-border text-muted-foreground hover:text-yellow-400 hover:border-yellow-400/50 hover:bg-yellow-400/5"
                  : "border-border text-slate-600 hover:text-indigo-600 hover:border-indigo-400/50 hover:bg-indigo-400/5"
              )}
            >
              {theme === "dark" 
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {/* Avatar with dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen(prev => !prev)}
                title={username || "Usuario"}
                className={cn(
                  "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all font-bold text-sm select-none",
                  theme === "dark"
                    ? "bg-gradient-to-br from-[#00aae1] to-[#0177ab] border-[#00aae1]/40 text-white hover:border-[#00aae1] hover:shadow-[0_0_12px_rgba(0,170,225,0.4)]"
                    : "bg-gradient-to-br from-[#00aae1] to-[#0177ab] border-[#b6ecff] text-white hover:border-[#00aae1] hover:shadow-[0_0_12px_rgba(0,170,225,0.3)]"
                )}
              >
                {username ? username.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </button>

              {/* Dropdown */}
              {avatarOpen && (
                <div className={cn(
                  "absolute right-0 top-11 z-50 w-52 rounded-xl border shadow-2xl overflow-hidden",
                  theme === "dark"
                    ? "bg-[#0f172a] border-[#1e293b]"
                    : "bg-white/95 border-[#b6ecff] backdrop-blur-md"
                )}>
                  {/* User info */}
                  <div className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b",
                    theme === "dark" ? "border-[#1e293b]" : "border-[#b6ecff]"
                  )}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00aae1] to-[#0177ab] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {username ? username.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-semibold truncate",
                        theme === "dark" ? "text-white" : "text-[#04354d]"
                      )}>
                        {username || "Usuario"}
                      </p>
                      <p className="text-[10px] text-[#00aae1] font-medium tracking-wide uppercase">
                        {t("Administrador", "Administrator")}
                      </p>
                    </div>
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={() => { setAvatarOpen(false); handleLogout() }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors",
                      theme === "dark"
                        ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        : "text-red-600 hover:bg-red-50 hover:text-red-700"
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                    {t("Cerrar Sesión", "Log Out")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
