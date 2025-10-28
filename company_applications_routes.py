from fastapi import APIRouter, Depends, HTTPException
from mysql.connector import Error


def create_company_applications_router(get_db, require_admin_or_recruiter):
    router = APIRouter()

    def _ensure_company_access(db, current_user_id: int, company_id: int):
        with db.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM companies
                WHERE id = %s AND created_by = %s
                """,
                (company_id, current_user_id),
            )
            exists = cur.fetchone()[0]
        if not exists:
            raise HTTPException(status_code=403, detail="You cannot access this company data")

    @router.get("/api/company/applications")
    def company_list_applications(
        job_id: int | None = None,
        current_user: dict = Depends(require_admin_or_recruiter),
        db=Depends(get_db),
    ):
        try:
            where = ["c.created_by = %s"]
            params = [current_user["id"]]
            if job_id:
                where.append("j.id = %s")
                params.append(job_id)

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    f"""
                    SELECT
                        a.id,
                        a.job_id,
                        j.title AS job_title,
                        j.company_id,
                        a.status,
                        a.matched_at,
                        a.created_at,
                        CONCAT_WS(' ', p.first_name, p.last_name) AS candidate_name,
                        p.id AS profile_id,
                        p.first_name,
                        p.last_name,
                        p.city,
                        p.job_target,
                        p.skills,
                        p.motivation,
                        p.avatar_url,
                        p.cv_url,
                        CASE
                            WHEN a.status = 'matched' THEN p.contact_email
                            ELSE NULL
                        END AS contact_email,
                        CASE
                            WHEN a.status = 'matched' THEN p.phone
                            ELSE NULL
                        END AS contact_phone
                    FROM applications a
                    JOIN jobs j ON j.id = a.job_id
                    JOIN companies c ON c.id = j.company_id
                    LEFT JOIN profiles p ON p.user_id = a.user_id
                    WHERE {" AND ".join(where)}
                    ORDER BY a.created_at DESC, a.id DESC
                    """,
                    tuple(params),
                )
                items = cur.fetchall()
            return {"items": items}
        except Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    @router.post("/api/company/applications/{application_id}/match")
    def company_match_application(
        application_id: int,
        current_user: dict = Depends(require_admin_or_recruiter),
        db=Depends(get_db),
    ):
        try:
            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT
                        a.id,
                        a.job_id,
                        a.user_id,
                        a.status,
                        j.company_id,
                        j.title,
                        c.created_by AS owner_id
                    FROM applications a
                    JOIN jobs j ON j.id = a.job_id
                    JOIN companies c ON c.id = j.company_id
                    WHERE a.id = %s
                    """,
                    (application_id,),
                )
                application = cur.fetchone()
            if not application:
                raise HTTPException(status_code=404, detail="Application not found")
            if application["owner_id"] != current_user["id"]:
                raise HTTPException(status_code=403, detail="Not your application")
            if application["status"] == "matched":
                raise HTTPException(status_code=409, detail="Already matched")

            with db.cursor() as cur:
                cur.execute(
                    """
                    UPDATE applications
                    SET status = 'matched',
                        matched_at = NOW()
                    WHERE id = %s
                    """,
                    (application_id,),
                )

            if application["user_id"]:
                with db.cursor(dictionary=True) as cur:
                    cur.execute(
                        """
                        INSERT INTO notifications
                            (recipient_user_id, type, message, job_id, application_id, created_at)
                        VALUES
                            (%s, %s, %s, %s, %s, NOW())
                        """,
                        (
                            application["user_id"],
                            "application:matched",
                            f"Votre candidature sur {application['title']} a été acceptée.",
                            application["job_id"],
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
                        j.company_id,
                        CONCAT_WS(' ', p.first_name, p.last_name) AS candidate_name,
                        p.id AS profile_id,
                        p.first_name,
                        p.last_name,
                        p.city,
                        p.job_target,
                        p.skills,
                        p.motivation,
                        p.avatar_url,
                        p.cv_url,
                        p.contact_email,
                        p.phone
                    FROM applications a
                    JOIN jobs j ON j.id = a.job_id
                    LEFT JOIN profiles p ON p.user_id = a.user_id
                    WHERE a.id = %s
                    """,
                    (application_id,),
                )
                updated = cur.fetchone()
            return updated
        except Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return router
