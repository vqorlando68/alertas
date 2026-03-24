"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, CheckCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

type LogAlerta = {
  ID: number
  ID_ALERTA: number
  LOG: string
  FECHA: string
  ESTADO: string // 'F' fail, 'S' success, 'E' error, etc.
  ASIGNADO: string
  SOLUCIONADO: string
  FECHA_SOLUCION: string
  COMENTARIOS_SOLUCION: string
}

export default function LogsAlertasPage() {
  const params = useParams()
  const router = useRouter()
  const idAlerta = params.id as string

  const [logs, setLogs] = React.useState<LogAlerta[]>([])
  const [loading, setLoading] = React.useState(true)
  
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [selectedLog, setSelectedLog] = React.useState<LogAlerta | null>(null)
  const [comentarios, setComentarios] = React.useState("")
  const [isResolving, setIsResolving] = React.useState(false)

  React.useEffect(() => {
    if (idAlerta) fetchLogs()
  }, [idAlerta])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/alertas/${idAlerta}/logs`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openResolveModal = (log: LogAlerta) => {
    setSelectedLog(log)
    setComentarios(log.COMENTARIOS_SOLUCION || "")
    setIsModalOpen(true)
  }

  const handleResolve = async () => {
    if (!selectedLog) return
    setIsResolving(true)
    try {
      const res = await fetch(`/api/alertas/${idAlerta}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_log: selectedLog.ID,
          comentarios_solucion: comentarios
        })
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchLogs()
      } else {
        alert("Error al guardar la solución.")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/alertas")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-3xl font-bold">Logs de la Alerta #{idAlerta}</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No hay logs registrados para esta alerta.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Mensaje (Log)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Solucionado Por</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.ID}>
                    <TableCell className="whitespace-nowrap">
                      {log.FECHA ? format(new Date(log.FECHA), "dd MMM yyyy HH:mm", { locale: es }) : "N/A"}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={log.LOG}>{log.LOG}</div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        log.ESTADO === 'S' ? "bg-green-500/20 text-green-500" :
                        log.ESTADO === 'F' ? "bg-red-500/20 text-red-500" :
                        "bg-yellow-500/20 text-yellow-500"
                      )}>
                        {log.ESTADO === 'S' ? 'Solucionado' : log.ESTADO === 'F' ? 'Fallo' : log.ESTADO}
                      </span>
                    </TableCell>
                    <TableCell>
                       {log.SOLUCIONADO ? (
                         <div className="text-sm">
                           <span className="font-medium text-primary">{log.SOLUCIONADO}</span>
                           <div className="text-xs text-muted-foreground">
                             {log.FECHA_SOLUCION && format(new Date(log.FECHA_SOLUCION), "dd MMM yyyy", { locale: es })}
                           </div>
                         </div>
                       ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.ESTADO !== 'S' && (
                         <Button variant="outline" size="sm" onClick={() => openResolveModal(log)}>
                           <CheckCircle className="w-4 h-4 mr-1" />
                           Resolver
                         </Button>
                      )}
                      {log.ESTADO === 'S' && (
                         <Button variant="ghost" size="sm" onClick={() => openResolveModal(log)}>
                           Ver Detalles
                         </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader>
          <DialogTitle>
            {selectedLog?.ESTADO === 'S' ? "Detalles de Solución" : "Resolver Incidente"}
          </DialogTitle>
          <DialogDescription>
            Agregue los comentarios sobre cómo se solucionó este incidente de la alerta.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
             <label className="text-sm font-medium">Log Original:</label>
             <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono">
               {selectedLog?.LOG}
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium">Comentarios de Solución:</label>
             <Textarea 
               value={comentarios} 
               onChange={(e) => setComentarios(e.target.value)}
               readOnly={selectedLog?.ESTADO === 'S'}
               className="min-h-[120px]"
               placeholder="Escriba aquí los detalles..."
             />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
          {selectedLog?.ESTADO !== 'S' && (
            <Button onClick={handleResolve} disabled={isResolving || !comentarios.trim()}>
              {isResolving ? "Guardando..." : "Marcar como Solucionado"}
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  )
}
