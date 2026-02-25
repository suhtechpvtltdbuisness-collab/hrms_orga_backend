import { EmployeeRepository } from "../repository/employee.repo.js";
import { Employee, users } from "../db/schema.js";

export class EmployeeService {
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.employeeRepo = new EmployeeRepository();
  }

  async createEmployee(data: typeof Employee.$inferInsert, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create employees");
    }

    // Validate required fields
    if (!data.adminId || !data.userId) {
      throw new Error("Admin ID and User ID are required");
    }

    return await this.employeeRepo.createEmployee(data);
  }

  async getAllEmployees(currentUser: any) {
    let adminId = currentUser.id;

    if (!currentUser.isAdmin) {
      // If not admin, find the admin for this user
      const employee = await this.employeeRepo.getEmployeeByUserId(
        currentUser.id,
      );
      if (employee.length > 0 && employee[0].employee) {
        adminId = employee[0].employee.adminId;
      }
    }

    return await this.employeeRepo.getEmployeesByAdminId(adminId);
  }

  async getEmployeeById(id: number, currentUser: any) {
    const employee = await this.employeeRepo.getEmployeeById(id);

    if (employee.length === 0) {
      throw new Error("Employee not found");
    }

    // Check authorization
    if (
      !currentUser.isAdmin &&
      employee[0].employee?.adminId !== currentUser.id &&
      employee[0].employee?.userId !== currentUser.id
    ) {
      throw new Error("Unauthorized to view this employee");
    }

    return employee;
  }

  async getEmployeeByUserId(userId: number, currentUser: any) {
    const employee = await this.employeeRepo.getEmployeeByUserId(userId);

    if (employee.length === 0) {
      throw new Error("Employee not found");
    }

    // Check authorization
    if (
      !currentUser.isAdmin &&
      employee[0].employee?.adminId !== currentUser.id &&
      employee[0].employee?.userId !== currentUser.id
    ) {
      throw new Error("Unauthorized to view this employee");
    }

    return employee;
  }

  async updateEmployee(
    userId: number,
    data: typeof Employee.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update employees");
    }

    const existingEmployee =
      await this.employeeRepo.getEmployeeByUserId(userId);
    if (existingEmployee.length === 0) {
      throw new Error("Employee not found");
    }

    return await this.employeeRepo.updateEmployeeByUserId(userId, data);
  }

  async deleteEmployee(userId: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete employees");
    }

    const existingEmployee =
      await this.employeeRepo.getEmployeeByUserId(userId);
    if (existingEmployee.length === 0) {
      throw new Error("Employee not found");
    }

    return await this.employeeRepo.deleteEmployeeByUserId(userId);
  }
}
