import DesignationRepository from "../repository/desiganation.repo.js";
import { designation, users } from "../db/schema.js";

class DesignationServices {
  private designationRepo: DesignationRepository;
  constructor() {
    this.designationRepo = new DesignationRepository();
  }

  private validateDesignationData(data: any, isUpdate = false) {
    const { name, level, status } = data;

    // Validate Designation Name
    if (!isUpdate || name !== undefined) {
      if (!name) {
        throw new Error("Designation name is required");
      }
      if (name.length < 2 || name.length > 100) {
        throw new Error("Designation name must be between 2 and 100 characters");
      }
    }

    // Validate Level
    if (!isUpdate || level !== undefined) {
      const parsedLevel = Number(level);
      if (isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 5) {
        throw new Error("Designation level must be an integer between 1 and 5");
      }
    }

    // Validate Status
    if (status !== undefined && typeof status !== "boolean") {
      throw new Error("Status must be a boolean value");
    }
  }

  async createDesignation(
    data: any,
    currentUser: typeof users.$inferSelect,
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can create designations");
    }

    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }

    this.validateDesignationData(data);

    // Check for duplicate name in the same department
    const existingDesignation =
      await this.designationRepo.getDesignationByDepartmentIdAndName(
        Number(data.departmentId),
        data.name,
      );
    if (existingDesignation) {
      throw new Error(
        "Designation with the same name already exists in this department",
      );
    }

    const designationData = {
      name: data.name,
      type: data.type || "permanent",
      departmentId: Number(data.departmentId),
      level: Number(data.level),
      status: data.status !== undefined ? data.status : true,
      responsibility: Array.isArray(data.responsibility) 
        ? data.responsibility.join("\n") 
        : data.responsibility || null,
      reportingTo: data.reportingTo ? Number(data.reportingTo) : null,
      description: data.description || null,
      createdBy: currentUser.id,
    };

    const result = await this.designationRepo.createDesignation(designationData);
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

  async getAllDesignations(
    currentUser: typeof users.$inferSelect,
    queryParams: {
      search?: string;
      departmentId?: number;
      level?: number;
      status?: boolean;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      page?: number;
      limit?: number;
    }
  ) {
    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }

    const page = queryParams.page ? Number(queryParams.page) : undefined;
    const limit = queryParams.limit ? Number(queryParams.limit) : undefined;
    const offset = (page && limit) ? (page - 1) * limit : undefined;

    const designations = await this.designationRepo.getAllDesignations(
      orgId,
      queryParams.search,
      queryParams.departmentId,
      queryParams.level,
      queryParams.status,
      queryParams.sortBy,
      queryParams.sortOrder,
      limit,
      offset
    );

    const total = await this.designationRepo.countDesignations(
      orgId,
      queryParams.search,
      queryParams.departmentId,
      queryParams.level,
      queryParams.status
    );

    return {
      message: "successfully fetched designations",
      success: true,
      data: {
        designations,
        total,
        page: page || 1,
        limit: limit || total,
        totalPages: limit ? Math.ceil(total / limit) : 1,
      },
    };
  }

  async getDesignationsDropdown(currentUser: typeof users.$inferSelect) {
    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }
    const result = await this.designationRepo.getDesignationsDropdown(orgId);
    return {
      message: "successfully fetched designations dropdown",
      success: true,
      data: result,
    };
  }

  async getDesignationStats(currentUser: typeof users.$inferSelect) {
    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }
    const result = await this.designationRepo.getDesignationStats(orgId);
    return {
      message: "successfully fetched designation statistics",
      success: true,
      data: result,
    };
  }

  async updateDesignation(
    id: number,
    data: any,
    currentUser: typeof users.$inferSelect,
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can update designations");
    }

    const existingDesignation =
      await this.designationRepo.getDesignationById(id);
    if (!existingDesignation) {
      throw new Error("Designation not found");
    }

    this.validateDesignationData(data, true);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.departmentId !== undefined) updateData.departmentId = Number(data.departmentId);
    if (data.level !== undefined) updateData.level = Number(data.level);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.responsibility !== undefined) {
      updateData.responsibility = Array.isArray(data.responsibility) 
        ? data.responsibility.join("\n") 
        : data.responsibility;
    }
    if (data.reportingTo !== undefined) updateData.reportingTo = data.reportingTo ? Number(data.reportingTo) : null;
    if (data.description !== undefined) updateData.description = data.description || null;

    const result = await this.designationRepo.updateDesignation(id, updateData);
    return {
      message: "successfully updated designation",
      success: true,
      data: result,
    };
  }

  async updateStatus(
    id: number,
    status: boolean,
    currentUser: typeof users.$inferSelect
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can update designation status");
    }
    const existing = await this.designationRepo.getDesignationById(id);
    if (!existing) {
      throw new Error("Designation not found");
    }
    const result = await this.designationRepo.updateStatus(id, status);
    return {
      message: "successfully updated status",
      success: true,
      data: result,
    };
  }

  async deleteDesignation(id: number, currentUser: typeof users.$inferSelect) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can delete designations");
    }

    const existing = await this.designationRepo.getDesignationById(id);
    if (!existing) {
      throw new Error("Designation not found");
    }

    const hasEmployees = await this.designationRepo.checkEmployeesAssigned(id);
    if (hasEmployees) {
      throw new Error("Cannot delete designation because employees are currently assigned to it");
    }

    const result = await this.designationRepo.softDeleteDesignation(id);
    return {
      message: "successfully deleted designation",
      success: true,
      data: result,
    };
  }
}

export default DesignationServices;
