package com.aurumcore.app;

import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fija la entidad activa dentro de la transaccion en curso.
 *
 * Las politicas de fila de PostgreSQL leen aurumcore.entidad_id. Se usa SET LOCAL,
 * asi el valor muere al terminar la transaccion y nunca se filtra a otra peticion
 * que reutilice la misma conexion del pool.
 *
 * Si nadie fija la entidad, entidad_activa() devuelve null y no se ve ninguna fila.
 * El fallo es cerrado, nunca abierto.
 */
@Component
public class ContextoEntidad {

  private final JdbcTemplate jdbc;

  public ContextoEntidad(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Transactional
  public <T> T comoEntidad(UUID entidadId, Supplier<T> trabajo) {
    jdbc.update("select set_config('aurumcore.entidad_id', ?, true)", entidadId.toString());
    return trabajo.get();
  }
}
