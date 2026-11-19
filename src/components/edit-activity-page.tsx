"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ActivityForm from "./activity-form";
import { LoadingScreen } from "./ui";
import type { Activity } from "@/lib/types";

export default function EditActivityPage() {
  const { id } = useParams<{ id: string }>();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/activities/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.activity) setActivity(d.activity);
        else setError(d.error || "加载失败");
      })
      .catch(() => setError("网络错误"));
  }, [id]);

  if (error) return <p className="text-sm text-red-500 py-10 text-center">{error}</p>;
  if (!activity) return <LoadingScreen />;
  return <ActivityForm initial={activity} activityId={id} />;
}
