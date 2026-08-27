---
description: Crea un git worktree en .worktrees/ a partir de una descripción.
agent: build
---

Crea un git worktree para: "$ARGUMENTS"

Instrucciones:

1. **Normaliza el nombre**: convierte el argumento a un slug kebab-case (minúsculas, sin acentos ni diacríticos, palabras separadas por `-`, solo `[a-z0-9-]`). Si el argumento es una frase larga, resúmela a 2-4 palabras significativas (máximo ~30 caracteres). Si el argumento está vacío o no es útil, usa `worktree-YYYYMMDD-HHMM` (fecha y hora actuales).
2. **Evita colisiones**: si ya existe la carpeta `.worktrees/<slug>` o la rama `<slug>`, añade un sufijo `-2`, `-3`, etc. hasta que sea único.
3. **Crea el worktree y la rama** en un solo paso:

   ```
   git worktree add .worktrees/<slug> -b <slug>
   ```

   No crees la carpeta manualmente ni hagas `cd` a ella. Trabaja desde el directorio actual.
4. **Verifica** con `git worktree list` que se creó correctamente.
5. **Reporta** únicamente la ruta del worktree y la rama creada, en una o dos líneas.

Restricciones:

- No hagas commits, no cambies de rama en el repo principal, no edites archivos.
- Este comando solo crea el worktree; nada más.
- Responde en español.
