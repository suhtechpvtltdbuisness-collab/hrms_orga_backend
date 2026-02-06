import DesignationRepository from "../repository/desiganation.repo.js";
import { designation, users } from "../db/schema.js";

class DesignationServices {
  private designationRepo: DesignationRepository;
  constructor() {
    this.designationRepo = new DesignationRepository();
  }
  async createDesignation(
    data: typeof designation.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create designations");
    }
    const existingDesignation =
      await this.designationRepo.getDesignationByDepartmentIdAndName(
        data.departmentId as number,
        data.name,
      );
    if (existingDesignation) {
      throw new Error(
        "Designation with the same name already exists in this department",
      );
    }
    const newData = { ...data, createdBy: currentUser.id };
    const result = await this.designationRepo.createDesignation(newData);
    return {
      message: "successfully created designation",
      success: true,
      data: result,
    };
  }
  async getDesignationById(id: number) {
    const result = await this.designationRepo.getDesignationById(id);
    if (!result) {
      throw new Error("Designation not found");
    }
    return {
      message: "successfully fetched designation",
      success: true,
      data: result,
    };
  }
  async getAllDesignations() {
    const result = await this.designationRepo.getAllDesignations();
    return {
      message: "successfully fetched designations",
      success: true,
      data: result,
    };
  }
  async updateDesignation(
    id: number,
    data: typeof designation.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update designations");
    }
    const existingDesignation =
      await this.designationRepo.getDesignationById(id);
    if (!existingDesignation) {
      throw new Error("Designation not found");
    }
    const result = await this.designationRepo.updateDesignation(id, data);
    return {
      message: "successfully updated designation",
      success: true,
      data: result,
    };
  }
  async getDesignationsByAdminId(adminId: number) {
    const result = await this.designationRepo.getDesignationsByAdminId(adminId);
    return {
      message: "successfully fetched designations by admin",
      success: true,
      data: result,
    };
  }
}
export default DesignationServices;
