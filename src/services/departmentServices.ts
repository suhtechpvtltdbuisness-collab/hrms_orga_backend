import DepartmentRepository from "../repository/department.repo.js";
import { department, users } from "../db/schema.js";
class DepartmentServices {
  private departmentRepo: DepartmentRepository;
  constructor() {
    this.departmentRepo = new DepartmentRepository();
  }
  async createDepartment(
    data: typeof department.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create departments");
    }
    const departmentData = {
      ...data,
      adminId: currentUser.id,
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
  async getAllDepartments() {
    const result = await this.departmentRepo.getAllDepartments();
    return {
      message: "successfully fetched departments",
      success: true,
      data: result,
    };
  }
  async updateDepartment(
    id: number,
    data: typeof department.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update departments");
    }
    const existingDepartment = await this.departmentRepo.getDepartmentById(id);
    if (!existingDepartment) {
      throw new Error("Department not found");
    }
    const result = await this.departmentRepo.updateDepartment(id, data);
    return {
      message: "successfully updated department",
      success: true,
      data: result,
    };
  }
}
export default DepartmentServices;
