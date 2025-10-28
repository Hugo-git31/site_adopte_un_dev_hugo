Jobboard – API + Front (demo)

Présentation
- Petit jobboard d’inspiration « matching » (type likes/candidatures).
- Backend en FastAPI + MySQL, front statique en `site/` pour la démo.
- Authentification JWT et rôles: `user` (candidat), `recruiter` (entreprise), `admin`.

Fonctionnalités
- Comptes et login JWT (`/auth/signup`, `/auth/login`, `/auth/me`).
- Entreprises et offres: créer/lister/modifier/supprimer (droits recruteur/admin).
- Profils candidats, candidatures aux offres, notifications.
- Upload d’images (jpg/png/webp) stockées dans `uploads/`.

Prérequis
- Python 3.11+
- MySQL 8+
- pip / virtualenv (recommandé)

Installation rapide
1) Cloner le repo puis créer un virtualenv et installer les deps:
   - `python -m venv .venv && source .venv/bin/activate`
   - `pip install -r requirements.txt`
2) Configurer l’environnement:
   - `cp env.example .env` puis adapter les variables (MySQL, JWT…).
3) Base de données (jeu de données démo inclus):
   - `mysql -u <user> -p < data/jobboard_demo.sql`
   - Les comptes de démo utilisent le mot de passe: `test`
     - Admin: `admin1@test.com`, `admin2@test.com`
     - Recruteurs: `entreprise1@test.com` … `entreprise6@test.com`
     - Candidats: `candidat1@test.com` … `candidat15@test.com`

Lancer l’API
- `uvicorn main:app --reload`
- Endpoints de santé: `/health`, `/db/ping`
- CORS autorise par défaut `http://localhost:5500`, `http://localhost:5173`, etc.

Front de démo (optionnel)
- Servir le dossier `site/` en statique, par exemple:
  - `python -m http.server 5500 -d site`
  - Ouvrir `http://localhost:5500` (les appels API pointent sur `http://localhost:8000`).

Routes clés (aperçu)
- Auth: `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`
- Entreprises: `GET/POST/PUT/DELETE /api/companies*`
- Offres: `GET/POST /api/jobs*` (liste, détail, création), recherche via `q`, pagination
- Profils: `GET/POST/PUT/DELETE /api/profiles*`
- Candidatures: flux côté admin/recruteur et utilisateur (voir routes dédiées)
- Notifications: `GET /api/notifications` (lecture/marquage)
- Upload: `POST /upload/image`

Configuration (extrait)
- Voir `env.example` pour toutes les variables: base MySQL (`DB_HOST`, `DB_USER`, …), JWT (`JWT_SECRET`, `JWT_EXPIRES_MIN`), taille max upload.

Structure utile
- API: `main.py`, routes dans `admin_routes.py`, `applications_routes.py`, `company_applications_routes.py`, `notifications_routes.py`
- Front démo statique: `site/`
- Données de démo + schéma: `data/jobboard_demo.sql`
- Fichiers uploadés: `uploads/`

Notes
- Les actions sensibles (création/édition/suppression) nécessitent un token JWT et les rôles appropriés.
- Le schéma et les données de démo créent la base `jobboard` automatiquement.
