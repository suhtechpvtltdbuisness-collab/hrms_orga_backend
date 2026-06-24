import DepartmentRepository from "../repository/department.repo.js";
import { department, users } from "../db/schema.js";

class DepartmentServices {
  private departmentRepo: DepartmentRepository;
  constructor() {
    this.departmentRepo = new DepartmentRepository();
  }

  private validateDepartmentData(data: any, isUpdate = false) {
    const { departmentName, departmentCode, description, status } = data;

    // Validate Department Name
    if (!isUpdate || departmentName !== undefined) {
      if (!departmentName) {
        throw new Error("Department name is required");
      }
      if (departmentName.length < 2 || departmentName.length > 100) {
        throw new Error("Department name must be between 2 and 100 characters");
      }
    }

    // Validate Department Code
    if (!isUpdate || departmentCode !== undefined) {
      if (!departmentCode) {
        throw new Error("Department code is required");
      }
      if (departmentCode !== departmentCode.toUpperCase()) {
        throw new Error("Department code must be uppercase");
      }
    }

    // Validate Description
    if (description && description.length > 500) {
      throw new Error("Description must not exceed 500 characters");
    }

    // Validate Status
    if (status && status !== "Active" && status !== "Inactive") {
      throw new Error("Status must be either 'Active' or 'Inactive'");
    }
  }

  async createDepartment(
    data: any,
    currentUser: typeof users.$inferSelect
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can create departments");
    }

    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }

    this.validateDepartmentData(data);

    // Check for duplicate name in same organization
    const existingName = await this.departmentRepo.findDepartmentByName(
      data.departmentName,
      orgId
    );
    if (existingName) {
      throw new Error("Department name already exists in this organization");
    }

    // Check for duplicate code in same organization
    const existingCode = await this.departmentRepo.findDepartmentByCode(
      data.departmentCode,
      orgId
    );
    if (existingCode) {
      throw new Error("Department code already exists in this organization");
    }

    const departmentData = {
      organizationId: orgId,
      departmentName: data.departmentName,
      departmentCode: data.departmentCode,
      description: data.description || null,
      managerId: data.managerId ? Number(data.managerId) : null,
      status: data.status || "Active",
      createdBy: currentUser.id,
    };

    const result = await this.departmentRepo.createDepartment(departmentData);
    return {
      message: "successfully created department",
      success: true,
      data: result,
    };
  }

  async getDepartmentById(id: number) {
    const result = await this.departmentRepo.getDepartmentById(id);
    if (!result) {
      throw new Error("Department not found");
    }
    return {
      message: "successfully fetched department",
      success: true,
      data: result,
    };
  }

  async getAllDepartments(
    currentUser: typeof users.$inferSelect,
    queryParams: {
      search?: string;
      status?: string;
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

    const page = queryParams.page ? Number(queryParams.page) : 1;
    const limit = queryParams.limit ? Number(queryParams.limit) : 10;
    const offset = (page - 1) * limit;

    const departments = await this.departmentRepo.getAllDepartments(
      orgId,
      queryParams.search,
      queryParams.status,
      queryParams.sortBy,
      queryParams.sortOrder,
      limit,
      offset
    );

    const total = await this.departmentRepo.countDepartments(
      orgId,
      queryParams.search,
      queryParams.status
    );

    return {
      message: "successfully fetched departments",
      success: true,
      data: {
        departments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDepartmentsDropdown(currentUser: typeof users.$inferSelect) {
    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }

    const result = await this.departmentRepo.getDepartmentsDropdown(orgId);
    return {
      message: "successfully fetched departments for dropdown",
      success: true,
      data: result,
    };
  }

  async getDepartmentStats(currentUser: typeof users.$inferSelect) {
    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }

    const stats = await this.departmentRepo.getDepartmentStats(orgId);
    return {
      message: "successfully fetched department statistics",
      success: true,
      data: stats,
    };
  }

  async updateDepartment(
    id: number,
    data: any,
    currentUser: typeof users.$inferSelect
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can update departments");
    }

    const orgId = currentUser.organizationId;
    if (!orgId) {
      throw new Error("User does not belong to any organization");
    }

    const existingDepartment = await this.departmentRepo.getDepartmentById(id);
    if (!existingDepartment) {
      throw new Error("Department not found");
    }

    this.validateDepartmentData(data, true);

    // Name uniqueness check if name is changed
    if (data.departmentName && data.departmentName !== existingDepartment.departmentName) {
      const existingName = await this.departmentRepo.findDepartmentByName(
        data.departmentName,
        orgId
      );
      if (existingName) {
        throw new Error("Department name already exists in this organization");
      }
    }

    // Code uniqueness check if code is changed
    if (data.departmentCode && data.departmentCode !== existingDepartment.departmentCode) {
      const existingCode = await this.departmentRepo.findDepartmentByCode(
        data.departmentCode,
        orgId
      );
      if (existingCode) {
        throw new Error("Department code already exists in this organization");
      }
    }

    const updateData: any = {};
    if (data.departmentName !== undefined) updateData.departmentName = data.departmentName;
    if (data.departmentCode !== undefined) updateData.departmentCode = data.departmentCode;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.managerId !== undefined) updateData.managerId = data.managerId ? Number(data.managerId) : null;
    if (data.status !== undefined) updateData.status = data.status;

    const result = await this.departmentRepo.updateDepartment(id, updateData);
    return {
      message: "successfully updated department",
      success: true,
      data: result,
    };
  }

  async updateStatus(
    id: number,
    status: string,
    currentUser: typeof users.$inferSelect
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can update department status");
    }

    if (status !== "Active" && status !== "Inactive") {
      throw new Error("Status must be either 'Active' or 'Inactive'");
    }

    const existingDepartment = await this.departmentRepo.getDepartmentById(id);
    if (!existingDepartment) {
      throw new Error("Department not found");
    }

    const result = await this.departmentRepo.updateStatus(id, status);
    return {
      message: "successfully updated department status",
      success: true,
      data: result,
    };
  }

  async deleteDepartment(id: number, currentUser: typeof users.$inferSelect) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("Only admins can delete departments");
    }

    const hasEmployees = await this.departmentRepo.checkEmployeesAssigned(id);
    if (hasEmployees) {
      throw new Error("Cannot delete department because employees are currently assigned to it");
    }

    const result = await this.departmentRepo.softDeleteDepartment(id);
    return {
      message: "successfully deleted department",
      success: true,
      data: result,
    };
  }
}

export default DepartmentServices;
