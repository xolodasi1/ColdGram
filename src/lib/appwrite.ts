import { Client, Databases, Account } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (projectId) {
    client
        .setEndpoint(endpoint)
        .setProject(projectId);
}

export const databases = new Databases(client);
export const account = new Account(client);
export { client };

export const APPWRITE_CONFIG = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    collections: {
        messages: import.meta.env.VITE_APPWRITE_COLLECTION_MESSAGES_ID,
        users: import.meta.env.VITE_APPWRITE_COLLECTION_USERS_ID,
    }
};
