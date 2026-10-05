import { ignore } from './handlers';
export const concise = () => 1;
export async function work() { await Promise.resolve(1); }
export async function risky() { new Promise(async resolve => resolve(1)); }
Promise.reject(1).catch(ignore);
Promise.reject(2).then(undefined, ignore);
Promise.reject(3).catch(unknownHandler);
import(unknownModule);
