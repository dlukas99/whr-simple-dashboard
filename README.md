# WHR vizualizacija

Jednostavna web vizualizacija podataka iz World Happiness Report (WHR) skupa podataka za razdoblje 2015-2023. Fokus je na usporedbi država kroz vrijeme i brzom uvidu u razine sreće po svijetu.

Aplikacija je hostana i možete joj pristupiti ovdje: https://dlukas99.github.io/whr-simple-dashboard/

## Dataset
WHRFinal.json sadrži godišnje podatke po državama, uključujući Happiness Score te povezane faktore poput GDP, Social Support, Life Expectancy, Freedom, Generosity i Corruption.

## Sadržaj stranice
- linijski graf s prikazom odabranih država kroz godine
- stupčasti graf za usporedbu država u odabranoj godini
- heatmap svijeta za Happiness Score u odabranoj godini
- kontrole za odabir država, metrike i godine te Play/Pause animaciju

Napredne funkcionalnosti:
- mogućnost pokretanja/zaustavljanja animacije kod vremenskih podataka
- mogućnost usporedbe podataka za dva ili više odabira

Napredno ponašanje:
- implementiran UPDATE podataka umjesto DELETE and INSERT - svjesna upotreba D3.js obrasca Enter, Exit and Update
- korištenje tranzicija umjesto instantne promjene
