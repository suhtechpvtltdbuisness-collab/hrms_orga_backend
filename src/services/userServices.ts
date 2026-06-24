import UserRepository from "../repository/user.repo.js";
import { users } from "../db/schema.js";
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
    data: typeof users.$inferInsert,
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

    await subscriptionService.assertCanAddEmployee(currentUser.id);

    // Generate random password if not provided
    const plainPassword = (data.password && data.password.trim() !== "")
      ? data.password
      : crypto.randomBytes(6).toString("hex");

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const userData = {
      ...data,
      password: hashedPassword,
      createdBy: currentUser.id,
      organizationId: currentUser.organizationId,
      roleId: 2, // Added by admin/super admin, so role is employee (2)
      isAdmin: false,
    };

    const result = await this.userRepo.createUser(userData, currentUser);

    // Send email with credentials to employee asynchronously
    emailService.sendEmployeeCredentialsEmail(data.email, data.name, plainPassword)
      .then((sent) => {
        if (sent) {
          console.log(`Credentials email sent to employee: ${data.email}`);
        } else {
          console.error(`Failed to send credentials email to employee: ${data.email}`);
        }
      })
      .catch((err) => {
        console.error(`Error sending credentials email to employee: ${data.email}`, err);
      });

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

  async getAllEmployeesByAdminId(adminId: number) {
    const result = await this.userRepo.getAllEmployeesByAdminId(adminId);
    const mapped = result.map((item) => ({
      ...item,
      user: item.user
        ? {
            ...item.user,
            employeeId: `EMP${1000 + item.user.id}`,
          }
        : null,
    }));
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

  async getAllUsersForSuperAdmin(page: number = 1, limit: number = 10, search?: string) {
    const { data, total } = await this.userRepo.getAllUsersForSuperAdmin(page, limit, search);
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
}
export default UserServices;
