# Lógica del parser CSV adaptativo

Reglas que debe seguir el backend al parsear el CSV de cada Google Sheet para que la aplicación se adapte a cambios en Drive sin errores y sin mostrar contenido vacío.

---

## 1. Adaptación automática a cambios en el Sheet

- **Nueva columna en Drive:** Si en el Excel/Sheet añades una columna con su título en la fila de cabecera, en la siguiente carga (o en el siguiente ciclo de polling) la aplicación debe mostrar esa columna **sin cambiar código**. El parser usa como cabecera la primera fila que tenga al menos un valor; las claves del JSON serán todas las columnas de esa fila.
- **Nueva fila con datos:** Si añades una fila con al menos un valor en alguna celda, debe aparecer en la tabla. No hace falta desplegar ni tocar código.
- **Eliminar columna/fila en Drive:** Al volver a cargar, los datos reflejarán el CSV actual; columnas o filas que ya no estén (o que queden vacías según las reglas siguientes) no se mostrarán.

**Conclusión:** No se fija en código el número de columnas ni los nombres; todo se deduce del CSV en cada petición.

---

## 2. Cabecera: no usar las primeras filas vacías

- **Fila de cabecera:** Es la **primera fila que tenga al menos una celda con contenido** (después de hacer trim). Las filas anteriores se ignoran.
- No se asume que la cabecera está siempre en la fila 1. Así se soportan hojas con títulos o filas en blanco al inicio (como en Enseñanzas, Estudios bíblicos e Instituto bíblico).

---

## 3. No mostrar filas vacías

- **Fila vacía:** Una fila donde **todas** las celdas están vacías (o solo espacios) después de trim.
- **Regla:** Esas filas **no** se incluyen en el array de datos que se devuelve a la app. Solo se muestran filas que tengan al menos un valor en alguna columna.

---

## 4. No mostrar columnas vacías

- **Columna vacía:** Una columna cuya cabecera existe pero **en todas las filas de datos** el valor de esa columna está vacío (o solo espacios).
- **Regla:** Esas columnas **no** se incluyen en los objetos que se devuelven (o no se envían al front). Así la tabla no muestra columnas sin información.

Si en el futuro alguna hoja tiene una columna con cabecera pero sin datos en ninguna fila, no se mostrará hasta que haya al menos un valor.

---

## 5. Resumen del flujo del parser

1. Descargar el CSV (fetch a la URL, cuerpo como texto UTF-8).
2. Parsear filas (respetando comillas y comas dentro de celdas, p. ej. RFC 4180).
3. **Cabecera:** Buscar la primera fila con al menos una celda no vacía → esa fila son las claves. Normalizar nombres (trim; opcional: espacios → `_`, etc.) para usarlos como claves de objeto.
4. **Filas de datos:** Para cada fila siguiente, construir un objeto con las claves de la cabecera. **Excluir** la fila si todas sus celdas (en el rango de la cabecera) están vacías.
5. **Columnas vacías:** Tras tener el array de objetos, detectar las claves (columnas) donde todos los valores son vacíos y **eliminar** esas claves de todos los objetos (o no enviarlas al front).
6. Devolver el array resultante.

Con esto, la aplicación se adapta a nuevas columnas y filas con datos, no usa las primeras filas vacías como cabecera y no muestra filas ni columnas totalmente vacías.
