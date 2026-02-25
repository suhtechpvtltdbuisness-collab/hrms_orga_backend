import UserRepository from "../repository/user.repo.js";
import { users } from "../db/schema.js";
import bcrypt from "bcrypt";

class UserServices {
  private userRepo: UserRepository;
  constructor() {
    this.userRepo = new UserRepository();
  }
  async createUser(
    data: typeof users.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("unauthorize, Only admins can create users");
    }

    // Validate required fields
    if (!data.name || !data.email || !data.password) {
      throw new Error("Name, email, and password are required");
    }

    if (data.isAdmin) {
      throw new Error("Cannot create admin user");
    }
    if (data.type !== "employee") {
      throw new Error("Only employee users can be created, update type");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userData = {
      ...data,
      password: hashedPassword,
      createdBy: currentUser.id,
    };

    const result = await this.userRepo.createUser(userData, currentUser);
    return {
      message: "successfully created user",
      success: true,
      data: result,
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
      data: result,
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
    return {
      message: "successfully fetched employees by admin",
      success: true,
      data: result,
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
      data: result,
    };
  }

  async updateUser(
    id: number,
    data: typeof users.$inferInsert,
    currentUser: typeof users.$inferSelect,
  ) {
    if (!currentUser.isAdmin) {
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
      data: result,
    };
  }
}
export default UserServices;
