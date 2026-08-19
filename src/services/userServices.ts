import UserRepository from "../repository/user.repo.js";
import { document, employment, payroll, users } from "../db/schema.js";
import bcrypt from "bcrypt";
import { subscriptionService } from "./subscriptionServices.js";
import { emailService } from "./emailService.js";
import crypto from "crypto";

class UserServices {
  private userRepo: UserRepository;
  constructor() {
    this.userRepo = new UserRepository();
  }
  async createUser(
    data: typeof users.$inferInsert & {
      employment?: Omit<typeof employment.$inferInsert, "employeeId"> | null;
      payroll?: Omit<typeof payroll.$inferInsert, "empId"> | null;
      documents?: Array<Omit<typeof document.$inferInsert, "empId">>;
    },
    currentUser: typeof users.$inferSelect,
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("unauthorize, Only admins can create users");
    }

    // Validate required fields
    if (!data.name || !data.email) {
      throw new Error("Name and email are required");
    }

    if (data.isAdmin) {
      throw new Error("Cannot create admin user");
    }
    if (data.type !== "employee") {
      throw new Error("Only employee users can be created, update type");
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUser = await this.userRepo.getUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error("An employee with this email already exists");
    }

    await subscriptionService.assertCanAddEmployee(currentUser.id);

    const {
      employment: employmentData,
      payroll: payrollData,
      documents: documentData = [],
      ...userInput
    } = data;

    if (!employmentData?.departmentId) {
      throw new Error("Employment department is required");
    }
    if (
      payrollData &&
      (Number(payrollData.ctc) < 0 ||
        Number(payrollData.monthlyGross) < 0 ||
        Number(payrollData.monthlyPay) < 0 ||
        Number(payrollData.baseSalary || 0) < 0)
    ) {
      throw new Error("Payroll amounts cannot be negative");
    }

    // Generate random password if not provided
    const plainPassword = (userInput.password && userInput.password.trim() !== "")
      ? userInput.password
      : crypto.randomBytes(6).toString("hex");

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const userData = {
      ...userInput,
      email: normalizedEmail,
      password: hashedPassword,
      createdBy: currentUser.id,
      organizationId: currentUser.organizationId,
      roleId: 2, // Added by admin/super admin, so role is employee (2)
      isAdmin: false,
    };

    const result = await this.userRepo.createUser(userData, currentUser, {
      employment: employmentData,
      payroll: payrollData,
      documents: documentData,
    });

    // Send email with credentials to employee asynchronously
    if (userInput.sendInvite !== false) {
      emailService.sendEmployeeCredentialsEmail(userInput.email, userInput.name, plainPassword)
      .then((sent) => {
        if (sent) {
          console.log(`Credentials email sent to employee: ${userInput.email}`);
        } else {
          console.error(`Failed to send credentials email to employee: ${userInput.email}`);
        }
      })
      .catch((err) => {
        console.error(`Error sending credentials email to employee: ${userInput.email}`, err);
      });
    }

    return {
      message: "successfully created user",
      success: true,
      data: {
        ...result,
        user: {
          ...result.user,
          employeeId: `EMP${1000 + result.user.id}`,
        },
      },
    };
  }
  async getUserById(id: number) {
    const result = await this.userRepo.getUserById(id);
    if (!result) {
      throw new Error("User not found");
    }
    return {
      message: "successfully fetched user",
      success: true,
      data: {
        ...result,
        employeeId: `EMP${1000 + result.id}`,
      },
    };
  }
  async getEmployeeById(id: number) {
    const result = await this.userRepo.getEmployeeById(id);
    if (!result) {
      throw new Error("Employee not found");
    }
    return {
      message: "successfully fetched employee",
      success: true,
      data: result,
    };
  }

  async getAllEmployeesByAdminId(adminId: number, page?: number, limit?: number, search?: string) {
    const { data, total } = await this.userRepo.getAllEmployeesByAdminId(adminId, page, limit, search);
    const mapped = data.map((item) => ({
      employee: item.employee,
      user: item.user
        ? {
            ...item.user,
            employeeId: `EMP${1000 + item.user.id}`,
          }
        : null,
      employment: item.employment
        ? {
            ...item.employment,
            department: item.department
              ? {
                  id: item.department.id,
                  name: item.department.departmentName,
                }
              : null,
            designation: item.designation
              ? {
                  id: item.designation.id,
                  name: item.designation.name,
                }
              : null,
          }
        : null,
    }));

    if (page !== undefined && limit !== undefined) {
      return {
        message: "successfully fetched employees by admin",
        success: true,
        data: {
          employees: mapped,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
      };
    }

    return {
      message: "successfully fetched employees by admin",
      success: true,
      data: mapped,
    };
  }

  async getEmployeeDetailsByUserId(userId: number) {
    const result = await this.userRepo.getEmployeeDetailsByUserId(userId);
    if (!result) {
      throw new Error("Employee details not found");
    }
    return {
      message: "successfully fetched employee details",
      success: true,
      data: {
        ...result,
        user: result.user
          ? {
              ...result.user,
              employeeId: `EMP${1000 + result.user.id}`,
            }
          : null,
      },
    };
  }

  async updateUser(
    id: number,
    data: typeof users.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("unauthorize, Only admins can update users");
    }

    // Check if user exists
    const existingUser = await this.userRepo.getUserById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Prevent updating isAdmin field
    if (data.isAdmin !== undefined && data.isAdmin !== existingUser.isAdmin) {
      throw new Error("Cannot modify admin status");
    }

    // Hash password if provided
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      data.password = hashedPassword;
    }

    const result = await this.userRepo.updateUser(id, data);
    return {
      message: "successfully updated user",
      success: true,
      data: {
        ...result,
        employeeId: `EMP${1000 + result.id}`,
      },
    };
  }

  async getAllUsersForSuperAdmin(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
  ) {
    const { data, total } = await this.userRepo.getAllUsersForSuperAdmin(
      page,
      limit,
      search,
      role,
      false,
    );
    return {
      message: "successfully fetched all users for super admin",
      success: true,
      data: {
        users: data,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  async getDeletedUsersForSuperAdmin(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
  ) {
    const { data, total } = await this.userRepo.getAllUsersForSuperAdmin(
      page,
      limit,
      search,
      role,
      true,
    );
    return {
      message: "successfully fetched deleted users",
      success: true,
      data: {
        users: data,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };
  }

  private isOrgAdmin(user: typeof users.$inferSelect) {
    return user.roleId === 1 || user.type === "admin" || user.isAdmin === true;
  }

  async softDeleteUserForSuperAdmin(id: number) {
    const existingUser = await this.userRepo.getUserById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }
    if (existingUser.roleId === 0) {
      throw new Error("Super admin cannot be deleted");
    }

    const ids = [id];
    if (this.isOrgAdmin(existingUser)) {
      const employeeIds = await this.userRepo.getEmployeeUserIdsByAdminId(id, false);
      ids.push(...employeeIds);
    }

    const deleted = await this.userRepo.setUsersDeleted(ids, true);
    return {
      success: true,
      message: this.isOrgAdmin(existingUser)
        ? "Admin and their employees were deleted"
        : "Employee deleted successfully",
      data: { deletedCount: deleted.length },
    };
  }

  async softDeleteUsersForSuperAdmin(ids: number[]) {
    const uniqueIds = [
      ...new Set(
        (ids || [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    if (!uniqueIds.length) {
      throw new Error("No users selected");
    }

    const toDelete = new Set<number>();
    for (const id of uniqueIds) {
      const existingUser = await this.userRepo.getUserById(id);
      if (!existingUser || existingUser.roleId === 0) continue;
      toDelete.add(id);
      if (this.isOrgAdmin(existingUser)) {
        const employeeIds = await this.userRepo.getEmployeeUserIdsByAdminId(
          id,
          false,
        );
        employeeIds.forEach((employeeId) => toDelete.add(employeeId));
      }
    }

    if (!toDelete.size) {
      throw new Error("No eligible users to delete");
    }

    const deleted = await this.userRepo.setUsersDeleted([...toDelete], true);
    return {
      success: true,
      message: `${deleted.length} user(s) deleted`,
      data: { deletedCount: deleted.length },
    };
  }

  async restoreUserForSuperAdmin(id: number) {
    const existingUser = await this.userRepo.getUserById(id, true);
    if (!existingUser) {
      throw new Error("User not found");
    }
    if (!existingUser.isDeleted) {
      throw new Error("User is not deleted");
    }
    if (existingUser.roleId === 0) {
      throw new Error("Super admin cannot be restored this way");
    }

    const ids = [id];
    if (this.isOrgAdmin(existingUser)) {
      const employeeIds = await this.userRepo.getEmployeeUserIdsByAdminId(id, true);
      ids.push(...employeeIds);
    }

    const restored = await this.userRepo.setUsersDeleted(ids, false);
    return {
      success: true,
      message: this.isOrgAdmin(existingUser)
        ? "Admin and their employees were restored"
        : "Employee restored successfully",
      data: { restoredCount: restored.length },
    };
  }

  async softDeleteUser(
    id: number,
    currentUser: typeof users.$inferSelect,
  ) {
    if (currentUser.roleId !== 0 && currentUser.roleId !== 1) {
      throw new Error("unauthorize, Only admins can delete users");
    }

    const existingUser = await this.userRepo.getUserById(id);
    if (!existingUser) {
      throw new Error("Employee not found");
    }

    if (
      existingUser.isAdmin ||
      existingUser.type === "admin" ||
      existingUser.roleId === 1
    ) {
      throw new Error("Admin users cannot be deleted");
    }

    await this.userRepo.softDeleteUser(id);

    return {
      message: "Employee deleted successfully",
      success: true,
    };
  }
}
export default UserServices;
