import { APIGatewayProxyEventV2 } from "aws-lambda";
import { validateAccessToken } from "../lib/jwt";
import { ProtectedHttpRequest } from "../types/Http";
import { parseEvent } from "./parseEvent";

export function parseProtectedEvent(
  event: APIGatewayProxyEventV2
): ProtectedHttpRequest {
  const baseEvent = parseEvent(event);
  const { authorization } = event.headers;

  if (!authorization) {
    throw new Error("Authorization token not provided.");
  }

  const [_, token] = authorization.split(" ");

  const userId = validateAccessToken(token);

  if (!userId) {
    throw new Error("Access token not provided.");
  }

  return {
    ...baseEvent,
    userId,
  };
}
