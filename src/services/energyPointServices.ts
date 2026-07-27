import EnergyPointRepository from "../repository/energyPoint.repo.js";
import { users } from "../db/schema.js";

class EnergyPointServices {
  private repo: EnergyPointRepository;
  constructor() {
    this.repo = new EnergyPointRepository();
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

  // ---- Rules ----
  async createRule(data: any, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    if (!data.ruleName?.trim()) {
      throw new Error("Rule name is required");
    }

    const result = await this.repo.createRule({
      organizationId: orgId,
      ruleName: data.ruleName.trim(),
      enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
      referenceDocumentType: data.referenceDocumentType || null,
      forDocumentEvent: data.forDocumentEvent || "Custom",
      points: data.points !== undefined ? Number(data.points) : 0,
      allotPointsToUser: Boolean(data.allotPointsToUser),
      userField: data.userField || "Owner",
      multiplierField: data.multiplierField || null,
      applyOnlyOnce: Boolean(data.applyOnlyOnce),
      condition: data.condition || null,
      createdBy: currentUser.id,
    });

    return {
      success: true,
      message: "successfully created energy point rule",
      data: {
        ...result,
        status: result.enabled ? "Enabled" : "Disabled",
        name: result.ruleName,
        referenceDocument: result.referenceDocumentType,
      },
    };
  }

  async getRuleById(id: number, currentUser: typeof users.$inferSelect) {
    const orgId = this.requireOrg(currentUser);
    const result = await this.repo.getRuleById(id);
    if (!result || result.organizationId !== orgId) {
      throw new Error("Energy point rule not found");
    }
    return {
      success: true,
      message: "successfully fetched energy point rule",
      data: {
        ...result,
        status: result.enabled ? "Enabled" : "Disabled",
        name: result.ruleName,
        referenceDocument: result.referenceDocumentType,
      },
    };
  }

  async getAllRules(
    currentUser: typeof users.$inferSelect,
    query: {
      search?: string;
      enabled?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const orgId = this.requireOrg(currentUser);
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    const enabled =
      query.enabled === undefined
        ? undefined
        : query.enabled === "true" || query.enabled === "1";

    const filters = { search: query.search, enabled, limit, offset };
    const rules = await this.repo.getAllRules(orgId, filters);
    const total = await this.repo.countRules(orgId, filters);

    return {
      success: true,
      message: "successfully fetched energy point rules",
      data: {
        rules: rules.map((r, index) => ({
          ...r,
          srNo: String(offset + index + 1).padStart(2, "0"),
          status: r.enabled ? "Enabled" : "Disabled",
          name: r.ruleName,
          referenceDocument: r.referenceDocumentType,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateRule(
    id: number,
    data: any,
    currentUser: typeof users.$inferSelect,
  ) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    const existing = await this.repo.getRuleById(id);
    if (!existing || existing.organizationId !== orgId) {
      throw new Error("Energy point rule not found");
    }

    const updateData: any = {};
    if (data.ruleName !== undefined) updateData.ruleName = data.ruleName.trim();
    if (data.enabled !== undefined) updateData.enabled = Boolean(data.enabled);
    if (data.referenceDocumentType !== undefined) {
      updateData.referenceDocumentType = data.referenceDocumentType;
    }
    if (data.forDocumentEvent !== undefined) {
      updateData.forDocumentEvent = data.forDocumentEvent;
    }
    if (data.points !== undefined) updateData.points = Number(data.points);
    if (data.allotPointsToUser !== undefined) {
      updateData.allotPointsToUser = Boolean(data.allotPointsToUser);
    }
    if (data.userField !== undefined) updateData.userField = data.userField;
    if (data.multiplierField !== undefined) {
      updateData.multiplierField = data.multiplierField;
    }
    if (data.applyOnlyOnce !== undefined) {
      updateData.applyOnlyOnce = Boolean(data.applyOnlyOnce);
    }
    if (data.condition !== undefined) updateData.condition = data.condition;

    const result = await this.repo.updateRule(id, updateData);
    return {
      success: true,
      message: "successfully updated energy point rule",
      data: {
        ...result,
        status: result.enabled ? "Enabled" : "Disabled",
        name: result.ruleName,
        referenceDocument: result.referenceDocumentType,
      },
    };
  }

  async deleteRule(id: number, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    const existing = await this.repo.getRuleById(id);
    if (!existing || existing.organizationId !== orgId) {
      throw new Error("Energy point rule not found");
    }

    const result = await this.repo.softDeleteRule(id);
    return {
      success: true,
      message: "successfully deleted energy point rule",
      data: result,
    };
  }

  // ---- Logs ----
  async createLog(data: any, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    if (!data.empId) {
      throw new Error("Employee (empId) is required");
    }

    if (data.ruleId) {
      const rule = await this.repo.getRuleById(Number(data.ruleId));
      if (!rule || rule.organizationId !== orgId) {
        throw new Error("Energy point rule not found");
      }
    }

    const result = await this.repo.createLog({
      organizationId: orgId,
      empId: Number(data.empId),
      ruleId: data.ruleId ? Number(data.ruleId) : null,
      status: data.status || "Auto",
      points: data.points !== undefined ? Number(data.points) : 0,
      referenceDocumentType:
        data.referenceDocumentType || data.referenceDocument || null,
      referenceDocumentId: data.referenceDocumentId || null,
      createdBy: currentUser.id,
    });

    const full = await this.repo.getLogById(result.id);
    return {
      success: true,
      message: "successfully created energy point log",
      data: full,
    };
  }

  async getLogById(id: number, currentUser: typeof users.$inferSelect) {
    const orgId = this.requireOrg(currentUser);
    const result = await this.repo.getLogById(id);
    if (!result || result.organizationId !== orgId) {
      throw new Error("Energy point log not found");
    }
    return {
      success: true,
      message: "successfully fetched energy point log",
      data: result,
    };
  }

  async getAllLogs(
    currentUser: typeof users.$inferSelect,
    query: {
      name?: string;
      user?: string;
      rule?: string;
      referenceDocument?: string;
      empId?: number;
      page?: number;
      limit?: number;
    },
  ) {
    const orgId = this.requireOrg(currentUser);
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = (page - 1) * limit;

    const filters = {
      name: query.name,
      user: query.user,
      rule: query.rule,
      referenceDocument: query.referenceDocument,
      empId: query.empId ? Number(query.empId) : undefined,
      limit,
      offset,
    };

    const logs = await this.repo.getAllLogs(orgId, filters);
    const total = await this.repo.countLogs(orgId, filters);

    return {
      success: true,
      message: "successfully fetched energy point logs",
      data: {
        logs: logs.map((l, index) => ({
          ...l,
          srNo: String(offset + index + 1).padStart(2, "0"),
          action: "View Reference",
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async deleteLog(id: number, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    const existing = await this.repo.getLogById(id);
    if (!existing || existing.organizationId !== orgId) {
      throw new Error("Energy point log not found");
    }

    const result = await this.repo.softDeleteLog(id);
    return {
      success: true,
      message: "successfully deleted energy point log",
      data: result,
    };
  }

  // ---- Settings ----
  async getSettings(currentUser: typeof users.$inferSelect) {
    const orgId = this.requireOrg(currentUser);
    let settings = await this.repo.getSettingsByOrg(orgId);

    if (!settings) {
      settings = await this.repo.upsertSettings({
        organizationId: orgId,
        enabled: false,
        allocationPeriod: "Weekly",
        lastAllocationDate: null,
      });
    }

    const reviewLevels = await this.repo.getReviewLevels(settings.id);
    return {
      success: true,
      message: "successfully fetched energy point settings",
      data: {
        ...settings,
        reviewLevels: reviewLevels.map((l, index) => ({
          ...l,
          srNo: String(index + 1).padStart(2, "0"),
        })),
      },
    };
  }

  async upsertSettings(data: any, currentUser: typeof users.$inferSelect) {
    this.requireAdmin(currentUser);
    const orgId = this.requireOrg(currentUser);

    const settings = await this.repo.upsertSettings({
      organizationId: orgId,
      enabled: data.enabled !== undefined ? Boolean(data.enabled) : false,
      allocationPeriod: data.allocationPeriod || "Weekly",
      lastAllocationDate: data.lastAllocationDate || null,
    });

    let reviewLevels;
    if (Array.isArray(data.reviewLevels)) {
      const rows = data.reviewLevels
        .filter((l: any) => l && l.levelName && l.role)
        .map((l: any, index: number) => ({
          settingsId: settings.id,
          levelName: String(l.levelName).trim(),
          role: String(l.role).trim(),
          reviewPoints: Number(l.reviewPoints ?? 0) || 0,
          sortOrder: index,
        }));
      reviewLevels = await this.repo.replaceReviewLevels(settings.id, rows);
    } else {
      reviewLevels = await this.repo.getReviewLevels(settings.id);
    }

    return {
      success: true,
      message: "successfully saved energy point settings",
      data: {
        ...settings,
        reviewLevels: reviewLevels.map((l, index) => ({
          ...l,
          srNo: String(index + 1).padStart(2, "0"),
        })),
      },
    };
  }
}

export default EnergyPointServices;
