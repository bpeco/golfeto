"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { LandPlot, Trash } from "lucide-react";
import { toast } from "@/lib/toast";
import { cancelReplace, expectReplace } from "@/lib/nav-history";
import { ActionMenu, type Action } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/use-confirm";
import { deleteRound } from "../actions";
import type { CourseSheetProps } from "./course-sheet";

const loadCourseSheet = () => import("./course-sheet");
const CourseSheet = dynamic(loadCourseSheet, { ssr: false });

/**
 * Menú ⋯ de la partida: cambiar la cancha (participantes y quien la creó) y dar de baja (solo quien
 * la creó).
 */
export function RoundMenu({ roundId, canDelete, courseChange }: { roundId: string; canDelete: boolean; courseChange: CourseSheetProps | null }) {
  const [pending, start] = useTransition();
  const [courseOpen, setCourseOpen] = useState(false);
  const [courseMounted, setCourseMounted] = useState(false);
  const confirm = useConfirm();

  async function remove() {
    const res = await confirm({
      title: "¿Dar de baja la partida?",
      body: "Solo se puede si nadie firmó. Queda dada de baja, no se borra.",
      confirmLabel: "Dar de baja",
      tone: "destructive",
    });
    if (!res.ok) return;
    start(async () => {
      expectReplace();
      const r = await deleteRound(roundId);
      if (r && !r.ok) {
        cancelReplace();
        toast.error(r.error);
      }
    });
  }

  const actions: Action[] = [];
  if (courseChange) {
    actions.push({
      label: "Cambiar cancha",
      icon: <LandPlot />,
      onSelect: () => {
        void loadCourseSheet();
        setCourseMounted(true);
        setCourseOpen(true);
      },
    });
  }
  if (canDelete) actions.push({ label: "Dar de baja la partida", icon: <Trash />, onSelect: remove, destructive: true });

  return (
    <>
      <ActionMenu label="Más acciones de la partida" pending={pending} actions={actions} />
      {courseChange && courseMounted && <CourseSheet open={courseOpen} onOpenChange={setCourseOpen} {...courseChange} />}
    </>
  );
}
