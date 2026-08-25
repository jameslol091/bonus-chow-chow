# Bonus Chow Chow — publishable starter

This is a mobile-friendly, Supabase-powered version of Bonus Chow Chow.

## Features
- Email/password sign up and sign in
- Nicknames
- Real-time community chat
- Emoji picker
- Clickable hyperlinks
- Photo uploads
- Responsive phone layout
- Yellow / green / blue theme

## 1. Create Supabase project
Create a project at https://supabase.com/

Open SQL Editor and run `supabase-schema.sql`.

Then go to Project Settings -> API and copy:
- Project URL
- anon/public key

Put those values into `config.js`.

Do NOT put a `service_role` key in this website.

## 2. Email confirmation
For the easiest school/demo deployment, you can disable email confirmation in:
Authentication -> Providers -> Email.
For a real public site, keep confirmation enabled and configure your email settings.

## 3. Test
Open `index.html` with a local web server. Do not use file:// if your browser blocks scripts.

VS Code users can use Live Server, or:
`python -m http.server 5500`

Then open:
http://localhost:5500

## 4. Publish with Vercel
Create a Vercel account and import this folder as a project.
No build command is needed; it is a static site.

You can also deploy the same folder with Netlify or GitHub Pages.

## Security note
The browser uses only Supabase's anon/public key. Database Row Level Security policies protect the data.
Never expose a Supabase service_role key in frontend code.

## Important production improvements
Before a large public launch, add:
- message/report moderation
- rate limiting / anti-spam
- image moderation and size limits
- stronger nickname rules
- account recovery
- privacy policy / terms
- proper production email configuration
