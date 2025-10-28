import os
from datetime import datetime, timedelta
from pathlib import Path
import secrets
import imghdr

from fastapi import FastAPI, Depends, HTTPException, status, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles

from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error

from passlib.context import CryptContext
from jose import jwt, JWTError

from admin_routes import create_admin_router
from applications_routes import create_applications_router
from company_applications_routes import create_company_applications_router
from notifications_routes import create_notifications_router

# --------------------------------------------------------------------
# Boot
# --------------------------------------------------------------------
load_dotenv()
app = FastAPI(title="Jobboard API")

# --------------------------------------------------------------------
# Static / Uploads
# --------------------------------------------------------------------
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR), html=False), name="uploads")

ALLOWED_KINDS = {"jpeg", "png", "webp"}
MAX_BYTES = 8 * 1024 * 1024  # 8MB

def _validate_image_bytes(raw: bytes) -> str:
    kind = imghdr.what(None, h=raw)  # returns "jpeg","png","webp", etc.
    return kind or ""

def _safe_image_name(prefix="img", ext="jpg") -> str:
    return f"{prefix}_{secrets.token_hex(8)}.{ext}"

# --------------------------------------------------------------------
# DB
# --------------------------------------------------------------------
def get_db():
    """Connexion MySQL par requête (commit/rollback) + erreurs lisibles."""
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3306")),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASS"),
            database=os.getenv("DB_NAME", "jobboard"),
            charset="utf8mb4",
            autocommit=False,
            raise_on_warnings=True,
            connection_timeout=5,
        )
        conn.ping(reconnect=True, attempts=1, delay=0)
    except Error as e:
        raise HTTPException(status_code=500, detail=f"DB connection failed: {e}") from e

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# --------------------------------------------------------------------
# Sécurité / JWT
# --------------------------------------------------------------------
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",
)
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGO = os.getenv("JWT_ALGO", "HS256")
JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "60"))

def hash_password(plain: str) -> str:
    try:
        return pwd_context.hash(plain)
    except Exception:
        # fallback si algo indisponible
        return pwd_context.hash(plain, scheme="pbkdf2_sha256")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False

def create_access_token(data: dict, expires_minutes: int = JWT_EXPIRES_MIN) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGO)

security = HTTPBearer(auto_error=True)

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db=Depends(get_db),
):
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    with db.cursor(dictionary=True) as cur:
        cur.execute("SELECT id, email, role FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_user(user=Depends(get_current_user)):
    return user

def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

def require_admin_or_recruiter(user=Depends(get_current_user)):
    if user["role"] not in ("admin", "recruiter"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user

# --------------------------------------------------------------------
# Health
# --------------------------------------------------------------------
@app.get("/db/ping")
def db_ping(db=Depends(get_db)):
    try:
        with db.cursor() as cur:
            cur.execute("SELECT DATABASE(), VERSION()")
            dbname, version = cur.fetchone()
        return {"ok": True, "db": dbname, "version": version}
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Ping failed: {e}")

@app.get("/health")
def health():
    return {"status": "ok"}

# --------------------------------------------------------------------
# Upload Image
# --------------------------------------------------------------------
@app.post("/upload/image", status_code=201)
def upload_image(file: UploadFile = File(...), current_user=Depends(require_user)):
    raw = file.file.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 8MB)")
    kind = _validate_image_bytes(raw)
    if kind not in ALLOWED_KINDS:
        raise HTTPException(status_code=400, detail="Unsupported image (jpg/png/webp)")

    ext = "jpg" if kind == "jpeg" else kind
    name = _safe_image_name(prefix=str(current_user["id"]), ext=ext)
    dest = UPLOAD_DIR / name
    with open(dest, "wb") as f:
        f.write(raw)

    url = f"/uploads/{name}"
    return {"url": url}

# --------------------------------------------------------------------
# Companies
# --------------------------------------------------------------------
@app.get("/api/companies")
def list_companies(db=Depends(get_db)):
    try:
        with db.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    name,
                    hq_city,
                    sector,
                    description,
                    website,
                    social_links,
                    headcount,
                    banner_url
                FROM companies
                ORDER BY id DESC
                LIMIT 50
                """
            )
            rows = cur.fetchall()
        return {"items": rows}
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

@app.post("/api/companies", status_code=201)
def create_company(
    payload: dict,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin_or_recruiter),
):
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    fields = [
        "name",
        "hq_city",
        "sector",
        "description",
        "website",
        "social_links",
        "headcount",
        "banner_url",
    ]
    values = [
        name,
        payload.get("hq_city"),
        payload.get("sector"),
        payload.get("description"),
        payload.get("website"),
        payload.get("social_links"),
        payload.get("headcount"),
        payload.get("banner_url"),
        current_user["id"],
    ]
    placeholders = ", ".join(["%s"] * (len(fields) + 1))
    columns = ", ".join(fields + ["created_by"])
    try:
        with db.cursor() as cur:
            cur.execute(
                f"INSERT INTO companies ({columns}, created_at) VALUES ({placeholders}, NOW())",
                (*values,),
            )
            new_id = cur.lastrowid
        with db.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id, name, hq_city, sector, description, website,
                       social_links, headcount, banner_url, created_at, created_by
                FROM companies
                WHERE id=%s
                """,
                (new_id,),
            )
            company = cur.fetchone()
        return company
    except Error as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

@app.get("/api/my/company")
def get_my_company(
    db=Depends(get_db),
    current_user: dict = Depends(require_admin_or_recruiter),
):
    with db.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT
                id,
                name,
                hq_city,
                sector,
                description,
                website,
                social_links,
                headcount,
                banner_url,
                created_at,
                created_by
            FROM companies
            WHERE created_by = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (current_user["id"],),
        )
        company = cur.fetchone()
    return company or None

@app.get("/api/companies/{company_id}")
def get_company(
    company_id: int,
    db=Depends(get_db),
    _: dict = Depends(require_admin_or_recruiter),
):
    with db.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT id, name, hq_city, sector, description, website,
                   social_links, headcount, banner_url, created_at
            FROM companies
            WHERE id=%s
            """,
            (company_id,),
        )
        company = cur.fetchone()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@app.put("/api/companies/{company_id}", status_code=200)
def update_company(
    company_id: int,
    payload: dict,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin_or_recruiter),
):
    if not payload:
        raise HTTPException(status_code=400, detail="empty payload")
    editable = {
        "name", "hq_city", "sector", "description",
        "website", "social_links", "headcount",
        "banner_url"
    }
    data = {k: v for k, v in payload.items() if k in editable}
    if not data:
        raise HTTPException(status_code=400, detail="no valid fields to update")
    # Ownership check (admin can edit all, recruiter only own company)
    with db.cursor(dictionary=True) as cur:
        cur.execute("SELECT id, created_by FROM companies WHERE id=%s", (company_id,))
        company_row = cur.fetchone()
    if not company_row:
        raise HTTPException(status_code=404, detail="Company not found")
    if current_user["role"] != "admin" and company_row["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    set_clause = ", ".join(f"{k}=%s" for k in data.keys())
    values = list(data.values())
    try:
        with db.cursor() as cur:
            cur.execute(f"UPDATE companies SET {set_clause} WHERE id=%s", (*values, company_id))
            if cur.rowcount == 0:
                cur.execute("SELECT 1 FROM companies WHERE id=%s", (company_id,))
                if cur.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Company not found")
        with db.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id, name, hq_city, sector, description, website,
                       social_links, headcount, banner_url, created_at
                FROM companies WHERE id=%s
                """,
                (company_id,),
            )
            company = cur.fetchone()
        return company
    except Error as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

@app.delete("/api/companies/{company_id}", status_code=204)
def delete_company(
    company_id: int,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin_or_recruiter),
):
    with db.cursor(dictionary=True) as cur:
        cur.execute("SELECT id, created_by FROM companies WHERE id=%s", (company_id,))
        company = cur.fetchone()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable.")
    if current_user["role"] != "admin" and company["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    with db.cursor() as cur:
        # Supprimer les notifications liées aux jobs de cette entreprise pour éviter des notifs orphelines
        cur.execute(
            """
            DELETE n FROM notifications n
            WHERE n.job_id IN (SELECT id FROM jobs WHERE company_id=%s)
               OR n.application_id IN (
                    SELECT a.id FROM applications a
                    JOIN jobs j ON j.id = a.job_id
                    WHERE j.company_id = %s
               )
            """,
            (company_id, company_id),
        )
        cur.execute("DELETE FROM jobs WHERE company_id=%s", (company_id,))
        cur.execute("DELETE FROM companies WHERE id=%s", (company_id,))
    return Response(status_code=204)

# --------------------------------------------------------------------
# Jobs
# --------------------------------------------------------------------
@app.get("/api/jobs/{job_id}")
def get_job(job_id: int, db=Depends(get_db)):
    with db.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT j.*,
                   c.name AS company_name,
                   c.website AS company_website,
                   c.banner_url AS company_banner_url
            FROM jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE j.id = %s
            """,
            (job_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return row

@app.get("/api/jobs")
def list_jobs(
    q: str | None = None,
    company_id: int | None = None,
    page: int = 1,
    page_size: int = 10,
    db=Depends(get_db),
):
    try:
        page = max(1, int(page))
        page_size = max(1, min(100, int(page_size)))
        offset = (page - 1) * page_size

        where = []
        params = []
        if q:
            where.append("(j.title LIKE %s OR j.short_desc LIKE %s)")
            params += [f"%{q}%", f"%{q}%"]
        if company_id is not None:
            where.append("j.company_id = %s")
            params.append(int(company_id))
        where_sql = "WHERE " + " AND ".join(where) if where else ""

        with db.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM jobs j
                JOIN companies c ON c.id = j.company_id
                {where_sql}
                """,
                tuple(params),
            )
            total = cur.fetchone()["total"]

        with db.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT j.id, j.company_id, j.title, j.short_desc, j.location,
                        j.contract_type, j.work_mode,
                       c.name AS company_name,
                       c.banner_url AS company_banner_url
                FROM jobs j
                JOIN companies c ON c.id = j.company_id
                {where_sql}
                ORDER BY j.created_at DESC, j.id DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params + [page_size, offset]),
            )
            items = cur.fetchall()

        return {"items": items, "page": page, "page_size": page_size, "total": total}
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

@app.post("/api/jobs", status_code=201)
def create_job(
    payload: dict,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin_or_recruiter),
):
    company_id = payload.get("company_id")
    title = payload.get("title")
    short_desc = payload.get("short_desc")
    full_desc = payload.get("full_desc")
    location = payload.get("location")
    profile_sought = payload.get("profile_sought")
    contract_type = payload.get("contract_type")
    work_mode = payload.get("work_mode")
    salary_min = payload.get("salary_min")
    salary_max = payload.get("salary_max")
    currency = payload.get("currency")
    tags = payload.get("tags")

    if not company_id or not title or not short_desc:
        raise HTTPException(
            status_code=400,
            detail="company_id, title and short_desc are required",
        )

    # Vérifier que la company existe et l'ownership
    with db.cursor(dictionary=True) as cur:
        cur.execute("SELECT id, created_by FROM companies WHERE id=%s", (company_id,))
        company = cur.fetchone()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if current_user["role"] != "admin" and company["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    try:
        with db.cursor() as cur:
            cur.execute(
                """
                INSERT INTO jobs
                    (company_id, title, short_desc, full_desc, location, profile_sought,
                     contract_type, work_mode, salary_min, salary_max, currency, tags, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, NOW())
                """,
                (
                    company_id,
                    title,
                    short_desc,
                    full_desc,
                    location,
                    profile_sought,
                    contract_type,
                    work_mode,
                    salary_min,
                    salary_max,
                    currency,
                    tags,
                ),
            )
            new_id = cur.lastrowid
        return {
            "id": new_id,
            "company_id": company_id,
            "title": title,
            "short_desc": short_desc,
            "full_desc": full_desc,
            "location": location,
            "profile_sought": profile_sought,
            "contract_type": contract_type,
            "work_mode": work_mode,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "currency": currency,
            "tags": tags,
        }
    except Error as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

@app.patch("/api/jobs/{job_id}")
def patch_job(
    job_id: int,
    payload: dict,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin_or_recruiter),
):
    if not payload:
        raise HTTPException(status_code=400, detail="empty payload")
    # Ownership check
    with db.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT c.created_by
            FROM jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE j.id = %s
            """,
            (job_id,),
        )
        owner = cur.fetchone()
    if not owner:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["role"] != "admin" and owner["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    cols, vals = zip(*payload.items())
    set_clause = ", ".join([f"{c}=%s" for c in cols])
    with db.cursor() as cur:
        cur.execute(f"UPDATE jobs SET {set_clause} WHERE id=%s", (*vals, job_id))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job not found")
    return {"id": job_id, **payload}

@app.delete("/api/jobs/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db=Depends(get_db),
    current_user: dict = Depends(require_admin_or_recruiter),
):
    # Ownership check
    with db.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT c.created_by
            FROM jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE j.id = %s
            """,
            (job_id,),
        )
        owner = cur.fetchone()
    if not owner:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user["role"] != "admin" and owner["created_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    with db.cursor() as cur:
        cur.execute("DELETE FROM jobs WHERE id=%s", (job_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Job not found")
    return Response(status_code=204)

# --------------------------------------------------------------------
# Profiles
# --------------------------------------------------------------------
@app.get("/api/profiles")
def list_profiles(
    q: str | None = None,
    city: str | None = None,
    skills: str | None = None,
    page: int = 1,
    page_size: int = 10,
    db=Depends(get_db),
):
    try:
        page = max(1, int(page))
        page_size = max(1, min(100, int(page_size)))
        offset = (page - 1) * page_size

        where = []
        params: list = []
        if q:
            where.append("(p.first_name LIKE %s OR p.last_name LIKE %s)")
            params += [f"%{q}%", f"%{q}%"]
        if city:
            where.append("p.city = %s")
            params.append(city)
        if skills:
            where.append("p.skills LIKE %s")
            params.append(f"%{skills}%")
        where_sql = "WHERE " + " AND ".join(where) if where else ""

        with db.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT COUNT(*) AS total
                FROM profiles p
                {where_sql}
                """,
                tuple(params),
            )
            total = cur.fetchone()["total"]

        with db.cursor(dictionary=True) as cur:
            cur.execute(
                f"""
                SELECT
                    p.id,
                    p.user_id,
                    u.email,
                    u.role,
                    p.first_name,
                    p.last_name,
                    p.city,
                    p.contact_email,
                    p.date_birth,
                    p.phone,
                    p.diplomas,
                    p.experiences,
                    p.skills,
                    p.languages,
                    p.qualities,
                    p.interests,
                    p.job_target,
                    p.motivation,
                    p.links,
                    p.avatar_url,
                    p.cv_url,
                    p.created_at,
                    p.updated_at
                FROM profiles p
                LEFT JOIN users u ON u.id = p.user_id
                {where_sql}
                ORDER BY p.created_at DESC, p.id DESC
                LIMIT %s OFFSET %s
                """,
                tuple(params + [page_size, offset]),
            )
            items = cur.fetchall()

        return {"items": items, "page": page, "page_size": page_size, "total": total}
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

@app.post("/api/profiles", status_code=201)
def create_profile(payload: dict, db=Depends(get_db), current_user=Depends(get_current_user)):
    first_name = payload.get("first_name")
    last_name = payload.get("last_name")
    city = payload.get("city")
    contact_email = payload.get("contact_email")
    cv_url = payload.get("cv_url")
    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="first_name and last_name are required")
    with db.cursor() as cur:
        cur.execute(
            """
            INSERT INTO profiles
                (user_id, first_name, last_name, city, contact_email, cv_url, created_at)
            VALUES (%s,%s,%s,%s,%s,%s, NOW())
            """,
            (current_user["id"], first_name, last_name, city, contact_email, cv_url),
        )
        new_id = cur.lastrowid
    with db.cursor(dictionary=True) as cur:
        cur.execute(
            "SELECT id, user_id, first_name, last_name, city, contact_email, cv_url, created_at FROM profiles WHERE id=%s",
            (new_id,),
        )
        prof = cur.fetchone()
    return prof

@app.get("/api/profiles/{profile_id}")
def get_profile(profile_id: int, db=Depends(get_db)):
    with db.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT id, user_id, first_name, last_name, date_birth, city, phone,
                   diplomas, experiences, skills, languages, qualities, interests,
                   job_target, motivation, links, avatar_url, contact_email, cv_url,
                   created_at, updated_at
            FROM profiles WHERE id=%s
            """,
            (profile_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return row

@app.put("/api/profiles/{profile_id}")
def update_profile(profile_id: int, payload: dict, db=Depends(get_db), current_user=Depends(get_current_user)):
    with db.cursor(dictionary=True) as cur:
        cur.execute("SELECT id, user_id FROM profiles WHERE id=%s", (profile_id,))
        prof = cur.fetchone()
    if not prof:
        raise HTTPException(status_code=404, detail="Profile not found")
    if current_user["role"] != "admin" and prof["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    editable = {
        "first_name", "last_name", "date_birth", "city", "phone",
        "diplomas", "experiences", "skills", "languages", "qualities",
        "interests", "job_target", "motivation", "links",
        "avatar_url", "contact_email", "cv_url"
    }
    data = {k: v for k, v in payload.items() if k in editable}
    if not data:
        raise HTTPException(status_code=400, detail="no valid fields to update")
    set_clause = ", ".join(f"{k}=%s" for k in data.keys())
    values = list(data.values())
    try:
        with db.cursor() as cur:
            cur.execute(
                f"UPDATE profiles SET {set_clause}, updated_at=NOW() WHERE id=%s",
                (*values, profile_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Profile not found")
        with db.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT id, user_id, first_name, last_name, date_birth, city, phone,
                       diplomas, experiences, skills, languages, qualities, interests,
                       job_target, motivation, links, avatar_url, contact_email, cv_url,
                       created_at, updated_at
                FROM profiles WHERE id=%s
                """,
                (profile_id,),
            )
            updated = cur.fetchone()
        return updated
    except Error as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

@app.delete("/api/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: int, db=Depends(get_db), current_user=Depends(get_current_user)):
    with db.cursor(dictionary=True) as cur:
        cur.execute("SELECT id, user_id FROM profiles WHERE id=%s", (profile_id,))
        prof = cur.fetchone()
    if not prof:
        raise HTTPException(status_code=404, detail="Profil introuvable.")
    if current_user["role"] != "admin" and prof["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisés à supprimer ce profil.")
    with db.cursor() as cur:
        if prof["user_id"]:
            cur.execute("DELETE FROM applications WHERE user_id=%s", (prof["user_id"],))
        cur.execute("DELETE FROM profiles WHERE id=%s", (profile_id,))
    return Response(status_code=204)

# --------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------
@app.post("/auth/signup", status_code=201)
def auth_signup(payload: dict, db=Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password")
    role = payload.get("role", "user")  # ⚠ en prod, ne pas laisser libre

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password are required")

    hashed = hash_password(password)
    try:
        with db.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (%s,%s,%s)",
                (email, hashed, role),
            )
            new_id = cur.lastrowid
        return {"id": new_id, "email": email, "role": role}
    except Error as e:
        if getattr(e, "errno", None) == 1062:  # email unique
            raise HTTPException(status_code=409, detail="email already exists")
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

@app.post("/auth/login")
def auth_login(payload: dict, db=Depends(get_db)):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password are required")

    try:
        with db.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT id, email, password_hash, role FROM users WHERE email=%s",
                (email,),
            )
            user = cur.fetchone()
    except Error as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me")
def auth_me(current_user=Depends(get_current_user)):
    return current_user

@app.delete("/auth/me", status_code=204)
def delete_me(current_user=Depends(get_current_user), db=Depends(get_db)):
    with db.cursor() as cur:
        # Notifications liées à mes candidatures
        # Toujours consommer le résultat d'un SELECT pour éviter
        # mysql.connector.errors.InternalError: Unread result found
        cur.execute("SELECT id FROM applications WHERE user_id=%s", (current_user["id"],))
        app_ids = [row[0] for row in cur.fetchall()]
        if app_ids:
            ids_tuple = tuple(app_ids)
            in_clause = ",".join(["%s"] * len(ids_tuple))
            cur.execute(f"DELETE FROM notifications WHERE application_id IN ({in_clause})", ids_tuple)

        # Notifications liées aux jobs de mes entreprises (si recruteur)
        cur.execute(
            """
            DELETE n FROM notifications n
            WHERE n.job_id IN (
                SELECT j.id FROM jobs j
                JOIN companies c ON c.id = j.company_id
                WHERE c.created_by = %s
            )
            """,
            (current_user["id"],),
        )

        # Données directes
        cur.execute("DELETE FROM profiles WHERE user_id=%s", (current_user["id"],))
        cur.execute("DELETE FROM applications WHERE user_id=%s", (current_user["id"],))
        # La suppression du user cascade sur companies/jobs et leurs candidatures
        cur.execute("DELETE FROM users WHERE id=%s", (current_user["id"],))
    return Response(status_code=204)

# --------------------------------------------------------------------
# CORS
# --------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://localhost:5173",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(create_applications_router(get_db, require_user))
app.include_router(create_company_applications_router(get_db, require_admin_or_recruiter))
app.include_router(create_notifications_router(get_db, require_user))
app.include_router(create_admin_router(get_db, require_admin, hash_password))
