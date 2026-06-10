import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import oracledb from "oracledb";
import { getSession } from "@/lib/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let connection;
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { comentarios_solucion, estado, id_persona_asignada } = body;

    // Validar: si estado = 'A', id_persona_asignada es obligatorio
    if (estado === "A" && !id_persona_asignada) {
      return NextResponse.json(
        { error: "Debe seleccionar un usuario asignado cuando el estado es 'Asignado'" },
        { status: 400 }
      );
    }

    connection = await getOracleConnection();

    const binds: any = {
      p_id_log: { val: Number(id), type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      p_estado: { val: estado || "P", type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_id_persona_asignada: {
        val: id_persona_asignada ? Number(id_persona_asignada) : null,
        type: oracledb.NUMBER,
        dir: oracledb.BIND_IN,
      },
      p_solucionado: { val: session.username, type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_comentarios_solucion: {
        val: comentarios_solucion || null,
        type: oracledb.STRING,
        dir: oracledb.BIND_IN,
      },
    };

    await connection.execute(
      `BEGIN
         pkgln_alertas.p_save_log_solucion(
           p_id_log              => :p_id_log,
           p_estado              => :p_estado,
           p_id_persona_asignada => :p_id_persona_asignada,
           p_solucionado         => :p_solucionado,
           p_comentarios_solucion => :p_comentarios_solucion
         );
       END;`,
      binds,
      { autoCommit: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error PUT /api/logs/[id]:", error);
    return NextResponse.json(
      { error: "Error actualizando log", details: error.message },
      { status: 500 }
    );
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
