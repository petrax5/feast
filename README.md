# Kitchen Routes

Mobile-first web app (installable on iPhone) for a kitchen's delivery drivers.

- **Admin**: drivers (login, active, work days, meals, maps app), recurring routes with houses in order and
  meals per house, one-off or per-day changes, weekly pay per driver with PDF report.
- **Driver**: today's routes, start route in Google/Apple Maps in your order, mark completed, weekly earnings + PDF.

Pay weeks run **Friday → Thursday**. Each route has its own pay; a day's route is a frozen copy, so editing a
route later never changes past days or pay already earned. Drivers can undo a completion the same day; after
that only the admin can.

## Run locally

```bash
npm install
npm run dev
```

Without `DATABASE_URL` data is stored in `./.data` (embedded Postgres). First visit asks you to create the admin.

## Production (Vercel)

Set `DATABASE_URL` (Neon Postgres) and `SESSION_SECRET` (long random string). Tables are created automatically.

```bash
npm test        # date / pay-week / maps link logic
npm run build
```
