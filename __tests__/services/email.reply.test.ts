import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mock refs so they're available inside vi.mock factories ──────────────

const { mockThreadsGet, mockMessagesList } = vi.hoisted(() => ({
  mockThreadsGet: vi.fn(),
  mockMessagesList: vi.fn(),
}));

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ emailProvider: "google" }),
    },
  },
}));

vi.mock("@/lib/auth/refresh-token", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("fake-access-token"),
}));

vi.mock("googleapis", () => {
  function MockOAuth2(this: { setCredentials: () => void }) {
    this.setCredentials = vi.fn();
  }
  return {
    google: {
      auth: { OAuth2: MockOAuth2 },
      gmail: vi.fn().mockReturnValue({
        users: {
          threads: { get: mockThreadsGet },
          messages: { list: mockMessagesList },
        },
      }),
    },
  };
});

// ── Import after mocks ─────────────────────────────────────────────────────────

import { checkForReply } from "@/lib/services/email";

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeThread = (messages: Array<{ from: string }>) => ({
  data: {
    messages: messages.map((m) => ({
      payload: {
        headers: [{ name: "From", value: m.from }],
      },
    })),
  },
});

const SENDER = "nikhil@example.com";
const RECIPIENT = "contact@company.com";
const SENT_AT = new Date("2024-01-01T10:00:00Z");
const THREAD_ID = "thread-abc-123";
const SUBJECT = "Quick coffee chat request";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("checkForReply — thread_id method", () => {
  it("true positive: contact replies to the outreach email", async () => {
    // Thread has 2 messages: outbound from sender, then reply from recipient
    mockThreadsGet.mockResolvedValue(
      makeThread([{ from: SENDER }, { from: RECIPIENT }])
    );

    const result = await checkForReply("user-1", RECIPIENT, SENT_AT, {
      gmailThreadId: THREAD_ID,
      originalSubject: SUBJECT,
    });

    expect(result.replied).toBe(true);
    expect(result.method).toBe("thread_id");
    expect(mockThreadsGet).toHaveBeenCalledWith(
      expect.objectContaining({ id: THREAD_ID })
    );
    // Should NOT fall back to a broad message search
    expect(mockMessagesList).not.toHaveBeenCalled();
  });

  it("false positive prevention: contact emails about something unrelated (different thread)", async () => {
    // Our thread only has the original outbound — no reply from recipient
    mockThreadsGet.mockResolvedValue(
      makeThread([{ from: SENDER }])
    );

    // Even though the recipient may have sent some other email (different thread),
    // the thread-scoped check correctly sees no reply.
    const result = await checkForReply("user-1", RECIPIENT, SENT_AT, {
      gmailThreadId: THREAD_ID,
      originalSubject: SUBJECT,
    });

    expect(result.replied).toBe(false);
    expect(result.method).toBe("thread_id");
    // The old bare "from:X after:Y" search query is never issued
    expect(mockMessagesList).not.toHaveBeenCalled();
  });

  it("edge case: contact replies but changes the subject line — still detected via thread", async () => {
    // Recipient replied with a completely different subject, but it's in the same Gmail thread
    mockThreadsGet.mockResolvedValue(
      makeThread([{ from: SENDER }, { from: RECIPIENT }])
    );

    const result = await checkForReply("user-1", RECIPIENT, SENT_AT, {
      gmailThreadId: THREAD_ID,
      originalSubject: "completely different subject in the reply",
    });

    // Thread ID check finds the reply regardless of subject mutation
    expect(result.replied).toBe(true);
    expect(result.method).toBe("thread_id");
  });
});

describe("checkForReply — subject_search fallback (no threadId stored)", () => {
  it("falls back to subject-scoped search when gmailThreadId is null", async () => {
    mockMessagesList.mockResolvedValue({ data: { messages: [{ id: "msg-1" }] } });

    const result = await checkForReply("user-1", RECIPIENT, SENT_AT, {
      gmailThreadId: null,
      originalSubject: SUBJECT,
    });

    expect(result.replied).toBe(true);
    expect(result.method).toBe("subject_search");
    expect(mockThreadsGet).not.toHaveBeenCalled();

    // Query must include subject filter — not a bare from: search
    const callArg = mockMessagesList.mock.calls[0][0];
    expect(callArg.q).toContain(`subject:"${SUBJECT}"`);
    expect(callArg.q).toContain(`from:${RECIPIENT}`);
  });

  it("strips leading Re: prefixes from subject before searching", async () => {
    mockMessagesList.mockResolvedValue({ data: { messages: [] } });

    await checkForReply("user-1", RECIPIENT, SENT_AT, {
      gmailThreadId: null,
      originalSubject: `Re: Re: ${SUBJECT}`,
    });

    const callArg = mockMessagesList.mock.calls[0][0];
    expect(callArg.q).toContain(`subject:"${SUBJECT}"`);
    expect(callArg.q).not.toContain("Re:");
  });
});
