# Calculator Review Checklist

Use this before changing a calculator from `needs_legal_review` to `live`.

1. Confirm the calculator has at least one official source.
2. Confirm every legal claim maps to a rule id in `legal-rules.json`.
3. Confirm unsupported cases are listed on the page.
4. Confirm formulas are tested with normal, boundary, and invalid inputs.
5. Confirm the page has a unique title, description, canonical URL, FAQ, examples, limitations, and last reviewed date.
6. Confirm draft pages are `noindex` and excluded from `sitemap.xml`.
7. Confirm no personal data is collected or stored.
8. Confirm browser smoke tests pass on desktop and mobile.
9. Confirm schema and `llms.txt` entries are updated.
10. Confirm a human review note is added to the page or changelog.
