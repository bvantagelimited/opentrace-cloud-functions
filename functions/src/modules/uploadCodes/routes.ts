import { Application } from "express";
import { postGenerateUploadCode, getListUploadCodes, decryptCodeDataUpload } from "./controller";
import { isAuthenticated, isAdminAuthenticated } from "../auth/authenticated";

export default function uploadCodeRoutes(app: Application) {

  app.post('/generate-code', isAuthenticated, postGenerateUploadCode);
  app.get('/upload-codes', isAdminAuthenticated, getListUploadCodes);
  app.get('/decrypt-upload-data', isAdminAuthenticated, decryptCodeDataUpload);
}