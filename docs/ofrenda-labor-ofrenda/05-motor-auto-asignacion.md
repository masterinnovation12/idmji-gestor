# 05 — Motor de auto-asignación del plano

## Objetivo

Generar automáticamente `ofrenda_plano_asignaciones` para uno o más servicios del mes, rellenando ofrendario + apoyo en cada bloque del lienzo, con **máxima rotación** y restricciones de género/pareja/capacidad/turno.

## Entrada

| Parámetro | Valores |
|-----------|---------|
| Alcance | `semana` (3 servicios: jueves + dom AM + dom PM) \| `mes` (todos los servicios del plan) |
| Plan | `plan_id` o `(anio, mes)` |
| Modo | `generar` (vacío) \| `regenerar` (sobrescribir) \| `rellenar` (solo huecos) |

## Salida

Registros en `ofrenda_plano_asignaciones`:

```
servicio_id × bloque (1..N) × rol ('ofrendario' | 'apoyo') → persona_id + nombre_snapshot
```

Donde `N = sacosParaDia(plan, servicio.dia_tipo)` → 4 u 8.

## Pool elegible por servicio

Para cada `servicio` con `dia_tipo`:

```typescript
elegibles = personas
  .filter(p => p.activo)
  .filter(p => puedeEnTurno(p, servicio.dia_tipo))
  .filter(p => !yaAsignadoEnEsteServicio(p)) // si aplica regla 1 persona = 1 rol
```

**Pregunta abierta:** ¿una persona puede aparecer **dos veces** en el mismo servicio (ofrendario en bloque 1 y apoyo en bloque 3)? Por defecto asumimos **no**.

## Algoritmo por bloque

Para cada `bloque` de 1 a N:

1. Elegir pareja ofrendario + apoyo.
2. Intentar primero **parejas matrimoniales** donde ambos estén en el pool y al menos uno tenga capacidad para su rol.
3. Si no hay pareja disponible, elegir **mismo género**: hombre+hombre o mujer+mujer.
4. Rotar: priorizar quien **menos veces** apareció en el alcance (mes/semana) y evitar repetir la misma dupla del servicio anterior del mismo turno.

### Reglas de género (confirmadas por usuario)

| Composición bloque | Permitido |
|--------------------|-----------|
| Hombre ofrendario + Hombre apoyo | ✅ |
| Mujer ofrendario + Mujer apoyo | ✅ |
| Mujer + Hombre | ✅ **solo si** `ofrenda_plano_parejas` los vincula |
| Mujer + Hombre sin pareja | ❌ |

### Reglas de capacidad

| Rol | Capacidad requerida |
|-----|---------------------|
| `ofrendario` | `ofrendario` o `ambos` |
| `apoyo` | `apoyo` o `ambos` |

Si `capacidad = apoyo` solo → nunca ofrendario.

### Prioridad de parejas matrimoniales

Cuando ambos cónyuges están en el pool del turno:

- Preferir asignarlos en el **mismo bloque** (uno ofrendario, otro apoyo).
- Si solo cabe uno, el otro queda para otro bloque con regla de mismo género.

## Rotación

Inspiración: `ofrendaEngine.ts`

| Mecanismo | Aplicación plano |
|-----------|------------------|
| Puntero cíclico por pool | Índice por turno (jueves / dom AM / dom PM) |
| Anti-repetición consecutiva | No repetir la misma persona en dos servicios seguidos del mismo turno |
| Contador de uso | Tabla auxiliar o cálculo en memoria por alcance |
| Mezcla «al azar» | Barajar dentro del mismo tier de prioridad (equidad) |

**Opcional futuro:** persistir puntero en `ofrenda_planes` (como `secuencia_puntero`) para continuidad entre meses.

## Validación pre-generación

Antes de ejecutar, comprobar (como `validarDisponibilidadParaGenerar`):

| Check | Error si falla |
|-------|----------------|
| Hay plan del mes | «No hay plan» |
| Pool turno jueves ≥ 2 × sacos_jueves | «Faltan personas jueves» |
| Pool dom AM ≥ 2 × sacos_domingo | idem |
| Pool dom PM ≥ 2 × sacos_domingo_tarde | idem |
| Género definido en todos los elegibles | «Falta género en X» |
| Bloques con solo «solo apoyo» sin ofrendarios | «Capacidad insuficiente» |

## API propuesta

```typescript
// planoActions.ts
export async function generarPlanoAsignaciones(opts: {
  anio: number
  mes: number
  alcance: 'semana' | 'mes'
  semanaIso?: number      // requerido si alcance === 'semana'
  modo: 'generar' | 'regenerar' | 'rellenar'
}): Promise<{ ok: true; asignados: number } | { ok: false; error: string }>
```

Motor puro testeable:

```typescript
// src/lib/utils/planoEngine.ts
export function asignarPlanoServicio(
  servicio: PlanoServicioInput,
  personas: PlanoPersonaEngine[],
  parejas: PlanoParejaEngine[],
  historial: PlanoHistorial,
  sacos: number,
): PlanoAsignacionBorrador[]
```

## UI — pestaña «Generar plano»

Controles:

- Radio: Semana actual / Mes completo
- Si semana: selector de semana (reutilizar `exportWeekUtils.ts`)
- Botón: Generar / Regenerar / Rellenar huecos
- Resumen: «12 servicios · 96 asignaciones»
- Enlace: «Ver en Plano»

## Tests mínimos

| Caso | Esperado |
|------|----------|
| Pareja en pool, bloque libre | Mismo bloque M+H |
| Dos hombres sin pareja | Bloque H+H |
| M+H sin pareja en pool | No se asignan juntos |
| Solo apoyo en pool | Solo rol apoyo |
| 4 sacos jueves | 8 asignaciones |
| Rotación 2 semanas | Distribución equitativa |

## Relación con regenerar labores generales

Hoy `generarORegenerarPlan` **rescata** asignaciones del plano. Con motor propio:

- **Recomendación:** botones independientes; regenerar labores **no toca** el plano salvo que el usuario lo confirme.
