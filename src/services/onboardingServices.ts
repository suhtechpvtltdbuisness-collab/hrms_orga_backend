import OrganizationRepository from "../repository/organization.repo.js";
import { organizations } from "../db/schema.js";
import { createOrganizationSchema } from "../utils/validators.js";

class OnboardingServices {
  private orgRepo: OrganizationRepository;
  constructor() {
    this.orgRepo = new OrganizationRepository();
  }

  async onboardOrganization(
    data: any,
    userId: number
  ) {
    // 1. Validate payload
    const parsedData = createOrganizationSchema.parse(data);

    // 2. Map payload to organizations type
    const orgData: typeof organizations.$inferInsert = {
      name: parsedData.name,
      organizationType: parsedData.organizationType,
      industry: parsedData.industry,
      companySize: parsedData.companySize,
      country: parsedData.country,
      timezone: parsedData.timezone,
      organizationEmail: parsedData.organizationEmail,
      organizationPhone: parsedData.organizationPhone,
      website: parsedData.website || null,
      currency: parsedData.currency,
      workingDays: parsedData.workingDays,
      officeStartTime: parsedData.officeStartTime,
      officeEndTime: parsedData.officeEndTime,
      createdBy: userId,
    };

    // 3. Create and update user
    const result = await this.orgRepo.createOrganizationAndOnboardUser(orgData, userId);

    return {
      message: "Successfully onboarded organization",
      success: true,
      data: result.organization,
    };
  }

  async getOnboardingStatus(user: any) {
    return {
      message: "Successfully fetched onboarding status",
      success: true,
      data: {
        onboardingCompleted: user.onboardingCompleted,
        organizationId: user.organizationId,
      },
    };
  }
}

export default OnboardingServices;
