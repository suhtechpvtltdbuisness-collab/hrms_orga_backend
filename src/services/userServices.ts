import UserRepository from "../repository/user.repo.js";
import { users } from "../db/schema.js";

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
    if (data.isAdmin) {
      throw new Error("Cannot create admin user");
    }
    if (data.type !== "employee") {
      throw new Error("Only employee users can be created, update type");
    }
    const result = await this.userRepo.createUser(data, currentUser);
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
}
export default UserServices;
