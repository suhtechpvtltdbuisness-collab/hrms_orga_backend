import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import GoogleCalendarRepository from "../repository/googleCalendar.repo.js";

const TIMEZONE = "Asia/Kolkata";
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

const getOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.API_PUBLIC_URL || "http://localhost:4000"}/google-calendar/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured on the server");
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

const toKolkataDateTime = (date: Date) =>
  date.toLocaleString("sv-SE", { timeZone: TIMEZONE }).replace(" ", "T");

const extractMeetDetails = (event: {
  conferenceData?: {
    entryPoints?: Array<{ entryPointType?: string | null; uri?: string | null; meetingCode?: string | null }>;
    conferenceId?: string | null;
  } | null;
  hangoutLink?: string | null;
}) => {
  const meetEntryPoint = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video",
  );
  const meetUrl = meetEntryPoint?.uri || event.hangoutLink || null;
  const meetingCode =
    meetEntryPoint?.meetingCode ||
    event.conferenceData?.conferenceId ||
    (meetUrl ? meetUrl.split("/").pop()?.replace(/\?.*$/, "") : null) ||
    null;
  return { meetUrl, meetingCode };
};

class GoogleCalendarService {
  private repo = new GoogleCalendarRepository();

  getAuthUrl(userId: number) {
    const client = getOAuthClient();
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state: String(userId),
    });
  }

  async handleOAuthCallback(code: string, userId: number) {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token. Please reconnect and grant calendar access.");
    }

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();

    await this.repo.upsertConnection({
      userId,
      googleEmail: profile.data.email || null,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token || null,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    });

    return { email: profile.data.email || null };
  }

  async getConnectionStatus(userId: number) {
    const connection = await this.repo.getByUserId(userId);
    return {
      connected: Boolean(connection?.refreshToken),
      email: connection?.googleEmail || null,
    };
  }

  async disconnect(userId: number) {
    await this.repo.deleteByUserId(userId);
    return { disconnected: true };
  }

  private async getCalendarClient(userId: number) {
    const connection = await this.repo.getByUserId(userId);
    if (!connection?.refreshToken) {
      throw new Error("Google Calendar is not connected. Connect your Google account before scheduling online interviews.");
    }

    const client = getOAuthClient();
    client.setCredentials({
      refresh_token: connection.refreshToken,
      access_token: connection.accessToken || undefined,
      expiry_date: connection.tokenExpiry?.getTime(),
    });

    client.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        await this.repo.updateTokens(userId, {
          accessToken: tokens.access_token,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        });
      }
    });

    return google.calendar({ version: "v3", auth: client });
  }

  async createInterviewEvent(options: {
    userId: number;
    candidateName: string;
    candidateEmail: string;
    interviewerEmail: string;
    jobTitle: string;
    interviewType: string;
    interviewMode: string;
    panel: string;
    scheduledAt: Date;
    instructions?: string;
  }) {
    const calendar = await this.getCalendarClient(options.userId);
    const start = options.scheduledAt;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const requestId = crypto.randomUUID();

    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: `Interview: ${options.candidateName} - ${options.jobTitle}`,
        description: [
          `Candidate: ${options.candidateName}`,
          `Job: ${options.jobTitle}`,
          `Interview Type: ${options.interviewType}`,
          `Interview Mode: ${options.interviewMode}`,
          `Interview Panel: ${options.panel}`,
          options.instructions ? `Instructions: ${options.instructions}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        start: {
          dateTime: toKolkataDateTime(start),
          timeZone: TIMEZONE,
        },
        end: {
          dateTime: toKolkataDateTime(end),
          timeZone: TIMEZONE,
        },
        attendees: [
          { email: options.candidateEmail },
          { email: options.interviewerEmail },
        ],
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const event = response.data;
    const { meetUrl, meetingCode } = extractMeetDetails(event);
    if (!meetUrl || !event.id) {
      if (event.id) {
        await calendar.events.delete({ calendarId: "primary", eventId: event.id }).catch(() => undefined);
      }
      throw new Error("Google Meet link could not be created. Please try again.");
    }

    return {
      googleEventId: event.id,
      meetUrl,
      meetingCode,
    };
  }

  async updateInterviewEvent(options: {
    userId: number;
    googleEventId: string;
    candidateName: string;
    candidateEmail: string;
    interviewerEmail: string;
    jobTitle: string;
    interviewType: string;
    interviewMode: string;
    panel: string;
    scheduledAt: Date;
    instructions?: string;
  }) {
    const calendar = await this.getCalendarClient(options.userId);
    const start = options.scheduledAt;
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId: options.googleEventId,
      sendUpdates: "all",
      requestBody: {
        summary: `Interview: ${options.candidateName} - ${options.jobTitle}`,
        description: [
          `Candidate: ${options.candidateName}`,
          `Job: ${options.jobTitle}`,
          `Interview Type: ${options.interviewType}`,
          `Interview Mode: ${options.interviewMode}`,
          `Interview Panel: ${options.panel}`,
          options.instructions ? `Instructions: ${options.instructions}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        start: {
          dateTime: toKolkataDateTime(start),
          timeZone: TIMEZONE,
        },
        end: {
          dateTime: toKolkataDateTime(end),
          timeZone: TIMEZONE,
        },
        attendees: [
          { email: options.candidateEmail },
          { email: options.interviewerEmail },
        ],
      },
    });

    const { meetUrl, meetingCode } = extractMeetDetails(response.data);
    return {
      googleEventId: response.data.id || options.googleEventId,
      meetUrl,
      meetingCode,
    };
  }

  async deleteInterviewEvent(userId: number, googleEventId: string) {
    const calendar = await this.getCalendarClient(userId);
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
      sendUpdates: "all",
    });
  }
}

export default new GoogleCalendarService();
