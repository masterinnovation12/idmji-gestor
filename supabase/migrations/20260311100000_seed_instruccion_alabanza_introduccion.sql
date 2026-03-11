-- Instrucción oficial: Introducción del culto de Alabanza
-- Contenido basado en docs/instrucciones/alabanza-introduccion.md
-- Solo afecta a (Alabanza, introduccion). Seguro y repetible.

INSERT INTO public.instrucciones_culto (
  culto_type_id,
  rol,
  titulo_es,
  titulo_ca,
  contenido_es,
  contenido_ca,
  updated_at
)
SELECT
  ct.id,
  'introduccion',
  'Introducción — Culto de Alabanza',
  'Introducció — Culte d''Alabança',
  $contenido_es$Los temas para preparar la alabanza

1. PREPARARNOS PARA LA ALABANZA Y CONGREGARNOS
Preparar el corazón y congregarnos con el propósito de alabar a Dios.

2. DARLE GRACIAS A DIOS
Utilizando la Palabra: «Tú eres».

3. BUSCAR LOS DONES ESPIRITUALES
También podemos utilizar la Palabra: «Tú eres el Dios que».

4. CONCENTRARNOS Y DEJAR LA TIMIDEZ
Disponer el corazón y la mente para la alabanza, venciendo la timidez.

5. ¿CÓMO RECIBIR EL ESPÍRITU SANTO?
• Leer la Biblia.
• Cantar a capela.
• Congregarnos.
• Insistir en la oración.
• Libertarnos de las ataduras.

6. SER REVERENTES

6.1 Reverencia interna (la del corazón) — 5 puntos
• Amar a Dios.
• Confiar y creer en Dios.
• Obedecer y cumplir sus mandamientos.
• Buscarlo con el corazón.
• Convertirnos a Dios.

6.2 Reverencia externa — Cómo nos presentamos delante de nuestro Dios
• Cuando leemos la Biblia: con atención y respeto.
• Cuando le oramos: con devoción.
• Cuando vemos un estudio bíblico o una enseñanza en casa: con disposición.
• Cómo nos comportamos en casa y en el trabajo: el testimonio.
• Cómo nos vestimos para venir a la congregación: de forma digna.
• Concentrarnos para la alabanza y no pensar en otras cosas es tener reverencia.

6.3 Punto importante
Fue una revelación que Dios le dio a nuestra hermana María Luisa: que fuéramos muy reverentes, porque Él fijaría sus ojos en los reverentes y los amaría.$contenido_es$,
  $contenido_ca$Els temes per preparar l''alabança

1. PREPARAR-NOS PER A L''ALABANÇA I CONGREGAR-NOS
Preparar el cor i congregar-nos amb el propòsit d''alabar a Déu.

2. DONAR-LI GRÀCIES A DÉU
Utilitzant la Paraula: «Tu ets».

3. BUSCAR ELS DONS ESPIRITUALS
També podem utilitzar la Paraula: «Tu ets el Déu que».

4. CONCENTRAR-NOS I DEIXAR LA TIMIDESA
Disposar el cor i la ment per a l''alabança, vencent la timidesa.

5. COM REBRE L''ESPERIT SANT?
• Llegir la Bíblia.
• Cantar a capella.
• Congregar-nos.
• Insistir en l''oració.
• Alliberar-nos de les atadures.

6. SER REVERENTS

6.1 Reverència interna (la del cor) — 5 punts
• Estimar a Déu.
• Confiar i creure en Déu.
• Obeeir i complir els seus manaments.
• Buscar-lo amb el cor.
• Convertir-nos a Déu.

6.2 Reverència externa — Com ens presentem davant del nostre Déu
• Quan llegim la Bíblia: amb atenció i respecte.
• Quan li preguem: amb devoció.
• Quan veiem un estudi bíblic o una ensenyança a casa: amb disposició.
• Com ens comportem a casa i a la feina: el testimoni.
• Com ens vestim per vindre a la congregació: de forma digna.
• Concentrar-nos per a l''alabança i no pensar en altres coses és tenir reverència.

6.3 Punt important
Va ser una revelació que Déu va donar a la nostra germana Maria Lluïsa: que fóssim molt reverents, perquè Ell fixaria els seus ulls en els reverents i els estimaria.$contenido_ca$,
  now()
FROM public.culto_types ct
WHERE ct.nombre ILIKE '%Alabanza%'
LIMIT 1
ON CONFLICT (culto_type_id, rol)
DO UPDATE SET
  titulo_es = EXCLUDED.titulo_es,
  titulo_ca = EXCLUDED.titulo_ca,
  contenido_es = EXCLUDED.contenido_es,
  contenido_ca = EXCLUDED.contenido_ca,
  updated_at = EXCLUDED.updated_at;
