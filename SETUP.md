# Guía de Configuración - Neko DApp

Esta guía te ayudará a configurar el proyecto Neko DApp en una nueva máquina.

## Requisitos Previos

### 1. Node.js y npm

- **Node.js**: Versión 18 o superior
- **npm**: Versión 9 o superior (viene incluido con Node.js)

Verificar instalación:

```bash
node --version
npm --version
```

Si no están instalados, descarga Node.js desde: https://nodejs.org/

### 2. Rust y Cargo (para contratos Soroban)

- **Rust**: Versión 1.70 o superior
- **Cargo**: Viene incluido con Rust

Verificar instalación:

```bash
rustc --version
cargo --version
```

Si no están instalados, instala Rust:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 3. Soroban CLI

Necesario para generar los bindings de los contratos.

**Instalación en Linux/macOS:**

```bash
curl -L https://github.com/stellar/soroban-tools/releases/download/v22.8.0/soroban-22.8.0-x86_64-unknown-linux-gnu.tar.gz | tar -xz
sudo mv soroban /usr/local/bin/
```

**Instalación en macOS (Apple Silicon):**

```bash
curl -L https://github.com/stellar/soroban-tools/releases/download/v22.8.0/soroban-22.8.0-aarch64-apple-darwin.tar.gz | tar -xz
sudo mv soroban /usr/local/bin/
```

**Instalación con Cargo (alternativa):**

```bash
cargo install --locked soroban-cli
```

Verificar instalación:

```bash
soroban --version
```

### 4. Git

Necesario para clonar el repositorio.

Verificar instalación:

```bash
git --version
```

## Pasos de Instalación

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/Neko-Protocol/Neko-DApp.git
cd Neko-DApp
```

### Paso 2: Instalar Dependencias de npm

```bash
npm install
```

Este comando instalará todas las dependencias del proyecto, incluyendo los workspaces (paquetes de contratos).

### Paso 3: Generar Bindings de Contratos

El proyecto genera automáticamente los bindings del contrato oracle. Si necesitas generarlos manualmente:

```bash
npm run generate:oracle-binding
```

### Paso 4: Construir los Paquetes de Contratos

```bash
npm run build --workspace=packages/oracle
```

O construir todos los paquetes:

```bash
npm run install:contracts
```

### Paso 5: Verificar que Todo Funciona

```bash
npm run build
```

Este comando debería:

1. Generar el binding del oracle
2. Construir el paquete oracle
3. Compilar TypeScript
4. Construir la aplicación con Vite

Si todo funciona correctamente, verás un mensaje de éxito y se creará la carpeta `dist/` con los archivos compilados.

## Desarrollo

### Iniciar el Servidor de Desarrollo

```bash
npm start
```

O alternativamente:

```bash
npm run dev
```

Esto iniciará:

- El servidor de desarrollo de Vite (frontend)
- El watcher de Stellar scaffold (para contratos)

El frontend estará disponible en: `http://localhost:5173`

### Comandos Útiles

```bash
# Linting
npm run lint

# Formatear código
npm run format

# Construir para producción
npm run build

# Vista previa de la build de producción
npm run preview
```

## Solución de Problemas

### Error: "soroban: command not found"

- Asegúrate de que Soroban CLI esté instalado y en tu PATH
- Verifica con: `soroban --version`
- Si está instalado pero no se encuentra, agrega `/usr/local/bin` a tu PATH

### Error: "Cannot find module 'oracle'"

- Ejecuta: `npm run generate:oracle-binding`
- Luego: `npm run build --workspace=packages/oracle`

### Error: "Cannot find module '../../../../contracts/oracle'"

- Verifica que el archivo `src/contracts/oracle.ts` exista
- Si no existe, créalo o verifica la estructura del proyecto

### Error de permisos en Linux/macOS

Si tienes problemas con permisos al mover `soroban`:

```bash
sudo chmod +x soroban
sudo mv soroban /usr/local/bin/
```

### Problemas con Workspaces de npm

Si hay problemas con los workspaces:

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules packages/*/node_modules
npm install
```

## Estructura del Proyecto

```
neko-dapp/
├── contracts/              # Contratos Soroban (Rust)
├── packages/               # Paquetes generados (TypeScript)
│   └── oracle/             # Binding del contrato oracle
├── src/                    # Código fuente del frontend
│   ├── components/         # Componentes React
│   ├── contracts/          # Helpers de contratos
│   └── ...
├── dist/                   # Build de producción (generado)
└── package.json            # Configuración del proyecto
```

## Notas Adicionales

- El contrato oracle se obtiene directamente desde la red de testnet, no necesita estar en `contracts/`
- Los bindings se generan automáticamente durante el build
- El proyecto usa npm workspaces para manejar los paquetes de contratos
- Asegúrate de tener una conexión a internet para descargar las dependencias y generar los bindings

## Soporte

Si encuentras problemas, verifica:

1. Que todas las herramientas estén instaladas correctamente
2. Que las versiones sean compatibles
3. Los logs de error para más detalles
4. La documentación de Stellar Soroban: https://soroban.stellar.org/docs
