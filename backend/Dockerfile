# Imagen del backend. Debe funcionar en ARM64 (Oracle Ampere) y en AMD64 (tu maquina).
# eclipse-temurin publica ambas arquitecturas, asi que la misma receta sirve en los dos sitios.

FROM maven:3.9-eclipse-temurin-21 AS construccion
WORKDIR /obra
# Primero solo el pom: asi la capa de dependencias se reutiliza si el codigo cambia.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre AS ejecucion
WORKDIR /app
# Usuario sin privilegios: el proceso nunca corre como root.
RUN useradd --system --uid 10001 aurum
COPY --from=construccion /obra/target/aurumcore-backend-*.jar app.jar
USER aurum
EXPOSE 8081
# Limites de memoria pensados para una maquina pequena compartida con otros proyectos.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD ["sh","-c","wget -qO- http://127.0.0.1:8081/api/salud >/dev/null || exit 1"]
ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar app.jar"]
