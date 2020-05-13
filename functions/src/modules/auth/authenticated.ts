import { findClientByApiKey } from '../clients/service';
import config from '../../config';

export async function isAuthenticated(req: any, res: any, next: Function) {
  const { authorization } = req.headers;

  if (!authorization) return res.status(401).send({ message: 'Unauthorized' });
  if (!authorization.startsWith('Bearer')) return res.status(401).send({ message: 'Unauthorized' });

  const apiKey = authorization.slice(7);

  const client = await findClientByApiKey(apiKey);

  if(client){
    res.locals = {...res.locals, client};
    return next();
  }else{
    return res.status(401).send({ message: 'Unauthorized' });
  }

}

export async function isAdminAuthenticated(req: any, res: any, next: Function) {
  const { authorization } = req.headers;

  if (!authorization) return res.status(401).send({ message: 'Unauthorized' });
  if (!authorization.startsWith('Bearer')) return res.status(401).send({ message: 'Unauthorized' });

  const apiKey = authorization.slice(7);

  if(apiKey === config.upload.adminApiKey){
    return next();
  }else{
    return res.status(401).send({ message: 'Unauthorized' });
  }

}