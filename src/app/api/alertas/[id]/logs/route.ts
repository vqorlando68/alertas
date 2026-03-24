import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import oracledb from "oracledb";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let connection;
  try {
    const { id } = await params;

    connection = await getOracleConnection();

    const binds: any = {
      p_id_alerta: Number(id),
      p_resultado: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    };

    const result = await connection.execute(
      `BEGIN
         pkgln_alertas.p_get_logs_alerta(
           p_id_alerta => :p_id_alerta,
           p_resultado => :p_resultado
         );
       END;`,
      binds
    );

    const resultSet = (result.outBinds as any)?.p_resultado;
    if (!resultSet) {
      return NextResponse.json({ logs: [] });
    }

    const rows = await resultSet.getRows();
    await resultSet.close();

    return NextResponse.json({ logs: rows });

  } catch (error: any) {
    console.error(`Error GET /api/alertas/[id]/logs:`, error);
    return NextResponse.json({ error: "Error obteniendo logs", details: error.message }, { status: 500 });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This route is for "Update log/incident resolution" as per requirements
  let connection;
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await params; // Wait for params even if we might not strictly need it directly for saving a log if we pass id_log in body
    const body = await request.json();
    const { id_log, comentarios_solucion } = body;

    if (!id_log) {
      return NextResponse.json({ error: "ID de log es requerido" }, { status: 400 });
    }

    connection = await getOracleConnection();

    const binds: any = {
      p_id_log: Number(id_log),
      p_solucionado: session.username,
      p_comentarios_solucion: comentarios_solucion
    };

    await connection.execute(
      `BEGIN
         pkgln_alertas.p_save_log_solucion(
           p_id_log               => :p_id_log,
           p_solucionado          => :p_solucionado,
           p_comentarios_solucion => :p_comentarios_solucion
         );
       END;`,
      binds,
      { autoCommit: true }
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`Error POST /api/alertas/[id]/logs:`, error);
    return NextResponse.json({ error: "Error guardando solución de log", details: error.message }, { status: 500 });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
}
