import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import oracledb from "oracledb";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  let connection;
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const estado = searchParams.get("estado");

    connection = await getOracleConnection();

    const binds: any = {
      p_id: { val: id ? Number(id) : null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      p_estado: { val: estado || null, type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_resultado: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    };

    // DEBUG ROW VISIBILITY
    const dbCountResult = await connection.execute('SELECT COUNT(*) AS total FROM TEKER_DEV.TKR_ALERTAS');
    console.log("==> DB RAW COUNT FROM NODE: ", dbCountResult.rows);

    const result = await connection.execute(
      `BEGIN
         TEKER_DEV.pkgln_alertas.p_get_alertas(
           p_id => :p_id,
           p_estado => :p_estado,
           p_resultado => :p_resultado
         );
       END;`,
      binds
    );

    const resultSet = (result.outBinds as any)?.p_resultado;
    if (!resultSet) {
      return NextResponse.json({ alertas: [] });
    }

    let allRows: any[] = [];
    let row;
    try {
      while ((row = await resultSet.getRow())) {
        allRows.push(row);
      }
    } catch (fetchErr) {
      console.error("SILENT FETCH ERROR CAUGHT ON ROW", allRows.length + 1, fetchErr);
    }
    
    await resultSet.close();

    console.log(`Fetched ${allRows.length} rows from Oracle for /api/alertas`);
    return NextResponse.json({ alertas: allRows });

  } catch (error: any) {
    console.error("Error GET /api/alertas:", error);
    return NextResponse.json({ error: "Error obteniendo alertas", details: error.message }, { status: 500 });
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

export async function POST(request: NextRequest) {
  let connection;
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      descripcion_alerta,
      tipo_proceso,
      proceso,
      frecuencia,
      estado,
      pasos_a_seguir,
      correo,
      telefono,
      prioridad
    } = body;

    connection = await getOracleConnection();

    const binds: any = {
      p_id: null,
      p_descripcion_alerta: descripcion_alerta,
      p_tipo_proceso: tipo_proceso,
      p_proceso: proceso,
      p_frecuencia: frecuencia,
      p_estado: estado || 'A',
      p_pasos_a_seguir: pasos_a_seguir,
      p_correo: correo,
      p_telefono: telefono,
      p_prioridad: prioridad,
      p_usuario: session.username,
      p_new_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    const result = await connection.execute(
      `BEGIN
         pkgln_alertas.p_save_alerta(
           p_id                 => :p_id,
           p_descripcion_alerta => :p_descripcion_alerta,
           p_tipo_proceso       => :p_tipo_proceso,
           p_proceso            => :p_proceso,
           p_frecuencia         => :p_frecuencia,
           p_estado             => :p_estado,
           p_pasos_a_seguir     => :p_pasos_a_seguir,
           p_correo             => :p_correo,
           p_telefono           => :p_telefono,
           p_prioridad          => :p_prioridad,
           p_usuario            => :p_usuario,
           p_new_id             => :p_new_id
         );
       END;`,
      binds,
      { autoCommit: true } // p_save_alerta also has COMMIT, but keeping it safe
    );

    const newId = (result.outBinds as any)?.p_new_id;

    return NextResponse.json({ success: true, id: newId });

  } catch (error: any) {
    console.error("Error POST /api/alertas:", error);
    return NextResponse.json({ error: "Error guardando alerta", details: error.message }, { status: 500 });
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
