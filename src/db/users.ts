import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string, photoUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name,
        photoUrl,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          name,
          photoUrl,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Failed to get/create user in DB:", error);
    throw new Error("Erro de banco de dados ao autenticar usuário.", { cause: error });
  }
}
