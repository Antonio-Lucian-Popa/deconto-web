# Deconto Web

Dashboard web Next.js pentru aplicația de decont cheltuieli + flotă auto.

## Setup

```bash
cp .env.example .env.local
# Editează NEXT_PUBLIC_API_URL să pointeze la API
npm install
npm run dev
```

## Structură

- `/dashboard` — pagina principală cu statistici
- `/deconturi` — management deconturi (trips)
- `/cheltuieli` — toate cheltuielile
- `/rapoarte` — rapoarte PDF
- `/flota` — management flotă auto
- `/echipa` — useri companie
- `/setari` — setări companie (ADMIN)
