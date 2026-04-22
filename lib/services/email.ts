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
): Promise<{ gmailThreadId?: string | null }> {
  const { provider, accessToken } = await getEmailProvider(userId);

  if (provider === "google") {
    return sendViaGmail(accessToken, to, subject, body);
  } else if (provider === "microsoft-entra-id") {
    await sendViaOutlook(accessToken, to, subject, body);
    return {};
  }
  return {};
}

async function sendViaGmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ gmailThreadId: string | null }> {
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
  const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
  return { gmailThreadId: res.data.threadId ?? null };
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
  sentAfter: Date,
  options: { gmailThreadId?: string | null; originalSubject?: string } = {}
): Promise<{ replied: boolean; method: string }> {
  try {
    const { provider, accessToken } = await getEmailProvider(userId);

    if (provider === "google") {
      return checkGmailReply(accessToken, recipientEmail, sentAfter, options.gmailThreadId, options.originalSubject);
    } else if (provider === "microsoft-entra-id") {
      return checkOutlookReply(accessToken, recipientEmail, sentAfter, options.originalSubject);
    }
    return { replied: false, method: "unsupported_provider" };
  } catch {
    return { replied: false, method: "error" };
  }
}

async function checkGmailReply(
  accessToken: string,
  recipientEmail: string,
  sentAfter: Date,
  gmailThreadId?: string | null,
  originalSubject?: string
): Promise<{ replied: boolean; method: string }> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Primary: check the specific thread for a reply from the recipient
  if (gmailThreadId) {
    const thread = await gmail.users.threads.get({
      userId: "me",
      id: gmailThreadId,
      format: "metadata",
      metadataHeaders: ["From"],
    });

    const messages = thread.data.messages ?? [];
    // First message is the outbound email; any subsequent message from the recipient is a reply
    const hasReply = messages.slice(1).some((msg) => {
      const from = msg.payload?.headers?.find((h) => h.name === "From")?.value ?? "";
      return from.toLowerCase().includes(recipientEmail.toLowerCase());
    });

    return { replied: hasReply, method: "thread_id" };
  }

  // Fallback: subject-scoped search for emails sent before this fix that have no threadId
  const strippedSubject = (originalSubject ?? "").replace(/^(Re:\s*)+/i, "").trim();
  const subjectFilter = strippedSubject ? ` subject:"${strippedSubject}"` : "";
  const q = `from:${recipientEmail}${subjectFilter} after:${Math.floor(sentAfter.getTime() / 1000)}`;
  const res = await gmail.users.messages.list({ userId: "me", q, maxResults: 1 });
  return { replied: (res.data.messages?.length ?? 0) > 0, method: "subject_search" };
}

async function checkOutlookReply(
  accessToken: string,
  recipientEmail: string,
  sentAfter: Date,
  originalSubject?: string
): Promise<{ replied: boolean; method: string }> {
  const strippedSubject = (originalSubject ?? "").replace(/^(Re:\s*)+/i, "").trim();

  // Scope to sender + date + subject to avoid false positives from unrelated emails
  const parts = [
    `from/emailAddress/address eq '${recipientEmail}'`,
    `receivedDateTime ge ${sentAfter.toISOString()}`,
  ];
  if (strippedSubject) {
    parts.push(`contains(subject, '${strippedSubject.replace(/'/g, "''")}')`);
  }

  const filter = parts.join(" and ");
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$top=1&$select=id`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) return { replied: false, method: "outlook_error" };
  const data = await response.json();
  return { replied: (data.value?.length ?? 0) > 0, method: "outlook_subject_search" };
}
