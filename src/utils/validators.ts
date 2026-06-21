import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name must be at most 100 characters"),
  organizationType: z.enum([
    "private_company",
    "public_company",
    "startup",
    "government",
    "ngo",
    "education",
    "healthcare",
    "manufacturing",
    "it_services",
    "consultancy",
    "other"
  ]),
  industry: z.enum([
    "information_technology",
    "healthcare",
    "education",
    "finance",
    "manufacturing",
    "retail",
    "real_estate",
    "telecommunications",
    "hospitality",
    "construction",
    "transportation",
    "media",
    "legal_services",
    "other"
  ]),
  companySize: z.enum([
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1000+"
  ]),
  country: z.string().min(1, "Country is required"),
  timezone: z.string().min(1, "Timezone is required"),
  organizationEmail: z.string().email("Invalid email format"),
  organizationPhone: z.string().regex(/^\d{8,15}$/, "Phone number must be between 8 and 15 digits"),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  currency: z.string().min(1, "Currency is required"),
  workingDays: z.array(z.string()).nonempty("Must select at least one working day"),
  officeStartTime: z.string().min(1, "Office start time is required"),
  officeEndTime: z.string().min(1, "Office end time is required"),
});
