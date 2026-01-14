import { Request, Response, NextFunction } from "express";
import { db } from "../db/connection.js";
import { organization } from "../db/schema.js";
import { eq } from "drizzle-orm";
import organizationRepo from "../repository/organization.repo.js";

class OrganizationService {
  async createOrganization(data: typeof organization.$inferInsert) {
    const result = await organizationRepo.createOrganization(data);
    return result;
  }
  async getAllOrganizations() {
    const result = await organizationRepo.getAllOrganizations();
    return result;
  }
  async getOrganizationById(id: number) {
    const result = await organizationRepo.getOrganizationById(id);
    if (result.length === 0) {
      throw new Error("Organization not found");
    }
    return result;
  }
  async deleteOrganization(id: number) {
    const organication = await organizationRepo.getOrganizationById(id);
    if (organication.length === 0) {
      throw new Error("Organization not found");
    }
    const result = await organizationRepo.deleteOrganization(id);
    return result;
  }
  async updateOrganization(id: number, data: typeof organization.$inferInsert) {
    const organication = await organizationRepo.getOrganizationById(id);
    if (organication.length === 0) {
      throw new Error("Organization not found");
    }
    const result = await organizationRepo.updateOrganization(id, data);
    return result;
  }
}
export default new OrganizationService();
