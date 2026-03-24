# Alertas Web App

Aplicación web desarrollada en React con Next.js (App Router) y Tailwind CSS para la gestión de alertas, integrada con una base de datos Oracle mediante la librería `oracledb`.

## Requisitos Previos

- Node.js 18+ instalado.
- Cliente de Oracle nativo instalado (Opcional, `oracledb` ^6 utilza modo Thin por defecto y no requiere cliente nativo para operaciones básicas).
- Base de datos Oracle activa con el esquema correspondite.

## Configuración y Despliegue Local

1.  **Clonar/Descargar** los archivos del proyecto en su directorio local.
2.  **Instalar dependencias:**
    ```bash
    npm install
    ```
3.  **Configurar Variables de Entorno:**
    Asegúrese de que el archivo `.env.local` exista en la raíz del proyecto con las siguientes variables (ajustadas a su entorno de desarrollo):
    ```env
    DB_USER=TEKER_DEV
    DB_PASSWORD=T3k3r_2025_D3v_$ecur3
    DB_CONNECTION_STRING=tekerapp-db.maxapex.net:1521/orclpdb1
    JWT_SECRET=super_secret_key_for_development_replace_in_prod
    ```
4.  **Ejecutar Script de Base de Datos:**
    Antes de inicializar la aplicación, ejecute el script `pkgln_alertas.sql` en su base de datos Oracle para crear el paquete PL/SQL correspondiente que maneja la lógica de negocio.
5.  **Iniciar Servidor de Desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000`.

## Despliegue en Vercel

1.  Suba el repositorio a GitHub u otro proveedor compatible con Vercel.
2.  Importe el proyecto en [Vercel](https://vercel.com/).
3.  En la configuración del proyecto en Vercel, agregue las variables de entorno de su `.env.local`.
4.  Realice el despliegue.

## Documentación Integrada

La aplicación cuenta con una función especial para ver la documentación de los métodos PL/SQL y cómo invocarlos desde un bloque anónimo de Oracle. Presione las teclas `Ctrl + Alt + D` en cualquier pantalla del Dashboard para ver la documentación correspondiente al módulo activo.

## Estructura Principal

- **/src/app/api:** Rutas API de Next.js.
- **/src/app/dashboard:** Layouts y pantallas principales.
- **/src/components:** Componentes reutilizables UI (Shadcn-like).
- **/src/lib:** Utilidades y conexión a Oracle (`oracle.ts`, `session.ts`).
