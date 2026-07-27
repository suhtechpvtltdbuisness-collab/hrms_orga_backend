import AppraisalRepository from "../repository/appraisal.repo.js";
import AppraisalTemplateRepository from "../repository/appraisalTemplate.repo.js";
import { users } from "../db/schema.js";

class AppraisalServices {
  private repo: AppraisalRepository;
  private templateRepo: AppraisalTemplateRepository;
  constructor() {
    this.repo = new AppraisalRepository();
    this.templateRepo = new AppraisalTemplateRepository();
  }

  private requireOrg(user: typeof users.$inferSelect) {
    if (!user.organizationId) {
      throw new Error("User does not belong to any organization");
    }
    return user.organizationId;
  }

  private requireAdmin(user: typeof users.$inferSelect) {
    if (user.roleId !== 0 && user.roleId !== 1) {
      throw new Error("Only admins can perform this action");
    }
  }

  private calcEarned(score: number, weightage: number) {
    return Number(((score / 5) * weightage).toFixed(3));
  }

  private async generateSeries(organizationId: number) {
    const year = new Date().getFullYear();
    const sequence = await this.repo.getNextSeriesSequence(organizationId, year);
    return `HR-APR-${year}-${String(sequence).padStart(4, "0")}`;
  }

  private normalizeGoals(goals: any[] = []) {
    return goals
      .filter((g) => g && (g.goal || g.kra))
      .map((g, index) => {
        const weightage = Number(String(g.weightage ?? 0).replace(/,/g, "")) || 0;
        let score = Number(g.score ?? 0);
        if (!Number.isFinite(score)) score = 0;
        if (score < 0) score = 0;
        if (score > 5) score = 5;
        const earned =
          g.earned !== undefined && g.earned !== null && g.earned !== ""
            ? Number(g.earned)
            : this.calcEarned(score, weightage);
        return {
          templateGoalId: g.templateGoalId ? Number(g.templateGoalId) : null,
          srNo: g.srNo || String(index + 1).padStart(2, "0"),
          goal: String(g.goal || g.kra).trim(),
          weightage,
          score,
          earned: Number.isFinite(earned) ? earned : 0,
          sortOrder: index,
        };
      });
  }

  async createAppraisal(data: any, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    if (!data.empId) {
      throw new Error("Employee (empId) is required");
    }

    let templateId = data.templateId ? Number(data.templateId) : null;
    let goalsInput = data.goals;

    if (templateId) {
      const template = await this.templateRepo.getTemplateWithGoals(templateId);
      if (!template || template.organizationId !== orgId) {
        throw new Error("Appraisal template not found");
      }
      if (!Array.isArray(goalsInput) || goalsInput.length === 0) {
        goalsInput = template.goals.map((g) => ({
          templateGoalId: g.id,
          srNo: g.srNo,
          goal: g.kra,
          weightage: g.weightage,
          score: 0,
          earned: 0,
        }));
      }
    }

    const goals = this.normalizeGoals(goalsInput || []);
    const totalScore = goals.reduce((sum, g) => sum + g.earned, 0);

    const empDept = await this.repo.getEmployeeDepartment(Number(data.empId));
    const departmentId =
      data.departmentId !== undefined
        ? data.departmentId
          ? Number(data.departmentId)
          : null
        : empDept?.departmentId ?? null;

    const created = await this.repo.createAppraisal({
      organizationId: orgId,
      series: await this.generateSeries(orgId),
      templateId,
      empId: Number(data.empId),
      departmentId,
      status: data.status || "Draft",
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      remarks: data.remarks || null,
      totalScore: String(totalScore.toFixed(3)),
      createdBy: currentUser.id,
    });

    const goalRows = goals.map((g) => ({
      appraisalId: created.id,
      templateGoalId: g.templateGoalId,
      srNo: g.srNo,
      goal: g.goal,
      weightage: String(g.weightage),
      score: String(g.score),
      earned: String(g.earned),
      sortOrder: g.sortOrder,
    }));
    const savedGoals = await this.repo.createGoals(goalRows);

    return {
      success: true,
      message: "successfully created appraisal",
      data: {
        ...created,
        departmentName: empDept?.departmentName ?? null,
        goals: savedGoals,
      },
    };
  }

  async getAppraisalById(id: number, currentUser: typeof users.$inferSelect) {
    const orgId = this.requireOrg(currentUser);
    const result = await this.repo.getAppraisalWithGoals(id);
    if (!result || result.organizationId !== orgId) {
      throw new Error("Appraisal not found");
    }
    return {
      success: true,
      message: "successfully fetched appraisal",
      data: result,
    };
  }

  async getAllAppraisals(
    currentUser: typeof users.$inferSelect,
    query: {
      search?: string;
      empId?: number;
      status?: string;
      templateId?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const orgId = this.requireOrg(currentUser);
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    const filters = {
      search: query.search,
      empId: query.empId ? Number(query.empId) : undefined,
      status: query.status,
      templateId: query.templateId ? Number(query.templateId) : undefined,
      limit,
      offset,
    };

    const appraisals = await this.repo.getAllAppraisals(orgId, filters);
    const total = await this.repo.countAppraisals(orgId, filters);

    return {
      success: true,
      message: "successfully fetched appraisals",
      data: {
        appraisals,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateAppraisal(
    id: number,
    data: any,
    currentUser: typeof users.$inferSelect,
  ) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    const existing = await this.repo.getAppraisalById(id);
    if (!existing || existing.organizationId !== orgId) {
      throw new Error("Appraisal not found");
    }

    const updateData: any = {};
    if (data.templateId !== undefined) {
      updateData.templateId = data.templateId ? Number(data.templateId) : null;
    }
    if (data.empId !== undefined) updateData.empId = Number(data.empId);
    if (data.departmentId !== undefined) {
      updateData.departmentId = data.departmentId
        ? Number(data.departmentId)
        : null;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;

    let goals;
    if (Array.isArray(data.goals)) {
      const normalized = this.normalizeGoals(data.goals);
      const totalScore = normalized.reduce((sum, g) => sum + g.earned, 0);
      updateData.totalScore = String(totalScore.toFixed(3));
      goals = await this.repo.replaceGoals(
        id,
        normalized.map((g) => ({
          appraisalId: id,
          templateGoalId: g.templateGoalId,
          srNo: g.srNo,
          goal: g.goal,
          weightage: String(g.weightage),
          score: String(g.score),
          earned: String(g.earned),
          sortOrder: g.sortOrder,
        })),
      );
    } else {
      goals = await this.repo.getGoalsByAppraisalId(id);
    }

    const updated = await this.repo.updateAppraisal(id, updateData);
    return {
      success: true,
      message: "successfully updated appraisal",
      data: { ...updated, goals },
    };
  }

  async deleteAppraisal(id: number, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    const existing = await this.repo.getAppraisalById(id);
    if (!existing || existing.organizationId !== orgId) {
      throw new Error("Appraisal not found");
    }

    const result = await this.repo.softDeleteAppraisal(id);
    return {
      success: true,
      message: "successfully deleted appraisal",
      data: result,
    };
  }
}

export default AppraisalServices;
