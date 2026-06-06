"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"

function DocModalListener() {
  const [open, setOpen] = useState(false)
  const docContent = {
    title: "Documentación PL/SQL: Validación de Usuario",
    method: "pkgln_seguridad.f_validar_clave",
    example: `DECLARE\n  v_ret NUMBER;\nBEGIN\n  -- Retorna 1 si es válido, 0 si es incorrecto\n  v_ret := pkgln_seguridad.f_validar_clave(:p_username, :p_password, 1);\n  DBMS_OUTPUT.PUT_LINE('Resultado: ' || v_ret);\nEND;`,
    output: `// Si las credenciales son válidas:\nResultado: 1\n\n// Si las credenciales son inválidas:\nResultado: 0`
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault()
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
          <pre className="text-sm bg-muted p-4 rounded overflow-x-auto whitespace-pre">
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

const schema = z.object({
  username: z.string().min(1, { message: "Usuario es requerido" }),
  password: z.string().min(1, { message: "Contraseña es requerida" }),
})

export default function Login() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof schema>) {
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (res.ok) {
        router.push("/dashboard/alertas")
      } else {
        const data = await res.json()
        setError(data.error || "Credenciales inválidas")
      }
    } catch (err) {
      setError("Error de conexión con el servidor")
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <DocModalListener />
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold">Alertas</CardTitle>
          <CardDescription>
            Ingrese sus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="username">
                Usuario
              </label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Ingresando..." : "Ingresar"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
