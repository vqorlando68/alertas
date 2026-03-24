import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import oracledb from "oracledb";

export async function DELETE(request: NextRequest) {
  let connection;
  try {
    const searchParams = request.nextUrl.searchParams;
    const idList = searchParams.get("ids");
    if (!idList) return NextResponse.json({ error: "Faltan IDs" }, { status: 400 });

    const ids = idList.split(',').map(Number);
    connection = await getOracleConnection();
    
    for (const id of ids) {
        if (!isNaN(id)) {
            await connection.execute(
                `BEGIN pkgln_alertas.p_del_programacion(:id); END;`,
                { id: { val: id, type: oracledb.NUMBER, dir: oracledb.BIND_IN } },
                { autoCommit: true }
            );
        }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Error borrando jobs", details: error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch(e) {}
    }
  }
}

export async function GET(request: NextRequest) {
  let connection;
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_alerta = searchParams.get("id_alerta");
    
    connection = await getOracleConnection();
    
    let query = `SELECT ID, ID_ALERTA, NOMBRE_JOB, TIPO_FRECUENCIA, HORA_EJECUCION, REPETIR_CADA, DIAS_OPERACION, FECHA_INICIO, FECHA_FIN, ESTADO, CODIGO_SCHEDULER, FECHA_CREACION FROM TKR_PROGRAMACION_ALERTAS`;
    let params: any = {};
    
    if (id_alerta) {
        query += ` WHERE ID_ALERTA = :id_alerta`;
        params.id_alerta = Number(id_alerta);
    }
    
    query += ` ORDER BY FECHA_CREACION DESC`;
    
    const result = await connection.execute(query, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    
    return NextResponse.json({ jobs: result.rows || [] });
  } catch (error: any) {
    return NextResponse.json({ error: "Error obteniendo jobs", details: error.message }, { status: 500 });
  } finally {
    if (connection) {
      try { await connection.close(); } catch(e) {}
    }
  }
}

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { 
      id_alerta, tipo_frecuencia, hora_ejecucion, 
      repetir_cada, dias_operacion, fecha_inicio, fecha_fin 
    } = body;

    // Aquí irían las validaciones correspondientes

    connection = await getOracleConnection();

    const binds: any = {
      p_id_alerta: { val: Number(id_alerta), type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      p_tipo_frecuencia: { val: tipo_frecuencia, type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_hora_ejecucion: { val: hora_ejecucion, type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_repetir_cada: { val: Number(repetir_cada), type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      p_dias_operacion: { val: dias_operacion, type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_fecha_inicio: { val: new Date(fecha_inicio), type: oracledb.DATE, dir: oracledb.BIND_IN },
      p_fecha_fin: { val: fecha_fin ? new Date(fecha_fin) : null, type: oracledb.DATE, dir: oracledb.BIND_IN }
    };

    await connection.execute(
      `BEGIN
         pkgln_alertas.p_save_programacion(
           p_id_alerta       => :p_id_alerta,
           p_tipo_frecuencia => :p_tipo_frecuencia,
           p_hora_ejecucion  => :p_hora_ejecucion,
           p_repetir_cada    => :p_repetir_cada,
           p_dias_operacion  => :p_dias_operacion,
           p_fecha_inicio    => :p_fecha_inicio,
           p_fecha_fin       => :p_fecha_fin
         );
       END;`,
      binds,
      { autoCommit: true }
    );

    // Simulación temporal mientras se configuran las dependencias del procedure en BD
    console.log("Mock Oracle Schedule saving:", body);

    return NextResponse.json({ success: true, message: "Programación creada con éxito" });
  } catch (error: any) {
    console.error("Error POST /api/schedule:", error);
    return NextResponse.json({ error: "Error creando programación", details: error.message }, { status: 500 });
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
