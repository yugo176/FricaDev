import { v7 as uuidv7 } from 'uuid';

/** UUIDv7 : unique sans coordination entre serveurs et triable par date de création. */
export const newId = (): string => uuidv7();
