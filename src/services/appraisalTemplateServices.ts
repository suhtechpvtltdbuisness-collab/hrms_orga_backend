import AppraisalTemplateRepository from "../repository/appraisalTemplate.repo.js";
import { users } from "../db/schema.js";

class AppraisalTemplateServices {
  private repo: AppraisalTemplateRepository;
  constructor() {
    this.repo = new AppraisalTemplateRepository();
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

  private normalizeGoals(goals: any[] = []) {
    return goals
      .filter((g) => g && (g.kra || g.goal))
      .map((g, index) => {
        const weightageRaw = String(g.weightage ?? "0").replace(/,/g, "");
        const weightage = Number(weightageRaw);
        return {
          srNo: g.srNo || String(index + 1).padStart(2, "0"),
          kra: String(g.kra || g.goal).trim(),
          weightage: Number.isFinite(weightage) ? weightage : 0,
          sortOrder: index,
        };
      });
  }

  async createTemplate(data: any, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    if (!data.title?.trim()) {
      throw new Error("Appraisal template title is required");
    }

    const existing = await this.repo.findByTitle(data.title.trim(), orgId);
    if (existing) {
      throw new Error("Appraisal template title already exists");
    }

    const template = await this.repo.createTemplate({
      organizationId: orgId,
      title: data.title.trim(),
      description: data.description || null,
      createdBy: currentUser.id,
    });

    const goalRows = this.normalizeGoals(data.goals).map((g) => ({
      templateId: template.id,
      ...g,
      weightage: String(g.weightage),
    }));
    const goals = await this.repo.createGoals(goalRows);

    return {
      success: true,
      message: "successfully created appraisal template",
      data: { ...template, goals },
    };
  }

  async getTemplateById(id: number, currentUser: typeof users.$inferSelect) {
    const orgId = this.requireOrg(currentUser);
    const result = await this.repo.getTemplateWithGoals(id);
    if (!result || result.organizationId !== orgId) {
      throw new Error("Appraisal template not found");
    }
    return {
      success: true,
      message: "successfully fetched appraisal template",
      data: result,
    };
  }

  async getAllTemplates(
    currentUser: typeof users.$inferSelect,
    query: { search?: string; page?: number; limit?: number },
  ) {
    const orgId = this.requireOrg(currentUser);
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 50;
    const offset = (page - 1) * limit;

    const templates = await this.repo.getAllTemplates(
      orgId,
      query.search,
      limit,
      offset,
    );
    const total = await this.repo.countTemplates(orgId, query.search);

    return {
      success: true,
      message: "successfully fetched appraisal templates",
      data: {
        templates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getDropdown(currentUser: typeof users.$inferSelect) {
    const orgId = this.requireOrg(currentUser);
    const result = await this.repo.getDropdown(orgId);
    return {
      success: true,
      message: "successfully fetched appraisal templates dropdown",
      data: result,
    };
  }

  async updateTemplate(
    id: number,
    data: any,
    currentUser: typeof users.$inferSelect,
  ) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    const existing = await this.repo.getTemplateById(id);
    if (!existing || existing.organizationId !== orgId) {
      throw new Error("Appraisal template not found");
    }

    if (data.title?.trim() && data.title.trim() !== existing.title) {
      const dup = await this.repo.findByTitle(data.title.trim(), orgId, id);
      if (dup) {
        throw new Error("Appraisal template title already exists");
      }
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description;

    const template = await this.repo.updateTemplate(id, updateData);

    let goals;
    if (Array.isArray(data.goals)) {
      const goalRows = this.normalizeGoals(data.goals).map((g) => ({
        templateId: id,
        ...g,
        weightage: String(g.weightage),
      }));
      goals = await this.repo.replaceGoals(id, goalRows);
    } else {
      goals = await this.repo.getGoalsByTemplateId(id);
    }

    return {
      success: true,
      message: "successfully updated appraisal template",
      data: { ...template, goals },
    };
  }

  async deleteTemplate(id: number, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    const existing = await this.repo.getTemplateById(id);
    if (!existing || existing.organizationId !== orgId) {
      throw new Error("Appraisal template not found");
    }

    const result = await this.repo.softDeleteTemplate(id);
    return {
      success: true,
      message: "successfully deleted appraisal template",
      data: result,
    };
  }
}

export default AppraisalTemplateServices;
