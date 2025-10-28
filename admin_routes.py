from fastapi import APIRouter, Depends, HTTPException, Response
from mysql.connector import Error


def create_admin_router(get_db, require_admin, hash_password):
    router = APIRouter()

    @router.get("/api/admin/stats")
    def admin_stats(
        db=Depends(get_db),
        _: dict = Depends(require_admin),
    ):
        try:
            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT
                      (SELECT COUNT(*) FROM users) AS total_users,
                      (SELECT COUNT(*) FROM users WHERE role='admin') AS total_admins,
                      (SELECT COUNT(*) FROM users WHERE role='recruiter') AS total_recruiters,
                      (SELECT COUNT(*) FROM companies) AS total_companies,
                      (SELECT COUNT(*) FROM jobs) AS total_jobs,
                      (SELECT COUNT(*) FROM applications) AS total_applications
                    """
                )
                stats = cur.fetchone() or {}

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT id, email, role, created_at
                    FROM users
                    ORDER BY created_at DESC, id DESC
                    LIMIT 5
                    """
                )
                latest_users = cur.fetchall()

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT id, name, created_at
                    FROM companies
                    ORDER BY created_at DESC, id DESC
                    LIMIT 5
                    """
                )
                latest_companies = cur.fetchall()

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT j.id, j.title, j.created_at, c.name AS company_name
                    FROM jobs j
                    JOIN companies c ON c.id = j.company_id
                    ORDER BY j.created_at DESC, j.id DESC
                    LIMIT 5
                    """
                )
                latest_jobs = cur.fetchall()

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    """
                    SELECT a.id, a.job_id, a.created_at, a.status,
                           COALESCE(a.email, u.email) AS candidate_email,
                           j.title AS job_title
                    FROM applications a
                    LEFT JOIN users u ON u.id = a.user_id
                    JOIN jobs j ON j.id = a.job_id
                    ORDER BY a.created_at DESC, a.id DESC
                    LIMIT 5
                    """
                )
                latest_applications = cur.fetchall()

            return {
                "stats": stats,
                "latest_users": latest_users,
                "latest_companies": latest_companies,
                "latest_jobs": latest_jobs,
                "latest_applications": latest_applications,
            }
        except Error as e:
            raise HTTPException(status_code=500, detail=f"DB error: {e}")

    @router.get("/api/applications")
    def admin_list_applications(
        q: str | None = None,
        job_id: int | None = None,
        company_id: int | None = None,
        page: int = 1,
        page_size: int = 20,
        db=Depends(get_db),
        _: dict = Depends(require_admin),
    ):
        try:
            page = max(1, int(page))
            page_size = max(1, min(100, int(page_size)))
            offset = (page - 1) * page_size

            where: list[str] = []
            params: list = []

            if job_id is not None:
                where.append("a.job_id = %s")
                params.append(int(job_id))
            if company_id is not None:
                where.append("j.company_id = %s")
                params.append(int(company_id))
            if q:
                like = f"%{q}%"
                where.append(
                    "(COALESCE(a.name, CONCAT_WS(' ', p.first_name, p.last_name)) LIKE %s "
                    "OR COALESCE(a.email, u.email) LIKE %s "
                    "OR j.title LIKE %s OR c.name LIKE %s)"
                )
                params.extend([like, like, like, like])

            where_sql = "WHERE " + " AND ".join(where) if where else ""

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    f"""
                    SELECT COUNT(*) AS total
                    FROM applications a
                    JOIN jobs j ON j.id = a.job_id
                    JOIN companies c ON c.id = j.company_id
                    LEFT JOIN users u ON u.id = a.user_id
                    LEFT JOIN profiles p ON p.user_id = a.user_id
                    {where_sql}
                    """,
                    tuple(params),
                )
                total = cur.fetchone()["total"]

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    f"""
                    SELECT
                        a.id,
                        a.job_id,
                        j.title AS job_title,
                        j.company_id,
                        c.name AS company_name,
                        a.user_id,
                        COALESCE(a.name, CONCAT_WS(' ', p.first_name, p.last_name)) AS candidate_name,
                        COALESCE(a.email, u.email) AS candidate_email,
                        COALESCE(a.phone, p.phone) AS candidate_phone,
                        a.status,
                        a.created_at
                    FROM applications a
                    JOIN jobs j ON j.id = a.job_id
                    JOIN companies c ON c.id = j.company_id
                    LEFT JOIN users u ON u.id = a.user_id
                    LEFT JOIN profiles p ON p.user_id = a.user_id
                    {where_sql}
                    ORDER BY a.created_at DESC, a.id DESC
                    LIMIT %s OFFSET %s
                    """,
                    tuple(params + [page_size, offset]),
                )
                items = cur.fetchall()

            return {"items": items, "page": page, "page_size": page_size, "total": total}
        except Error as e:
            raise HTTPException(status_code=500, detail=f"Query failed: {e}")

    @router.get("/api/applications/{application_id}")
    def admin_get_application(
        application_id: int,
        db=Depends(get_db),
        _: dict = Depends(require_admin),
    ):
        with db.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT
                    a.id,
                    a.job_id,
                    j.title AS job_title,
                    j.company_id,
                    c.name AS company_name,
                    a.user_id,
                    COALESCE(a.name, CONCAT_WS(' ', p.first_name, p.last_name)) AS candidate_name,
                    COALESCE(a.email, u.email) AS candidate_email,
                    COALESCE(a.phone, p.phone) AS candidate_phone,
                    a.message,
                    a.cv_url,
                    a.status,
                    a.created_at
                FROM applications a
                JOIN jobs j ON j.id = a.job_id
                JOIN companies c ON c.id = j.company_id
                LEFT JOIN users u ON u.id = a.user_id
                LEFT JOIN profiles p ON p.user_id = a.user_id
                WHERE a.id = %s
                """,
                (application_id,),
            )
            app_row = cur.fetchone()
        if not app_row:
            raise HTTPException(status_code=404, detail="Application not found")
        return app_row

    @router.patch("/api/applications/{application_id}")
    def admin_update_application(
        application_id: int,
        payload: dict,
        db=Depends(get_db),
        _: dict = Depends(require_admin),
    ):
        if not payload:
            raise HTTPException(status_code=400, detail="empty payload")

        updates = {}
        status = payload.get("status")
        if status is not None:
            status = status.strip()
            if not status:
                raise HTTPException(status_code=400, detail="status cannot be empty")
            updates["status"] = status
        if "message" in payload:
            updates["message"] = payload.get("message")
        if "cv_url" in payload:
            updates["cv_url"] = payload.get("cv_url")

        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        set_clause = ", ".join(f"{col}=%s" for col in updates.keys())
        values = list(updates.values())

        with db.cursor() as cur:
            cur.execute(
                f"UPDATE applications SET {set_clause} WHERE id=%s",
                (*values, application_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Application not found")

        return {"id": application_id, **updates}

    @router.delete("/api/applications/{application_id}", status_code=204)
    def admin_delete_application(
        application_id: int,
        db=Depends(get_db),
        _: dict = Depends(require_admin),
    ):
        with db.cursor() as cur:
            cur.execute("DELETE FROM applications WHERE id=%s", (application_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Application not found")
        return Response(status_code=204)

    @router.delete("/api/users/{user_id}", status_code=204)
    def delete_user(
        user_id: int,
        db=Depends(get_db),
        _: dict = Depends(require_admin),
    ):
        # Nettoyage explicite des données liées pour éviter les orphelins visibles côté UI
        # 1) Notifications liées aux candidatures du user
        with db.cursor() as cur:
            cur.execute("SELECT id FROM applications WHERE user_id=%s", (user_id,))
            # Consommer systématiquement le résultat pour éviter l'erreur
            # mysql.connector.errors.InternalError: Unread result found
            app_ids = [row[0] for row in cur.fetchall()]
            if app_ids:
                ids_tuple = tuple(app_ids)
                in_clause = ",".join(["%s"] * len(ids_tuple))
                cur.execute(f"DELETE FROM notifications WHERE application_id IN ({in_clause})", ids_tuple)

        # 2) Notifications reçues par le user (sera de toute façon supprimé par FK CASCADE, mais explicite)
        with db.cursor() as cur:
            cur.execute("DELETE FROM notifications WHERE recipient_user_id=%s", (user_id,))

        # 3) Candidatures du user (sinon FK SET NULL les laisse visibles)
        with db.cursor() as cur:
            cur.execute("DELETE FROM applications WHERE user_id=%s", (user_id,))

        # 4) Notifications liées aux jobs appartenant à ses entreprises (si recruteur)
        with db.cursor() as cur:
            cur.execute(
                """
                DELETE n FROM notifications n
                WHERE n.job_id IN (
                    SELECT j.id FROM jobs j
                    JOIN companies c ON c.id = j.company_id
                    WHERE c.created_by = %s
                )
                """,
                (user_id,),
            )

        # 5) Suppression de l'utilisateur (FKs gèrent profiles/companies/jobs/applications restantes)
        with db.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="User not found")
        return Response(status_code=204)

    @router.patch("/api/users/{user_id}")
    def update_user(
        user_id: int,
        payload: dict,
        db=Depends(get_db),
        _: dict = Depends(require_admin),
    ):
        if not payload:
            raise HTTPException(status_code=400, detail="empty payload")

        updates = {}
        email = payload.get("email")
        role = payload.get("role")
        password = payload.get("password")

        if email:
            updates["email"] = email.strip().lower()
        if role:
            if role not in {"user", "recruiter", "admin"}:
                raise HTTPException(status_code=400, detail="invalid role")
            updates["role"] = role
        if password:
            updates["password_hash"] = hash_password(password)

        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        try:
            with db.cursor() as cur:
                if "email" in updates:
                    cur.execute(
                        "SELECT id FROM users WHERE email=%s AND id<>%s",
                        (updates["email"], user_id),
                    )
                    if cur.fetchone():
                        raise HTTPException(status_code=409, detail="email already exists")

                set_clause = ", ".join(f"{col}=%s" for col in updates.keys())
                cur.execute(
                    f"UPDATE users SET {set_clause} WHERE id=%s",
                    (*updates.values(), user_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="User not found")
            return {"id": user_id, **{k: v for k, v in updates.items() if k != "password_hash"}}
        except HTTPException:
            raise
        except Error as e:
            raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return router
