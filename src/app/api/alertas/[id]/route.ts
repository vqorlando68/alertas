import { NextRequest, NextResponse } from "next/server";
import { getOracleConnection } from "@/lib/oracle";
import oracledb from "oracledb";
import { getSession } from "@/lib/session";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let connection;
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
      p_id: Number(id),
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
         
         -- Toggle Jobs status based on Alerta status
         pkgln_alertas.p_toggle_jobs_alerta(
           p_id_alerta => :p_id,
           p_estado    => :p_estado
         );
       END;`,
      {
        ...binds,
        p_estado: estado || 'A'
      },
      { autoCommit: true }
    );

    return NextResponse.json({ success: true, id: (result.outBinds as any)?.p_new_id });

  } catch (error: any) {
    console.error(`Error PUT /api/alertas/[id]:`, error);
    return NextResponse.json({ error: "Error actualizando alerta", details: error.message }, { status: 500 });
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let connection;
  try {
    const session = await getSession();
    if (!session || !session.username) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    connection = await getOracleConnection();

    await connection.execute(
      `BEGIN
         pkgln_alertas.p_del_alerta(
           p_id      => :p_id,
           p_usuario => :p_usuario
         );
       END;`,
      {
        p_id: Number(id),
        p_usuario: session.username
      },
      { autoCommit: true }
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`Error DELETE /api/alertas/[id]:`, error);
    return NextResponse.json({ error: "Error eliminando alerta", details: error.message }, { status: 500 });
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
