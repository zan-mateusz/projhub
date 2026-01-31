"use client";

import { useMemo } from "react";
import { format, differenceInDays, addDays, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Milestone {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
}

interface ProjectTimelineProps {
  milestones: Milestone[];
  projectStartDate: Date | null;
  projectEndDate: Date | null;
}

const statusColors: Record<string, string> = {
  on_track: "bg-green-500",
  at_risk: "bg-yellow-500",
  overdue: "bg-red-500",
  completed: "bg-blue-500",
};

export function ProjectTimeline({
  milestones,
  projectStartDate,
  projectEndDate,
}: ProjectTimelineProps) {
  const timelineData = useMemo(() => {
    // Filter milestones with dates
    const milestonesWithDates = milestones.filter(
      (m) => m.startDate || m.endDate
    );

    if (milestonesWithDates.length === 0) {
      return null;
    }

    // Calculate timeline bounds
    const allDates = milestonesWithDates.flatMap((m) => [
      m.startDate,
      m.endDate,
    ]).filter(Boolean) as Date[];

    if (projectStartDate) allDates.push(projectStartDate);
    if (projectEndDate) allDates.push(projectEndDate);

    const minDate = startOfDay(new Date(Math.min(...allDates.map((d) => d.getTime()))));
    const maxDate = endOfDay(new Date(Math.max(...allDates.map((d) => d.getTime()))));
    const totalDays = differenceInDays(maxDate, minDate) || 1;

    // Add today marker
    const today = new Date();
    const todayPosition = Math.max(
      0,
      Math.min(100, (differenceInDays(today, minDate) / totalDays) * 100)
    );

    return {
      minDate,
      maxDate,
      totalDays,
      todayPosition,
      milestones: milestonesWithDates.map((m) => {
        const start = m.startDate || m.endDate!;
        const end = m.endDate || m.startDate!;
        const startPosition = (differenceInDays(start, minDate) / totalDays) * 100;
        const width = Math.max(
          2,
          ((differenceInDays(end, start) || 1) / totalDays) * 100
        );

        return {
          ...m,
          startPosition,
          width,
        };
      }),
    };
  }, [milestones, projectStartDate, projectEndDate]);

  if (!timelineData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add dates to milestones to see them on the timeline
          </p>
        </CardContent>
      </Card>
    );
  }

  // Generate month markers
  const monthMarkers: { date: Date; position: number }[] = [];
  let currentDate = new Date(timelineData.minDate);
  currentDate.setDate(1);
  currentDate.setMonth(currentDate.getMonth() + 1);

  while (currentDate < timelineData.maxDate) {
    const position = (differenceInDays(currentDate, timelineData.minDate) / timelineData.totalDays) * 100;
    if (position > 0 && position < 100) {
      monthMarkers.push({ date: new Date(currentDate), position });
    }
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Date labels */}
          <div className="relative h-6 text-xs text-muted-foreground">
            <span className="absolute left-0">
              {format(timelineData.minDate, "MMM d")}
            </span>
            {monthMarkers.map((marker, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2"
                style={{ left: `${marker.position}%` }}
              >
                {format(marker.date, "MMM")}
              </span>
            ))}
            <span className="absolute right-0">
              {format(timelineData.maxDate, "MMM d")}
            </span>
          </div>

          {/* Timeline bars */}
          <div className="relative">
            {/* Background track */}
            <div className="h-2 rounded-full bg-muted" />

            {/* Today marker */}
            {timelineData.todayPosition >= 0 && timelineData.todayPosition <= 100 && (
              <div
                className="absolute top-0 h-2 w-0.5 bg-primary"
                style={{ left: `${timelineData.todayPosition}%` }}
                title={`Today: ${format(new Date(), "MMM d, yyyy")}`}
              />
            )}
          </div>

          {/* Milestone bars */}
          <div className="space-y-2">
            {timelineData.milestones.map((milestone) => (
              <div key={milestone.id} className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative h-6 flex-1">
                    <div
                      className={`absolute h-full rounded ${
                        statusColors[milestone.status] || "bg-gray-400"
                      } opacity-80`}
                      style={{
                        left: `${milestone.startPosition}%`,
                        width: `${milestone.width}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="text-xs font-medium truncate"
                    style={{ marginLeft: `${milestone.startPosition}%` }}
                  >
                    {milestone.title}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span>On Track</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-yellow-500" />
              <span>At Risk</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-red-500" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded bg-blue-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-0.5 bg-primary" />
              <span>Today</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
