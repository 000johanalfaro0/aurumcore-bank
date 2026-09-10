package com.aurumcore.app;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Comprobacion de arranque: confirma rol de ejecucion, esquema y migracion aplicada. */
@RestController
public class SaludControlador {

  private final JdbcTemplate jdbc;

  public SaludControlador(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @GetMapping("/api/salud")
  public Map<String, Object> salud() {
    return Map.of(
        "estado", "ok",
        "rol", jdbc.queryForObject("select current_user", String.class),
        "esquema", jdbc.queryForObject("select current_schema()", String.class),
        "migracionMaxima",
            jdbc.queryForObject(
                "select max(version) from aurumcore.flyway_schema_history", String.class));
  }
}
