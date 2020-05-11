import { Application } from "express";
import { postStoreUploadCodes, getRetrieveUploadCodes, decryptCodeDataUpload } from "./controller";
import { isAuthenticated } from "../auth/authenticated";

export function clientRoutesConfig(app: Application) {
  app.post('/verification-codes', isAuthenticated, postStoreUploadCodes);
  app.get('/verification-codes', isAuthenticated, getRetrieveUploadCodes);
  app.get('/decrypt-upload-data', isAuthenticated, decryptCodeDataUpload);
}