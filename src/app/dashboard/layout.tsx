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
  const [docContent, setDocContent] = React.useState({
    title: "Documentación PL/SQL",
    method: "N/A",
    example: "-- No hay ejemplo disponible",
    output: "-- No hay salida esperada"
  })

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === "d") {
        e.preventDefault()
        
        const path = window.location.pathname
        if (path.includes("/alertas") && path.includes("/logs")) {
          setDocContent({
            title: "Logs Específicos de Alerta",
            method: "pkgln_alertas.p_get_logs_alerta",
            example: `DECLARE\n  v_cursor pkgln_alertas.cur_type;\n  v_rec TKR_LOG_ALERTAS%ROWTYPE;\nBEGIN\n  pkgln_alertas.p_get_logs_alerta(1, v_cursor);\n  LOOP\n    FETCH v_cursor INTO v_rec;\n    EXIT WHEN v_cursor%NOTFOUND;\n    DBMS_OUTPUT.PUT_LINE('Log: ' || v_rec.LOG);\n  END LOOP;\n  CLOSE v_cursor;\nEND;`,
            output: `// Salida en consola DBMS:\nLog: Falla conexión... | Estado: F`
          })
        } else if (path.includes("/logs")) {
          setDocContent({
            title: "Reporte Global de Logs",
            method: "pkgln_alertas.p_get_all_logs",
            example: `DECLARE\n  v_cursor pkgln_alertas.cur_type;\nBEGIN\n  pkgln_alertas.p_get_all_logs(p_estado => 'P', p_resultado => v_cursor);\nEND;`,
            output: `// Salida de cursor:\nAlerta: Usuarios bloqueados... | Estado: P`
          })
        } else if (path.includes("/alertas")) {
          setDocContent({
            title: "Gestión de Alertas",
            method: "pkgln_alertas.p_get_alertas",
            example: `DECLARE\n  v_cursor pkgln_alertas.cur_type;\nBEGIN\n  pkgln_alertas.p_get_alertas(NULL, 'A', v_cursor);\nEND;`,
            output: `// Salida en consola DBMS:\nID: 1 | Falla crítica en el sistema`
          })
        } else {
          setDocContent({
            title: "Login / Seguridad",
            method: "pkgln_seguridad.f_validar_clave",
            example: `DECLARE\n  v_ret NUMBER;\nBEGIN\n  v_ret := pkgln_seguridad.f_validar_clave('admin', '123', 1);\nEND;`,
            output: `// Resultado: 1`
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
      <div className="relative z-[100] w-full max-w-2xl border bg-background p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">{docContent.title}</h2>
        <div className="mb-4">
          <p className="text-sm font-semibold mb-1">Método de Base de Datos:</p>
          <code className="text-sm bg-muted px-2 py-1 rounded">{docContent.method}</code>
        </div>
        <div className="mb-4 relative">
          <p className="text-sm font-semibold mb-1">Ejemplo (Bloque Anónimo):</p>
          <pre className="text-sm bg-muted p-4 rounded overflow-x-auto">
            {docContent.example}
          </pre>
          <Button size="sm" variant="outline" className="absolute top-8 right-2 h-8" onClick={copyToClipboard}>
            Copiar
          </Button>
        </div>
        <div className="mb-6">
          <p className="text-sm font-semibold mb-1">Salida Esperada:</p>
          <code className="text-sm bg-muted px-2 py-1 rounded block whitespace-pre-wrap">{docContent.output}</code>
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
