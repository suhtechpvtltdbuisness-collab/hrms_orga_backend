import SalesRepository from "../repository/sales.repo.js";
import { users } from "../db/schema.js";

const RECORD_TYPES = ["lead", "client", "opportunity", "deal"] as const;
const RECORD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
  "Active",
  "Expansion",
] as const;
const DOC_TYPES = [
  "proposal",
  "quotation",
  "contract",
  "case-study",
  "battlecard",
  "objection-playbook",
] as const;
const LEAD_SOURCES = ["Website", "Referral", "Campaign", "Partner", "Other"] as const;

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

  private validateRecordData(data: any, isUpdate = false) {
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
    if (data.status !== undefined && data.status !== null && data.status !== "") {
      if (!RECORD_STATUSES.includes(data.status)) {
        throw new Error(`Status must be one of: ${RECORD_STATUSES.join(", ")}`);
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
      if (!LEAD_SOURCES.includes(data.source)) {
        throw new Error(`Source must be one of: ${LEAD_SOURCES.join(", ")}`);
      }
    }
    if (data.followUpAt !== undefined && data.followUpAt !== null && data.followUpAt !== "") {
      if (isNaN(new Date(data.followUpAt).getTime())) {
        throw new Error("followUpAt must be a valid date");
      }
    }
  }

  private defaultStatusFor(recordType: string) {
    if (recordType === "deal") return "Discovery";
    if (recordType === "client") return "Active";
    if (recordType === "opportunity") return "Proposal";
    return "New";
  }

  // ---------- Records ----------

  async createRecord(data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    this.validateRecordData(data);

    const recordData = {
      organizationId: orgId,
      recordType: data.recordType,
      name: String(data.name).trim(),
      company: data.company ? String(data.company).trim() : null,
      status: data.status || this.defaultStatusFor(data.recordType),
      owner: data.owner ? String(data.owner).trim() : currentUser.name,
      value: data.value !== undefined && data.value !== null && data.value !== "" ? String(Number(data.value)) : "0",
      health: data.health !== undefined && data.health !== null && data.health !== "" ? Number(data.health) : 50,
      source: data.source || null,
      nextAction: data.nextAction ? String(data.nextAction).trim() : null,
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
      notes: data.notes ? String(data.notes).trim() : null,
      createdBy: currentUser.id,
    };

    const result = await this.salesRepo.createRecord(recordData);
    await this.salesRepo.logActivity(
      orgId,
      `${result.name} added as new ${result.recordType} (${result.status})`,
      currentUser.id,
    );

    return {
      message: `successfully created sales ${result.recordType}`,
      success: true,
      data: result,
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
        records,
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
      data: record,
    };
  }

  async updateRecord(id: number, data: any, currentUser: CurrentUser) {
    const orgId = this.getOrgId(currentUser);
    const existing = await this.salesRepo.getRecordById(id, orgId);
    if (!existing) {
      throw new Error("Sales record not found");
    }

    this.validateRecordData(data, true);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.company !== undefined) updateData.company = data.company ? String(data.company).trim() : null;
    if (data.status !== undefined && data.status !== "") updateData.status = data.status;
    if (data.owner !== undefined) updateData.owner = data.owner ? String(data.owner).trim() : null;
    if (data.value !== undefined && data.value !== "") updateData.value = String(Number(data.value));
    if (data.health !== undefined && data.health !== "") updateData.health = Number(data.health);
    if (data.source !== undefined) updateData.source = data.source || null;
    if (data.nextAction !== undefined) updateData.nextAction = data.nextAction ? String(data.nextAction).trim() : null;
    if (data.followUpAt !== undefined) updateData.followUpAt = data.followUpAt ? new Date(data.followUpAt) : null;
    if (data.notes !== undefined) updateData.notes = data.notes ? String(data.notes).trim() : null;

    const result = await this.salesRepo.updateRecord(id, updateData);

    if (data.status && data.status !== existing.status) {
      await this.salesRepo.logActivity(
        orgId,
        `${result.name} moved to ${result.status}`,
        currentUser.id,
      );
    }

    return {
      message: "successfully updated sales record",
      success: true,
      data: result,
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
      wonDeals,
      lostDeals,
      opportunities,
      todayRevenue,
      monthRevenue,
      leadSources,
      followUpRecords,
      revenueTrend,
      activities,
      deals,
      leads,
      clients,
      opportunityRows,
      knowledge,
      products,
      documents,
    ] = await Promise.all([
      this.salesRepo.countByTypeAndStatus(orgId, "lead"),
      this.salesRepo.countByTypeAndStatus(orgId, "lead", "Qualified"),
      this.salesRepo.countByTypeAndStatus(orgId, "lead", "Lost"),
      this.salesRepo.sumDealValue(orgId, "Won"),
      this.salesRepo.sumDealValue(orgId, "Lost"),
      this.salesRepo.sumOpportunityValue(orgId),
      this.salesRepo.sumDealValue(orgId, "Won", startOfToday),
      this.salesRepo.sumDealValue(orgId, "Won", startOfMonth),
      this.salesRepo.getLeadSources(orgId),
      this.salesRepo.getUpcomingFollowUps(orgId),
      this.salesRepo.getWeeklyRevenueTrend(orgId),
      this.salesRepo.getRecentActivities(orgId),
      this.salesRepo.getRecords(orgId, "deal", undefined, undefined, "desc", 50, 0),
      this.salesRepo.getRecords(orgId, "lead", undefined, undefined, "desc", 20, 0),
      this.salesRepo.getRecords(orgId, "client", undefined, undefined, "desc", 20, 0),
      this.salesRepo.getRecords(orgId, "opportunity", undefined, undefined, "desc", 20, 0),
      this.salesRepo.getKnowledge(orgId),
      this.salesRepo.getProducts(orgId),
      this.salesRepo.getDocuments(orgId),
    ]);

    const totalClosedDeals = wonDeals.count + lostDeals.count;
    const conversionRate = totalClosedDeals > 0 ? (wonDeals.count / totalClosedDeals) * 100 : 0;
    const averageDealSize = wonDeals.count > 0 ? wonDeals.total / wonDeals.count : 0;

    const totalLeadSourceCount = leadSources.reduce((sum, item) => sum + item.count, 0);

    const documentsByType: Record<string, any[]> = {};
    for (const docType of DOC_TYPES) {
      documentsByType[docType] = [];
    }
    for (const doc of documents) {
      if (!documentsByType[doc.docType]) documentsByType[doc.docType] = [];
      documentsByType[doc.docType].push(doc);
    }

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
          wonDeals: wonDeals.count,
          activeOpportunities: opportunities.count,
          opportunityValue: opportunities.total,
          conversionRate: Number(conversionRate.toFixed(1)),
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
        deals,
        rows: {
          leads,
          clients,
          opportunities: opportunityRows,
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
      this.salesRepo.sumDealValue(orgId, "Won"),
      this.salesRepo.sumDealValue(orgId, "Lost"),
      this.salesRepo.sumOpportunityValue(orgId),
      this.salesRepo.sumDealValue(orgId, "Won", startOfToday),
      this.salesRepo.sumDealValue(orgId, "Won", startOfMonth),
      this.salesRepo.getMonthlyRevenue(orgId),
      this.salesRepo.getSalesByOwner(orgId),
      this.salesRepo.getLeadSources(orgId),
      this.salesRepo.getUpcomingFollowUps(orgId, 10),
      this.salesRepo.getRecords(orgId, "deal", undefined, undefined, "desc", 30, 0),
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
      if (row.recordType === "deal") {
        if (row.status === "Won") {
          summary.wonDeals += row.count;
          summary.wonValueINR += Number(row.totalValue);
        } else if (row.status !== "Lost") {
          summary.openDeals += row.count;
          summary.openDealValueINR += Number(row.totalValue);
        }
      } else if (row.recordType === "lead") {
        summary.leads += row.count;
      } else if (row.recordType === "client") {
        summary.clients += row.count;
      } else if (row.recordType === "opportunity") {
        summary.opportunities += row.count;
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
      deals: deals.map(slimRecord),
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
