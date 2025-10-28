from fastapi import APIRouter, Depends, HTTPException
from mysql.connector import Error, IntegrityError
from pydantic import BaseModel, Field


def create_applications_router(get_db, require_user):
    router = APIRouter()

    class ApplyPayload(BaseModel):
        job_id: int = Field(..., ge=1)
        message: str | None = Field(default=None, max_length=2000)

    @router.post("/api/applications", status_code=201)
    def apply_to_job(
        payload: ApplyPayload,
        current_user: dict = Depends(require_user),
        db=Depends(get_db),
    ):
        try:
            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT
                        j.id,
                        j.title,
                        j.company_id,
                        c.name AS company_name,
                        c.created_by AS company_owner_id
                    FROM jobs j
                    JOIN companies c ON c.id = j.company_id
                    WHERE j.id = %s
                    """,
                    (payload.job_id,),
                )
                job = cur.fetchone()
            if not job:
                raise HTTPException(status_code=404, detail="Job not found")

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT id FROM applications
                    WHERE job_id = %s AND user_id = %s
                    LIMIT 1
                    """,
                    (job["id"], current_user["id"]),
                )
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Application already exists")

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT
                        first_name,
                        last_name,
                        contact_email,
                        phone,
                        cv_url
                    FROM profiles
                    WHERE user_id = %s
                    """,
                    (current_user["id"],),
                )
                profile = cur.fetchone()
            if not profile:
                raise HTTPException(status_code=400, detail="Profile required before applying")
            if not profile.get("contact_email") or not profile.get("cv_url"):
                raise HTTPException(
                    status_code=400,
                    detail="Profile must include contact email and CV before applying",
                )

            candidate_name = f"{profile.get('first_name', '').strip()} {profile.get('last_name', '').strip()}".strip()
            message = (payload.message or "").strip() or None

            with db.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO applications
                        (job_id, user_id, name, email, phone, message, cv_url, status, matched_at, created_at)
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s, 'new', NULL, NOW())
                    """,
                    (
                        job["id"],
                        current_user["id"],
                        candidate_name or None,
                        profile.get("contact_email"),
                        profile.get("phone"),
                        message,
                        profile.get("cv_url"),
                    ),
                )
                application_id = cur.lastrowid

            if job.get("company_owner_id"):
                notif_message = f"{candidate_name or profile['contact_email']} a postulé à {job['title']}."
                with db.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO notifications
                            (recipient_user_id, type, message, job_id, application_id, created_at)
                        VALUES
                            (%s, %s, %s, %s, %s, NOW())
                        """,
                        (
                            job["company_owner_id"],
                            "application:new",
                            notif_message,
                            job["id"],
                            application_id,
                        ),
                    )

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT
                        a.id,
                        a.job_id,
                        a.status,
                        a.matched_at,
                        a.created_at,
                        j.title AS job_title,
                        j.location AS job_location,
                        c.name AS company_name
                    FROM applications a
                    JOIN jobs j ON j.id = a.job_id
                    JOIN companies c ON c.id = j.company_id
                    WHERE a.id = %s
                    """,
                    (application_id,),
                )
                created = cur.fetchone()
            return created
        except IntegrityError:
            raise HTTPException(status_code=409, detail="Application already exists")
        except Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    @router.get("/api/me/applications")
    def list_my_applications(
        current_user: dict = Depends(require_user),
        db=Depends(get_db),
    ):
        try:
            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT
                        a.id,
                        a.job_id,
                        a.status,
                        a.matched_at,
                        a.created_at,
                        j.title AS job_title,
                        j.location AS job_location,
                        j.contract_type,
                        c.name AS company_name
                    FROM applications a
                    JOIN jobs j ON j.id = a.job_id
                    JOIN companies c ON c.id = j.company_id
                    WHERE a.user_id = %s
                    ORDER BY a.created_at DESC, a.id DESC
                    """,
                    (current_user["id"],),
                )
                items = cur.fetchall()
            return {"items": items}
        except Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return router
