import { users } from "../db/schema.js";
import { DashboardRepository } from "../repository/dashboard.repo.js";

function indiaDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export class DashboardServices {
  private repo = new DashboardRepository();

  async getAdminDashboard(currentUser: typeof users.$inferSelect) {
    if (!currentUser.isAdmin && currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can view the admin dashboard");
    }

    const today = indiaDateKey();
    const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
    const yesterday = dates[5];
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [employeeSummary, attendanceRows, requestSummary, jobs, attendanceActivity, leaveActivity] =
      await Promise.all([
        this.repo.getEmployeeSummary(currentUser.id, monthStart, nextMonthStart),
        this.repo.getAttendanceByDates(currentUser.id, dates),
        this.repo.getRequestSummary(currentUser.id),
        this.repo.getJobs(currentUser.id),
        this.repo.getRecentAttendance(currentUser.id),
        this.repo.getRecentLeaveRequests(currentUser.id),
      ]);

    const countsByDate = new Map<string, { present: number; absent: number; leave: number }>();
    for (const date of dates) countsByDate.set(date, { present: 0, absent: 0, leave: 0 });
    for (const row of attendanceRows) {
      const values = countsByDate.get(row.date);
      if (!values) continue;
      const amount = Number(row.value);
      if (row.status === "present" || row.status === "half_day") values.present += amount;
      else if (row.status === "on_leave") values.leave += amount;
      else if (row.status === "absent") values.absent += amount;
    }

    const dailyCounts = dates.map((date) => {
      const values = countsByDate.get(date)!;
      const absent = Math.max(values.absent, employeeSummary.total - values.present - values.leave);
      return { date, present: values.present, absent, leave: values.leave };
    });
    const todayCounts = dailyCounts[6];
    const yesterdayCounts = dailyCounts[5];
    const toPercent = (value: number) =>
      employeeSummary.total ? Math.round((value / employeeSummary.total) * 100) : 0;
    const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
    const weeklyAttendance = dailyCounts.map((item) => ({
      date: item.date,
      day: dayFormatter.format(new Date(`${item.date}T00:00:00Z`)),
      Present: toPercent(item.present),
      Absent: toPercent(item.absent),
      Leave: toPercent(item.leave),
    }));

    const activeJobs = jobs.filter((job) => job.isActive);
    const recentActivity = [
      ...attendanceActivity.map((item) => ({
        id: `attendance-${item.id}`,
        name: item.name,
        action:
          item.status === "present"
            ? "checked in successfully"
            : item.status === "on_leave"
              ? "was marked on leave"
              : "was marked absent",
        occurredAt: item.occurredAt,
      })),
      ...leaveActivity.map((item) => ({
        id: `leave-${item.id}`,
        name: item.name,
        action:
          item.status === "submitted"
            ? "submitted a leave request"
            : `leave request was ${item.status}`,
        occurredAt: item.occurredAt,
      })),
    ]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 5)
      .map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString() }));

    const employeesBeforeMonth = Math.max(
      0,
      employeeSummary.total - employeeSummary.joinedThisMonth,
    );

    return {
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        stats: {
          totalEmployees: employeeSummary.total,
          presentToday: todayCounts.present,
          absentToday: todayCounts.absent,
          pendingLeave: requestSummary.pendingLeave,
          activeTasks: requestSummary.pendingTasks,
          totalTasks: requestSummary.totalTasks,
          activeJobs: activeJobs.length,
        },
        trends: {
          totalEmployees: percentageChange(employeeSummary.total, employeesBeforeMonth),
          presentToday: percentageChange(todayCounts.present, yesterdayCounts.present),
          absentToday: percentageChange(todayCounts.absent, yesterdayCounts.absent),
        },
        weeklyAttendance,
        recentActivity,
        recentJobs: jobs.slice(0, 4).map((job) => ({
          id: job.id,
          title: job.title,
          department: job.department ?? "Unassigned",
          location: job.location ?? "Not specified",
          status: job.isActive ? "active" : "inactive",
          openings: job.openings ?? 0,
        })),
      },
    };
  }
}
