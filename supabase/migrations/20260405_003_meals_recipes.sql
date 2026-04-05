-- Dodaj przepis i składniki do meals
ALTER TABLE meals ADD COLUMN IF NOT EXISTS recipe TEXT;
ALTER TABLE meals ADD COLUMN IF NOT EXISTS ingredients TEXT;

-- Wstaw 7 dań tygodnia 16 z przepisami
INSERT INTO meals (name, category, prep_time, protein_rating, recipe, ingredients) VALUES
(
  'Udka z kurczaka z piekarnika + surówka',
  'drób',
  60,
  'hi',
  '1. Udka natrzyj solą, pieprzem, czosnkiem, papryką słodką i oliwą. Odstaw na 30 min.
2. Piecz w 200°C przez 45 min, aż skórka się zarumieni.
3. Surówka: poszatkuj kapustę, zetrzyj marchew, dodaj sól, cukier, ocet, oliwę. Wymieszaj.',
  '4 udka kurczaka, 1/2 główki kapusty białej, 2 marchew, 3 ząbki czosnku, papryka słodka mielona, sól, pieprz, oliwa z oliwek, ocet, szczypta cukru'
),
(
  'Makaron pesto',
  'makaron',
  20,
  'md',
  '1. Ugotuj makaron al dente wg instrukcji na opakowaniu.
2. Na patelni podsmaż czosnek na oliwie przez 1 min.
3. Wymieszaj odcedzony makaron z pesto i podsmażonym czosnkiem.
4. Podaj z tartym parmezanem.',
  '400g makaron (spaghetti/penne), 1 słoiczek pesto bazyliowe (190g), 2 ząbki czosnku, parmezan do posypania, oliwa z oliwek, sól'
),
(
  'Kebab domowy',
  'drób',
  30,
  'hi',
  '1. Pierś kurczaka pokrój w paski, zamarynuj w przyprawach kebab, soli i jogurcie przez 15 min.
2. Usmaż na patelni na oleju przez 8-10 min.
3. Sos: wymieszaj jogurt, czosnek, koperek, sól.
4. Złóż kebab w tortilli z warzywami i sosem.',
  '500g pierś kurczaka, 4 tortille, 1 cebula, 1 pomidor, 1 ogórek, 1 sałata lodowa, przyprawa kebab, 200g jogurt naturalny, 2 ząbki czosnku, koperek, sól, olej'
),
(
  'Burrito bowl z kurczakiem',
  'drób',
  30,
  'hi',
  '1. Ugotuj ryż wg przepisu.
2. Pierś kurczaka dopraw kumin, papryką, solą — usmaż na patelni pokrojoną w kostkę.
3. W misce ułóż warstwy: ryż, kurczak, kukurydza, fasola, pokrojony pomidor, awokado.
4. Polej sosem: jogurt + limonka + sól.',
  '500g pierś kurczaka, 200g ryż, 1 puszka kukurydzy, 1 puszka fasoli czerwonej, 2 pomidory, 1 awokado, 200g jogurt naturalny, 1 limonka, kumin, papryka słodka, sól, olej'
),
(
  'Kasza z kiełbasą i ogórkami',
  'kasza',
  25,
  'md',
  '1. Ugotuj kaszę gryczaną wg przepisu (1:2 z wodą, ok. 15 min).
2. Kiełbasę pokrój w plasterki i podsmaż na patelni bez tłuszczu.
3. Ogórki kiszone pokrój w kostkę.
4. Wymieszaj kaszę z kiełbasą i ogórkami, dopraw pieprzem.',
  '300g kasza gryczana, 400g kiełbasa (np. śląska), 4 ogórki kiszone, pieprz, sól'
),
(
  'Kasza z jajkiem',
  'kasza',
  20,
  'md',
  '1. Ugotuj kaszę gryczaną (1:2 z wodą, ok. 15 min).
2. Jajka usmaż na maśle — sadzone lub jajecznica.
3. Cebulę zeszklij na maśle.
4. Podaj kaszę z jajkami i zeszkloną cebulą, posól.',
  '300g kasza gryczana, 4 jajka, 1 cebula, masło, sól, pieprz'
),
(
  'Ryż z jabłkami i cynamonem',
  'słodkie',
  20,
  'lo',
  '1. Ugotuj ryż na mleku (1 szklanka ryżu + 2 szklanki mleka + szczypta soli).
2. Jabłka obierz i pokrój w kostkę, podsmaż na maśle z cukrem i cynamonem przez 5 min.
3. Podaj ryż z jabłkami na wierzchu, posyp cynamonem.',
  '200g ryż, 500ml mleko, 2 jabłka, masło, 2 łyżki cukru, cynamon, szczypta soli'
)
RETURNING id, name;
