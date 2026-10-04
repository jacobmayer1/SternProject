# TODO – Case Study Doc Chat

Stand: Sonntag. Abgabe: Sonntagabend.

## Pflicht vor Abgabe
- [ ] Redesign committen (`Frontend: editorial black/white redesign`)
- [ ] Frischer Clone-Test: leerer Ordner → nur `.env` → `docker compose up --build` → Happy Path
- [ ] README fertig: Run-Befehl, Env-Vars, Architektur, was gebaut, Known limitations, Next steps
- [ ] DECISIONS.md ergänzen: k=5, `[doc, p. X]`-Labels, `/sources` mit globalem State, Zitat-Filter im Frontend, kein Live-Streaming im UI, Frage als Query-Parameter
- [ ] Aufräumen: TODO-Kommentar `main.py`, ungenutzter `retrieve`-Import, Notiz-Kommentar in `retrieval.py`, `bytes` → `pdf_bytes`
- [ ] Demo 2× durchspielen (10 min, Stoppuhr): Upload → Frage mit Antwort → Quellen aufklappen → Frage, die nicht im PDF steht

## Extra-Anforderungen aus dem Briefing
Empfohlene Reihenfolge: 1 → 2 → 3 → 4. Zwei sauber umgesetzt + zwei begründet weggelassen ist okay.

| # | Anforderung | Stand | Umsetzung | Aufwand |
|---|---|---|---|---|
| 1 | **Retrieval evaluation with numbers** | ✅ erledigt – Hit@1 0.53 · Hit@3/5/10 1.00 · MRR 0.74 (15 Fragen). Noch: Tabelle in README | Testset aus 15 Fragen mit erwarteter Seite (`eval/questions.json`) + Skript `eval.py`, das **Hit@1, Hit@5 und MRR** berechnet. Bonus: Chunk-Größen und k-Werte vergleichen, Tabelle in die README. | ~1 h |
| 2 | **Chat artifacts and rich rendering** | 🟡 Markdown-Rendering + Tabellen-CSS ✅, Zitat-Chips offen (siehe unten) | Antworten als **Markdown** rendern (Tabellen, Listen, Fettdruck) mit `react-markdown` + `remark-gfm`. Zitate `[doc, p. X]` im Text als **klickbare Chips**, die die passende Quelle aufklappen. | ~45 min |
| 3 | **Multi-model routing or side-by-side** | ❌ offen | `/chat` bekommt Parameter `model`. Vergleichsmodus im Frontend: dieselbe Frage parallel an zwei Modelle (z. B. `gpt-4o-mini` + größeres), Antworten nebeneinander mit **Antwortzeit**. Retrieval läuft nur einmal, damit nur das Modell den Unterschied macht. | ~1,5 h |
| 4 | **Citation highlighting in the source document** | 🟡 teilweise | Vorhanden: Quellen mit Seite, Score, Ausschnitt, Filter auf zitierte Quellen. Fehlt: Markierung **im Dokument**. Backend speichert das PDF und rendert die Seite als Bild; PyMuPDF sucht die Fundstelle mit `page.search_for(...)` und hebt sie gelb hervor. Frontend zeigt das Seitenbild beim Klick auf eine Quelle. Hängt mit den verschobenen Quotes zusammen. | ~2 h |

## Verschoben
- [ ] Exakte Quotes (Variante 2a): Modell liefert wörtliche Zitate in `###QUOTES###`-Block, Frontend normalisiert + markiert, sonst „⚠ nicht verifiziert". Auf eigenem Branch, Zeitlimit 2 h. Grundlage für #4.

## Optional (falls Zeit übrig)
- [ ] Live-Streaming im UI (Text Wort für Wort)
- [ ] Klick auf Seite öffnet PDF an der Stelle (`#page=26`)
- [ ] Kopf-/Fußzeilen beim Ingest entfernen

## Später: Klickbare Zitat-Chips (Rest von #2, ~30 min)
- [ ] `citeId(msg, doc, page)` in `Sources.tsx` exportieren (gemeinsame ID für Chip + Quelle)
- [ ] `Sources` bekommt Prop `msg`, jedes `<details>` bekommt `id={citeId(...)}`
- [ ] `linkifyCitations(text, msg)`: `[doc, p. 26]` → `[S. 26](#cite-…)` per `CITATION.replace`
- [ ] `ReactMarkdown components={{ a: ... }}`: `#cite-`-Links als `<button className="cite-chip">`
- [ ] `openSource(id)`: `details.open = true`, `scrollIntoView`, kurz `flash`-Klasse
- [ ] CSS: `.cite-chip`, `.source.flash`
- [ ] Bonus: Chip rot + ⚠, wenn zitierte Seite nicht im Kontext (Halluzinations-Hinweis)

