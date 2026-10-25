import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { db } from "@/repositories/dexie/db";
import { convertCloudToLocal } from "@/services/sync.service";

const CLOUD_TO_LOCAL: Record<string, string> = {
  cloud_schools: "schools",
  cloud_teachers: "teachers",
  cloud_academic_years: "academicYears",
  cloud_classrooms: "classrooms",
  cloud_students: "students",
  cloud_attendance_sessions: "attendanceSessions",
  cloud_attendance_records: "attendanceRecords",
  cloud_calendar_entries: "calendarEntries",
};

const CLOUD_TABLES = Object.keys(CLOUD_TO_LOCAL);

export function useCloudRealtime(userId: string | null, enabled: boolean) {
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const handleChange = useCallback(async (tableName: string, payload: any) => {
    const localTable = CLOUD_TO_LOCAL[tableName];
    if (!localTable) return;

    const eventType = payload.eventType;

    try {
      if (eventType === "DELETE") {
        const old = payload.old;
        if (old?.local_id && !isNaN(old.local_id)) {
          // Amankan: jangan hapus data lokal kalau masih ada baris lain di cloud
          // dengan local_id yang sama (mis. saat pembersihan duplikat cloud
          // menghapus baris kembar — data asli tidak boleh ikut hilang).
          const uid = userIdRef.current;
          if (uid) {
            const { count } = await supabase
              .from(tableName)
              .select("*", { count: "exact", head: true })
              .eq("user_id", uid)
              .eq("local_id", old.local_id);
            if (count && count > 0) return; // masih ada salinannya → jangan hapus
          }
          await db.table(localTable).delete(old.local_id);
        }
      } else {
        const row = payload.new;
        if (!row?.local_id || isNaN(row.local_id)) return;

        const localData = convertCloudToLocal(row);
        const existing = await db.table(localTable).get(row.local_id);

        if (existing) {
          if ((row.diubah_pada || 0) >= ((existing as any).diubahPada || 0)) {
            await db.table(localTable).put(localData);
          }
        } else {
          await db.table(localTable).put(localData);
        }
      }

      // Tandai bahwa perubahan ini datang dari cloud, agar tidak di-upload ulang
      (window as any).__realtimeDirty = true;
      window.dispatchEvent(new Event("data-changed"));
      window.dispatchEvent(new CustomEvent("realtime-update", { detail: { table: localTable } }));
    } catch (err) {
      console.error(`[Realtime] Error handling ${eventType} on ${tableName}:`, err);
    }
  }, []);

  useEffect(() => {
    if (!userId || !enabled) return;

    const channel = supabase.channel(`cloud-sync-${userId}`, {
      config: { broadcast: { self: true } },
    });

    for (const tableName of CLOUD_TABLES) {
      channel.on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: tableName,
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => handleChange(tableName, payload)
      );
    }

    channel.subscribe((status) => {
      const connected = status === "SUBSCRIBED";
      setConnected(connected);
      window.dispatchEvent(new CustomEvent("realtime-status", { detail: { connected } }));
    });

    channelRef.current = channel;

    const handleVisibility = () => {
      if (!enabledRef.current) return;
      if (document.hidden) {
        channel.unsubscribe();
      } else {
        channel.subscribe();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setConnected(false);
    };
  }, [userId, enabled, handleChange]);

  return { connected };
}
