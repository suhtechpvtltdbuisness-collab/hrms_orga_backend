import SalesRepository from "../repository/sales.repo.js";
import { users } from "../db/schema.js";

const RECORD_TYPES = ["lead", "client", "opportunity"] as const;
const LEAD_STAGES = ["New", "Contacted", "Qualified", "Lost"] as const;
const LEAD_CONVERSION_STATUSES = ["Not Converted", "Converted", "Closed Lost"] as const;
const OPPORTUNITY_STAGES = [
  "Discovery",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
  "Pending Activation",
] as const;
const PIPELINE_STAGES = ["Discovery", "Qualified", "Proposal", "Negotiation"] as const;
const CLIENT_LIFECYCLES = ["Onboarding", "Active", "Renewed", "Churned"] as const;
const CLIENT_RENEWAL_STATUSES = ["On Track", "At Risk", "Renewal Due", "Churned"] as const;
const LOSS_REASONS = ["Price", "Timeline", "Competitor", "No decision", "Other"] as const;
const DOC_TYPES = [
  "proposal",
  "quotation",
  "contract",
  "case-study",
  "battlecard",
  "objection-playbook",
] as const;
const LEAD_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Cold outreach",
  "Event",
  "Partner",
  "Other",
] as const;

type CurrentUser = typeof users.$inferSelect;

class SalesServices {
  private salesRepo: SalesRepository;
  constructor() {
    this.salesRepo = new SalesRepository();
  }

  private getOrgId(currentUser: CurrentUser) {
    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }
    return orgId;
  }

  private validateStatusForType(recordType: string, status: string) {
    if (recordType === "lead" && !LEAD_STAGES.includes(status as any)) {
      throw new Error(`Lead stage must be one of: ${LEAD_STAGES.join(", ")}`);
    }
    if (recordType === "opportunity" && !OPPORTUNITY_STAGES.includes(status as any)) {
      throw new Error(`Opportunity stage must be one of: ${OPPORTUNITY_STAGES.join(", ")}`);
    }
    if (recordType === "client" && status) {
      if (!CLIENT_LIFECYCLES.includes(status as any)) {
        throw new Error(`Client lifecycle must be one of: ${CLIENT_LIFECYCLES.join(", ")}`);
      }
    }
  }

  private validateRecordData(data: any, isUpdate = false, recordType?: string) {
    const type = recordType || data.recordType;
    if (!isUpdate || data.recordType !== undefined) {
      if (!data.recordType || !RECORD_TYPES.includes(data.recordType)) {
        throw new Error(`recordType must be one of: ${RECORD_TYPES.join(", ")}`);
      }
    }
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || String(data.name).trim().length < 2) {
        throw new Error("Name is required and must be at least 2 characters");
      }
      if (String(data.name).length > 255) {
        throw new Error("Name must not exceed 255 characters");
      }
    }
    if (data.status !== undefined && data.status !== null && data.status !== "" && type) {
      this.validateStatusForType(type, data.status);
    }
    if (data.renewalStatus !== undefined && data.renewalStatus !== null && data.renewalStatus !== "") {
      if (!CLIENT_RENEWAL_STATUSES.includes(data.renewalStatus)) {
        throw new Error(`Renewal status must be one of: ${CLIENT_RENEWAL_STATUSES.join(", ")}`);
      }
    }
    if (data.lossReason !== undefined && data.lossReason !== null && data.lossReason !== "") {
      if (!LOSS_REASONS.includes(data.lossReason)) {
        throw new Error(`Loss reason must be one of: ${LOSS_REASONS.join(", ")}`);
      }
    }
    if (data.value !== undefined && data.value !== null && data.value !== "") {
      const numeric = Number(data.value);
      if (isNaN(numeric) || numeric < 0) {
        throw new Error("Value must be a non-negative number");
      }
    }
    if (data.health !== undefined && data.health !== null && data.health !== "") {
      const health = Number(data.health);
      if (isNaN(health) || health < 0 || health > 100) {
        throw new Error("Health must be a number between 0 and 100");
      }
    }
    if (data.source !== undefined && data.source !== null && data.source !== "") {
      const source = String(data.source).trim();
      if (source.length > 100) {
        throw new Error("Source must not exceed 100 characters");
      }
    }
    if (data.followUpAt !== undefined && data.followUpAt !== null && data.followUpAt !== "") {
      if (isNaN(new Date(data.followUpAt).getTime())) {
        throw new Error("followUpAt must be a valid date");
      }
    }
  }

  private sanitizeMetadata(raw: unknown): Record<string, unknown> | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value === undefined || value === null || value === "") continue;
      cleaned[key] = value;
    }
    return Object.keys(cleaned).length ? cleaned : null;
  }

  private defaultStatusFor(recordType: string) {
    if (recordType === "opportunity") return "Discovery";
    if (recordType === "client") return "Onboarding";
    return "New";
  }

  private formatRecord(record: any) {
    return {
      ...record,
      value: Number(record.value),
      metadata: record.metadata || {},
      conversionStatus: record.conversionStatus || (record.recordType === "lead" ? "Not Converted" : null),
    };
  }

  private async logRecordActivity(
    orgId: number,
    recordId: number | null,
    description: string,
    userId?: number,
  ) {
    await this.salesRepo.logActivity(orgId, description, userId, recordId ?? undefined);
  }

  // ---------- Records ----------

  async createRecord(data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    this.validateRecordData(data);

    const recordData: any = {
      organizationId: orgId,
      recordType: data.recordType,
      name: String(data.name).trim(),
      company: data.company ? String(data.company).trim() : null,
      status: data.status || this.defaultStatusFor(data.recordType),
      owner: data.owner ? String(data.owner).trim() : currentUser.name,
      value: data.value !== undefined && data.value !== null && data.value !== "" ? String(Number(data.value)) : "0",
      health: data.health !== undefined && data.health !== null && data.health !== "" ? Number(data.health) : 50,
      source: data.source ? String(data.source).trim() : null,
      nextAction: data.nextAction ? String(data.nextAction).trim() : null,
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
      notes: data.notes ? String(data.notes).trim() : null,
      metadata: this.sanitizeMetadata(data.metadata),
      createdBy: currentUser.id,
    };

    if (data.recordType === "lead") {
      recordData.conversionStatus = "Not Converted";
      recordData.aiLeadScore = data.aiLeadScore !== undefined ? Number(data.aiLeadScore) : null;
    }

    if (data.recordType === "client") {
      recordData.clientLifecycle = data.clientLifecycle || "Onboarding";
      recordData.renewalStatus = data.renewalStatus || "On Track";
      recordData.clientSource = data.clientSource || "direct";
      recordData.status = recordData.clientLifecycle;
    }

    const result = await this.salesRepo.createRecord(recordData);
    await this.logRecordActivity(
      orgId,
      result.id,
      `${result.name} added as new ${result.recordType}`,
      currentUser.id,
    );

    return {
      message: `successfully created sales ${result.recordType}`,
      success: true,
      data: this.formatRecord(result),
    };
  }

  async getRecords(
    currentUser: CurrentUser,
    queryParams: {
      type?: string;
      search?: string;
      status?: string;
      sortOrder?: "asc" | "desc";
      page?: number;
      limit?: number;
    },
  ) {
    const orgId = this.getOrgId(currentUser);

    if (queryParams.type && !RECORD_TYPES.includes(queryParams.type as any)) {
      throw new Error(`type must be one of: ${RECORD_TYPES.join(", ")}`);
    }

    const page = queryParams.page ? Number(queryParams.page) : 1;
    const limit = queryParams.limit ? Number(queryParams.limit) : 20;
    const offset = (page - 1) * limit;

    const records = await this.salesRepo.getRecords(
      orgId,
      queryParams.type,
      queryParams.search,
      queryParams.status,
      queryParams.sortOrder || "desc",
      limit,
      offset,
    );
    const total = await this.salesRepo.countRecords(
      orgId,
      queryParams.type,
      queryParams.search,
      queryParams.status,
    );

    return {
      message: "successfully fetched sales records",
      success: true,
      data: {
        records: records.map((record) => this.formatRecord(record)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecordById(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const record = await this.salesRepo.getRecordById(id, orgId);
    if (!record) {
      throw new Error("Sales record not found");
    }
    return {
      message: "successfully fetched sales record",
      success: true,
      data: this.formatRecord(record),
    };
  }

  async updateRecord(id: number, data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.salesRepo.getRecordById(id, orgId);
    if (!existing) {
      throw new Error("Sales record not found");
    }

    if (existing.isReadOnly) {
      throw new Error("This record is read-only after conversion and cannot be edited");
    }

    this.validateRecordData(data, true, existing.recordType);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.company !== undefined) updateData.company = data.company ? String(data.company).trim() : null;
    if (data.owner !== undefined) updateData.owner = data.owner ? String(data.owner).trim() : null;
    if (data.value !== undefined && data.value !== "") updateData.value = String(Number(data.value));
    if (data.health !== undefined && data.health !== "") updateData.health = Number(data.health);
    if (data.source !== undefined) updateData.source = data.source || null;
    if (data.nextAction !== undefined) updateData.nextAction = data.nextAction ? String(data.nextAction).trim() : null;
    if (data.followUpAt !== undefined) updateData.followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
    if (data.notes !== undefined) updateData.notes = data.notes ? String(data.notes).trim() : null;
    if (data.metadata !== undefined) updateData.metadata = this.sanitizeMetadata(data.metadata);
    if (data.renewalStatus !== undefined) updateData.renewalStatus = data.renewalStatus;
    if (data.clientLifecycle !== undefined) {
      updateData.clientLifecycle = data.clientLifecycle;
      updateData.status = data.clientLifecycle;
    }

    const newStatus = data.status !== undefined && data.status !== "" ? data.status : undefined;

    if (newStatus && newStatus !== existing.status) {
      if (existing.recordType === "lead") {
        if (newStatus === "Lost") {
          if (!data.lossReason) {
            throw new Error("Loss reason is required when marking a lead as Lost");
          }
          updateData.status = "Lost";
          updateData.conversionStatus = "Closed Lost";
          updateData.closeLostAt = new Date();
          updateData.lossReason = data.lossReason;
        } else {
          updateData.status = newStatus;
        }
      } else if (existing.recordType === "opportunity") {
        if (newStatus === "Proposal") {
          const quotations = await this.salesRepo.getDocumentsByOpportunity(orgId, id, "quotation");
          if (!quotations.length) {
            throw new Error(
              "Proposal stage requires at least one linked quotation. Create a quotation first.",
            );
          }
          updateData.status = newStatus;
        } else if (newStatus === "Closed Won") {
          const accepted = await this.salesRepo.getAcceptedQuotationForOpportunity(orgId, id);
          if (!accepted) {
            throw new Error(
              "Closed Won requires an accepted quotation. Link a quotation and mark it Accepted before closing the deal.",
            );
          }
          updateData.status = "Pending Activation";
          updateData.wonAt = new Date();
        } else if (newStatus === "Closed Lost") {
          if (!data.lossReason) {
            throw new Error("Loss reason is required when marking an opportunity as Closed Lost");
          }
          updateData.status = "Closed Lost";
          updateData.closeLostAt = new Date();
          updateData.lossReason = data.lossReason;
        } else {
          updateData.status = newStatus;
        }
      } else {
        updateData.status = newStatus;
      }
    }

    const result = await this.salesRepo.updateRecord(id, updateData);

    if (newStatus && newStatus !== existing.status) {
      await this.logRecordActivity(
        orgId,
        id,
        `${result.name} moved to ${result.status}`,
        currentUser.id,
      );
    }

    return {
      message: "successfully updated sales record",
      success: true,
      data: this.formatRecord(result),
    };
  }

  async convertLeadToOpportunity(leadId: number, data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const lead = await this.salesRepo.getRecordById(leadId, orgId);
    if (!lead || lead.recordType !== "lead") {
      throw new Error("Lead not found");
    }
    if (lead.conversionStatus === "Converted") {
      throw new Error("This lead has already been converted");
    }
    if (lead.conversionStatus === "Closed Lost" || lead.status === "Lost") {
      throw new Error("Lost leads cannot be converted");
    }
    if (lead.status !== "Qualified" && !data.force) {
      throw new Error("Only Qualified leads can be converted. Move the lead to Qualified first.");
    }

    const leadMeta = (lead.metadata || {}) as Record<string, unknown>;
    const contact = leadMeta.contact ? String(leadMeta.contact) : "";
    const primaryContact = [lead.name, contact].filter(Boolean).join(" — ");

    const opportunityData: any = {
      organizationId: orgId,
      recordType: "opportunity",
      name: data.company?.trim() || lead.company || lead.name,
      company: data.company?.trim() || lead.company,
      status: data.stage || "Discovery",
      owner: data.owner?.trim() || lead.owner || currentUser.name,
      value:
        data.value !== undefined && data.value !== ""
          ? String(Number(data.value))
          : String(Number(lead.value) || 0),
      health: data.health !== undefined ? Number(data.health) : Number(lead.health) || 50,
      source: lead.source,
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : lead.followUpAt,
      notes: lead.notes,
      metadata: this.sanitizeMetadata({
        primaryContact: data.primaryContact?.trim() || primaryContact,
        employees: leadMeta.employees,
        modules: leadMeta.modules,
        competitor: data.competitor,
        winProbability: data.winProbability ?? lead.health ?? 50,
        attribution: lead.source,
      }),
      sourceLeadId: lead.id,
      createdBy: currentUser.id,
    };

    const opportunity = await this.salesRepo.createRecord(opportunityData);

    const now = new Date();
    await this.salesRepo.updateRecord(lead.id, {
      conversionStatus: "Converted",
      convertedAt: now,
      isReadOnly: true,
      linkedOpportunityId: opportunity.id,
      status: lead.status === "Qualified" ? lead.status : "Qualified",
    });

    await this.logRecordActivity(
      orgId,
      lead.id,
      `Lead converted to opportunity: ${opportunity.name}`,
      currentUser.id,
    );
    await this.logRecordActivity(
      orgId,
      opportunity.id,
      `Opportunity created from lead: ${lead.name}`,
      currentUser.id,
    );

    return {
      message: "successfully converted lead to opportunity",
      success: true,
      data: {
        lead: this.formatRecord({ ...lead, conversionStatus: "Converted", convertedAt: now, isReadOnly: true, linkedOpportunityId: opportunity.id }),
        opportunity: this.formatRecord(opportunity),
      },
    };
  }

  async activateClientFromOpportunity(opportunityId: number, data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const opportunity = await this.salesRepo.getRecordById(opportunityId, orgId);
    if (!opportunity || opportunity.recordType !== "opportunity") {
      throw new Error("Opportunity not found");
    }
    if (opportunity.status !== "Pending Activation") {
      throw new Error("Only opportunities in Pending Activation can be converted to clients");
    }

    const existingClient = await this.salesRepo.getClientByOpportunityId(orgId, opportunityId);
    if (existingClient) {
      return {
        message: "client already activated for this opportunity",
        success: true,
        data: this.formatRecord(existingClient),
      };
    }

    const oppMeta = (opportunity.metadata || {}) as Record<string, unknown>;
    const acceptedQuote = await this.salesRepo.getAcceptedQuotationForOpportunity(orgId, opportunityId);
    const monthlyRevenue =
      data.monthlyRevenue !== undefined && data.monthlyRevenue !== ""
        ? Number(data.monthlyRevenue)
        : acceptedQuote?.amount
          ? Number(acceptedQuote.amount) / 12
          : Number(opportunity.value) / 12;

    const clientData: any = {
      organizationId: orgId,
      recordType: "client",
      name: String(oppMeta.primaryContact || opportunity.name).split(" — ")[0].trim(),
      company: opportunity.company || opportunity.name,
      status: "Onboarding",
      clientLifecycle: "Onboarding",
      renewalStatus: "On Track",
      clientSource: "conversion",
      owner: data.accountManager?.trim() || opportunity.owner || currentUser.name,
      value: String(monthlyRevenue),
      sourceOpportunityId: opportunity.id,
      sourceLeadId: opportunity.sourceLeadId,
      metadata: this.sanitizeMetadata({
        email: oppMeta.email || oppMeta.contact,
        phone: oppMeta.phone,
        employees: oppMeta.employees,
        industry: oppMeta.industry || data.industry,
        plan: data.plan || acceptedQuote?.notes || oppMeta.plan,
        contractStart: data.contractStart,
        contractEnd: data.contractEnd,
        gstin: data.gstin,
        billingAddress: data.billingAddress,
      }),
      createdBy: currentUser.id,
    };

    const client = await this.salesRepo.createRecord(clientData);
    const now = new Date();

    await this.salesRepo.updateRecord(opportunity.id, {
      status: "Closed Won",
      activatedAt: now,
    });

    await this.logRecordActivity(
      orgId,
      opportunity.id,
      `Client activated: ${client.company || client.name}`,
      currentUser.id,
    );
    await this.logRecordActivity(
      orgId,
      client.id,
      `Client created from opportunity (payment/contract confirmed)`,
      currentUser.id,
    );

    return {
      message: "successfully activated client from opportunity",
      success: true,
      data: this.formatRecord(client),
    };
  }

  async checkDuplicates(data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const company = data.company ? String(data.company).trim() : "";
    const email = data.email ? String(data.email).trim() : "";
    const domain = email.includes("@") ? email.split("@")[1]?.toLowerCase() : "";

    const matches = await this.salesRepo.findDuplicateRecords(orgId, company, domain);
    return {
      message: "duplicate check complete",
      success: true,
      data: { matches: matches.map((r) => this.formatRecord(r)) },
    };
  }

  async deleteRecord(id: number, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.salesRepo.getRecordById(id, orgId);
    if (!existing) {
      throw new Error("Sales record not found");
    }
    const result = await this.salesRepo.softDeleteRecord(id);
    return {
      message: "successfully deleted sales record",
      success: true,
      data: result,
    };
  }

  // ---------- Workspace (overview payload) ----------

  async getWorkspace(currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      qualifiedLeads,
      lostLeads,
      convertedLeads,
      wonOpportunities,
      lostOpportunities,
      opportunities,
      todayRevenue,
      monthRevenue,
      leadSources,
      followUpRecords,
      revenueTrend,
      activities,
      pipelineRecords,
      leads,
      clients,
      opportunityRows,
      awaitingPayment,
      idleLeads,
      knowledge,
      products,
      documents,
    ] = await Promise.all([
      this.salesRepo.countByTypeAndStatus(orgId, "lead"),
      this.salesRepo.countByTypeAndStatus(orgId, "lead", "Qualified"),
      this.salesRepo.countByTypeAndStatus(orgId, "lead", "Lost"),
      this.salesRepo.countByConversionStatus(orgId, "Converted"),
      this.salesRepo.sumOpportunityValueByStatus(orgId, "Closed Won"),
      this.salesRepo.sumOpportunityValueByStatus(orgId, "Closed Lost"),
      this.salesRepo.sumOpenOpportunityValue(orgId),
      this.salesRepo.sumOpportunityValueByStatus(orgId, "Closed Won", startOfToday),
      this.salesRepo.sumOpportunityValueByStatus(orgId, "Closed Won", startOfMonth),
      this.salesRepo.getLeadSources(orgId),
      this.salesRepo.getUpcomingFollowUps(orgId),
      this.salesRepo.getWeeklyRevenueTrend(orgId),
      this.salesRepo.getRecentActivities(orgId),
      this.salesRepo.getRecords(orgId, "opportunity", undefined, undefined, "desc", 50, 0),
      this.salesRepo.getRecords(orgId, "lead", undefined, undefined, "desc", 20, 0),
      this.salesRepo.getRecords(orgId, "client", undefined, undefined, "desc", 20, 0),
      this.salesRepo.getRecords(orgId, "opportunity", undefined, undefined, "desc", 20, 0),
      this.salesRepo.getAwaitingPaymentOpportunities(orgId),
      this.salesRepo.getIdleLeads(orgId, 7),
      this.salesRepo.getKnowledge(orgId),
      this.salesRepo.getProducts(orgId),
      this.salesRepo.getDocuments(orgId),
    ]);

    const totalClosedOpportunities = wonOpportunities.count + lostOpportunities.count;
    const winRate = totalClosedOpportunities > 0 ? (wonOpportunities.count / totalClosedOpportunities) * 100 : 0;
    const leadToOppRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const averageDealSize = wonOpportunities.count > 0 ? wonOpportunities.total / wonOpportunities.count : 0;

    const openPipeline = pipelineRecords.filter((r) =>
      PIPELINE_STAGES.includes(r.status as (typeof PIPELINE_STAGES)[number]),
    );
    const weightedForecast = openPipeline.reduce(
      (sum, record) => sum + Number(record.value) * (Number(record.health) / 100),
      0,
    );

    const totalLeadSourceCount = leadSources.reduce((sum, item) => sum + item.count, 0);

    const documentsByType: Record<string, any[]> = {};
    for (const docType of DOC_TYPES) {
      documentsByType[docType] = [];
    }
    for (const doc of documents) {
      if (!documentsByType[doc.docType]) documentsByType[doc.docType] = [];
      documentsByType[doc.docType].push(doc);
    }

    const formattedPipeline = openPipeline.map((record) => this.formatRecord(record));
    const formattedLeads = leads.map((record) => this.formatRecord(record));
    const formattedClients = clients.map((record) => this.formatRecord(record));
    const formattedOpportunities = opportunityRows.map((record) => this.formatRecord(record));

    return {
      message: "successfully fetched sales workspace",
      success: true,
      data: {
        updatedAt: now.toISOString(),
        metrics: {
          todayRevenue: todayRevenue.total,
          monthlyRevenue: monthRevenue.total,
          totalLeads,
          qualifiedLeads,
          lostLeads,
          convertedLeads,
          leadToOpportunityRate: Number(leadToOppRate.toFixed(1)),
          wonOpportunities: wonOpportunities.count,
          activeOpportunities: opportunities.count,
          opportunityValue: opportunities.total,
          weightedForecast: Number(weightedForecast.toFixed(2)),
          winRate: Number(winRate.toFixed(1)),
          conversionRate: Number(winRate.toFixed(1)),
          averageDealSize: Number(averageDealSize.toFixed(2)),
        },
        revenueTrend,
        leadSources: leadSources.map((item) => ({
          label: item.source,
          count: item.count,
          value: totalLeadSourceCount > 0 ? Math.round((item.count / totalLeadSourceCount) * 100) : 0,
        })),
        activities: activities.map((item) => item.description),
        followUps: followUpRecords.map((item) => ({
          id: item.id,
          client: item.name,
          company: item.company,
          time: item.followUpAt,
          owner: item.owner,
        })),
        awaitingPayment: awaitingPayment.map((item) => this.formatRecord(item)),
        idleLeads: idleLeads.map((item) => this.formatRecord(item)),
        pipeline: formattedPipeline,
        rows: {
          leads: formattedLeads,
          clients: formattedClients,
          opportunities: formattedOpportunities,
        },
        knowledge,
        products,
        documents: documentsByType,
      },
    };
  }

  // ---------- Sales AI Co-Pilot ----------

  private async buildCopilotContext(orgId: number) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalLeads,
      qualifiedLeads,
      lostLeads,
      wonDeals,
      lostDeals,
      opportunities,
      todayRevenue,
      monthRevenue,
      monthlyRevenue,
      salesByOwner,
      leadSources,
      followUpRecords,
      deals,
      leads,
      clients,
      opportunityRows,
      products,
      activities,
    ] = await Promise.all([
      this.salesRepo.countByTypeAndStatus(orgId, "lead"),
      this.salesRepo.countByTypeAndStatus(orgId, "lead", "Qualified"),
      this.salesRepo.countByTypeAndStatus(orgId, "lead", "Lost"),
      this.salesRepo.sumOpportunityValueByStatus(orgId, "Closed Won"),
      this.salesRepo.sumOpportunityValueByStatus(orgId, "Closed Lost"),
      this.salesRepo.sumOpenOpportunityValue(orgId),
      this.salesRepo.sumOpportunityValueByStatus(orgId, "Closed Won", startOfToday),
      this.salesRepo.sumOpportunityValueByStatus(orgId, "Closed Won", startOfMonth),
      this.salesRepo.getMonthlyRevenue(orgId),
      this.salesRepo.getSalesByOwner(orgId),
      this.salesRepo.getLeadSources(orgId),
      this.salesRepo.getUpcomingFollowUps(orgId, 10),
      this.salesRepo.getRecords(orgId, "opportunity", undefined, undefined, "desc", 30, 0),
      this.salesRepo.getRecords(orgId, "lead", undefined, undefined, "desc", 30, 0),
      this.salesRepo.getRecords(orgId, "client", undefined, undefined, "desc", 30, 0),
      this.salesRepo.getRecords(orgId, "opportunity", undefined, undefined, "desc", 30, 0),
      this.salesRepo.getProducts(orgId),
      this.salesRepo.getRecentActivities(orgId, 15),
    ]);

    const slimRecord = (record: any) => ({
      name: record.name,
      company: record.company,
      status: record.status,
      owner: record.owner,
      valueINR: Number(record.value),
      nextAction: record.nextAction,
      followUpAt: record.followUpAt,
      createdAt: record.createdAt,
    });

    // Consolidate per-owner rows into readable per-employee summaries.
    const ownerSummary: Record<string, any> = {};
    for (const row of salesByOwner) {
      const summary = (ownerSummary[row.owner] ||= {
        owner: row.owner,
        totalRecords: 0,
        wonDeals: 0,
        wonValueINR: 0,
        openDeals: 0,
        openDealValueINR: 0,
        leads: 0,
        clients: 0,
        opportunities: 0,
      });
      summary.totalRecords += row.count;
      if (row.recordType === "opportunity") {
        if (row.status === "Closed Won") {
          summary.wonDeals += row.count;
          summary.wonValueINR += Number(row.totalValue);
        } else if (!["Closed Lost", "Pending Activation"].includes(row.status)) {
          summary.openDeals += row.count;
          summary.openDealValueINR += Number(row.totalValue);
        }
      } else if (row.recordType === "lead") {
        summary.leads += row.count;
      } else if (row.recordType === "client") {
        summary.clients += row.count;
      }
    }

    return {
      today: now.toISOString().slice(0, 10),
      summary: {
        revenueTodayINR: todayRevenue.total,
        revenueThisMonthINR: monthRevenue.total,
        allTimeWonRevenueINR: wonDeals.total,
        wonDeals: wonDeals.count,
        lostDeals: lostDeals.count,
        totalLeads,
        qualifiedLeads,
        lostLeads,
        activeOpportunities: opportunities.count,
        opportunityPipelineValueINR: opportunities.total,
      },
      revenueByMonth: monthlyRevenue,
      salesByEmployee: Object.values(ownerSummary),
      leadSources,
      upcomingFollowUps: followUpRecords.map((item) => ({
        name: item.name,
        company: item.company,
        owner: item.owner,
        followUpAt: item.followUpAt,
      })),
      pipeline: deals.map(slimRecord),
      leads: leads.map(slimRecord),
      clients: clients.map(slimRecord),
      opportunities: opportunityRows.map(slimRecord),
      products: products.map((product: any) => ({
        name: product.name,
        category: product.category,
        price: product.priceLabel,
        status: product.status,
      })),
      recentActivities: activities.map((item) => item.description),
    };
  }

  async askCopilot(question: string, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);

    if (!question || !String(question).trim()) {
      throw new Error("Question is required");
    }
    const trimmedQuestion = String(question).trim();
    if (trimmedQuestion.length > 500) {
      throw new Error("Question must not exceed 500 characters");
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Sales Co-Pilot is not configured. Please set GROQ_API_KEY.");
    }

    const context = await this.buildCopilotContext(orgId);

    const userName = currentUser.name || "there";
    const systemPrompt = [
      "You are the Orga Sales Co-Pilot, a professional AI assistant inside the Orga HRMS & CRM platform.",
      `You are speaking with ${userName}, an authorized member of this organization.`,
      "",
      "PERSONALITY & CONVERSATION:",
      `- If the user greets you or makes small talk (hi, hello, good morning, how are you, thanks, bye), respond warmly and professionally. Example: "Hello ${userName}, welcome to Orga! I'm your Sales Co-Pilot. I can help you with questions about your revenue, leads, deals, pipeline, team performance, and follow-ups. What would you like to know?"`,
      "- If the user asks what you can do, briefly list your capabilities: monthly/daily revenue, employee-wise sales performance, pipeline and deal status, lead sources, upcoming follow-ups, products, and recent activity.",
      "- Always maintain a courteous, professional, business-like tone. Address the user by name when it feels natural.",
      "",
      "DATA RULES (strict):",
      "- For any factual or numerical question, answer ONLY using the sales data provided in the DATA section below.",
      "- If a sales-related answer cannot be derived from the data, say: \"I couldn't find that in your sales records yet.\" and suggest what data they could add.",
      "- Never invent numbers, names, companies, or records.",
      "- For questions unrelated to sales or this CRM (general knowledge, coding, news, etc.), politely decline: \"I'm focused on your sales data, so I can't help with that — but I'd be happy to answer anything about your revenue, leads, deals, or team performance.\"",
      "- All monetary values in the data are INR. Format large amounts in Indian style (e.g. INR 4.2L for 420000, INR 1.2Cr for 12000000).",
      "- Owner/employee attribution comes from the 'owner' fields and the salesByEmployee section.",
      `- Today's date is ${context.today}. Use it to interpret phrases like "this month" or "today".`,
      "- Keep answers short and factual. Use a small list or table when comparing employees or deals.",
      "",
      "DATA:",
      JSON.stringify(context),
    ].join("\n");

    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    let response: globalThis.Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 600,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: trimmedQuestion },
          ],
        }),
      });
    } catch {
      throw new Error("Could not reach the AI service. Please try again.");
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("Groq API error:", response.status, errorBody.slice(0, 500));
      if (response.status === 401) {
        throw new Error("Sales Co-Pilot API key is invalid. Please check GROQ_API_KEY.");
      }
      if (response.status === 429) {
        throw new Error("Sales Co-Pilot is busy right now (rate limit). Please try again in a minute.");
      }
      throw new Error("Sales Co-Pilot request failed. Please try again.");
    }

    const completion: any = await response.json();
    const answer = completion?.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      throw new Error("Sales Co-Pilot returned an empty answer. Please try again.");
    }

    return {
      message: "successfully generated co-pilot answer",
      success: true,
      data: {
        question: trimmedQuestion,
        answer,
        model,
      },
    };
  }

  // ---------- Knowledge ----------

  async createKnowledge(data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    if (!data.title || String(data.title).trim().length < 2) {
      throw new Error("Title is required and must be at least 2 characters");
    }

    const result = await this.salesRepo.createKnowledge({
      organizationId: orgId,
      title: String(data.title).trim(),
      category: data.category ? String(data.category).trim() : "Services",
      owner: data.owner ? String(data.owner).trim() : currentUser.name,
      content: data.content ? String(data.content).trim() : null,
      confidence: data.confidence !== undefined && data.confidence !== "" ? Number(data.confidence) : 90,
      createdBy: currentUser.id,
    });
    await this.salesRepo.logActivity(orgId, `Knowledge article published: ${result.title}`, currentUser.id);

    return {
      message: "successfully created knowledge article",
      success: true,
      data: result,
    };
  }

  async getKnowledge(currentUser: CurrentUser, category?: string, search?: string) {
    const orgId = this.getOrgId(currentUser);
    const result = await this.salesRepo.getKnowledge(orgId, category, search);
    return {
      message: "successfully fetched knowledge articles",
      success: true,
      data: result,
    };
  }

  // ---------- Products ----------

  async createProduct(data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    if (!data.name || String(data.name).trim().length < 2) {
      throw new Error("Product name is required and must be at least 2 characters");
    }

    const result = await this.salesRepo.createProduct({
      organizationId: orgId,
      name: String(data.name).trim(),
      category: data.category ? String(data.category).trim() : "Subscription",
      status: data.status || "Active",
      team: data.team ? String(data.team).trim() : null,
      priceLabel: data.priceLabel ? String(data.priceLabel).trim() : null,
      note: data.note ? String(data.note).trim() : null,
      createdBy: currentUser.id,
    });
    await this.salesRepo.logActivity(orgId, `Product added to catalog: ${result.name}`, currentUser.id);

    return {
      message: "successfully created product",
      success: true,
      data: result,
    };
  }

  async getProducts(currentUser: CurrentUser, search?: string) {
    const orgId = this.getOrgId(currentUser);
    const result = await this.salesRepo.getProducts(orgId, search);
    return {
      message: "successfully fetched products",
      success: true,
      data: result,
    };
  }

  // ---------- Documents ----------

  async createDocument(data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    if (!data.docType || !DOC_TYPES.includes(data.docType)) {
      throw new Error(`docType must be one of: ${DOC_TYPES.join(", ")}`);
    }
    if (!data.title || String(data.title).trim().length < 2) {
      throw new Error("Title is required and must be at least 2 characters");
    }
    if (data.amount !== undefined && data.amount !== null && data.amount !== "") {
      const numeric = Number(data.amount);
      if (isNaN(numeric) || numeric < 0) {
        throw new Error("Amount must be a non-negative number");
      }
    }

    const result = await this.salesRepo.createDocument({
      organizationId: orgId,
      docType: data.docType,
      opportunityId: data.opportunityId ? Number(data.opportunityId) : null,
      title: String(data.title).trim(),
      clientName: data.clientName ? String(data.clientName).trim() : null,
      status: data.status || "Draft",
      owner: data.owner ? String(data.owner).trim() : currentUser.name,
      amount: data.amount !== undefined && data.amount !== null && data.amount !== "" ? String(Number(data.amount)) : null,
      notes: data.notes ? String(data.notes).trim() : null,
      createdBy: currentUser.id,
    });
    await this.salesRepo.logActivity(orgId, `${result.docType} created: ${result.title}`, currentUser.id);

    return {
      message: "successfully created sales document",
      success: true,
      data: result,
    };
  }

  async getDocuments(currentUser: CurrentUser, docType?: string, search?: string) {
    const orgId = this.getOrgId(currentUser);
    if (docType && !DOC_TYPES.includes(docType as any)) {
      throw new Error(`docType must be one of: ${DOC_TYPES.join(", ")}`);
    }
    const result = await this.salesRepo.getDocuments(orgId, docType, search);
    return {
      message: "successfully fetched sales documents",
      success: true,
      data: result,
    };
  }
}

export default SalesServices;
