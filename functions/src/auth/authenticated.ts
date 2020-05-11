import { findClientByApiKey } from '../clients/service';

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