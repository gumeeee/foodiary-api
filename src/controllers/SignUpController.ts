import { z } from "zod";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { usersTable } from "../db/schema";
import { calculateGoals } from "../lib/calculateCalories";
import { signAccessTokenFor } from "../lib/jwt";
import { HttpRequest, HttpResponse } from "../types/Http";
import { badRequest, conflict, created } from "../utils/http";

const schema = z.object({
  goal: z.enum(["lose", "maintain", "gain"]),
  gender: z.enum(["male", "female"]),
  birthDate: z.iso.date(),
  height: z.number(),
  weight: z.number(),
  activityLevel: z.number().min(1).max(5),
  account: z.object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
  }),
});

export class SignUpController {
  static async handle({ body }: HttpRequest): Promise<HttpResponse> {
    const { success, error, data } = schema.safeParse(body);

    if (!success) {
      return badRequest({ errors: error.issues });
    }

    const userAlreadyExists = await db.query.usersTable.findFirst({
      columns: {
        email: true,
      },
      where: eq(usersTable.email, data.account.email),
    });

    if (userAlreadyExists) {
      return conflict({ error: "This email is already registered." });
    }

    const hashedPassword = await hash(data.account.password, 8);

    const goals = calculateGoals({
      activityLevel: data.activityLevel,
      birthDate: new Date(data.birthDate),
      gender: data.gender,
      goal: data.goal,
      height: data.height,
      weight: data.weight,
    });

    const [user] = await db
      .insert(usersTable)
      .values({
        name: data.account.name,
        email: data.account.email,
        password: hashedPassword,
        goal: data.goal,
        birthDate: data.birthDate,
        height: data.height,
        weight: data.weight,
        activityLevel: data.activityLevel,
        calories: goals.calories,
        proteins: goals.proteins,
        carbohydrate: goals.carbohydrates,
        fats: goals.fats,
      })
      .returning({ id: usersTable.id });

    const accessToken = signAccessTokenFor(user.id);

    return created({
      accessToken,
    });
  }
}
