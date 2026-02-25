import { DocumentRepository } from "../repository/document.repo.js";
import { EmployeeRepository } from "../repository/employee.repo.js";
import { document, users } from "../db/schema.js";

export class DocumentService {
  private documentRepo: DocumentRepository;
  private employeeRepo: EmployeeRepository;

  constructor() {
    this.documentRepo = new DocumentRepository();
    this.employeeRepo = new EmployeeRepository();
  }

  async createDocument(data: typeof document.$inferInsert, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can create documents");
    }

    // Validate required fields
    if (!data.empId) {
      throw new Error("Employee ID is required");
    }

    return await this.documentRepo.createDocument(data);
  }

  async getAllDocuments(currentUser: any) {
    return await this.documentRepo.getAllDocuments();
  }

  async getDocumentById(id: number, currentUser: any) {
    const doc = await this.documentRepo.getDocumentById(id);

    if (doc.length === 0) {
      throw new Error("Document not found");
    }

    return doc;
  }

  async getDocumentsByEmployeeId(empId: number, currentUser: any) {
    return await this.documentRepo.getDocumentsByEmployeeId(empId);
  }

  async updateDocument(
    id: number,
    data: typeof document.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update documents");
    }

    const existingDoc = await this.documentRepo.getDocumentById(id);
    if (existingDoc.length === 0) {
      throw new Error("Document not found");
    }

    return await this.documentRepo.updateDocument(id, data);
  }

  async updateDocumentByUserId(
    userId: number,
    data: typeof document.$inferInsert,
    currentUser: any,
  ) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can update documents");
    }

    return await this.documentRepo.updateDocumentByUserId(userId, data);
  }

  async deleteDocument(id: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete documents");
    }

    const existingDoc = await this.documentRepo.getDocumentById(id);
    if (existingDoc.length === 0) {
      throw new Error("Document not found");
    }

    return await this.documentRepo.deleteDocument(id);
  }

  async deleteDocumentByUserId(userId: number, currentUser: any) {
    if (!currentUser.isAdmin) {
      throw new Error("Only admins can delete documents");
    }

    return await this.documentRepo.deleteDocumentByUserId(userId);
  }
}
