import * as _ from 'lodash';

import { generateClient, allClient } from './service';
import { storeUploadCodes, retrieveUploadCodes } from '../opentrace/token';
import { showUploadedData } from '../opentrace/processUploadedData';

// store verification code
export async function postStoreUploadCodes(req: any, res: any) {
  const { codes } = req.body;
  await storeUploadCodes(codes);
  res.status(200).send({success: true});
}

// get verification code
export async function getRetrieveUploadCodes(req: any, res: any) {
  const codes = await retrieveUploadCodes();
  res.status(200).send({ codes });
}

export async function createClient(req: any, res: any) {
  const client = await generateClient();
  res.send(client);
}

export async function getAllClient(req: any, res: any) {
  const clients = await allClient();
  res.send({ clients });
}

export async function decryptCodeDataUpload(req: any, res: any) {
  const { filePath } = req.query || {};
  if(!filePath){
    res.status(400).send({message: 'filePath is require'});
    return;
  }
  
  const response = await showUploadedData(filePath, false);
  res.send(response);
}
