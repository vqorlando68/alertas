CREATE TABLE TKR_PROGRAMACION_ALERTAS
(
    ID                 NUMBER,
    ID_ALERTA          NUMBER NOT NULL,
    NOMBRE_JOB         VARCHAR2 (100) UNIQUE NOT NULL,
    TIPO_FRECUENCIA    VARCHAR2 (20) DEFAULT 'Diario', -- 'Diario', 'Semanal', 'Mensual'
    HORA_EJECUCION     VARCHAR2 (20),
    REPETIR_CADA       NUMBER DEFAULT 1,
    DIAS_OPERACION     VARCHAR2 (50),
    FECHA_INICIO       DATE
                          DEFAULT CAST (
                                      SYSTIMESTAMP
                                          AT TIME ZONE 'America/Bogota'
                                          AS DATE),
    FECHA_FIN          DATE,
    ESTADO             VARCHAR2 (10) DEFAULT 'ACTIVO',
    FECHA_CREACION     DATE
                          DEFAULT CAST (
                                      SYSTIMESTAMP
                                          AT TIME ZONE 'America/Bogota'
                                          AS DATE)
);

-- Secuencia para agilizar insercion principal

CREATE SEQUENCE TKR_PROGRAMACION_ALERTAS_SEQ START WITH 1 INCREMENT BY 1;



CREATE UNIQUE INDEX TKR_PROGRAMACION_ALERTAS_PK
    ON TKR_PROGRAMACION_ALERTAS (ID);

ALTER TABLE TKR_PROGRAMACION_ALERTAS
    ADD (
        PRIMARY KEY
            (ID)
            USING INDEX TKR_PROGRAMACION_ALERTAS_PK ENABLE VALIDATE);

CREATE OR REPLACE TRIGGER TRG_BI_TKR_PROGRAMACION_ALERTAS
    BEFORE INSERT
    ON TKR_PROGRAMACION_ALERTAS
    FOR EACH ROW
    WHEN (new.id IS NULL)
BEGIN
    :new.id := TKR_PROGRAMACION_ALERTAS_SEQ.NEXTVAL;
END;