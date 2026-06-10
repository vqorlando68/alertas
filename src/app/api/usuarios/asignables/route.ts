import { NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import oracledb from "oracledb";

export async function GET() {
  let connection;
  try {
    connection = await getOracleConnection();

    const result = await connection.execute(
      `SELECT u.id, u.nombres || ' ' || u.apellidos nombre_completo
         FROM tkr_usuarios u
        WHERE EXISTS (
                SELECT 1
                  FROM tkr_roles_usuario ru
                 WHERE u.id = ru.id_usuario AND ru.id_rol = 13
              )
        ORDER BY 2`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const usuarios = (result.rows as any[]).map((r) => ({
      id: r.ID,
      nombre_completo: r.NOMBRE_COMPLETO,
    }));

    return NextResponse.json({ usuarios });
  } catch (error: any) {
    console.error("Error GET /api/usuarios/asignables:", error);
    return NextResponse.json(
      { error: "Error obteniendo usuarios asignables", details: error.message },
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
