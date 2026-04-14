import { prisma } from "@/lib/prisma";
import type { Account } from "@prisma/client";

export async function refreshMicrosoftToken(account: Account): Promise<string> {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AZURE_AD_CLIENT_ID!,
      client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token!,
      scope: "openid profile email User.Read Mail.Send Mail.ReadWrite Calendars.ReadWrite OnlineMeetings.ReadWrite offline_access",
    }),
  });

  const tokens = await response.json();

  if (!response.ok) {
    throw new Error(`Microsoft token refresh failed: ${tokens.error_description ?? tokens.error}`);
  }

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? account.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    },
  });

  return tokens.access_token as string;
}

export async function refreshGoogleToken(account: Account): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token!,
    }),
  });

  const tokens = await response.json();

  if (!response.ok) {
    throw new Error(`Google token refresh failed: ${tokens.error_description ?? tokens.error}`);
  }

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    },
  });

  return tokens.access_token as string;
}

export async function getValidAccessToken(userId: string, provider: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider },
  });

  if (!account) throw new Error(`No ${provider} account linked for user`);
  if (!account.access_token) throw new Error(`No access token stored for ${provider}`);

  const isExpired =
    account.expires_at != null && account.expires_at < Math.floor(Date.now() / 1000);

  if (isExpired) {
    if (provider === "microsoft-entra-id") return refreshMicrosoftToken(account);
    if (provider === "google") return refreshGoogleToken(account);
  }

  return account.access_token;
}
