from fastapi import APIRouter, Depends, HTTPException
from mysql.connector import Error


def create_notifications_router(get_db, require_user):
    router = APIRouter()

    @router.get("/api/me/notifications")
    def list_notifications(
        only_unread: bool | None = None,
        limit: int = 20,
        current_user: dict = Depends(require_user),
        db=Depends(get_db),
    ):
        try:
            limit = max(1, min(100, int(limit)))
            where = ["n.recipient_user_id = %s"]
            params = [current_user["id"]]
            if only_unread:
                where.append("n.is_read = 0")
            where_sql = " AND ".join(where)

            with db.cursor(dictionary=True) as cur:
                cur.execute(
                    f"""
                    SELECT
                        n.id,
                        n.type,
                        n.message,
                        n.job_id,
                        n.application_id,
                        n.is_read,
                        n.created_at,
                        CASE
                            WHEN n.type = 'application:matched' AND n.recipient_user_id = a.user_id
                                THEN uc.email
                            WHEN n.type = 'application:matched' AND n.recipient_user_id = c.created_by
                                THEN p.contact_email
                            ELSE NULL
                        END AS contact_email,
                        CASE
                            WHEN n.type = 'application:matched' AND n.recipient_user_id = a.user_id
                                THEN c.name
                            WHEN n.type = 'application:matched' AND n.recipient_user_id = c.created_by
                                THEN CONCAT_WS(' ', p.first_name, p.last_name)
                            ELSE NULL
                        END AS contact_name,
                        CASE
                            -- Quand le destinataire est le candidat, le contact attendu est l'entreprise
                            WHEN n.type = 'application:matched' AND n.recipient_user_id = a.user_id
                                THEN 'company'
                            -- Quand le destinataire est l'entreprise, le contact attendu est le candidat
                            WHEN n.type = 'application:matched' AND n.recipient_user_id = c.created_by
                                THEN 'candidate'
                            ELSE NULL
                        END AS contact_role
                    FROM notifications n
                    LEFT JOIN applications a ON a.id = n.application_id
                    LEFT JOIN profiles p ON p.user_id = a.user_id
                    LEFT JOIN jobs j ON j.id = a.job_id
                    LEFT JOIN companies c ON c.id = j.company_id
                    LEFT JOIN users uc ON uc.id = c.created_by
                    WHERE {where_sql}
                    ORDER BY n.created_at DESC, n.id DESC
                    LIMIT %s
                    """,
                    tuple(params + [limit]),
                )
                items = cur.fetchall()
            return {"items": items}
        except Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    @router.post("/api/me/notifications/{notification_id}/read")
    def mark_notification_read(
        notification_id: int,
        current_user: dict = Depends(require_user),
        db=Depends(get_db),
    ):
        try:
            with db.cursor() as cur:
                cur.execute(
                    """
                    UPDATE notifications
                    SET is_read = 1,
                        read_at = NOW()
                    WHERE id = %s AND recipient_user_id = %s
                    """,
                    (notification_id, current_user["id"]),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="Notification not found")
            return {"ok": True}
        except HTTPException:
            raise
        except Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    @router.post("/api/me/notifications/read-all")
    def mark_all_notifications_read(
        current_user: dict = Depends(require_user),
        db=Depends(get_db),
    ):
        try:
            with db.cursor() as cur:
                cur.execute(
                    """
                    UPDATE notifications
                    SET is_read = 1,
                        read_at = NOW()
                    WHERE recipient_user_id = %s AND is_read = 0
                    """,
                    (current_user["id"],),
                )
            return {"ok": True}
        except Error as e:
            raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return router
