import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import { createSession } from "@/lib/session";
import oracledb from "oracledb";

export async function POST(request: NextRequest) {
  let connection;
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos." },
        { status: 400 }
      );
    }

    connection = await getOracleConnection();

    const result = await connection.execute(
      `BEGIN
         :ret := pkgln_seguridad.f_validar_clave(:p_username, :p_password, 1);
       END;`,
      {
        p_username: username,
        p_password: password,
        ret: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    const out = result.outBinds as any;
    console.log("Oracle F_VALIDAR_CLAVE outBinds:", out);
    
    // Check if the ret value is 1 (number) or "1" (string)
    const isValid = out?.ret === 1 || out?.ret === "1";
    console.log("isValid computed:", isValid);
    if (isValid) {
      await createSession(username);
      return NextResponse.json({ success: true, username });
    } else {
      return NextResponse.json(
        { error: "Credenciales inválidas." },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error al processar el login.", details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}
