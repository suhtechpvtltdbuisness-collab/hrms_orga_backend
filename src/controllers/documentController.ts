import { Request, Response } from "express";
import { DocumentService } from "../services/documentServices.js";

const documentService = new DocumentService();

export const createDocument = async (req: Request, res: Response) => {
  try {
    const document = await documentService.createDocument(
      req.body,
      res.locals.user,
    );
    res.status(201).json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await documentService.getAllDocuments(res.locals.user);
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const document = await documentService.getDocumentById(
      parseInt(req.params.id as string),
      res.locals.user,
    );
    res.json(document);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getDocumentsByEmployeeId = async (req: Request, res: Response) => {
  try {
    const documents = await documentService.getDocumentsByEmployeeId(
      parseInt(req.params.empId as string),
      res.locals.user,
    );
    res.json(documents);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const updateDocument = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    const document = await documentService.updateDocumentByUserId(
      userId,
      req.body,
      res.locals.user,
    );
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id as string);
    await documentService.deleteDocumentByUserId(userId, res.locals.user);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
