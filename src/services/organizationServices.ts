import OrganizationRepository from "../repository/organization.repo.js";
import { SubscriptionRepository } from "../repository/subscription.repo.js";

class OrganizationServices {
  private orgRepo: OrganizationRepository;
  private subscriptionRepo: SubscriptionRepository;

  constructor() {
    this.orgRepo = new OrganizationRepository();
    this.subscriptionRepo = new SubscriptionRepository();
  }

  async getAllOrganizations(page: number = 1, limit: number = 10, search?: string) {
    const [{ data, total }, definitions] = await Promise.all([
      this.orgRepo.getAllOrganizations(page, limit, search),
      this.subscriptionRepo.getAllPlanDefinitionRecords(),
    ]);
    const planNames = new Map(definitions.map((definition) => [definition.planType, definition.name]));

    const formattedOrganizations = data.map(({ organization, userCount, plan }) => {
      const planActive = plan?.active ?? false;
      const planExpired = plan?.expired ? new Date(plan.expired) : null;
      const now = new Date();

      // Format status
      let status = "Inactive";
      if (plan?.planType) {
        if (planActive && (!planExpired || planExpired > now)) {
          status = plan.planType === "free_trial" ? "Trial" : "Active";
        } else {
          status = "Inactive";
        }
      }

      // Format plan name
      const planName = plan?.planType
        ? (planNames.get(plan.planType) ?? plan.planType.replace(/_/g, " "))
        : "No Plan";

      // Format domain
      let domain = "N/A";
      if (organization.website) {
        domain = organization.website.replace(/^(https?:\/\/)?(www\.)?/, "");
      } else if (organization.organizationEmail) {
        domain = organization.organizationEmail.split("@")[1];
      }

      return {
        id: organization.id,
        name: organization.name,
        domain,
        plan: planName,
        users: userCount,
        status,
        email: organization.organizationEmail,
        phone: organization.organizationPhone,
        createdAt: organization.createdAt,
      };
    });

    return {
      success: true,
      data: {
        organizations: formattedOrganizations,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      }
    };
  }

  async getSuperAdminDashboardOverview() {
    const [rawData, definitions] = await Promise.all([
      this.orgRepo.getSuperAdminDashboardOverview(),
      this.subscriptionRepo.getAllPlanDefinitionRecords(),
    ]);
    const planNames = new Map(definitions.map((definition) => [definition.planType, definition.name]));
    
    // Helper to get formatted plan name
    const getPlanName = (planType?: string | null) => {
      if (!planType) return "No Plan";
      return planNames.get(planType) ?? planType.replace(/_/g, " ");
    };

    // Helper to get relative time string
    const getRelativeTime = (dateInput: Date | string | null): string => {
      if (!dateInput) return "some time ago";
      const date = new Date(dateInput);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    // Format recent organizations
    const recentOrgs = rawData.recentOrganizations.map(({ organization, userCount, plan }) => {
      const planActive = plan?.active ?? false;
      const planExpired = plan?.expired ? new Date(plan.expired) : null;
      const now = new Date();

      let status = "Inactive";
      if (plan?.planType) {
        if (planActive && (!planExpired || planExpired > now)) {
          status = plan.planType === "free_trial" ? "Trial" : "Active";
        } else {
          status = "Inactive";
        }
      }

      let domain = "N/A";
      if (organization.website) {
        domain = organization.website.replace(/^(https?:\/\/)?(www\.)?/, "");
      } else if (organization.organizationEmail) {
        domain = organization.organizationEmail.split("@")[1];
      }

      return {
        id: organization.id,
        name: organization.name,
        domain,
        plan: getPlanName(plan?.planType),
        users: userCount,
        status,
      };
    });

    // Build Activity Feed
    const activities: Array<{
      id: string;
      type: "organization" | "payment" | "employee";
      title: string;
      description: string;
      time: string;
      timestamp: Date;
    }> = [];

    // Push org registrations
    rawData.recentOrganizations.forEach(({ organization }) => {
      activities.push({
        id: `org-${organization.id}`,
        type: "organization",
        title: "New Organization Registered",
        description: `<strong>${organization.name}</strong> registered in the system.`,
        time: getRelativeTime(organization.createdAt),
        timestamp: new Date(organization.createdAt),
      });
    });

    // Push payments
    rawData.recentPayments.forEach(({ payment, orgName, planType }) => {
      activities.push({
        id: `pay-${payment.id}`,
        type: "payment",
        title: "Subscription Upgraded/Paid",
        description: `<strong>${orgName}</strong> paid ₹${Number(payment.totalAmount).toLocaleString("en-IN")} for ${getPlanName(planType)}.`,
        time: getRelativeTime(payment.createdAt),
        timestamp: new Date(payment.createdAt),
      });
    });

    // Push employees
    rawData.recentEmployees.forEach(({ employee, orgName }) => {
      activities.push({
        id: `emp-${employee.id}`,
        type: "employee",
        title: "New Employee Joined",
        description: `<strong>${employee.name}</strong> joined ${orgName || "an organization"}.`,
        time: getRelativeTime(employee.createdAt),
        timestamp: new Date(employee.createdAt),
      });
    });

    // Sort by timestamp descending and take top 5
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5)
      .map(({ id, type, title, description, time }) => ({ id, type, title, description, time }));

    return {
      success: true,
      data: {
        stats: {
          totalOrganizations: rawData.stats.totalOrganizations,
          orgsGrowthPercent: rawData.stats.orgsGrowthPercent,
          activeSubscriptions: rawData.stats.activeSubscriptions,
          subsGrowthPercent: rawData.stats.subsGrowthPercent,
          totalEmployees: rawData.stats.totalEmployees,
          monthlyRevenue: rawData.stats.monthlyRevenue,
        },
        recentOrganizations: recentOrgs,
        activities: sortedActivities,
      }
    };
  }
}

export default OrganizationServices;
