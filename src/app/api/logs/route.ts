import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import oracledb from "oracledb";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  let connection;
  try {
    const searchParams = request.nextUrl.searchParams;
    const idAlerta = searchParams.get("id_alerta");
    const estado = searchParams.get("estado");
    const fechaIni = searchParams.get("fecha_ini");
    const fechaFin = searchParams.get("fecha_fin");

    connection = await getOracleConnection();

    const binds: any = {
      p_id_alerta: { val: idAlerta ? Number(idAlerta) : null, type: oracledb.NUMBER, dir: oracledb.BIND_IN },
      p_estado: { val: estado === 'Todas' ? null : (estado || null), type: oracledb.STRING, dir: oracledb.BIND_IN },
      p_fecha_ini: { val: fechaIni ? new Date(fechaIni) : null, type: oracledb.DATE, dir: oracledb.BIND_IN },
      p_fecha_fin: { val: fechaFin ? new Date(fechaFin) : null, type: oracledb.DATE, dir: oracledb.BIND_IN },
      p_resultado: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT }
    };

    const result = await connection.execute(
      `BEGIN
         pkgln_alertas.p_get_all_logs(
           p_id_alerta => :p_id_alerta,
           p_estado    => :p_estado,
           p_fecha_ini => :p_fecha_ini,
           p_fecha_fin => :p_fecha_fin,
           p_resultado => :p_resultado
         );
       END;`,
      binds
    );

    const resultSet = (result.outBinds as any)?.p_resultado;
    if (!resultSet) {
      return NextResponse.json({ logs: [] });
    }

    let allRows: any[] = [];
    let rows;
    try {
      while ((rows = await resultSet.getRows(100)) && rows.length > 0) {
        allRows.push(...rows);
      }
    } catch (fetchErr) {
      console.error("Error fetching rows from cursor:", fetchErr);
    }
    
    await resultSet.close();

    return NextResponse.json({ logs: allRows });

  } catch (error: any) {
    console.error("Error GET /api/logs:", error);
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
