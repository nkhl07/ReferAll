import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { getValidAccessToken } from "@/lib/auth/refresh-token";

async function getEmailProvider(userId: string): Promise<{ provider: string; accessToken: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailProvider: true },
  });

  const provider = user?.emailProvider ?? "google";
  const accessToken = await getValidAccessToken(userId, provider);
  return { provider, accessToken };
}

export async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const { provider, accessToken } = await getEmailProvider(userId);

  if (provider === "google") {
    await sendViaGmail(accessToken, to, subject, body);
  } else if (provider === "microsoft-entra-id") {
    await sendViaOutlook(accessToken, to, subject, body);
  }
}

async function sendViaGmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join("\n");

  const raw = Buffer.from(message).toString("base64url");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}

async function sendViaOutlook(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Outlook send failed: ${error.error?.message}`);
  }
}

export async function checkForReply(
  userId: string,
  recipientEmail: string,
  sentAfter: Date
): Promise<boolean> {
  try {
    const { provider, accessToken } = await getEmailProvider(userId);

    if (provider === "google") {
      return checkGmailReply(accessToken, recipientEmail, sentAfter);
    } else if (provider === "microsoft-entra-id") {
      return checkOutlookReply(accessToken, recipientEmail, sentAfter);
    }
    return false;
  } catch {
    return false;
  }
}

async function checkGmailReply(
  accessToken: string,
  recipientEmail: string,
  sentAfter: Date
): Promise<boolean> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const q = `from:${recipientEmail} after:${Math.floor(sentAfter.getTime() / 1000)}`;
  const res = await gmail.users.messages.list({ userId: "me", q, maxResults: 1 });
  return (res.data.messages?.length ?? 0) > 0;
}

async function checkOutlookReply(
  accessToken: string,
  recipientEmail: string,
  sentAfter: Date
): Promise<boolean> {
  const filter = `from/emailAddress/address eq '${recipientEmail}' and receivedDateTime ge ${sentAfter.toISOString()}`;
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$top=1&$select=id`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) return false;
  const data = await response.json();
  return (data.value?.length ?? 0) > 0;
}
