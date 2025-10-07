# DevSecOps Pipeline Project

Proyecto demostrativo de un pipeline CI/CD con seguridad integrada (DevSecOps) utilizando Node.js, Docker y GitHub Actions.

Este repositorio implementa un flujo completo de integración continua con análisis estático, dinámico y de dependencias, para asegurar la aplicación en todas las fases del ciclo de vida (SDLC).

---

## 1. Objetivo

El propósito de este proyecto es demostrar cómo integrar controles de seguridad automatizados dentro de un pipeline CI/CD moderno.

Fases cubiertas:
- Build y pruebas automáticas
- Análisis estático de código fuente (SAST)
- Escaneo de dependencias (SCA)
- Escaneo de imágenes Docker
- Análisis dinámico de seguridad (DAST)
- Despliegue y validación automatizada

---

## 2. Estructura del Proyecto

```bash
devsecops-pipeline/
│
├── .github/
│   └── workflows/
│       └── ci.yml             # Pipeline CI/CD con SAST, SCA, DAST y Docker
│
├── .zap/
│   └── rules.tsv              # Reglas personalizadas para OWASP ZAP
│
├── app/
│   ├── src/
│   │   └── app.js             # Aplicación principal en Express.js
│   ├── test/
│   │   └── app.test.js        # Test automatizado del endpoint /healthz
│   ├── Dockerfile             # Construcción de imagen Docker
│   ├── .dockerignore
│   ├── package.json
│   └── package-lock.json
│
├── .semgrep.yml               # Configuración de reglas SAST (OWASP + custom)
├── .gitignore
└── README.md
```
## 3. Diagrama General del Flujo CI/CD
```text
                   +----------------------------+
                   |        Developer           |
                   |  Commit / Push a GitHub    |
                   +-------------+--------------+
                                 |
                                 v
                     +-----------+------------+
                     |     GitHub Actions     |
                     |  CI/CD Pipeline Start  |
                     +-----------+------------+
                                 |
               +----------------+----------------+
               |                                     |
               v                                     v
       [Build & Test]                        [SAST - Semgrep]
     Ejecuta unit tests                 Analiza el código fuente
     y valida /healthz                  (OWASP Top 10 + reglas locales)
               |                                     |
               v                                     v
        [Dependency Scan - Trivy FS]          [Docker Build & Scan]
       Escanea vulnerabilidades               Escaneo de imagen
       en dependencias npm                    Docker con Trivy
               \                                     /
                \                                   /
                 +-------------+-------------------+
                               |
                               v
                    [DAST - OWASP ZAP Baseline]
                  Escaneo dinámico en contenedor
                  contra endpoints HTTP activos
                               |
                               v
                     [Reportes de Seguridad]
                 zap-report.html / trivy-report.txt
                 semgrep-results.json (SAST)

```


## 4. Aplicación base (Node.js + Express)

```js
const express = require("express");
const app = express();

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Hello from DevSecOps secure pipeline" });
});

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}`));
``` 
## Endpoints implementados 

| Método | Ruta       | Descripción                                   |
| ------ | ---------- | --------------------------------------------- |
| GET    | `/`        | Respuesta principal con mensaje de bienvenida |
| GET    | `/healthz` | Health check para monitoreo y CI/CD           |

## 5. Prueba Unitaria 
Archivo: app/test/app.test.js

```js 
const http = require("http");

function request(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "localhost", port: 3000, path }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

(async () => {
  try {
    const res = await request("/healthz");
    if (res.status !== 200) {
      console.error("Health check failed", res);
      process.exit(1);
    }
    console.log("Unit test passed");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
```
Este test envía una petición HTTP al endpoint /healthz.
Si el servidor responde con 200 OK, la prueba pasa; de lo contrario, falla el pipeline.

## 6. Dockerización
Archivo: app/Dockerfile

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/app.js"]
```
**Construcción y ejecución local:**

```bash 
docker build -t devsecops-demo-app:local ./app
docker run --rm -p 3000:3000 devsecops-demo-app:local
```

## 7. Pipeline CI/CD (GitHub Actions)
Archivo: .github/workflows/ci.yml

**Etapas principales**

- Build & Test

  - Instala dependencias y ejecuta pruebas unitarias.

  - Valida que la aplicación responda correctamente antes de escanearla.

- SAST (Semgrep)

  - Analiza el código fuente con las reglas OWASP Top 10.

  - Detecta vulnerabilidades como uso de eval(), inyecciones o malas prácticas.

- Dependency Scanning (Trivy FS)

  - Escanea vulnerabilidades en dependencias del proyecto (npm).

- Docker Image Build & Scan

  - Construye la imagen de la aplicación.

  - Ejecuta Trivy para detectar vulnerabilidades en la imagen Docker.

- DAST (OWASP ZAP Baseline)

  - Levanta la aplicación en un contenedor temporal.

  - Ejecuta un escaneo dinámico con OWASP ZAP para detectar fallas en ejecución (XSS, etc.).

  - Los reportes se guardan como artefactos (zap-report.html, zap-report.xml).

## 8. Ejemplo de vulnerabilidad detectada (SAST)
Durante las pruebas, se agregó intencionalmente un endpoint inseguro con eval():

```js 
app.get("/vuln-eval", (req, res) => {
  const code = req.query.code || "1+1";
  const result = eval(code);
  res.json({ result });
});
```

Semgrep lo detectó como una vulnerabilidad crítica:

*avoid-eval: Detected use of eval(), which can lead to Remote Code Execution.*

Esto demuestra la efectividad del análisis estático dentro del pipeline.

## 9. Reportes de seguridad

Los resultados de los análisis se almacenan automáticamente en GitHub Actions como artefactos:

- trivy-report.txt (dependencias e imagen Docker)

- zap-report.html (análisis DAST)

- semgrep-results.json (análisis SAST)

Cada ejecución del pipeline genera nuevos reportes, accesibles en la pestaña “Actions”.

## 10. Resultados del Pipeline

- Build, test y análisis automatizados en cada push o pull request.

- Fallo automático del pipeline si se detectan vulnerabilidades críticas.

- Evidencia de seguridad integrada desde el código hasta la imagen en contenedor.

## 11. Lecciones Aprendidas 

* La integración temprana de seguridad (Shift-Left) permite detectar vulnerabilidades antes del despliegue.

* Las herramientas SAST y SCA se complementan: una analiza código, la otra dependencias.

* Docker y Trivy permiten evaluar la seguridad del entorno de ejecución, no solo del código.

* OWASP ZAP es útil para evaluar vulnerabilidades reales en ejecución (DAST).

* GitHub Actions facilita centralizar todo el flujo DevSecOps de manera declarativa y reproducible.

* Automatizar la seguridad mejora la trazabilidad y reduce riesgos humanos.

## 12. Ejecución local

 ```bash 
# Entrar al proyecto
cd app

# Instalar dependencias
npm install

# Ejecutar la aplicación
npm start

# Probar el endpoint de salud
curl http://localhost:3000/healthz

# Ejecutar test unitario
npm test
 ```

 ## 13. Ejecución en Docker
 La aplicación puede ejecutarse de manera aislada en un contenedor Docker, tal como lo hace el pipeline en GitHub Actions.

 **Construcción de la imagen**
 ```bash
docker build -t devsecops-demo-app:local ./app
```
**Ejecución del contenedor**
```bash
docker run --rm -p 3000:3000 devsecops-demo-app:local
```

Esto expondrá la aplicación en http://localhost:3000.

**Verificación del servicio**
```bash
curl http://localhost:3000/healthz
```

**Salida esperada:**
ok

**Este paso permite validar que:**

- El Dockerfile está correctamente definido.

- Las dependencias se instalan sin errores.

- La aplicación es portátil y ejecutable sin entorno local Node.js.

- Los mismos comandos que usa el pipeline funcionan de manera idéntica en local.