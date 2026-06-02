import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let connection;
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const alertId = Number(id);

    if (isNaN(alertId)) {
      return NextResponse.json({ error: "ID de alerta inválido" }, { status: 400 });
    }

    connection = await getOracleConnection();

    await connection.execute(
      `BEGIN
         pkgln_alertas.p_procesar_proceso(
           p_id_alerta => :p_id_alerta
         );
       END;`,
      {
        p_id_alerta: alertId
      },
      { autoCommit: true }
    );

    return NextResponse.json({ success: true, message: "Alerta ejecutada correctamente y log generado." });

  } catch (error: any) {
    console.error(`Error en POST /api/alertas/[id]/ejecutar:`, error);
    return NextResponse.json({ error: "Error ejecutando alerta", details: error.message }, { status: 500 });
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
